const API = `http://${window.location.hostname || "localhost"}:5227/api`;
const API_PERFIL = `${API}/auth/perfil`;

// ─── Estado da carteira selecionada ────────────────────────────────────────────
let carteiraAtual = null; // { id, nome }

// ─── Navegação entre páginas ───────────────────────────────────────────────────
function mostrarPagina(id) {
  document.querySelectorAll("nav a").forEach(a => a.classList.remove("active"));
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

  document.getElementById(id).classList.add("active");

  const navLink = document.querySelector(`nav a[data-page="${id}"]`);
  if (navLink) navLink.classList.add("active");
}

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
  if (!file) return;

  const url = URL.createObjectURL(file);
  const wrap = document.getElementById('avatar-wrap');
  wrap.innerHTML = '<img src="' + url + '" alt="Foto de perfil">';
  const sidebarImg = document.getElementById('profile-pic');
  if (sidebarImg) sidebarImg.src = url;

  const formData = new FormData();
  formData.append("foto", file);

  await fetch(`${API}/auth/perfil/foto`, {
    method: "POST",
    credentials: "include",
    body: formData
  });
}

document.getElementById('input-foto').addEventListener('change', function (e) {
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
  if (v.length > 6) v = '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
  else if (v.length > 2) v = '(' + v.slice(0, 2) + ') ' + v.slice(2);
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
  document.getElementById("campo-nome").value = perfil.nome || "";
  document.getElementById("campo-email").value = perfil.email || "";
  document.getElementById("campo-tel").value = perfil.telefone || "";

  if (perfil.fotoUrl) {
    const urlCompleta = `${API.replace("/api", "")}${perfil.fotoUrl}`;
    document.getElementById('avatar-wrap').innerHTML =
      `<img src="${urlCompleta}" alt="Foto de perfil">`;
    const sidebarImg = document.getElementById('profile-pic');
    if (sidebarImg) sidebarImg.src = urlCompleta;
  }

  atualizarIniciais();
}

// ─── Perfil: salvar ───────────────────────────────────────────────────────────
async function salvar() {
  const nome = document.getElementById("campo-nome").value.trim();
  const email = document.getElementById("campo-email").value.trim();
  const telefone = document.getElementById("campo-tel").value.trim();
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

// ═══════════════════════════════════════════════════════════════════════════
// CARTEIRAS
// ═══════════════════════════════════════════════════════════════════════════

async function carregarCarteiras() {

  const res = await fetch(`${API}/carteiras`, {
    credentials: "include"
  });

  if (!res.ok) {
    console.error("Erro ao carregar carteiras.");
    return;
  }

  const carteiras = await res.json();

  const grid = document.getElementById("carteirasGrid");

  // Remove os cards antigos das carteiras
  grid.querySelectorAll(".carteira-card").forEach(card => {
    card.remove();
  });

  // O botão "Nova carteira" continua sempre na frente
  const addCard = document.getElementById("btn-nova-carteira");

  // Se não tiver nenhuma carteira,
  // não cria nenhum card adicional.
  if (!carteiras.length) {
    return;
  }

  // ============================================================
  // CRIA OS CARDS
  // ============================================================

  for (const c of carteiras) {

    let valorTotal = 0;

    try {

      const ativosRes = await fetch(
        `${API}/carteiras/${c.id}/ativos`,
        {
          credentials: "include"
        }
      );

      if (ativosRes.ok) {

        const ativos = await ativosRes.json();

        if (ativos.length > 0) {

          const tickers = ativos
            .map(a => a.ticker)
            .join(",");

          const cotacoesRes = await fetch(
            `${API}/ativos/cotacoes?tickers=${tickers}`,
            {
              credentials: "include"
            }
          );

          if (cotacoesRes.ok) {

            const respostas = await cotacoesRes.json();

            const precoMap = {};

            respostas.forEach(resposta => {

              resposta?.results?.forEach(p => {

                precoMap[p.symbol] =
                  p.regularMarketPrice || 0;

              });

            });

            ativos.forEach(ativo => {

              const precoAtual =
                precoMap[ativo.ticker] || 0;

              valorTotal +=
                precoAtual * ativo.quantidade;

            });
          }
        }
      }

    } catch (erro) {

      console.error(
        `Erro ao calcular carteira ${c.id}:`,
        erro
      );

    }

    // ============================================================
    // CARD
    // ============================================================

    const card = document.createElement("div");

    card.className = "card carteira-card";

    card.innerHTML = `

      <div class="carteira-card-top">

        <h3>
          ${c.nome}
        </h3>

        <div class="carteira-acoes">

          <button
            type="button"
            class="btn-editar-carteira"
            title="Alterar nome"
          >
            ✏️
          </button>

          <button
            type="button"
            class="btn-excluir-carteira"
            title="Excluir carteira"
          >
            🗑️
          </button>

        </div>

      </div>

      <div class="carteira-info">

        <span>
          ${c.qtdAtivos}
          ${c.qtdAtivos === 1 ? "ativo" : "ativos"}
        </span>

        <div class="carteira-valor">

          <small>
            Valor total
          </small>

          <strong>
            ${valorTotal.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            })}
          </strong>

        </div>

      </div>
    `;

    // ============================================================
    // ABRIR CARTEIRA
    // ============================================================

    card.addEventListener("click", () => {

      abrirCarteira(
        c.id,
        c.nome
      );

    });

    // ============================================================
    // EDITAR
    // ============================================================

    const btnEditar =
      card.querySelector(".btn-editar-carteira");

    btnEditar.addEventListener("click", async (event) => {

      event.stopPropagation();

      const novoNome = prompt(
        "Digite o novo nome da carteira:",
        c.nome
      );

      if (
        novoNome === null ||
        !novoNome.trim()
      ) {
        return;
      }

      const nome = novoNome.trim();

      if (nome === c.nome) {
        return;
      }

      const resposta = await fetch(
        `${API}/carteiras/${c.id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json"
          },

          credentials: "include",

          body: JSON.stringify({
            nome: nome
          })
        }
      );

      if (!resposta.ok) {

        const erro =
          await resposta.text();

        alert(
          erro ||
          "Não foi possível alterar o nome da carteira."
        );

        return;
      }

      // Atualiza a lista
      carregarCarteiras();

    });

    // ============================================================
    // EXCLUIR
    // ============================================================

    const btnExcluir =
      card.querySelector(".btn-excluir-carteira");

    btnExcluir.addEventListener("click", async (event) => {

      event.stopPropagation();

      const confirmar = confirm(
        `Deseja realmente excluir a carteira "${c.nome}"?\n\n` +
        `Todos os ativos dessa carteira serão removidos.`
      );

      if (!confirmar) {
        return;
      }

      const resposta = await fetch(
        `${API}/carteiras/${c.id}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );

      if (!resposta.ok) {

        const erro =
          await resposta.text();

        alert(
          erro ||
          "Não foi possível excluir a carteira."
        );

        return;
      }

      // Se era a carteira aberta, limpa a seleção
      if (
        carteiraAtual &&
        carteiraAtual.id === c.id
      ) {
        carteiraAtual = null;
      }

      // Atualiza a tela
      mostrarPagina("carteiras");

      carregarCarteiras();

    });

    // ============================================================
    // COLOCA DEPOIS DO BOTÃO NOVA CARTEIRA
    // ============================================================

    grid.appendChild(card);
  }
}

document.getElementById("btn-nova-carteira").addEventListener("click", async () => {
  const nome = prompt("Nome da nova carteira (ex: Renda Variável):");
  if (!nome || !nome.trim()) return;

  const res = await fetch(`${API}/carteiras`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ nome: nome.trim() })
  });

  if (!res.ok) {
    alert("Não foi possível criar a carteira.");
    return;
  }

  carregarCarteiras();
});

