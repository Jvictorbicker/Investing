const API_BASE = "http://localhost:5227/api/ativos";

// ─── Carregar e renderizar os cards ───────────────────────────────────────────
async function carregarAtivos() {
    const ativos = await fetch(API_BASE).then(r => r.json());

    const tickers = ativos.map(a => a.ticker).join(",");
    const precos = await fetch(`http://localhost:5000/api/ativos/cotacoes?tickers=${tickers}`)
        .then(r => r.json());

    const respostas = await fetch(`http://localhost:5000/api/ativos/cotacoes?tickers=${tickers}`)
        .then(r => r.json());

    const precoMap = {};
    respostas.forEach(resposta => {
        resposta.results?.forEach(p => {
            precoMap[p.symbol] = {
                preco: p.regularMarketPrice,
                nome: p.longName || p.shortName || p.symbol
            };
        });
    });

    const container = document.querySelector(".cards");
    const addCard = document.querySelector(".add-card");

    // Limpa cards antigos (exceto o +)
    container.querySelectorAll(".card:not(.add-card)").forEach(c => c.remove());

    // Atualiza total
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

    // Atualiza total geral
    document.querySelector(".stat-card h2").textContent =
        `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

// ─── Adicionar ativo ──────────────────────────────────────────────────────────
document.querySelector(".big-add").addEventListener("click", async () => {
    const ticker = prompt("Ticker do ativo (ex: PETR4):");
    if (!ticker) return; // ← sai se cancelar

    const qtdStr = prompt("Quantidade de unidades:");
    if (!qtdStr) return; // ← sai se cancelar

    const quantidade = parseInt(qtdStr);
    if (isNaN(quantidade)) return;

    await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: ticker.toUpperCase().trim(), quantidade })
    });

    carregarAtivos();
});

// ─── Comprar (adiciona 1 unidade) ─────────────────────────────────────────────
async function comprar(id) {
    const ativos = await fetch(API_BASE).then(r => r.json());
    const ativo = ativos.find(a => a.id === id);
    ativo.quantidade += 1;

    await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ativo)
    });

    carregarAtivos();
}

// ─── Vender (remove 1 unidade ou deleta) ─────────────────────────────────────
async function vender(id) {
    const ativos = await fetch(API_BASE).then(r => r.json());
    const ativo = ativos.find(a => a.id === id);

    if (ativo.quantidade <= 1) {
        if (!confirm("Remover ativo da carteira?")) return;
        await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
    } else {
        ativo.quantidade -= 1;
        await fetch(`${API_BASE}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ativo)
        });
    }

    carregarAtivos();
}

// ─── Navegação entre páginas ──────────────────────────────────────────────────
document.querySelectorAll("nav a").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll("nav a").forEach(a => a.classList.remove("active"));
        document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
        link.classList.add("active");
        document.getElementById(link.dataset.page).classList.add("active");
    });
});

// ─── Iniciar ──────────────────────────────────────────────────────────────────
carregarAtivos();