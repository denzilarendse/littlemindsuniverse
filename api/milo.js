export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS") return res.status(200).end();
  try{
    const { message, system, context } = req.body || {};
    const apiKey = process.env.GROQ_API_KEY;
    console.log("Milo request:", message?.substring(0,50), "hasKey:", !!apiKey);
    if(!apiKey){
      return res.status(200).json({ reply: "Milo is offline right now 🦉 (No API key set in Vercel). You asked: '"+(message||"hello")+"'. The sky is blue because sunlight scatters! 🌤️ Add GROQ_API_KEY in Vercel Settings to enable AI." });
    }
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",
      headers:{ "Authorization":"Bearer "+apiKey, "Content-Type":"application/json" },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages:[
          { role:"system", content: (system||"You are Milo friendly owl tutor")+" Stars:"+(context?.stars||0) },
          { role:"user", content: message||"Hello" }
        ],
        max_tokens: 250,
        temperature: 0.7
      })
    });
    const data = await r.json();
    console.log("Groq response:", JSON.stringify(data).substring(0,200));
    if(data.error){ return res.status(200).json({ reply: "Milo error: "+data.error.message+" 🦉 Let's try another question!" }); }
    const reply = data.choices?.[0]?.message?.content || "Let's keep learning! 🌟 What else would you like to explore?";
    return res.status(200).json({ reply });
  }catch(e){
    console.error("Milo handler error", e);
    return res.status(200).json({ reply: "Milo is thinking offline 🦉 but ready! The sky is blue because of Rayleigh scattering! 🌤️ What else?" });
  }
}
