const API = "http://localhost:5227/api";
const API_ATIVOS = `${API}/ativos`;
const API_PERFIL = `${API}/auth/perfil`;
 
// ─── Proteção de rota ─────────────────────────────────────────────────────────
async function verificarAuth() {
  const res = await fetch(`${API}/auth/me`, { credentials: "include" });
  if (!res.ok) {
    window.location.href = "login.html";
    return null;
  }
  const user = await res.json();
  document.getElementById("usuario-nome").textContent = user.nome;
  return user;
}
 
// ─── Foto de perfil ───────────────────────────────────────────────────────────
async function trocarFoto(e) {
  const file = e.target.files[0];
  console.log('trocarFoto chamada, arquivo:', file);
  if (!file) return;

  // Preview local imediato
  const url = URL.createObjectURL(file);
  const wrap = document.getElementById('avatar-wrap');
  wrap.innerHTML = '<img src="' + url + '" alt="Foto de perfil">';
  const sidebarImg = document.getElementById('profile-pic');
  if (sidebarImg) sidebarImg.src = url;

  // Envia pro servidor
  const formData = new FormData();
  formData.append("foto", file);

  const res = await fetch(`${API}/auth/perfil/foto`, {
    method: "POST",
    credentials: "include",
    body: formData
  });

}

document.getElementById('input-foto').addEventListener('change', function(e) {
  console.log('listener change disparado, arquivos:', e.target.files);
  e.stopPropagation();
  trocarFoto(e);
});
 
function atualizarIniciais() {
  const nome = document.getElementById('campo-nome').value.trim();
  const partes = nome.split(' ').filter(Boolean);
  const iniciais = partes.length >= 2
    ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
    : (partes[0] ? partes[0][0].toUpperCase() : '?');
  const el = document.getElementById('avatar-initials');
  if (el) el.textContent = iniciais;
  const nomeEl = document.getElementById('usuario-nome');
  if (nomeEl) nomeEl.textContent = nome || 'Usuário';
}
 
function mascaraTel(el) {
  let v = el.value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 6) v = '(' + v.slice(0,2) + ') ' + v.slice(2,7) + '-' + v.slice(7);
  else if (v.length > 2) v = '(' + v.slice(0,2) + ') ' + v.slice(2);
  else if (v.length > 0) v = '(' + v;
  el.value = v;
}
 
let senhaVisivel = false;
function toggleSenha() {
  senhaVisivel = !senhaVisivel;
  document.getElementById('campo-senha').type = senhaVisivel ? 'text' : 'password';
  document.getElementById('btn-ver').textContent = senhaVisivel ? 'Ocultar' : 'Mostrar';
}
 
// ─── Perfil: carregar ─────────────────────────────────────────────────────────
async function carregarPerfil() {
  const res = await fetch(API_PERFIL, { credentials: "include" });
  if (!res.ok) return;
 
  const perfil = await res.json();
  document.getElementById("campo-nome").value  = perfil.nome     || "";
  document.getElementById("campo-email").value = perfil.email    || "";
  document.getElementById("campo-tel").value   = perfil.telefone || "";

  if (perfil.fotoUrl) {
    const urlCompleta = `http://localhost:5227${perfil.fotoUrl}`;
    document.getElementById('avatar-wrap').innerHTML =
      `<img src="${urlCompleta}" alt="Foto de perfil">`;
    const sidebarImg = document.getElementById('profile-pic');
    if (sidebarImg) sidebarImg.src = urlCompleta;
  }
 
  atualizarIniciais();
}
 
// ─── Perfil: salvar ───────────────────────────────────────────────────────────
async function salvar() {
  const nome      = document.getElementById("campo-nome").value.trim();
  const email     = document.getElementById("campo-email").value.trim();
  const telefone  = document.getElementById("campo-tel").value.trim();
  const novaSenha = document.getElementById("campo-senha").value;
 
  let senhaAtual = null;
  if (novaSenha) {
    senhaAtual = prompt("Digite sua senha atual para confirmar a alteração:");
    if (senhaAtual === null) return;
  }
 
  const btn = document.querySelector(".btn-salvar");
  btn.disabled = true;
  btn.textContent = "Salvando…";
 
  try {
    const res = await fetch(API_PERFIL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ nome, email, telefone, senhaAtual, novaSenha })
    });
 
    if (res.ok) {
      document.getElementById("usuario-nome").textContent = nome || "Usuário";
      document.getElementById("campo-senha").value = "";
      if (senhaVisivel) toggleSenha();
 
      const badge = document.getElementById("badge-sucesso");
      badge.style.display = "block";
      setTimeout(() => (badge.style.display = "none"), 3000);
    } else {
      const erros = await res.json().catch(() => ["Erro desconhecido."]);
      alert("Erro ao salvar:\n" + (Array.isArray(erros) ? erros.join("\n") : JSON.stringify(erros)));
    }
  } catch (err) {
    alert("Falha de conexão: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Salvar alterações";
  }
}
 
