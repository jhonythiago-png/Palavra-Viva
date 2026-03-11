// ============================================================
// auth.js — Palavra Viva (Devocional Diário para Adultos)
// Supabase: autenticação + progresso na nuvem + licenças
// ============================================================

// ── CONFIGURAÇÃO SUPABASE ──────────────────────────────────
// Substitua pelos seus valores do painel Supabase
// (Settings → API → Project URL e anon public key)
   var SUPABASE_URL = 'https://pdrixknquouucinditvc.supabase.co';
   var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkcml4a25xdW91dWNpbmRpdHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTgxNDYsImV4cCI6MjA4ODgzNDE0Nn0.w7eFutYxqjuG6MLPh8wHojqAn924HTCthoIBUzqtG2s';


// ── CONTATO WHATSAPP ───────────────────────────────────────
// Número gerenciado pelo painel super.html — não edite aqui
var WHATSAPP_NUMERO        = '5544984373004'; // fallback inicial
var WHATSAPP_MSG_VISITANTE = 'Olá! Tenho uma dúvida sobre o Palavra Viva.';
var WHATSAPP_MSG_CLIENTE   = 'Olá! Sou assinante do Palavra Viva e preciso de ajuda.';

// Busca configurações do banco e atualiza variáveis globais
async function carregarConfiguracoes() {
  try {
    var res = await getSB().from('configuracoes').select('chave, valor');
    if (res.data) {
      res.data.forEach(function(c) {
        if (c.chave === 'whatsapp_numero')        WHATSAPP_NUMERO        = c.valor;
        if (c.chave === 'whatsapp_msg_visitante')  WHATSAPP_MSG_VISITANTE = c.valor;
        if (c.chave === 'whatsapp_msg_cliente')    WHATSAPP_MSG_CLIENTE   = c.valor;
      });
    }
  } catch(e) { /* usa os valores padrão acima */ }
}

async function salvarConfiguracao(chave, valor) {
  var sb = getSB();
  var res = await sb.from('configuracoes').upsert({ chave: chave, valor: valor }, { onConflict: 'chave' });
  if (res.error) return { ok: false, msg: res.error.message };
  if (chave === 'whatsapp_numero')        WHATSAPP_NUMERO        = valor;
  if (chave === 'whatsapp_msg_visitante') WHATSAPP_MSG_VISITANTE = valor;
  if (chave === 'whatsapp_msg_cliente')   WHATSAPP_MSG_CLIENTE   = valor;
  return { ok: true };
}

async function getConfiguracoes() {
  var res = await getSB().from('configuracoes').select('*').order('chave');
  return res.data || [];
}

// ── TIPOS DE USUÁRIO ───────────────────────────────────────
var ROLES = { SUPER: 'super', ADMIN: 'admin', USER: 'user' };

// ── CLIENTE SUPABASE ───────────────────────────────────────
var _sb = null;
function getSB() {
  if (_sb) return _sb;
  if (typeof supabase === 'undefined') { console.error('Supabase SDK não carregado!'); return null; }
  _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _sb;
}

// ══════════════════════════════════════════════════════════
// SESSÃO
// ══════════════════════════════════════════════════════════
async function getSession() {
  var sb = getSB(); if (!sb) return null;
  var res = await sb.auth.getSession();
  return res.data.session || null;
}

async function getProfile() {
  var session = await getSession(); if (!session) return null;
  var res = await getSB().from('profiles').select('*').eq('id', session.user.id).single();
  return res.data || null;
}

async function requireAuth(redirect) {
  var session = await getSession();
  if (!session) { window.location.href = redirect || 'login.html'; return null; }
  return session;
}

async function requireAccess() {
  var session = await requireAuth(); if (!session) return false;
  var profile = await getProfile();
  if (!profile) { window.location.href = 'login.html'; return false; }
  if (profile.role === ROLES.SUPER) return true;
  var ok = await hasActiveAccess(profile);
  if (!ok) { window.location.href = 'ativar.html'; return false; }
  return true;
}

async function requireSuper() {
  var session = await requireAuth(); if (!session) return false;
  var profile = await getProfile();
  if (!profile || profile.role !== ROLES.SUPER) { window.location.href = 'index.html'; return false; }
  return true;
}

async function requireAdmin() {
  var session = await requireAuth(); if (!session) return false;
  var profile = await getProfile();
  if (!profile || (profile.role !== ROLES.ADMIN && profile.role !== ROLES.SUPER)) {
    window.location.href = 'index.html'; return false;
  }
  return true;
}

