export default function handler(req, res) {
  const miloConfigured = Boolean(process.env.NINEROUTER_API_KEY);

  res.status(200).json({
    ok: true,
    service: 'littlemindsuniverse',
    time: new Date().toISOString(),
    miloConfigured,
    miloProvider: miloConfigured ? '9router' : null,
    whatsappConfigured: Boolean(
      process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID
    ),
    payfastConfigured: Boolean(
      process.env.PAYFAST_MERCHANT_ID &&
      process.env.PAYFAST_MERCHANT_KEY
    )
  });
}
