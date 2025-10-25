export default async function handler(req, res) {
  console.log('=== INÍCIO SEND-EMAIL ===');
  console.log('Method:', req.method);
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('Método não permitido:', req.method);
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verifica se a chave API existe
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.error('❌ RESEND_API_KEY não encontrada!');
      return res.status(500).json({ 
        error: 'Variável RESEND_API_KEY não configurada' 
      });
    }
    
    console.log('✅ RESEND_API_KEY encontrada');
    console.log('Body recebido:', req.body);

    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: to, subject, html' 
      });
    }

    console.log('Enviando email para:', to);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Garcia Transportes <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: html
      })
    });

    const data = await response.json();
    console.log('Resposta Resend:', data);

    if (!response.ok) {
      console.error('Erro Resend:', data);
      return res.status(response.status).json(data);
    }

    console.log('✅ Email enviado com sucesso!');
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('❌ Erro no servidor:', error);
    return res.status(500).json({ error: error.message });
  }
}