function abrirCarteira(id, nome) {
  carteiraAtual = { id, nome };
  document.getElementById("carteira-nome-titulo").textContent = nome;
  mostrarPagina("carteira");
  carregarAtivos();
}

document.getElementById("btn-voltar-carteiras").addEventListener("click", () => {
  carteiraAtual = null;
  mostrarPagina("carteiras");
  carregarCarteiras();
});

document.getElementById("btn-ver-rendimentos").addEventListener("click", () => {
  mostrarPagina("rendimentos");
  initRendimentos();
});

document.getElementById("btn-voltar-rendimentos").addEventListener("click", () => {
  mostrarPagina("carteira");
});

// ═══════════════════════════════════════════════════════════════════════════
// ATIVOS (sempre dentro da carteira selecionada — carteiraAtual)
// ═══════════════════════════════════════════════════════════════════════════

async function carregarAtivos() {
  if (!carteiraAtual) return;

  const urlBase = `${API}/carteiras/${carteiraAtual.id}/ativos`;
  const ativos = await fetch(urlBase, { credentials: "include" }).then(r => r.json());

  if (!ativos.length) {
    document.querySelector("#carteira .stat-card h2").textContent = "R$ 0,00";
    document.querySelectorAll("#carteira .card:not(.add-card)").forEach(c => c.remove());
    return;
  }

  const tickers = ativos.map(a => a.ticker).join(",");
  const respostas = await fetch(`${API}/ativos/cotacoes?tickers=${tickers}`, { credentials: "include" }).then(r => r.json());

  const precoMap = {};
  respostas.forEach(resposta => {
    resposta?.results?.forEach(p => {
      precoMap[p.symbol] = {
        preco: p.regularMarketPrice,
        nome: p.longName || p.shortName || p.symbol
      };
    });
  });

  const container = document.querySelector("#carteira .cards");
  const addCard = document.querySelector("#carteira .add-card");
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

  document.querySelector("#carteira .stat-card h2").textContent =
    `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

// ─── Adicionar ativo (dentro da carteira aberta) ───────────────────────────────
document.getElementById("btn-add-ativo").addEventListener("click", async () => {
  if (!carteiraAtual) return;

  const ticker = prompt("Ticker do ativo (ex: PETR4):");
  if (!ticker) return;

  const qtdStr = prompt("Quantidade de unidades:");
  if (!qtdStr) return;

  const quantidade = parseInt(qtdStr);
  if (isNaN(quantidade)) return;

  await fetch(`${API}/carteiras/${carteiraAtual.id}/ativos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ticker: ticker.toUpperCase().trim(), quantidade })
  });

  carregarAtivos();
});

