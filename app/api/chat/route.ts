
import { openai, createSystemPrompt } from '@/utils/openai';
import dotenv from 'dotenv';

dotenv.config();

export async function POST(req: Request) {
  try {
    const { message, websites, chatHistory, userName } = await req.json();

    const systemPrompt = createSystemPrompt(websites, userName);
    console.log("ssss",systemPrompt);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 4096,
      stream: true, // Enable streaming
    });

    // Create a readable stream for the response
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(content);
          }
        }
        controller.close();
      },
    });

    // Return the streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('Failed to get response from AI', { status: 500 });
  }
} 