// ══════════════════════════════════════════════════════════
// LOGIN / CADASTRO / LOGOUT
// ══════════════════════════════════════════════════════════
async function signUp(email, password, nome) {
  var res = await getSB().auth.signUp({ email: email, password: password, options: { data: { nome: nome } } });
  if (res.error) return { ok: false, msg: translateError(res.error.message) };
  return { ok: true };
}

async function signIn(email, password) {
  var res = await getSB().auth.signInWithPassword({ email: email, password: password });
  if (res.error) return { ok: false, msg: translateError(res.error.message) };
  return { ok: true, session: res.data.session };
}

async function signOut() {
  await getSB().auth.signOut();
  window.location.href = 'login.html';
}

async function resetPassword(email) {
  var res = await getSB().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login.html' });
  if (res.error) return { ok: false, msg: translateError(res.error.message) };
  return { ok: true };
}

async function redirectByRole() {
  var profile = await getProfile();
  if (!profile) { window.location.href = 'ativar.html'; return; }
  if (profile.role === ROLES.SUPER) { window.location.href = 'super.html'; return; }
  if (profile.role === ROLES.ADMIN) { window.location.href = 'admin.html'; return; }
  var ok = await hasActiveAccess(profile);
  window.location.href = ok ? 'index.html' : 'ativar.html';
}

// ══════════════════════════════════════════════════════════
// LICENÇAS / ACESSO
// ══════════════════════════════════════════════════════════
async function hasActiveAccess(profile) {
  if (!profile) return false;
  if (profile.role === ROLES.SUPER) return true;
  if (!profile.licenca_id) return false;
  var res = await getSB().from('licencas').select('*').eq('id', profile.licenca_id).single();
  if (res.error || !res.data) return false;
  var lic = res.data;
  if (!lic.ativa) return false;
  if (!lic.validade_ate) return true; // vitalício
  return new Date(lic.validade_ate) > new Date();
}

async function ativarCodigo(codigo) {
  var session = await getSession();
  if (!session) return { ok: false, msg: 'Você precisa estar logado.' };
  var sb = getSB();
  var res = await sb.from('licencas').select('*').eq('codigo', codigo.toUpperCase().trim()).single();
  if (res.error || !res.data) return { ok: false, msg: 'Código inválido. Verifique e tente novamente.' };
  var lic = res.data;
  if (!lic.ativa) return { ok: false, msg: 'Este código foi desativado.' };
  if (lic.validade_ate && new Date(lic.validade_ate) < new Date()) return { ok: false, msg: 'Este código expirou. Entre em contato para renovar.' };
  if (lic.limite_familias > 0 && lic.familias_ativas >= lic.limite_familias) {
    var msg = lic.tipo === 'individual'
      ? 'Este código é individual e já está em uso por outra pessoa.'
      : 'Este código atingiu o limite de pessoas. Entre em contato.';
    return { ok: false, msg: msg };
  }
  var upd = await sb.from('profiles').update({ licenca_id: lic.id }).eq('id', session.user.id);
  if (upd.error) return { ok: false, msg: 'Erro ao ativar. Tente novamente.' };
  if (lic.limite_familias > 0) await sb.from('licencas').update({ familias_ativas: lic.familias_ativas + 1 }).eq('id', lic.id);

  // Primeiro a ativar vira admin da licença
  if (!lic.licenca_admin_id && lic.familias_ativas === 0) {
    await sb.from('licencas').update({ licenca_admin_id: session.user.id }).eq('id', lic.id);
  }

  return { ok: true, tipo: lic.tipo, nome: lic.nome };
}

// ══════════════════════════════════════════════════════════
// PROGRESSO DE LEITURA (salvo na nuvem)
// ══════════════════════════════════════════════════════════
async function getReadIds() {
  var session = await getSession(); if (!session) return [];
  var res = await getSB().from('progresso').select('story_id').eq('user_id', session.user.id).eq('lida', true);
  if (res.error || !res.data) return [];
  return res.data.map(function(r) { return r.story_id; });
}

async function toggleReadCloud(storyId) {
  var session = await getSession(); if (!session) return false;
  var sb = getSB();
  var existing = await sb.from('progresso').select('*').eq('user_id', session.user.id).eq('story_id', storyId).single();
  if (existing.data) {
    var novoEstado = !existing.data.lida;
    await sb.from('progresso').update({ lida: novoEstado, updated_at: new Date().toISOString() }).eq('id', existing.data.id);
    return novoEstado;
  } else {
    await sb.from('progresso').insert({ user_id: session.user.id, story_id: storyId, lida: true });
    return true;
  }
}

