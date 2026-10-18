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

// ═══════════════════════════════════════════════════════════════════════════
// MODAL GENÉRICO (substitui os prompt())
// Monta um card usando as classes que já existem no style.css
//
// abrirModal({
//   titulo, descricao, textoConfirmar,
//   campos: [{ name, label, tipo, placeholder, valor, min, autocomplete }],
//   onConfirmar: async (valores) => { ... }
// })
//
// onConfirmar pode retornar um texto de erro (fica no card, que continua
// aberto) ou nada/null (o card fecha).
// ═══════════════════════════════════════════════════════════════════════════
function abrirModal({
  titulo,
  descricao = "",
  campos = [],
  textoConfirmar = "Confirmar",
  onConfirmar
}) {

  const overlay = document.createElement("div");
  overlay.className = "modal";
  overlay.style.display = "flex";

  const content = document.createElement("div");
  content.className = "modal-content";

  const btnX = document.createElement("button");
  btnX.type = "button";
  btnX.className = "modal-close";
  btnX.textContent = "×";

  const h2 = document.createElement("h2");
  h2.textContent = titulo;

  content.append(btnX, h2);

  if (descricao) {
    const p = document.createElement("p");
    p.textContent = descricao;
    content.appendChild(p);
  }

  // ── Campos ──
  const inputs = [];

  campos.forEach((campo, i) => {
    const id = `modal-campo-${i}`;

    const grupo = document.createElement("div");
    grupo.className = "form-group";

    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = campo.label;

    const input = document.createElement("input");
    input.id = id;
    input.type = campo.tipo || "text";
    input.placeholder = campo.placeholder || "";
    input.value = campo.valor ?? "";
    input.autocomplete = campo.autocomplete || "off";
    if (campo.min !== undefined) input.min = campo.min;

    grupo.append(label, input);
    content.appendChild(grupo);
    inputs.push(input);
  });

  // ── Área de erro (classe .erro já existe no CSS) ──
  const erro = document.createElement("div");
  erro.className = "erro";
  erro.style.display = "none";
  erro.style.whiteSpace = "pre-line";

  // ── Botões ──
  const acoes = document.createElement("div");
  acoes.className = "modal-actions";

  const btnCancelar = document.createElement("button");
  btnCancelar.type = "button";
  btnCancelar.className = "btn-cancelar";
  btnCancelar.textContent = "Cancelar";

  const btnOk = document.createElement("button");
  btnOk.type = "button";
  btnOk.className = "btn-confirmar";
  btnOk.textContent = textoConfirmar;

  acoes.append(btnCancelar, btnOk);
  content.append(erro, acoes);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  // ── Comportamento ──
  function fechar() {
    document.removeEventListener("keydown", aoTeclar);
    overlay.remove();
  }

  function aoTeclar(e) {
    if (e.key === "Escape") fechar();
  }

  function mostrarErro(texto) {
    erro.textContent = texto;
    erro.style.display = "block";
  }

  async function confirmar() {
    const valores = {};

    campos.forEach((campo, i) => {
      const valor = inputs[i].value;
      valores[campo.name] = campo.tipo === "password" ? valor : valor.trim();
    });

    erro.style.display = "none";
    btnOk.disabled = true;
    btnOk.textContent = "Aguarde…";

    try {
      const mensagem = await onConfirmar(valores);

      if (mensagem) {
        mostrarErro(mensagem);
        return;
      }

      fechar();

    } catch (err) {
      mostrarErro("Falha de conexão. Tente novamente.");

    } finally {
      btnOk.disabled = false;
      btnOk.textContent = textoConfirmar;
    }
  }

  btnX.addEventListener("click", fechar);
  btnCancelar.addEventListener("click", fechar);
  btnOk.addEventListener("click", confirmar);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fechar();
  });

  inputs.forEach(input => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") confirmar();
    });
  });

  document.addEventListener("keydown", aoTeclar);

   if (inputs[0]) {
    inputs[0].focus();
    inputs[0].select();
  } else {
    btnOk.focus();
  }
}

