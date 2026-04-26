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
      // Ask our own secure backend for the news instead of asking NewsAPI directly
      const res = await fetch("/api/news");
      const data = await res.json();

      if (data.news && data.news.length > 0) {
        setNews(data.news);
      }
    } catch (err) {
      console.error("Failed to load news from server:", err);
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