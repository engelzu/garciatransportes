// api/send-email.js (em Node.js para Vercel)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Only post');
  const { to, subject, html } = req.body;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: 'onboarding@resend.dev', to: [to], subject, html })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
