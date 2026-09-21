// api/interesse-workshop.js
// Guarda o interesse de alguém na próxima turma do workshop (não é uma compra),
// e envia um email de confirmação simples. Separado do salvar-lead.js dos guias
// para não misturar o email de boas-vindas dos guias com este fluxo.

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const ORIGEM = 'workshop-interesse';
const LIST_IDS = [2];

async function salvarContato(email, attributes) {
  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
    body: JSON.stringify({ email, attributes, listIds: LIST_IDS, updateEnabled: true })
  });
  if (!res.ok && res.status !== 204) {
    const t = await res.text();
    console.error('Brevo erro (contacts):', res.status, t);
  }
  return res.ok || res.status === 204;
}

async function enviarEmailConfirmacao(nome, email) {
  const primeiroNome = nome.split(' ')[0];
  const html = `
    <div style="font-family:Georgia,serif;background:#F5EFE6;padding:32px;">
      <div style="max-width:520px;margin:0 auto;background:#FDFAF6;border-radius:20px;padding:40px 36px;">
        <p style="font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:#4F7A52;margin:0 0 18px;">💛 Reencontro dos Relacionamentos</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Olá, ${primeiroNome},</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Recebemos o teu interesse no workshop <strong>Reencontro dos Relacionamentos</strong> — obrigado por quereres fazer parte!</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Estamos a organizar a próxima turma, e serás uma das primeiras pessoas a saber assim que a nova data e as inscrições abrirem.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Entretanto, fica à vontade para falar connosco se tiveres alguma dúvida.</p>
        <p style="text-align:center;margin:30px 0;">
          <a href="https://wa.me/351962250741" style="background:#4F7A52;color:#fff;padding:14px 30px;border-radius:999px;text-decoration:none;font-family:sans-serif;font-size:0.9rem;">💬 Falar no WhatsApp</a>
        </p>
        <p style="color:#6B5D52;font-size:0.85rem;margin-top:24px;">Um abraço,<br>Mônica &amp; Alexandre<br>Viva Livre Terapias</p>
      </div>
    </div>`;
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
      body: JSON.stringify({
        sender: { name: 'Viva Livre Terapias', email: 'contato@vivalivreterapia.com' },
        to: [{ email, name: nome }],
        subject: '💛 Recebemos o teu interesse — Reencontro dos Relacionamentos',
        htmlContent: html
      })
    });
  } catch (e) {
    console.error('Falha ao enviar email de confirmação:', e);
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://vivalivreterapia.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Método não permitido.' }); return; }

  if (!BREVO_API_KEY) {
    console.error('BREVO_API_KEY não está configurada nas variáveis de ambiente.');
    res.status(500).json({ ok: false, error: 'Erro de configuração do servidor.' });
    return;
  }

  try {
    const { nome, email, telefone } = req.body || {};
    if (!nome || !email || !telefone) {
      res.status(400).json({ ok: false, error: 'Preenche nome, email e WhatsApp.' });
      return;
    }

    let ok = await salvarContato(email, { NOME: nome, ORIGEM, WHATSAPP: telefone });
    if (!ok) {
      ok = await salvarContato(email, { NOME: nome, ORIGEM });
    }
    if (!ok) {
      res.status(502).json({ ok: false, error: 'Não foi possível guardar o contacto no Brevo.' });
      return;
    }

    enviarEmailConfirmacao(nome, email).catch((e) => console.error('Falha no email de confirmação:', e));

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Erro em /api/interesse-workshop:', e);
    res.status(500).json({ ok: false, error: 'Erro interno do servidor.' });
  }
};
