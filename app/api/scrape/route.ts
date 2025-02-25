import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import playwright from 'playwright';

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

export async function POST(req: Request) {
  try {
    const { urls } = await req.json();
    const browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const results = await Promise.all(
      urls.map(async (url: string) => {
        try {
          // Get random user agent
          const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
          
          // Create context with random user agent
          const context = await browser.newContext({
            userAgent: randomUserAgent,
            viewport: { width: 1920, height: 1080 }
          });
          
          const page = await context.newPage();
          await page.goto(url);
          const content = await page.content();
          
          // Close context after use
          await context.close();
          
          // Use cheerio to extract body content
          const $ = cheerio.load(content);
          
          // Remove scripts, styles, and other unnecessary elements
          $('script').remove();
          $('style').remove();
          $('nav').remove();
          $('header').remove();
          $('footer').remove();
          
          // Get cleaned text content
          const bodyText = $('body')
            .text()
            .replace(/\s+/g, ' ')
            .trim();

          return {
            url,
            content: bodyText,
            success: true
          };
        } catch (error) {
          return {
            url,
            content: null,
            success: false,
            error: error
          };
        }
      })
    );

    await browser.close();
    return NextResponse.json({ results });
    
  } catch (error) {
    return NextResponse.json(
      { error: error },
      { status: 500 }
    );
  }
} 