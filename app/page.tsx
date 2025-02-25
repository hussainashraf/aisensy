"use client";
import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const [userName, setUserName] = useState("");
  const [websites, setWebsites] = useState([{ url: "" }]);
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedContent, setScrapedContent] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);

  // Add ref for chat container
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set mounted state
    setMounted(true);
  }, []);

  const addWebsiteField = () => {
    setWebsites([...websites, { url: "" }]);
  };

  const removeWebsiteField = (index: number) => {
    const newWebsites = websites.filter((_, i) => i !== index);
    setWebsites(newWebsites);
  };

  const handleWebsiteChange = (index: number, value: string) => {
    const newWebsites = websites.map((website, i) => {
      if (i === index) {
        return { url: value };
      }
      return website;
    });
    setWebsites(newWebsites);
  };

  // Add type for scrape result
  interface ScrapeResult {
    url: string;
    content: string;
  }

  const scrapeWebsites = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Filter out empty URLs
      const validWebsites = websites.filter(w => w.url.trim());
      
      if (validWebsites.length === 0) {
        throw new Error('Please enter at least one valid website URL');
      }

      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: validWebsites.map(w => w.url.trim())
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to scrape websites');
      }

      // Validate that we received content for all URLs
      const missingContent = validWebsites
        .filter(w => !data.results.some((r: ScrapeResult) => r.url === w.url && r.content));

      if (missingContent.length > 0) {
        throw new Error(`Failed to scrape content from: ${missingContent.map(w => w.url).join(', ')}`);
      }

      const contentMap = data.results.reduce((acc: Record<string, string>, result: ScrapeResult) => {
        acc[result.url] = result.content;
        return acc;
      }, {});

      setScrapedContent(contentMap);
      setShowModal(false);
      
      setChatHistory([{
        role: "assistant",
        content: `👋 Hi ${userName}! I've successfully ingested the content from your provided websites. You can now ask me questions about:\n\n${validWebsites.map(w => `• ${w.url}`).join('\n')}\n\nWhat would you like to know?`
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while scraping websites');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userName && websites.some(web => web.url)) {
      await scrapeWebsites();
    }
  };

  // Add scroll helper function
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const newMessage = { role: "user", content: message };
    setChatHistory(prev => [...prev, newMessage]);
    setMessage("");
    
    // Scroll after user message
    scrollToBottom();
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage.content,
          userName,
          websites: websites.map(web => ({
            url: web.url,
            content: scrapedContent[web.url] || ''
          })),
          chatHistory
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      let aiResponse = '';
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      setChatHistory(prev => [...prev, { role: "assistant", content: '' }]);
      
      // Scroll after adding empty AI message
      scrollToBottom();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        aiResponse += chunk;
        
        setChatHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = {
            role: "assistant",
            content: aiResponse
          };
          return newHistory;
        });
        
        // Scroll after each chunk
        scrollToBottom();
      }
    } catch (err) {
      setError(err as string);
    }
  };

  const handleBackClick = () => {
    setShowModal(true);
    setChatHistory([]);
    setScrapedContent({});
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Initial Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-black">
              Welcome to AI Assistant
            </h2>
            <form onSubmit={handleStart} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded-lg border bg-white px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Website URLs
                </label>
                {websites.map((website, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={website.url}
                      onChange={(e) => handleWebsiteChange(index, e.target.value)}
                      className="flex-1 rounded-lg border bg-white px-4 py-2 text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com"
                      required
                    />
                    {websites.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeWebsiteField(index)}
                        className="p-2 text-red-500 hover:text-red-700 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addWebsiteField}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add another website
                </button>
              </div>

              {error && (
                <div className="text-red-500 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black hover:bg-gray-800 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:bg-gray-400"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Scraping websites...
                  </div>
                ) : (
                  'Start Chat'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Chat Interface */}
      {!showModal && (
        <div className="max-w-6xl mx-auto p-4 h-screen flex flex-col bg-white">
          {/* Header with ingested websites */}
          <header className="py-4 px-6 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackClick}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-black"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h1 className="text-2xl font-bold text-black">AI Assistant</h1>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  <span className="text-sm text-black">{userName}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {websites.map((website, index) => (
                  <div 
                    key={index}
                    className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600 flex items-center"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    {new URL(website.url).hostname}
                  </div>
                ))}
              </div>
            </div>
          </header>

          {/* Chat Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto py-6 px-4 space-y-6"
          >
            {chatHistory.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"} items-start gap-3`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                )}
                <div className={`flex flex-col max-w-[70%] ${msg.role === "assistant" ? "items-start" : "items-end"}`}>
                  <div className={`px-4 py-3 rounded-2xl ${
                    msg.role === "assistant" 
                      ? "bg-gray-100 text-black" 
                      : "bg-black text-white"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">You</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="w-full px-4 py-3 rounded-full border border-gray-300 bg-gray-50 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <button 
                onClick={handleSendMessage}
                className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-full font-medium transition-colors flex items-center gap-2"
              >
                <span>Send</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

