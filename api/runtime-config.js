const noStore = { "Cache-Control": "no-store, max-age=0", "Vary": "Host" };

export default function handler(_req, res) {
  res.setHeader("Cache-Control", noStore["Cache-Control"]);
  res.setHeader("Vary", noStore.Vary);

  // Only Vercel Preview may override the static production-safe browser config.
  if (process.env.VERCEL_ENV !== "preview") {
    return res.status(404).json({ error: "Preview runtime configuration is unavailable" });
  }

  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "");
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) ||
      !(publishableKey.startsWith("sb_publishable_") || publishableKey.startsWith("eyJ"))) {
    return res.status(503).json({ error: "Preview Supabase public configuration is incomplete" });
  }

  // Deliberately return only public browser credentials. Never serialize server keys.
  return res.status(200).json({
    environment: "preview",
    supabaseUrl: url,
    supabasePublishableKey: publishableKey
  });
}
