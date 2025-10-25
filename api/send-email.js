export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'RESEND_API_KEY não configurada' });
    }

    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Campos obrigatórios: to, subject, html' });
    }

    console.log('Enviando email para:', to);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'luciano.emobile.consultoria@gmail.com',
        to: [to],
        subject: subject,
        html: html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro Resend:', data);
      return res.status(response.status).json(data);
    }

    console.log('✅ Email enviado!');
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: error.message });
  }
}