// ─── Comprar ──────────────────────────────────────────────────────────────────
async function comprar(id) {
  const ativos = await fetch(`${API}/carteiras/${carteiraAtual.id}/ativos`, { credentials: "include" }).then(r => r.json());
  const ativo = ativos.find(a => a.id === id);
  ativo.quantidade += 1;

  await fetch(`${API}/ativos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(ativo)
  });

  carregarAtivos();
}

// ─── Vender ───────────────────────────────────────────────────────────────────
async function vender(id) {
  const ativos = await fetch(`${API}/carteiras/${carteiraAtual.id}/ativos`, { credentials: "include" }).then(r => r.json());
  const ativo = ativos.find(a => a.id === id);

  if (ativo.quantidade <= 1) {
    if (!confirm("Remover ativo da carteira?")) return;
    await fetch(`${API}/ativos/${id}`, { method: "DELETE", credentials: "include" });
  } else {
    ativo.quantidade -= 1;
    await fetch(`${API}/ativos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(ativo)
    });
  }

  carregarAtivos();
}

// ─── Navegação (Minhas Carteiras / Minha conta) ────────────────────────────────
document.querySelectorAll("nav a").forEach(link => {
  link.addEventListener("click", () => {
    mostrarPagina(link.dataset.page);
    if (link.dataset.page === "carteiras") carregarCarteiras();
  });
});

// ─── Iniciar ──────────────────────────────────────────────────────────────────
verificarAuth().then(user => {
  if (user) {
    carregarCarteiras();
    carregarPerfil();
  }
});
