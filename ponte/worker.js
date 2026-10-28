// Ponte entre o app de Finanças e a Pluggy (Open Finance) — SOMENTE LEITURA.
// Roda como Cloudflare Worker. As chaves da Pluggy ficam aqui, guardadas como "Secrets", nunca no app.
//
// Variáveis (Cloudflare → Worker → Settings → Variables and Secrets):
//   PLUGGY_CLIENT_ID      (Secret)  Client ID da aplicação na Pluggy
//   PLUGGY_CLIENT_SECRET  (Secret)  Client Secret da aplicação na Pluggy
//   PLUGGY_ITEM_ID        (Secret)  Item ID da conexão MeuPluggy
//   APP_TOKEN             (Secret)  senha da ponte (a mesma que vai em Config do app)
//   ALLOWED_ORIGINS       (Text)    sites que podem chamar a ponte, separados por vírgula
//                                   ex.: https://kethellynsoares.github.io
//
// Uso: GET /sync  com o cabeçalho  Authorization: Bearer <APP_TOKEN>

const API = 'https://api.pluggy.ai';
const DIAS_HISTORICO = 400;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const permitidas = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
    const origemOk = permitidas.includes(origin);
    const cors = origemOk ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    } : {};
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
      status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });

    if (req.method === 'OPTIONS') return new Response(null, { status: origemOk ? 204 : 403, headers: cors });
    if (!origemOk) return json({ erro: 'Site não autorizado a usar a ponte.' }, 403);

    const url = new URL(req.url);
    if (req.method !== 'GET' || url.pathname !== '/sync') return json({ erro: 'Endereço não encontrado.' }, 404);

    for (const k of ['PLUGGY_CLIENT_ID', 'PLUGGY_CLIENT_SECRET', 'PLUGGY_ITEM_ID', 'APP_TOKEN']) {
      if (!env[k]) return json({ erro: `A ponte está sem a variável ${k}.` }, 500);
    }
    if (!(await mesmaSenha(req.headers.get('Authorization') || '', 'Bearer ' + env.APP_TOKEN))) {
      await new Promise(r => setTimeout(r, 800));
      return json({ erro: 'Senha da ponte incorreta (Config do app).' }, 401);
    }

    try {
      return json(await coletar(env));
    } catch (e) {
      return json({ erro: 'Falha ao consultar o banco: ' + (e && e.message ? e.message : e) }, 502);
    }
  },
};

// Compara a senha sem vazar tempo (hash + comparação de tempo constante)
async function mesmaSenha(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  return crypto.subtle.timingSafeEqual(ha, hb);
}

async function pluggy(caminho, apiKey, init = {}) {
  const r = await fetch(API + caminho, {
    ...init,
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-KEY': apiKey } : {}), ...(init.headers || {}) },
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${caminho.split('?')[0]} respondeu ${r.status}: ${txt.slice(0, 200)}`);
  return txt ? JSON.parse(txt) : {};
}

// Data no horário de Brasília (UTC-3), formato AAAA-MM-DD
function dataBR(iso) {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (isNaN(t)) return String(iso).slice(0, 10);
  return new Date(t - 3 * 3600e3).toISOString().slice(0, 10);
}

async function coletar(env) {
  const { apiKey } = await pluggy('/auth', null, {
    method: 'POST',
    body: JSON.stringify({ clientId: env.PLUGGY_CLIENT_ID, clientSecret: env.PLUGGY_CLIENT_SECRET }),
  });
  if (!apiKey) throw new Error('a Pluggy não devolveu a chave de acesso');

  const item = await pluggy(`/items/${encodeURIComponent(env.PLUGGY_ITEM_ID)}`, apiKey);
  const contas = (await pluggy(`/accounts?itemId=${encodeURIComponent(env.PLUGGY_ITEM_ID)}`, apiKey)).results || [];
  const cartoes = contas.filter(a => a.type === 'CREDIT');
  const desde = new Date(Date.now() - DIAS_HISTORICO * 864e5).toISOString().slice(0, 10);

  const faturas = [], transacoes = [];
  for (const conta of cartoes) {
    for (let page = 1; page <= 20; page++) {
      const r = await pluggy(`/bills?accountId=${conta.id}&page=${page}&pageSize=500`, apiKey);
      for (const b of r.results || []) {
        faturas.push({ id: b.id, venc: dataBR(b.dueDate), fechamento: dataBR(b.billClosingDate), total: Math.round(b.totalAmount * 100) / 100 });
      }
      if (!r.totalPages || page >= r.totalPages) break;
    }
    let caminho = `/v2/transactions?accountId=${conta.id}&dateFrom=${desde}`;
    for (let page = 1; caminho && page <= 50; page++) {
      const r = await pluggy(caminho, apiKey);
      for (const t of r.results || []) {
        const m = t.creditCardMetadata || {};
        transacoes.push({
          id: t.id,
          data: dataBR(t.date),
          compra: dataBR(m.purchaseDate),
          desc: t.description || '',
          valor: Math.abs(+t.amount || 0),
          tipo: t.type,            // DEBIT = compra/tarifa, CREDIT = pagamento/estorno
          status: t.status,        // PENDING = fatura aberta
          cartao: m.cardNumber || '',
          parcela: m.installmentNumber || 0,
          totalParc: m.totalInstallments || 0,
          billId: m.billId || '',
          previsao: m.billForecastDate || '', // mês do vencimento previsto (AAAA-MM)
        });
      }
      const prox = r.next ? String(r.next) : '';
      if (!prox) caminho = null;
      else if (prox.startsWith('http')) caminho = new URL(prox).pathname + new URL(prox).search;
      else if (prox.startsWith('/')) caminho = prox;
      else if (prox.startsWith('?')) caminho = '/v2/transactions' + prox;
      else caminho = `/v2/transactions?accountId=${conta.id}&dateFrom=${desde}&after=${encodeURIComponent(prox)}`;
    }
  }

  return {
    status: item.status,
    atualizadoEm: item.lastUpdatedAt || '',
    proximaAtualizacao: item.nextAutoSyncAt || '',
    consentimentoAte: item.consentExpiresAt || '',
    cartoes: cartoes.map(c => ({ nome: c.name, final: c.number })),
    faturas,
    transacoes,
  };
}
