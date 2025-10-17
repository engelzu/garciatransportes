// Importe o Resend
import { Resend } from 'resend';

// Inicialize o Resend com a sua chave de API
// A chave é mantida aqui no servidor, de forma segura.
const resend = new Resend('re_Qp3oqRvJ_5QKw8pW1zv9VF8kd7pTt6m8V');

// Esta é a função que será executada quando o frontend chamar /api/send-email
export default async function handler(req, res) {
  // Permite apenas requisições do tipo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Pega os dados da corrida enviados do arquivo admin.html
    const ride = req.body;

    // Monta o conteúdo do e-mail
    const subject = `Nova Solicitação de Corrida: ${ride.userName}`;
    const htmlBody = `
      <h1>Nova Solicitação de Corrida Recebida</h1>
      <p>Uma nova solicitação de corrida foi registrada no sistema.</p>
      <h2>Detalhes:</h2>
      <ul>
        <li><strong>Usuário:</strong> ${ride.userName || 'Não informado'}</li>
        <li><strong>Empresa:</strong> ${ride.userCompany || 'N/A'}</li>
        <li><strong>Origem:</strong> ${ride.origin_address || 'Não informada'}</li>
        <li><strong>Destino:</strong> ${ride.destination || 'Não informado'}</li>
        <li><strong>Observação:</strong> ${ride.observation || 'Nenhuma'}</li>
        <li><strong>Tipo:</strong> ${ride.request_type === 'scheduled' ? `Agendada para ${new Date(ride.scheduled_datetime).toLocaleString('pt-BR')}` : 'Imediata'}</li>
        <li><strong>Horário da Solicitação:</strong> ${new Date(ride.requestTime).toLocaleString('pt-BR')}</li>
      </ul>
      <p>Por favor, acesse o painel de administrador para designar um motorista.</p>
    `;

    // Envia o e-mail
    const { data, error } = await resend.emails.send({
      from: 'GARCIA TRANSPORTES <onboarding@resend.dev>', // Este é o remetente padrão para testes e funciona bem.
      to: ['engelmobile2020@gmail.com'], // E-mail de destino
      subject: subject,
      html: htmlBody,
    });

    // Se houver erro no envio, retorna o erro para o log do servidor
    if (error) {
      console.error('Erro na API Resend:', error);
      return res.status(400).json({ error: 'Falha ao enviar e-mail' });
    }

    // Se o envio for bem-sucedido, retorna uma mensagem de sucesso
    return res.status(200).json({ message: 'E-mail enviado com sucesso' });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return res.status(500).json({ error: 'Erro Interno do Servidor' });
  }
}