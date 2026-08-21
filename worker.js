/**
 * LittleMindsUniverse - Milo AI Worker
 * Deploy to Cloudflare Workers, Vercel Functions, or Netlify Functions
 * Linked to Llama API (Meta Llama 3)
 * 
 * ENV VARS needed:
 * - LLAMA_API_KEY (or GROQ_API_KEY, or TOGETHER_API_KEY)
 * 
 * Supports: Groq, Together.ai, Anyscale, or Meta's own Llama API
 */

export default {
  async fetch(request, env) {
    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    if (request.method !== "POST") {
      return new Response("Milo AI is ready 🦉 Use POST", { status: 200 });
    }

    try {
      const { message, system, context } = await request.json();

      // Choose your Llama provider - UNCOMMENT ONE:

      // --- OPTION 1: GROQ (Fastest, free tier, recommended) ---
      const LLAMA_API_URL = "https://api.groq.com/openai/v1/chat/completions";
      const MODEL = "llama-3.1-70b-versatile"; // or llama-3.1-8b-instant for faster/cheaper
      const API_KEY = env.GROQ_API_KEY;

      // --- OPTION 2: TOGETHER.AI ---
      // const LLAMA_API_URL = "https://api.together.xyz/v1/chat/completions";
      // const MODEL = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo";
      // const API_KEY = env.TOGETHER_API_KEY;

      // --- OPTION 3: Meta's own Llama API (if you have access) ---
      // const LLAMA_API_URL = "https://api.llama-api.com/chat/completions";
      // const MODEL = "llama3-70b";
      // const API_KEY = env.LLAMA_API_KEY;

      if (!API_KEY) {
        return new Response(JSON.stringify({ 
          reply: "Milo is offline - API key not set! 🦉 But we can still play! What would you like to learn about South Africa? 🇿🇦" 
        }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      // Add context to system prompt for better answers
      const enrichedSystem = `${system}
      
Current learner context:
- Stars: ${context?.stars || 0}
- Skills: ${JSON.stringify(context?.skills || {})}
- Stages: Foundation Month ${context?.stages?.foundation || 1}, Discovery ${context?.stages?.discovery || 1}, Creator ${context?.stages?.creator || 1}
- Current Island: ${context?.island || 'foundation'}

Keep answer under 60 words, age-appropriate, encouraging.`;

      const aiRes = await fetch(LLAMA_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: enrichedSystem },
            { role: "user", content: message }
          ],
          max_tokens: 180,
          temperature: 0.7,
          top_p: 0.9
        })
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error("Llama API error:", errText);
        throw new Error(`Llama API ${aiRes.status}: ${errText.slice(0,200)}`);
      }

      const aiData = await aiRes.json();
      const reply = aiData.choices?.[0]?.message?.content || "Hmm, I didn't catch that! 🌟 Can you try again?";

      return new Response(JSON.stringify({ reply }), {
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });

    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ 
        reply: "Oh no, Milo is having trouble connecting! 🦉 Let's play offline - what CAPS topic should we explore? 🇿🇦" 
      }), { 
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
      });
    }
  }
};

// For Vercel / Netlify Functions (Node.js) - use this instead:
/*
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  
  const { message, system, context } = req.body;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  
  const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-70b-versatile",
      messages: [
        { role: "system", content: system },
        { role: "user", content: message }
      ],
      max_tokens: 180
    })
  });
  
  const data = await aiRes.json();
  res.json({ reply: data.choices[0].message.content });
}
*/
