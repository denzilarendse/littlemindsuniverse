export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS") return res.status(200).end();
  const { message, system, context } = req.body || {};
  const apiKey = process.env.GROQ_API_KEY;
  if(!apiKey){
    return res.status(200).json({ reply: "Milo is offline right now 🦉 but let's play! You have "+(context?.stars||0)+" stars 🌟 What CAPS topic should we explore? 🇿🇦" });
  }
  try{
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",
      headers:{ "Authorization":"Bearer "+apiKey, "Content-Type":"application/json" },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages:[
          { role:"system", content:(system||"You are Milo owl tutor")+" Context stars:"+(context?.stars||0)+" island:"+(context?.island||1) },
          { role:"user", content: message||"Hello" }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || "Let's keep learning! 🌟";
    return res.status(200).json({ reply });
  }catch(e){
    return res.status(200).json({ reply: "Milo is thinking offline 🦉 What should we explore next? 🇿🇦" });
  }
}
