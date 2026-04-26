import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

// Initialize our tools
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY!,
});

export async function GET(request: Request) {
  try {
    // 1. SECURITY CHECK: Make sure random people can't run your bot
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    
    // We will use "fac-bot-2026" as our secret password
    if (secret !== "fac-bot-2026") {
      return NextResponse.json({ error: "Unauthorized. Wrong password." }, { status: 401 });
    }

    // 2. THE CLEANER: Delete facts older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await supabase
      .from("facts")
      .delete()
      .lt("created_at", sevenDaysAgo.toISOString()); // "lt" means Less Than (older than)

    // 3. THE BRAIN: Ask Groq for 1 new concept
    const prompt = `You are a teacher for a 20-year-old. Generate exactly 1 random, fascinating concept, basic life skill, or global brand they should know.
    You MUST respond with valid JSON in exactly this format:
    {
      "topic": "The Name of the Concept",
      "category": "Science, Finance, History, etc.",
      "summary": "A punchy, casual 2-sentence explanation of what it is and why it matters."
    }`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
    });

    const textResponse = chatCompletion.choices[0]?.message?.content || "{}";
    const cleanJson = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    const newFact = JSON.parse(cleanJson);

    // 4. THE DATA ENTRY: Save the new fact to Supabase
    if (newFact.topic && newFact.summary) {
      await supabase.from("facts").insert([
        {
          topic: newFact.topic,
          category: newFact.category,
          summary: newFact.summary,
        }
      ]);
    }

    // Tell the browser the bot successfully did its job
    return NextResponse.json({ success: true, message: "Bot cleaned old data and added 1 new fact." });

  } catch (error) {
    console.error("Bot failed:", error);
    return NextResponse.json({ error: "The bot crashed." }, { status: 500 });
  }
}