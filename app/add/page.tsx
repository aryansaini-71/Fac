"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

// Initialize Supabase (Use your actual keys here or from .env)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AddFact() {
  const [topic, setTopic] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("General");

  const handleSave = async () => {
    if (!topic || !summary) return alert("Fill in the basics!");

    const { error } = await supabase
      .from("facts")
      .insert([{ topic, summary, category }]);

    if (error) {
      alert("Error saving: " + error.message);
    } else {
      alert("Fact added to FAC!");
      setTopic("");
      setSummary("");
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8 font-sans">
      <div className="max-w-md mx-auto">
        <Link href="/" className="text-zinc-500 hover:text-white transition text-sm">
          ← Back to Dashboard
        </Link>
        
        <h1 className="text-3xl font-bold mt-6 mb-8">Add New Knowledge</h1>

        <div className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Topic</label>
            <input 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. LVMH"
              className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Summary (Keep it short!)</label>
            <textarea 
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Explain it like I'm 20..."
              className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl h-32 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition"
          >
            Save to Bank
          </button>
        </div>
      </div>
    </main>
  );
}