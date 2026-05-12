/* ─────────────────────────────────────────
   rendimentos.js
   Consome a API ASP.NET Core:
     GET /api/ativos/comparativo  → lista de ativos com cotação atual
   ───────────────────────────────────────── */

// ─────────────────────────────────────────
// CONFIGURAÇÃO
// Ajuste a BASE_URL para o endereço da sua API.
// Em produção, use a URL real; em dev, o proxy do Vite/servidor local.
// ─────────────────────────────────────────
const BASE_URL = 'http://localhost:5000'; // <- altere se necessário

// ─────────────────────────────────────────
// ESTADO
// ─────────────────────────────────────────
let ativos      = [];   // dados vindos da API
let modoAtivo   = 'todos';
let chartInst   = null;

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function brl(val) {
  return Number(val).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getToken() {
  // Adapte para onde seu app guarda o JWT
  // Exemplos comuns: localStorage, sessionStorage, cookie
  return localStorage.getItem('token') ?? '';
}

function filtrados() {
  return modoAtivo === 'todos'
    ? ativos
    : ativos.filter(a => a.ticker === modoAtivo);
}

// ─────────────────────────────────────────
// API — GET /api/ativos/comparativo
//
// Retorno esperado (array):
// [
//   {
//     "id": 1,
//     "ticker": "PETR4",
//     "precoCompra": 32.50,
//     "quantidade": 100,
//     "carteiraId": 1,
//     "precoAtual": 38.20,        // cotação em tempo real via Brapi
//     "empresa": "Petrobras",     // nome da empresa (opcional)
//     "variacao": 17.54           // % variação (opcional, calculado no front se ausente)
//   },
//   ...
// ]
// ─────────────────────────────────────────
async function fetchComparativo() {
  const res = await fetch(`${BASE_URL}/api/ativos/comparativo`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}

// ─────────────────────────────────────────
// UI — LOADING / ERRO / CONTEÚDO
// ─────────────────────────────────────────
function showLoading() {
  document.getElementById('loadingState').style.display  = 'flex';
  document.getElementById('errorState').style.display    = 'none';
  document.getElementById('mainContent').style.display   = 'none';
}

function showError(msg) {
  document.getElementById('loadingState').style.display  = 'none';
  document.getElementById('errorState').style.display    = 'flex';
  document.getElementById('mainContent').style.display   = 'none';
  document.getElementById('errorMsg').textContent        = msg;
}

function showContent() {
  document.getElementById('loadingState').style.display  = 'none';
  document.getElementById('errorState').style.display    = 'none';
  document.getElementById('mainContent').style.display   = 'block';
}

// ─────────────────────────────────────────
// RENDER — CARDS DE RESUMO
// ─────────────────────────────────────────
function renderStats() {
  let totalInvestido = 0;
  let totalAtual     = 0;

  ativos.forEach(a => {
    totalInvestido += Number(a.precoCompra) * Number(a.quantidade);
    totalAtual     += Number(a.precoAtual)  * Number(a.quantidade);
  });

  const diff = totalAtual - totalInvestido;
  const pct  = totalInvestido > 0
    ? ((diff / totalInvestido) * 100).toFixed(2)
    : '0.00';
  const pos  = diff >= 0;

  document.getElementById('statsRow').innerHTML = `
    <div class="rend-stat">
      <p>Total investido</p>
      <h2>R$ ${brl(totalInvestido)}</h2>
    </div>
    <div class="rend-stat">
      <p>Valor atual</p>
      <h2>R$ ${brl(totalAtual)}</h2>
    </div>
    <div class="rend-stat ${pos ? 'pos' : 'neg'}">
      <p>Resultado total</p>
      <h2>${pos ? '+' : ''}R$ ${brl(diff)}</h2>
    </div>
    <div class="rend-stat ${pos ? 'pos' : 'neg'}">
      <p>Variação</p>
      <h2>${pos ? '+' : ''}${pct}%</h2>
    </div>
  `;
}

// ─────────────────────────────────────────
// RENDER — BOTÕES DE FILTRO
// ─────────────────────────────────────────
function renderToggles() {
  const opcoes = [
    { id: 'todos', label: 'Todos' },
    ...ativos.map(a => ({ id: a.ticker, label: a.ticker })),
  ];

  document.getElementById('toggleWrap').innerHTML = opcoes.map(o => `
    <button
      class="toggle-btn ${modoAtivo === o.id ? 'active' : ''}"
      onclick="filtrar('${o.id}')">
      ${o.label}
    </button>
  `).join('');
}

// ─────────────────────────────────────────
// RENDER — GRÁFICO
// ─────────────────────────────────────────
function renderChart() {
  const lista   = filtrados();
  const labels  = lista.map(a => a.ticker);
  const compras = lista.map(a => Number(a.precoCompra));
  const atuais  = lista.map(a => Number(a.precoAtual));
  const cores   = lista.map(a =>
    Number(a.precoAtual) >= Number(a.precoCompra) ? '#1a7a4a' : '#c0392b'
  );

  const ctx = document.getElementById('rendChart').getContext('2d');
  if (chartInst) chartInst.destroy();

  chartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Preço de compra',
          data: compras,
          backgroundColor: '#8A05BE',
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Valor atual',
          data: atuais,
          backgroundColor: cores,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` R$ ${Number(ctx.parsed.y).toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#777' },
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            color: '#777',
            callback: v => 'R$ ' + Number(v).toFixed(0),
          },
        },
      },
    },
  });
}

// ─────────────────────────────────────────
// RENDER — LISTA DE ATIVOS
// ─────────────────────────────────────────
function renderAtivos() {
  const lista = filtrados();

  document.getElementById('ativoList').innerHTML = lista.map(a => {
    const compra  = Number(a.precoCompra);
    const atual   = Number(a.precoAtual);
    const qtd     = Number(a.quantidade);
    const diffPct = compra > 0
      ? ((atual - compra) / compra * 100).toFixed(2)
      : '0.00';
    const pos  = atual >= compra;
    const cls  = pos ? 'lucro' : 'prejuizo';
    const seta = pos ? '▲' : '▼';
    const msg  = pos
      ? 'Você obteve lucro neste ativo'
      : 'Você obteve prejuízo neste ativo';

    // "empresa" é opcional — a API pode ou não retornar o campo
    const nomeEmpresa = a.empresa ? `${a.empresa} · ` : '';

    return `
      <div class="ativo-row">
        <div class="ativo-info">
          <strong>${a.ticker}</strong>
          <small>${nomeEmpresa}${qtd} cotas</small>
        </div>

        <div class="ativo-valores">
          <div class="val-col">
            <span class="val-label">Preço de compra</span>
            <span class="val-price">R$ ${compra.toFixed(2)}</span>
            <span class="val-total">Total: R$ ${brl(compra * qtd)}</span>
          </div>

          <div class="val-col">
            <span class="val-label">Valor atual</span>
            <span class="val-price">R$ ${atual.toFixed(2)}</span>
            <span class="val-total">Total: R$ ${brl(atual * qtd)}</span>
          </div>

          <div class="resultado-col">
            <span class="badge-resultado ${cls}">
              ${seta} ${pos ? '+' : ''}${diffPct}%
            </span>
            <span class="msg-resultado ${cls}">${msg}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ─────────────────────────────────────────
// FILTRO (chamado pelos botões)
// ─────────────────────────────────────────
function filtrar(id) {
  modoAtivo = id;
  renderToggles();
  renderChart();
  renderAtivos();
}

// ─────────────────────────────────────────
// INICIALIZAÇÃO
// ─────────────────────────────────────────
async function init() {
  showLoading();

  try {
    // Busca os dados da API
    const dados = await fetchComparativo();

    // Garante que é array e tem pelo menos um item
    if (!Array.isArray(dados) || dados.length === 0) {
      showError('Nenhum ativo encontrado na sua carteira.');
      return;
    }

    ativos     = dados;
    modoAtivo  = 'todos';

    showContent();
    renderStats();
    renderToggles();
    renderChart();
    renderAtivos();

  } catch (err) {
    console.error('[Rendimentos] Erro ao buscar comparativo:', err);
    showError(`Não foi possível carregar os dados: ${err.message}`);
  }
}

// Aguarda o DOM e o Chart.js carregarem antes de iniciar
document.addEventListener('DOMContentLoaded', init);