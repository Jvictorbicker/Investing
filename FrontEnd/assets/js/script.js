const API = "http://localhost:5227/api";
const API_ATIVOS = `${API}/ativos`;

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
  });
});

// ─── Iniciar ──────────────────────────────────────────────────────────────────
verificarAuth().then(user => { if (user) carregarAtivos(); });