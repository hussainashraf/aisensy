# AI Website Content Assistant

An AI-powered web application that allows users to scrape content from websites and ask questions about the content using GPT-4. Built with Next.js, Playwright, and OpenAI's API.

## Features

- Website content scraping using Playwright
- Real-time chat interface with AI
- Streaming responses from GPT-4
- Support for multiple website URLs
- Clean and responsive UI

## Prerequisites

Before running this project, make sure you have:

- Node.js (v18 or higher)
- OpenAI API key
- Playwright browsers installed

## Installation

1. Clone the repository:
   ```bash
   git clone <https://github.com/hussainashraf/aisensy.git>
   cd <aisensy>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

4. Create a `.env` file in the root directory and add your OpenAI API key:
   ```bash
   OPEN_AI_KEY=your_openai_api_key_here
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## How It Works

### Website Scraping

The application uses Playwright to scrape content from websites. Here's how it works:

1. **Browser Automation**: Uses Playwright's headless Chrome browser to load web pages
2. **Content Extraction**: 
   - Loads the full page content
   - Removes unnecessary elements (scripts, styles, navigation, etc.)
   - Extracts clean text content using Cheerio
3. **User Agent Rotation**: Implements random user agent selection to avoid blocking
4. **Error Handling**: Gracefully handles failed scraping attempts

Key components:
- `app/api/scrape/route.ts`: Handles the scraping API endpoint
- Playwright for browser automation
- Cheerio for HTML parsing

### LLM Integration

The application uses OpenAI's GPT-4 model to analyze scraped content and answer user questions:

1. **System Prompt**: Creates a context-aware system prompt containing:
   - Scraped website content
   - User information
   - Strict instructions to only reference provided content

2. **Streaming Responses**: 
   - Implements streaming API responses
   - Real-time message updates
   - Chunked transfer encoding

3. **Chat History**: 
   - Maintains conversation context
   - Allows for follow-up questions
   - Preserves user and assistant messages

Key components:
- `utils/openai.ts`: OpenAI configuration and prompt generation
- `app/api/chat/route.ts`: Handles chat API endpoint
- Streaming response handling in frontend