// ─── Proteção de rota ─────────────────────────────────────────────────────────
async function verificarAuth() {

    const res = await fetch(`${API}/auth/me`, {
        credentials: "include"
    });

    if (!res.ok) {
        window.location.href = "login.html";
        return null;
    }

    const user = await res.json();

    document.getElementById("usuario-nome").textContent = user.nome;

    const areaAdmin = document.getElementById("admin-solicitacoes-area");

    if (areaAdmin) {
        areaAdmin.style.display =
            user.isAdmin ? "block" : "none";
    }

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

// ─── Perfil: enviar para a API ────────────────────────────────────────────────
// Retorna null se deu certo, ou um texto com o erro.
async function enviarPerfil({ nome, email, telefone, senhaAtual, novaSenha }) {
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

      return null;
    }

    const erros = await res.json().catch(() => ["Erro desconhecido."]);
    return "Erro ao salvar:\n" + (Array.isArray(erros) ? erros.join("\n") : JSON.stringify(erros));

  } catch (err) {
    return "Falha de conexão: " + err.message;

  } finally {
    btn.disabled = false;
    btn.textContent = "Salvar alterações";
  }
}

// ─── Perfil: salvar ───────────────────────────────────────────────────────────
async function salvar() {
  const nome = document.getElementById("campo-nome").value.trim();
  const email = document.getElementById("campo-email").value.trim();
  const telefone = document.getElementById("campo-tel").value.trim();
  const novaSenha = document.getElementById("campo-senha").value;

  // Sem troca de senha: salva direto
  if (!novaSenha) {
    const erro = await enviarPerfil({
      nome, email, telefone, senhaAtual: null, novaSenha
    });

    if (erro) alert(erro);
    return;
  }

  // Com troca de senha: pede a senha atual num card
  abrirModal({
    titulo: "Confirmar alteração",
    descricao: "Digite sua senha atual para confirmar a alteração.",
    textoConfirmar: "Confirmar",
    campos: [
      {
        name: "senhaAtual",
        label: "Senha atual",
        tipo: "password",
        placeholder: "Sua senha atual",
        autocomplete: "current-password"
      }
    ],
    onConfirmar: async ({ senhaAtual }) => {
      if (!senhaAtual) return "Informe a senha atual.";

      return enviarPerfil({ nome, email, telefone, senhaAtual, novaSenha });
    }
  });
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

        <button type="button" class="btn-editar-carteira" title="Alterar nome">
    <i class="fa-solid fa-pen"></i>
</button>

<button type="button" class="btn-excluir-carteira" title="Excluir carteira">
    <i class="fa-solid fa-trash"></i>
</button>

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
    // EDITAR (card em vez de prompt)
    // ============================================================

    const btnEditar =
      card.querySelector(".btn-editar-carteira");

    btnEditar.addEventListener("click", (event) => {

      event.stopPropagation();

      abrirModal({
        titulo: "Alterar nome da carteira",
        descricao: "Digite o novo nome da carteira.",
        textoConfirmar: "Salvar",
        campos: [
          {
            name: "nome",
            label: "Nome da carteira",
            placeholder: "Ex.: Carteira de longo prazo",
            valor: c.nome
          }
        ],
        onConfirmar: async ({ nome }) => {

          if (!nome) {
            return "Informe o nome da carteira.";
          }

          // Nada mudou: só fecha o card
          if (nome === c.nome) {
            return null;
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

            return (
              erro ||
              "Não foi possível alterar o nome da carteira."
            );
          }

          // Atualiza a lista
          carregarCarteiras();

          return null;
        }
      });

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

// ─── Modal: nova carteira (usa o card #modal-carteira do HTML) ────────────────
const modalCarteira = document.getElementById("modal-carteira");
const inputNomeCarteira = document.getElementById("nome-carteira");
const inputDescCarteira = document.getElementById("descricao-carteira");
const btnCriarCarteira = document.getElementById("btn-criar-carteira");

function mostrarErroModal(texto) {
  let erro = modalCarteira.querySelector(".erro");
  if (!erro) {
    erro = document.createElement("div");
    erro.className = "erro";
    modalCarteira.querySelector(".modal-actions").before(erro);
  }
  erro.textContent = texto;
}

function limparErroModal() {
  modalCarteira.querySelector(".erro")?.remove();
}

function abrirModalCarteira() {
  inputNomeCarteira.value = "";
  inputDescCarteira.value = "";
  limparErroModal();
  modalCarteira.style.display = "flex";
  inputNomeCarteira.focus();
}

function fecharModalCarteira() {
  modalCarteira.style.display = "none";
}

async function criarCarteira() {
  const nome = inputNomeCarteira.value.trim();
  const descricao = inputDescCarteira.value.trim();

  if (!nome) {
    mostrarErroModal("Informe o nome da carteira.");
    inputNomeCarteira.focus();
    return;
  }

  limparErroModal();
  btnCriarCarteira.disabled = true;
  btnCriarCarteira.textContent = "Criando…";

  try {
    const res = await fetch(`${API}/carteiras`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ nome, descricao })
    });

    if (!res.ok) {
      const texto = await res.text().catch(() => "");
      mostrarErroModal(texto || "Não foi possível criar a carteira.");
      return;
    }

    fecharModalCarteira();
    carregarCarteiras();

  } catch (err) {
    mostrarErroModal("Falha de conexão. Tente novamente.");
  } finally {
    btnCriarCarteira.disabled = false;
    btnCriarCarteira.textContent = "Criar carteira";
  }
}