async function isReadCloud(storyId) {
  var session = await getSession(); if (!session) return false;
  var res = await getSB().from('progresso').select('lida').eq('user_id', session.user.id).eq('story_id', storyId).single();
  return res.data ? res.data.lida : false;
}

// ══════════════════════════════════════════════════════════
// PAINEL ADMIN (líder / admin de licença)
// ══════════════════════════════════════════════════════════
async function isLicencaAdmin() {
  var profile = await getProfile();
  if (!profile) return false;
  if (profile.role === ROLES.SUPER) return true;
  if (profile.role === ROLES.ADMIN) return true;
  if (!profile.licenca_id) return false;
  var lic = await getSB().from('licencas').select('licenca_admin_id').eq('id', profile.licenca_id).single();
  return lic.data && lic.data.licenca_admin_id === profile.id;
}

async function getAdminData() {
  var profile = await getProfile(); if (!profile || !profile.licenca_id) return null;
  var sb = getSB();
  var lic = await sb.from('licencas').select('*').eq('id', profile.licenca_id).single();
  var membros = await sb.from('profiles').select('id, nome, email, created_at').eq('licenca_id', profile.licenca_id);
  var ids = (membros.data || []).map(function(m) { return m.id; });
  var progPorMembro = {};
  if (ids.length > 0) {
    var prog = await sb.from('progresso').select('user_id').eq('lida', true).in('user_id', ids);
    if (prog.data) {
      prog.data.forEach(function(p) {
        progPorMembro[p.user_id] = (progPorMembro[p.user_id] || 0) + 1;
      });
    }
  }
  var membrosComProg = (membros.data || []).map(function(m) {
    return Object.assign({}, m, { lidas: progPorMembro[m.id] || 0 });
  });
  return {
    licenca:    lic.data,
    membros:    membrosComProg,
    totalLidas: Object.values(progPorMembro).reduce(function(a,b){ return a+b; }, 0),
    isAdmin:    lic.data && lic.data.licenca_admin_id === profile.id,
    myId:       profile.id,
  };
}

async function removerMembro(membroId) {
  var session = await getSession(); if (!session) return { ok: false, msg: 'Não autenticado.' };
  var meuProfile = await getProfile(); if (!meuProfile) return { ok: false, msg: 'Perfil não encontrado.' };

  var podeRemover = meuProfile.role === ROLES.SUPER || meuProfile.role === ROLES.ADMIN;
  if (!podeRemover) {
    var lic = await getSB().from('licencas').select('licenca_admin_id').eq('id', meuProfile.licenca_id).single();
    podeRemover = lic.data && lic.data.licenca_admin_id === meuProfile.id;
  }
  if (!podeRemover) return { ok: false, msg: 'Você não tem permissão para remover membros.' };

  var sb = getSB();
  var membroRes = await sb.from('profiles').select('licenca_id').eq('id', membroId).single();
  if (!membroRes.data || !membroRes.data.licenca_id) return { ok: false, msg: 'Membro não encontrado.' };
  var licencaId = membroRes.data.licenca_id;

  var upd = await sb.from('profiles').update({ licenca_id: null }).eq('id', membroId);
  if (upd.error) return { ok: false, msg: 'Erro ao remover. Tente novamente.' };

  var licRes = await sb.from('licencas').select('familias_ativas').eq('id', licencaId).single();
  if (licRes.data && licRes.data.familias_ativas > 0) {
    await sb.from('licencas').update({ familias_ativas: licRes.data.familias_ativas - 1 }).eq('id', licencaId);
  }
  return { ok: true };
}

