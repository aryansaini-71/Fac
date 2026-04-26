"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY!,
  dangerouslyAllowBrowser: true,
});

export default function FacDashboard() {
  const [fact, setFact] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // NEW: Keeps track of which news story we are currently looking at
  const [newsIndex, setNewsIndex] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    await Promise.all([fetchRandomFact(), fetchSimplifiedNews()]);
    setLoading(false);
  };

  const fetchRandomFact = async () => {
    const { data } = await supabase.from("facts").select("*");
    if (data && data.length > 0) {
      setFact(data[Math.floor(Math.random() * data.length)]);
    } else {
      setFact(null);
    }
  };

  const deleteFact = async (id: number) => {
    if (!confirm("Mastered this topic?")) return;
    const { error } = await supabase.from("facts").delete().eq("id", id);
    if (!error) fetchRandomFact();
  };

const fetchSimplifiedNews = async () => {
    try {
      const res = await fetch(
        `https://newsapi.org/v2/top-headlines?language=en&pageSize=5&apiKey=${process.env.NEXT_PUBLIC_NEWS_API_KEY}`
      );
      const data = await res.json();
      const rawArticles = data.articles || [];

      if (rawArticles.length === 0) return;

      const headlinesPrompt = rawArticles
        .map((a: any, i: number) => `Story ${i + 1}:\nTitle: ${a.title}\nDetails: ${a.description || "No extra details."}`)
        .join("\n\n");
      
      // 🚀 THE FIX: We are now forcing the AI to return strict JSON data
      const prompt = `Read these ${rawArticles.length} news stories. 
      For each story, write a casual 2-sentence summary explaining what happened and why it matters. No boring jargon.
      
      You MUST respond with a valid JSON array of strings containing exactly ${rawArticles.length} summaries. Do not include any other text, just the array.
      Example format: ["summary one", "summary two", "summary three", "summary four", "summary five"]
      
      Stories to summarize:
      ${headlinesPrompt}`;

      try {
        const chatCompletion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.1-8b-instant",
        });

        const textResponse = chatCompletion.choices[0]?.message?.content || "[]";
        
        // Sometimes AI adds markdown like ```json ... ```, so we clean it up before parsing
        const cleanJson = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
        const simplifiedTexts = JSON.parse(cleanJson);

        const combinedNews = rawArticles.map((article: any, i: number) => ({
          source: article.source.name,
          text: simplifiedTexts[i] || "Summary unavailable. " + article.title,
          url: article.url,
        }));

        setNews(combinedNews);
      } catch (aiError) {
        console.error("🔍 Groq Error or JSON Parsing Failed:", aiError);
        // If the AI messes up the JSON, we still show the news headlines safely
        setNews(rawArticles.map((a: any) => ({
          source: a.source.name,
          text: a.title,
          url: a.url
        })));
      }
    } catch (err) {
      console.error("News fetch failed:", err);
    }
  };

  // NEW: The function that flips to the next news story
  const handleNextNews = () => {
    if (news.length > 0) {
      // This loops back to 0 if you hit the end of the list
      setNewsIndex((prevIndex) => (prevIndex + 1) % news.length);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
      <header className="max-w-2xl mx-auto mb-12 flex justify-between items-center">
        <h1 className="text-4xl font-black tracking-tighter italic">FAC.</h1>
        <Link 
          href="/add" 
          className="bg-white text-black px-6 py-2 rounded-full text-sm font-bold hover:scale-105 transition"
        >
          + ADD
        </Link>
      </header>

      <div className="max-w-2xl mx-auto space-y-12">
        
        {/* DAILY SPARK */}
        <section>
          <div className="flex justify-between items-end mb-4 px-2">
            <p className="text-zinc-500 text-xs uppercase tracking-[0.2em] font-bold">Daily Spark</p>
            <button onClick={fetchRandomFact} className="text-zinc-600 text-xs hover:text-white transition underline">Shuffle</button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl min-h-[220px] flex flex-col justify-between">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-zinc-800 rounded w-1/2"></div>
                <div className="h-4 bg-zinc-800 rounded w-full"></div>
              </div>
            ) : fact ? (
              <>
                <div>
                  <h2 className="text-3xl font-bold mb-4 tracking-tight">{fact.topic}</h2>
                  <p className="text-zinc-400 text-lg leading-relaxed">{fact.summary}</p>
                </div>
                <div className="flex justify-between items-center mt-8">
                  <span className="bg-zinc-800 text-zinc-500 text-[10px] px-3 py-1 rounded-full uppercase font-bold tracking-tighter">
                    {fact.category || "General"}
                  </span>
                  <button onClick={() => deleteFact(fact.id)} className="text-zinc-700 hover:text-red-400 transition text-sm">
                    Remove
                  </button>
                </div>
              </>
            ) : (
              <p className="text-zinc-600 italic">Your bank is empty.</p>
            )}
          </div>
        </section>

        {/* ONE-AT-A-TIME NEWS CAROUSEL */}
        <section>
          <div className="flex justify-between items-end mb-4 px-2">
            <p className="text-zinc-500 text-xs uppercase tracking-[0.2em] font-bold">World Intel</p>
            {!loading && news.length > 0 && (
              <p className="text-zinc-600 text-xs font-bold">
                {newsIndex + 1} / {news.length}
              </p>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl relative min-h-[220px] flex flex-col justify-between">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-zinc-800 rounded w-full"></div>
                <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
              </div>
            ) : news.length > 0 ? (
              <>
                <div>
                  <h3 className="text-xl font-medium text-zinc-200 leading-relaxed mb-6">
                    {news[newsIndex].text}
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                    <a 
                      href={news[newsIndex].url} 
                      target="_blank" 
                      className="text-[10px] uppercase font-bold text-zinc-500 hover:text-white transition tracking-wider"
                    >
                      Source: {news[newsIndex].source}
                    </a>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={handleNextNews}
                    className="bg-zinc-800 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-zinc-700 transition active:scale-95 flex items-center gap-2"
                  >
                    Next Story ➔
                  </button>
                </div>
              </>
            ) : (
              <p className="text-zinc-600 italic">No news found right now.</p>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}