// abrir
document.getElementById("btn-nova-carteira")
  .addEventListener("click", abrirModalCarteira);

// fechar (X, Cancelar, clique fora, Esc)
document.getElementById("btn-fechar-modal")
  .addEventListener("click", fecharModalCarteira);
document.getElementById("btn-cancelar-carteira")
  .addEventListener("click", fecharModalCarteira);
modalCarteira.addEventListener("click", (e) => {
  if (e.target === modalCarteira) fecharModalCarteira();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalCarteira.style.display === "flex") {
    fecharModalCarteira();
  }
});

// criar (botão e Enter no campo de nome)
btnCriarCarteira.addEventListener("click", criarCarteira);
inputNomeCarteira.addEventListener("keydown", (e) => {
  if (e.key === "Enter") criarCarteira();
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

  // Verifica se existe uma carteira aberta
  if (!carteiraAtual) return;

  const grid = document.getElementById("ativosGrid");
  const ativosCount = document.getElementById("ativos-count");

  // ============================================================
  // LIMPA OS CARDS ANTIGOS
  // ============================================================

  grid.querySelectorAll(".ativo-card").forEach(card => {
    card.remove();
  });

  // Zera o contador enquanto carrega
  if (ativosCount) {
    ativosCount.textContent = "0";
  }

  try {

    // ============================================================
    // BUSCAR ATIVOS DA CARTEIRA
    // ============================================================

    const urlBase = `${API}/carteiras/${carteiraAtual.id}/ativos`;

    const res = await fetch(urlBase, {
      credentials: "include"
    });

    if (!res.ok) {
      console.error("Erro ao carregar ativos:", res.status);
      return;
    }

    const ativos = await res.json();

    // ============================================================
    // ATUALIZAR QUANTIDADE DE ATIVOS
    // ============================================================

    if (ativosCount) {
      ativosCount.textContent = ativos.length;
    }

    // ============================================================
    // SE NÃO POSSUIR ATIVOS
    // ============================================================

    if (!ativos.length) {

      document.querySelector("#carteira .stat-card h2").textContent =
        "R$ 0,00";

      return;
    }

    // ============================================================
    // BUSCAR COTAÇÕES
    // ============================================================

    const tickers = ativos
      .map(a => a.ticker)
      .join(",");

    const cotacoesRes = await fetch(
      `${API}/ativos/cotacoes?tickers=${tickers}`,
      {
        credentials: "include"
      }
    );

    if (!cotacoesRes.ok) {
      console.error("Erro ao carregar cotações.");
      return;
    }

    const respostas = await cotacoesRes.json();

    // ============================================================
    // MAPA DE PREÇOS
    // ============================================================

    const precoMap = {};

    respostas.forEach(resposta => {

      resposta?.results?.forEach(p => {

        precoMap[p.symbol] = {
          preco: p.regularMarketPrice || 0,
          nome: p.longName || p.shortName || p.symbol
        };

      });

    });

    // ============================================================
    // CONTAINER DOS CARDS
    // ============================================================

    const container = document.querySelector("#carteira .cards");
    const addCard = document.querySelector("#carteira .add-card");

    // Remove cards antigos
    container
      .querySelectorAll(".ativo-card")
      .forEach(card => card.remove());

    // ============================================================
    // CALCULAR TOTAL
    // ============================================================

    let total = 0;

    // ============================================================
    // CRIAR CARDS
    // ============================================================

    ativos.forEach(ativo => {

      const info = precoMap[ativo.ticker] || {};

      const preco = info.preco || 0;

      const subtotal =
        preco * Number(ativo.quantidade);

      total += subtotal;

      const card = document.createElement("div");

      card.classList.add("card", "ativo-card");

      card.dataset.id = ativo.id;

      card.innerHTML = `
        <h3>${ativo.ticker}</h3>

        <small>
          ${info.nome || ativo.ticker}
        </small>

        <p>
          ${ativo.quantidade} unid.
        </p>

        <strong>
          R$ ${preco.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </strong>

        <span>
          Total: R$ ${subtotal.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </span>

        <div class="btn-group">
          <button onclick="comprar(${ativo.id})">
            Comprar
          </button>

          <button onclick="vender(${ativo.id})">
            Vender
          </button>
        </div>
      `;

      container.insertBefore(card, addCard);
    });

    // ============================================================
    // ATUALIZAR TOTAL INVESTIDO
    // ============================================================

    document.querySelector("#carteira .stat-card h2").textContent =
      `R$ ${total.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;

  } catch (erro) {

    console.error("Erro ao carregar ativos:", erro);

  }
}

// ─── Adicionar ativo (card em vez de prompt) ──────────────────────────────────
document.getElementById("btn-add-ativo").addEventListener("click", () => {
  if (!carteiraAtual) return;

  abrirModal({
    titulo: "Adicionar ativo",
    descricao: "Informe o ticker e a quantidade que deseja adicionar à carteira.",
    textoConfirmar: "Adicionar",
    campos: [
      {
        name: "ticker",
        label: "Ticker do ativo",
        placeholder: "Ex.: PETR4"
      },
      {
        name: "quantidade",
        label: "Quantidade de unidades",
        tipo: "number",
        placeholder: "Ex.: 10",
        min: 1
      }
    ],
    onConfirmar: async ({ ticker, quantidade }) => {

      if (!ticker) {
        return "Informe o ticker do ativo.";
      }

      const qtd = parseInt(quantidade, 10);

      if (isNaN(qtd) || qtd < 1) {
        return "Informe uma quantidade válida (mínimo 1).";
      }

      const res = await fetch(`${API}/carteiras/${carteiraAtual.id}/ativos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          quantidade: qtd
        })
      });

      if (!res.ok) {
        const erro = await res.text().catch(() => "");
        return erro || "Não foi possível adicionar o ativo.";
      }

      carregarAtivos();

      return null;
    }
  });
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