async function convidarMembro(email) {
  var session = await getSession(); if (!session) return { ok: false, msg: 'Não autenticado.' };
  var meuProfile = await getProfile(); if (!meuProfile || !meuProfile.licenca_id) return { ok: false, msg: 'Sem licença ativa.' };

  var podeConvidar = meuProfile.role === ROLES.SUPER || meuProfile.role === ROLES.ADMIN;
  if (!podeConvidar) {
    var licCheck = await getSB().from('licencas').select('licenca_admin_id, familias_ativas, limite_familias').eq('id', meuProfile.licenca_id).single();
    podeConvidar = licCheck.data && licCheck.data.licenca_admin_id === meuProfile.id;
    if (!podeConvidar) return { ok: false, msg: 'Você não tem permissão para convidar membros.' };
    var lic = licCheck.data;
    if (lic.limite_familias > 0 && lic.familias_ativas >= lic.limite_familias) {
      return { ok: false, msg: 'Limite de membros atingido. Remova alguém antes de convidar.' };
    }
  }

  var sb = getSB();
  var token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  var expira = new Date(Date.now() + 7 * 86400000).toISOString();

  var existente = await sb.from('convites').select('id').eq('email', email.toLowerCase().trim()).eq('licenca_id', meuProfile.licenca_id).eq('usado', false);
  if (existente.data && existente.data.length > 0) {
    await sb.from('convites').update({ token: token, expira_em: expira }).eq('email', email.toLowerCase().trim()).eq('licenca_id', meuProfile.licenca_id);
  } else {
    var ins = await sb.from('convites').insert({
      email:      email.toLowerCase().trim(),
      licenca_id: meuProfile.licenca_id,
      token:      token,
      expira_em:  expira,
      usado:      false,
      criado_por: meuProfile.id,
    });
    if (ins.error) return { ok: false, msg: 'Erro ao criar convite: ' + ins.error.message };
  }

  var link = window.location.origin + '/aceitar-convite.html?token=' + token;
  return { ok: true, link: link, email: email };
}

async function aceitarConvite(token) {
  var sb = getSB();
  var res = await sb.from('convites').select('*').eq('token', token).eq('usado', false).single();
  if (res.error || !res.data) return { ok: false, msg: 'Convite inválido ou já utilizado.' };
  var convite = res.data;
  if (new Date(convite.expira_em) < new Date()) return { ok: false, msg: 'Este convite expirou. Peça um novo ao administrador.' };

  var session = await getSession();
  if (!session) {
    sessionStorage.setItem('convite_token', token);
    return { ok: false, redirect: 'login', msg: 'Faça login ou crie uma conta para aceitar o convite.' };
  }

  var licRes = await sb.from('licencas').select('*').eq('id', convite.licenca_id).single();
  if (!licRes.data || !licRes.data.ativa) return { ok: false, msg: 'Esta licença não está mais ativa.' };
  var lic = licRes.data;
  if (lic.limite_familias > 0 && lic.familias_ativas >= lic.limite_familias) {
    return { ok: false, msg: 'Limite de membros atingido. Contate o administrador.' };
  }

  var upd = await sb.from('profiles').update({ licenca_id: convite.licenca_id }).eq('id', session.user.id);
  if (upd.error) return { ok: false, msg: 'Erro ao aceitar convite.' };

  await sb.from('convites').update({ usado: true, usado_por: session.user.id, usado_em: new Date().toISOString() }).eq('token', token);
  if (lic.limite_familias > 0) {
    await sb.from('licencas').update({ familias_ativas: lic.familias_ativas + 1 }).eq('id', convite.licenca_id);
  }

  return { ok: true, licenca: lic };
}

async function aceitarPorLicenca(licencaId) {
  var sb = getSB();
  var licRes = await sb.from('licencas').select('*').eq('id', licencaId).single();
  if (licRes.error || !licRes.data) return { ok: false, msg: 'Link inválido. Verifique com seu administrador.' };
  var lic = licRes.data;

  if (!lic.ativa) return { ok: false, msg: 'Esta licença foi desativada. Entre em contato com o administrador.' };
  if (lic.validade_ate && new Date(lic.validade_ate) < new Date())
    return { ok: false, msg: 'Esta licença expirou. Entre em contato para renovar.' };
  if (lic.limite_familias > 0 && lic.familias_ativas >= lic.limite_familias)
    return { ok: false, msg: 'Todas as vagas desta licença já foram preenchidas. Fale com o administrador.' };

  var session = await getSession();
  if (!session) {
    sessionStorage.setItem('convite_licenca', licencaId);
    return { ok: false, redirect: 'login', msg: 'Faça login ou crie uma conta para entrar no plano.' };
  }

  var profileRes = await sb.from('profiles').select('licenca_id').eq('id', session.user.id).single();
  if (profileRes.data && profileRes.data.licenca_id === licencaId)
    return { ok: true, jaEra: true, licenca: lic };

  var upd = await sb.from('profiles').update({ licenca_id: licencaId }).eq('id', session.user.id);
  if (upd.error) return { ok: false, msg: 'Erro ao entrar no plano. Tente novamente.' };

  if (lic.limite_familias > 0)
    await sb.from('licencas').update({ familias_ativas: lic.familias_ativas + 1 }).eq('id', licencaId);
  if (!lic.licenca_admin_id && lic.familias_ativas === 0)
    await sb.from('licencas').update({ licenca_admin_id: session.user.id }).eq('id', licencaId);

  return { ok: true, licenca: lic };
}

