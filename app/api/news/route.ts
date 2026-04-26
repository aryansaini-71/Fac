// app/api/news/route.ts
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY!,
});

export async function GET() {
  try {
    // 1. Fetch from NewsAPI (Running on the Vercel server, so it bypasses the block!)
    const res = await fetch(
      `https://newsapi.org/v2/top-headlines?language=en&pageSize=5&apiKey=${process.env.NEXT_PUBLIC_NEWS_API_KEY}`
    );
    const data = await res.json();
    const rawArticles = data.articles || [];

    if (rawArticles.length === 0) return NextResponse.json({ news: [] });

    // 2. Use Groq to summarize
    const headlinesPrompt = rawArticles
      .map((a: any, i: number) => `Story ${i + 1}:\nTitle: ${a.title}\nDetails: ${a.description || "No extra details."}`)
      .join("\n\n");

    const prompt = `Read these ${rawArticles.length} news stories. 
    For each story, write a casual 2-sentence summary explaining what happened and why it matters. No boring jargon.
    
    You MUST respond with a valid JSON array of strings containing exactly ${rawArticles.length} summaries.
    Example format: ["summary one", "summary two", "summary three", "summary four", "summary five"]
    
    Stories to summarize:
    ${headlinesPrompt}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
    });

    const textResponse = chatCompletion.choices[0]?.message?.content || "[]";
    const cleanJson = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    const simplifiedTexts = JSON.parse(cleanJson);

    const combinedNews = rawArticles.map((article: any, i: number) => ({
      source: article.source.name,
      text: simplifiedTexts[i] || "Summary unavailable. " + article.title,
      url: article.url,
    }));

    // Send the finished, summarized news to your frontend
    return NextResponse.json({ news: combinedNews });

  } catch (error) {
    console.error("Server News Error:", error);
    return NextResponse.json({ error: "Failed to fetch or summarize news" }, { status: 500 });
  }
}