document.addEventListener('click', (e) => {
    const card = e.target.closest('.card.add-card');
    if (!card) return;

    // se clicou direto no botão "+", o handler original dele já cuida
    if (e.target.closest('#btn-add-ativo')) return;

    document.getElementById('btn-add-ativo').click();
});

// ─── Navegação (Minhas Carteiras / Minha conta) ────────────────────────────────
document.querySelectorAll("nav a").forEach(link => {
  link.addEventListener("click", () => {
    mostrarPagina(link.dataset.page);
    if (link.dataset.page === "carteiras") carregarCarteiras();
  });
});


document.getElementById("btn-ver-solicitacoes")
?.addEventListener("click", carregarSolicitacoesCadastro);

async function carregarSolicitacoesCadastro() {

    const area = document.getElementById("solicitacoes-cadastro");
    const msg = document.getElementById("mensagem-solicitacoes");
    const lista = document.getElementById("lista-solicitacoes");

    area.style.display = "block";
    lista.innerHTML = "";
    msg.textContent = "Carregando...";

    try {

        const res = await fetch(
            `${API}/admin/cadastros/pendentes`,
            {
                credentials: "include"
            }
        );

        if (res.status === 403) {
            msg.textContent = "Acesso restrito.";
            return;
        }

        if (!res.ok) {
            msg.textContent = "Erro ao carregar.";
            return;
        }

        const solicitacoes = await res.json();

        if (!solicitacoes.length) {
            msg.textContent = "Nenhuma solicitação pendente.";
            return;
        }

        msg.textContent = "";

        solicitacoes.forEach(s => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.marginTop = "15px";
    card.style.padding = "20px";

    const nome = document.createElement("h3");
    nome.textContent = s.nome;

    const email = document.createElement("p");
    email.textContent = s.email;

    const botoes = document.createElement("div");
    botoes.className = "acoes-solicitacao";

    const btnAceitar = document.createElement("button");
    btnAceitar.type = "button";
    btnAceitar.className = "btn-aceitar";
    btnAceitar.textContent = "Aceitar";

    btnAceitar.addEventListener("click", () => {
        aprovarCadastro(s.id);
    });

    const btnRecusar = document.createElement("button");
    btnRecusar.type = "button";
    btnRecusar.className = "btn-recusar";
    btnRecusar.textContent = "Recusar";

    btnRecusar.addEventListener("click", () => {
        rejeitarCadastro(s.id);
    });

    botoes.append(btnAceitar, btnRecusar);
    card.append(nome, email, botoes);
    lista.appendChild(card);
});
    } catch {

        msg.textContent = "Falha de conexão.";

    }
}