// ══════════════════════════════════════════════════════════
// PAINEL SUPER ADMIN
// ══════════════════════════════════════════════════════════
async function getAllLicencas() {
  var res = await getSB().from('licencas').select('*').order('created_at', { ascending: false });
  return res.data || [];
}

async function criarLicenca(dados) {
  var codigo = dados.codigoCustom
    ? dados.codigoCustom.toUpperCase().trim()
    : gerarCodigo(dados.tipo, dados.nome);

  if (dados.codigoCustom) {
    var existe = await getSB().from('licencas').select('id').eq('codigo', codigo).single();
    if (existe.data) return { ok: false, msg: 'Este código já está em uso. Escolha outro.' };
  }

  var licenca = {
    codigo:          codigo,
    nome:            dados.nome,
    tipo:            dados.tipo,
    validade_ate:    dados.vitalicio ? null : dados.validade_ate,
    limite_familias: parseInt(dados.limite) || 0,
    familias_ativas: 0,
    ativa:           true,
    observacao:      dados.observacao || ''
  };
  var res = await getSB().from('licencas').insert(licenca).select().single();
  if (res.error) return { ok: false, msg: res.error.message };
  return { ok: true, codigo: codigo, data: res.data };
}

async function atualizarLicenca(id, campos) {
  var res = await getSB().from('licencas').update(campos).eq('id', id);
  if (res.error) return { ok: false, msg: res.error.message };
  return { ok: true };
}

async function getSuperStats() {
  var sb = getSB();
  var lic = await sb.from('licencas').select('id', { count: 'exact' }).eq('ativa', true);
  var usr = await sb.from('profiles').select('id', { count: 'exact' }).eq('role', 'user');
  var hj  = await sb.from('progresso').select('id', { count: 'exact' }).gte('updated_at', new Date(Date.now() - 86400000).toISOString());
  return { licencasAtivas: lic.count || 0, familiasAtivas: usr.count || 0, historiasHoje: hj.count || 0 };
}

// ══════════════════════════════════════════════════════════
// UTILITÁRIOS
// ══════════════════════════════════════════════════════════
function gerarCodigo(tipo, nome) {
  var prefixo = { demo: 'DEMO', comprado: 'PV', bencao: 'BENCAO', parceiro: 'PARCEIRO', individual: 'IND', familiar: 'FAM' };
  var p   = (prefixo[tipo] || 'PV');
  var sig = nome.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  var rnd = Math.random().toString(36).toUpperCase().slice(2, 7);
  return p + '-' + sig + '-' + rnd;
}

function translateError(msg) {
  var map = {
    'Invalid login credentials':    'E-mail ou senha incorretos.',
    'Email not confirmed':          'Confirme seu e-mail antes de entrar.',
    'User already registered':      'Este e-mail já está cadastrado.',
    'Password should be at least':  'A senha deve ter pelo menos 6 caracteres.',
    'Unable to validate email':     'E-mail inválido.',
    'Email rate limit exceeded':    'Muitas tentativas. Aguarde alguns minutos.'
  };
  for (var k in map) { if (msg && msg.indexOf(k) >= 0) return map[k]; }
  return 'Ocorreu um erro. Tente novamente.';
}

function formatDate(iso) {
  if (!iso) return '♾️ Vitalício';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function diasRestantes(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / 86400000);
}

function tipoLabel(tipo) {
  return {
    demo:       '🟡 Demo',
    comprado:   '🟢 Comprado',
    bencao:     '🔵 Bênção ❤️',
    parceiro:   '🟣 Parceiro',
    individual: '👤 Individual',
    familiar:   '👨‍👩‍👧 Familiar'
  }[tipo] || tipo;
}

function statusLabel(lic) {
  if (!lic.ativa) return '🔴 Desativado';
  if (lic.validade_ate && new Date(lic.validade_ate) < new Date()) return '🔴 Expirado';
  var dias = diasRestantes(lic.validade_ate);
  if (dias !== null && dias <= 30) return '🟡 Expira em ' + dias + 'd';
  return '🟢 Ativo';
}
