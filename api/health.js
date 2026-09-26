export default function handler(req, res) {
  const miloConfigured = Boolean(
    process.env.GROQ_API_KEY || process.env.NINEROUTER_API_KEY
  );

  res.status(200).json({
    ok: true,
    service: 'littlemindsuniverse',
    time: new Date().toISOString(),
    miloConfigured,
    miloProvider: miloConfigured ? 'groq' : null,
    connectConfigured: Boolean(
      process.env.SUPABASE_URL &&
      (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
    ),
    payfastConfigured: Boolean(
      process.env.PAYFAST_MERCHANT_ID &&
      process.env.PAYFAST_MERCHANT_KEY
    )
  });
}
