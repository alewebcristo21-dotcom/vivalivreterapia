// api/salvar-lead.js
// Vercel Serverless Function — corre no servidor, nunca no browser.
// Guarda o lead no Brevo e envia o email de boas-vindas, sem expor a chave da API.

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const ORIGEM = 'guia-papel-familiar';
const LIST_IDS = [3];
const PDF_URL = 'https://vivalivreterapia.com/papel-familiar.pdf';

async function salvarContato(email, attributes, listIds) {
  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
    body: JSON.stringify({ email, attributes, listIds, updateEnabled: true })
  });
  if (!res.ok && res.status !== 204) {
    const t = await res.text();
    console.error('Brevo erro (contacts):', res.status, t);
  }
  return res.ok || res.status === 204;
}

async function enviarEmailBoasVindas(nome, email) {
  const primeiroNome = nome.split(' ')[0];
  const html = `
    <div style="font-family:Georgia,serif;background:#F5EFE6;padding:32px;">
      <div style="max-width:520px;margin:0 auto;background:#FDFAF6;border-radius:20px;padding:40px 36px;">
        <p style="font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:#4F7A52;margin:0 0 18px;font-family:Georgia,serif;">A dor tem história. A cura também.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Olá, ${primeiroNome},</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Antes de descarregares o teu PDF, gostava de partilhar uma reflexão contigo.</p>
        <p style="color:#2E2820;line-height:1.8;font-size:1rem;">
          Já fizeste terapia.<br>
          Já leste livros.<br>
          Já meditaste.<br>
          Já mudaste hábitos.<br>
          Já tentaste ser mais forte.<br>
          Já perdoaste.<br>
          Já compreendeste muita coisa.
        </p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Então por que motivo uma parte de ti continua a repetir os mesmos padrões?</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">E se o problema nunca tivesse sido falta de força?</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">E se também não fosse falta de informação?</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">E se existisse uma dinâmica invisível que continua a conduzir a tua vida... mesmo sem te aperceberes?</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Há feridas que não nasceram apenas contigo.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Há lealdades familiares que ninguém escolheu conscientemente.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Há pesos que carregamos por amor.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">E enquanto a raiz permanecer escondida, a vida continua a mostrar os mesmos frutos.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Não acreditamos que as pessoas estejam estragadas.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Acreditamos que cada sintoma, cada bloqueio e cada repetição tenta contar uma história que ainda não foi ouvida.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Quando a raiz é vista, algo começa finalmente a reorganizar-se.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;font-style:italic;">Porque...<br>A dor tem história.<br>A cura também.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Se esta mensagem fez sentido para ti, convido-te a juntares-te à nossa comunidade.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">No grupo partilhamos reflexões, conteúdos exclusivos, exercícios e materiais que te ajudam a compreender melhor a tua história e a dar novos passos no teu caminho.</p>
        <p style="text-align:center;margin:30px 0;">
          <a href="https://chat.whatsapp.com/JSChHMpKZaC6FoBM5hB0qa?s=cl&p=i&ilr=4" style="background:#4F7A52;color:#fff;padding:14px 30px;border-radius:999px;text-decoration:none;font-family:sans-serif;font-size:0.9rem;">💬 Entrar no grupo</a>
        </p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Obrigado por confiares em nós.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Seja muito bem-vindo(a).</p>
        <p style="color:#6B5D52;font-size:0.85rem;margin-top:28px;">Mônica &amp; Alexandre<br>Viva Livre Terapias</p>
        <p style="text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid #E8DDD0;">
          <a href="${PDF_URL}" style="color:#4F7A52;font-size:0.82rem;text-decoration:none;">📎 Voltar a descarregar o teu guia em PDF</a>
        </p>
      </div>
    </div>`;
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
      body: JSON.stringify({
        sender: { name: 'Viva Livre Terapias', email: 'contato@vivalivreterapia.com' },
        to: [{ email, name: nome }],
        subject: 'A dor tem história. A cura também. 🌿',
        htmlContent: html
      })
    });
  } catch (e) {
    console.error('Erro ao enviar email de boas-vindas:', e);
  }
}

module.exports = async (req, res) => {
  // CORS básico — só o próprio site pode chamar isto
  res.setHeader('Access-Control-Allow-Origin', 'https://vivalivreterapia.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Método não permitido.' });
    return;
  }

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

    let ok = await salvarContato(email, { NOME: nome, ORIGEM, WHATSAPP: telefone }, LIST_IDS);
    if (!ok) {
      // Se falhar (ex: campo WHATSAPP com problema), tenta guardar na mesma sem esse campo.
      ok = await salvarContato(email, { NOME: nome, ORIGEM }, LIST_IDS);
    }

    if (!ok) {
      res.status(502).json({ ok: false, error: 'Não foi possível guardar o contacto no Brevo.' });
      return;
    }

    // Não bloqueia a resposta à espera do email — mas tentamos e registamos falhas.
    enviarEmailBoasVindas(nome, email).catch((e) => console.error('Falha no email de boas-vindas:', e));

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Erro em /api/salvar-lead:', e);
    res.status(500).json({ ok: false, error: 'Erro interno do servidor.' });
  }
};
