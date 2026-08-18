// supabase/functions/membros-admin/index.ts
// Parte 4 da segurança: todas as operações do painel admin sobre a tabela membros.
// Requer sempre um token de admin válido (emitido pela função "auth").

const ALLOWED_ORIGINS = ["https://vivalivreterapia.com", "https://www.vivalivreterapia.com"];
const encoder = new TextEncoder();

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-auth-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function verifyToken(token: string, secret: string): Promise<any | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadStr, sig] = parts;
  const expected = await hmac(secret, payloadStr);
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(atob(payloadStr.replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

async function hashSenha(senha: string): Promise<string> {
  const data = encoder.encode(senha + "vivalivresalt2025");
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function gerarSenhaAleatoria() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function sb(path: string, method: string, serviceKey: string, url: string, body?: unknown) {
  const res = await fetch(url + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${path} -> ${res.status}`);
  return res.status === 204 ? null : res.json();
}

async function enviarEmailCredenciais(nome: string, email: string, senha: string, expiracaoISO: string | null, brevoKey: string): Promise<boolean> {
  const primeiroNome = nome.split(" ")[0] || nome;
  const expiracaoHtml = expiracaoISO
    ? `<p style="font-size:0.85rem;color:#6B5D52;">O teu acesso é válido até <strong>${new Date(expiracaoISO).toLocaleDateString("pt-PT")}</strong>.</p>`
    : "";
  const html = `
    <div style="font-family:Georgia,serif;background:#F5EFE6;padding:32px;">
      <div style="max-width:520px;margin:0 auto;background:#FDFAF6;border-radius:20px;padding:40px 36px;">
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Olá, ${primeiroNome},</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Antes de mais, obrigado pela tua confiança.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Em nome da Viva Livre Terapias, queremos dar-te as boas-vindas.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">A decisão que acabaste de tomar pode ser o início de uma nova forma de olhar para a tua história.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Lembra-te de uma coisa:</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;font-style:italic;">A dor tem história. A cura também.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">E, a partir de hoje, não precisas de caminhar sozinho(a).</p>

        <p style="font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:#4F7A52;margin:28px 0 12px;">🔑 Os teus dados de acesso</p>
        <div style="background:#F5EFE6;border-radius:12px;padding:18px 22px;margin:0 0 8px;">
          <p style="margin:0 0 8px;color:#2E2820;"><strong>Área de Membros:</strong> <a href="https://vivalivreterapia.com/mentora" style="color:#4F7A52;">vivalivreterapia.com/mentora</a></p>
          <p style="margin:0 0 8px;color:#2E2820;"><strong>Utilizador (email):</strong> ${email}</p>
          <p style="margin:0;color:#2E2820;"><strong>Palavra-passe:</strong> ${senha}</p>
        </div>
        <p style="font-size:0.8rem;color:#6B5D52;font-style:italic;">«Recomendamos que guardes estes dados num local seguro.»</p>
        ${expiracaoHtml}

        <p style="font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:#4F7A52;margin:28px 0 12px;">O que vais encontrar</p>
        <p style="color:#2E2820;line-height:1.8;font-size:0.95rem;">
          ✔️ Conteúdos exclusivos.<br>
          ✔️ Cursos e materiais para aprofundares o teu conhecimento.<br>
          ✔️ Exercícios práticos para aplicares no teu dia a dia.<br>
          ✔️ Atualizações e novos conteúdos à medida que forem disponibilizados.
        </p>

        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Não sintas que tens de fazer tudo de uma vez.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Percorre cada módulo ao teu ritmo.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">O importante não é a velocidade.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">É permitir que cada passo encontre espaço dentro da tua história.</p>

        <p style="text-align:center;margin:30px 0;">
          <a href="https://vivalivreterapia.com/mentora" style="background:#4F7A52;color:#fff;padding:14px 30px;border-radius:999px;text-decoration:none;font-family:sans-serif;font-size:0.9rem;">Aceder à Área de Membros</a>
        </p>

        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Se tiveres qualquer dificuldade em aceder à plataforma ou alguma dúvida, responde a este email. Teremos todo o gosto em ajudar.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Mais uma vez, seja muito bem-vindo(a) à Viva Livre Terapias.</p>
        <p style="color:#2E2820;line-height:1.7;font-size:1rem;">Que este seja apenas o início de uma transformação profunda e duradoura.</p>
        <p style="color:#6B5D52;font-size:0.85rem;margin-top:24px;">Um abraço,<br>Mônica &amp; Alexandre<br>Viva Livre Terapias</p>
      </div>
    </div>`;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": brevoKey },
      body: JSON.stringify({
        sender: { name: "Viva Livre Terapias", email: "contato@vivalivreterapia.com" },
        to: [{ email, name: nome }],
        subject: "✾ Bem-vindo(a) à Viva Livre Terapias — o teu acesso está pronto",
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("Brevo erro (smtp/email):", res.status, t);
    }
    return res.ok;
  } catch (e) {
    console.error("Falha ao enviar email de credenciais:", e);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SESSION_SECRET = Deno.env.get("SESSION_SECRET")!;
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

    const token = req.headers.get("x-auth-token") || "";
    const payload = await verifyToken(token, SESSION_SECRET);
    if (!payload || payload.sub !== "admin") return json({ ok: false, error: "Não autenticado como admin." }, 401);

    const body = await req.json();
    const { action, id } = body;

    if (action === "list") {
      const rows = await sb("/rest/v1/membros?select=*&order=criado_em.desc", "GET", SERVICE_KEY, SUPABASE_URL);
      return json({ ok: true, membros: rows });
    }

    if (action === "create") {
      const { nome, email, senha, expiracao } = body;
      if (!nome || !email || !senha) return json({ ok: false, error: "Preenche nome, email e senha." });
      const hash = await hashSenha(senha);
      const expiracaoISO = expiracao ? new Date(expiracao).toISOString() : null;
      const insertBody: Record<string, unknown> = { nome, email, senha_hash: hash, ativo: true };
      if (expiracaoISO) insertBody.data_expiracao = expiracaoISO;
      try {
        await sb("/rest/v1/membros", "POST", SERVICE_KEY, SUPABASE_URL, insertBody);
      } catch (e) {
        return json({ ok: false, error: "Erro ao criar membro. Email já existe?" });
      }
      let emailOk: boolean | null = null;
      if (BREVO_API_KEY) {
        emailOk = await enviarEmailCredenciais(nome, email, senha, expiracaoISO, BREVO_API_KEY);
      }
      return json({ ok: true, senha, emailOk });
    }

    if (action === "toggle") {
      const { ativoAtual } = body;
      await sb(`/rest/v1/membros?id=eq.${id}`, "PATCH", SERVICE_KEY, SUPABASE_URL, { ativo: !ativoAtual });
      return json({ ok: true });
    }

    if (action === "renovar") {
      const { novaData } = body;
      await sb(`/rest/v1/membros?id=eq.${id}`, "PATCH", SERVICE_KEY, SUPABASE_URL, {
        data_expiracao: new Date(novaData).toISOString(),
      });
      return json({ ok: true });
    }

    if (action === "remover-expiracao") {
      await sb(`/rest/v1/membros?id=eq.${id}`, "PATCH", SERVICE_KEY, SUPABASE_URL, { data_expiracao: null });
      return json({ ok: true });
    }

    if (action === "reenviar") {
      const novaSenha = gerarSenhaAleatoria();
      const hash = await hashSenha(novaSenha);
      const membroAtual = await sb(`/rest/v1/membros?id=eq.${id}&select=nome,email,data_expiracao`, "GET", SERVICE_KEY, SUPABASE_URL);
      await sb(`/rest/v1/membros?id=eq.${id}`, "PATCH", SERVICE_KEY, SUPABASE_URL, { senha_hash: hash });
      const nome = membroAtual?.[0]?.nome || "Membro";
      const email = membroAtual?.[0]?.email;
      const expiracaoISO = membroAtual?.[0]?.data_expiracao || null;
      let emailOk: boolean | null = null;
      if (BREVO_API_KEY && email) {
        emailOk = await enviarEmailCredenciais(nome, email, novaSenha, expiracaoISO, BREVO_API_KEY);
      }
      return json({ ok: true, novaSenha, data_expiracao: expiracaoISO, emailOk });
    }

    return json({ ok: false, error: "Ação desconhecida." }, 400);
  } catch (e) {
    return json({ ok: false, error: "Erro interno.", detail: String(e) }, 500);
  }
});
