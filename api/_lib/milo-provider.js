// Phase 5 - Provider routing with bounded retries and fallback
export async function callGroqWithRetry({ baseUrl, key, model, messages, max_tokens, temperature, maxRetries = 2 }) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, max_tokens, temperature }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const raw = await res.text();
      let data = {};
      try { data = JSON.parse(raw); } catch { const part = raw.replace(/\r/g,'').split('\ndata:')[0].trim(); try { data = JSON.parse(part); } catch {} }
      if (!res.ok) {
        if ([429,502,503,504].includes(res.status) && attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 300 * Math.pow(2, attempt)));
          lastError = new Error(`Provider ${res.status}`);
          continue;
        }
        throw new Error(`Provider ${res.status}: ${data?.error?.message||'Unknown'}`);
      }
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 200));
        continue;
      }
      return { reply, data, raw, status: res.status };
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError' && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt)));
        continue;
      }
      if (attempt >= maxRetries) break;
      if (err.message && /401|403/.test(err.message)) break;
      await new Promise(r => setTimeout(r, 300 * Math.pow(2, attempt)));
    }
  }
  throw lastError || new Error('Provider failed after retries');
}