// ─── Logout ───────────────────────────────────────────────────────────────────
document.getElementById("btn-logout").addEventListener("click", async () => {
  await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
  window.location.href = "login.html";
});
 
// ─── Carregar e renderizar os cards ───────────────────────────────────────────
async function carregarAtivos() {
  const ativos = await fetch(API_ATIVOS, { credentials: "include" }).then(r => r.json());
  if (!ativos.length) {
    document.querySelector(".stat-card h2").textContent = "R$ 0,00";
    document.querySelectorAll(".card:not(.add-card)").forEach(c => c.remove());
    return;
  }
 
  const tickers = ativos.map(a => a.ticker).join(",");
  const respostas = await fetch(`${API_ATIVOS}/cotacoes?tickers=${tickers}`, { credentials: "include" }).then(r => r.json());
 
  const precoMap = {};
  respostas.forEach(resposta => {
    resposta?.results?.forEach(p => {
      precoMap[p.symbol] = {
        preco: p.regularMarketPrice,
        nome: p.longName || p.shortName || p.symbol
      };
    });
  });
 
  const container = document.querySelector(".cards");
  const addCard = document.querySelector(".add-card");
  container.querySelectorAll(".card:not(.add-card)").forEach(c => c.remove());
 
  let total = 0;
 
  ativos.forEach(ativo => {
    const info = precoMap[ativo.ticker] || {};
    const preco = info.preco || 0;
    const subtotal = preco * ativo.quantidade;
    total += subtotal;
 
    const card = document.createElement("div");
    card.classList.add("card");
    card.dataset.id = ativo.id;
    card.innerHTML = `
      <h3>${ativo.ticker}</h3>
      <small>${info.nome || ""}</small>
      <p>${ativo.quantidade} unid.</p>
      <strong>R$ ${preco.toFixed(2)}</strong>
      <span>Total: R$ ${subtotal.toFixed(2)}</span>
      <div class="btn-group">
        <button onclick="comprar(${ativo.id})">Comprar</button>
        <button onclick="vender(${ativo.id})">Vender</button>
      </div>
    `;
    container.insertBefore(card, addCard);
  });
 
  document.querySelector(".stat-card h2").textContent =
    `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}
 
// ─── Adicionar ativo ──────────────────────────────────────────────────────────
document.querySelector(".big-add").addEventListener("click", async () => {
  const ticker = prompt("Ticker do ativo (ex: PETR4):");
  if (!ticker) return;
 
  const qtdStr = prompt("Quantidade de unidades:");
  if (!qtdStr) return;
 
  const quantidade = parseInt(qtdStr);
  if (isNaN(quantidade)) return;
 
  await fetch(API_ATIVOS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ticker: ticker.toUpperCase().trim(), quantidade })
  });
 
  carregarAtivos();
});
 
// ─── Comprar ──────────────────────────────────────────────────────────────────
async function comprar(id) {
  const ativos = await fetch(API_ATIVOS, { credentials: "include" }).then(r => r.json());
  const ativo = ativos.find(a => a.id === id);
  ativo.quantidade += 1;
 
  await fetch(`${API_ATIVOS}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(ativo)
  });
 
  carregarAtivos();
}
 
// ─── Vender ───────────────────────────────────────────────────────────────────
async function vender(id) {
  const ativos = await fetch(API_ATIVOS, { credentials: "include" }).then(r => r.json());
  const ativo = ativos.find(a => a.id === id);
 
  if (ativo.quantidade <= 1) {
    if (!confirm("Remover ativo da carteira?")) return;
    await fetch(`${API_ATIVOS}/${id}`, { method: "DELETE", credentials: "include" });
  } else {
    ativo.quantidade -= 1;
    await fetch(`${API_ATIVOS}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(ativo)
    });
  }
 
  carregarAtivos();
}
 
// ─── Navegação ────────────────────────────────────────────────────────────────
document.querySelectorAll("nav a").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll("nav a").forEach(a => a.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    link.classList.add("active");
    document.getElementById(link.dataset.page).classList.add("active");

    if (link.dataset.page === 'rendimentos') initRendimentos();
  });
});
 
// ─── Iniciar ──────────────────────────────────────────────────────────────────
verificarAuth().then(user => {
  if (user) {
    carregarAtivos();
    carregarPerfil();
  }
});