function aprovarCadastro(id) {
  abrirModal({
    titulo: "Aceitar solicitação",
    descricao: "Deseja aceitar esta solicitação de cadastro?",
    textoConfirmar: "Aceitar",
    onConfirmar: async () => {
      const res = await fetch(
        `${API}/admin/cadastros/${id}/aprovar`,
        {
          method: "POST",
          credentials: "include"
        }
      );

      if (!res.ok) {
        return "Não foi possível aceitar a solicitação.";
      }

      await carregarSolicitacoesCadastro();
      return null;
    }
  });
}

function rejeitarCadastro(id) {
  abrirModal({
    titulo: "Recusar solicitação",
    descricao: "Deseja recusar esta solicitação de cadastro?",
    textoConfirmar: "Recusar",
    onConfirmar: async () => {
      const res = await fetch(
        `${API}/admin/cadastros/${id}/rejeitar`,
        {
          method: "POST",
          credentials: "include"
        }
      );

      if (!res.ok) {
        return "Não foi possível recusar a solicitação.";
      }

      await carregarSolicitacoesCadastro();
      return null;
    }
  });
}

// ─── Iniciar ──────────────────────────────────────────────────────────────────
verificarAuth().then(user => {
  if (user) {
    carregarCarteiras();
    carregarPerfil();
  }
});