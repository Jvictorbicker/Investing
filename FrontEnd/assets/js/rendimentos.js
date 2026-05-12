/* ─────────────────────────────────────────
   rendimentos.js
   DEPENDE de script.js (carregado antes):
     - const API já declarada lá
     - autenticação via cookie (credentials: "include")
   
   Estrutura do JSON retornado pela API:
   [{ ativo: { id, ticker, precoCompra, quantidade, carteiraId }, precoAtual, variacaoAbsoluta, variacaoPercent }]
   ───────────────────────────────────────── */

// ─── Estado ───────────────────────────────────────────────────────────────────
let ativosRend  = [];
let modoFiltro  = 'todos';
let chartInst   = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function brl(val) {
  return Number(val).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Normaliza o item da API para um objeto flat — isola aqui qualquer mudança futura
function normalizar(item) {
  return {
    id:          item.ativo.id,
    ticker:      item.ativo.ticker,
    precoCompra: item.ativo.precoCompra,
    quantidade:  item.ativo.quantidade,
    precoAtual:  item.precoAtual,
    variacaoAbsoluta: item.variacaoAbsoluta,
    variacaoPercent:  item.variacaoPercent,
  };
}

function filtrados() {
  return modoFiltro === 'todos'
    ? ativosRend
    : ativosRend.filter(a => a.ticker === modoFiltro);
}

// ─── Estados visuais ──────────────────────────────────────────────────────────
function showLoading() {
  document.getElementById('loadingState').style.display = 'flex';
  document.getElementById('errorState').style.display   = 'none';
  document.getElementById('mainContent').style.display  = 'none';
}

function showError(msg) {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display   = 'flex';
  document.getElementById('mainContent').style.display  = 'none';
  document.getElementById('errorMsg').textContent       = msg;
}

function showContent() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display   = 'none';
  document.getElementById('mainContent').style.display  = 'block';
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function fetchComparativo() {
  const res = await fetch(`${API}/ativos/comparativo`, {
    credentials: 'include',
  });

  if (res.status === 401) {
    window.location.href = 'login.html';
    return [];
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}

// ─── Render: cards de resumo ──────────────────────────────────────────────────
function renderStats() {
  let totalInvestido = 0;
  let totalAtual     = 0;

  ativosRend.forEach(a => {
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

// ─── Render: botões de filtro ─────────────────────────────────────────────────
function renderToggles() {
  const opcoes = [
    { id: 'todos', label: 'Todos' },
    ...ativosRend.map(a => ({ id: a.ticker, label: a.ticker })),
  ];

  document.getElementById('toggleWrap').innerHTML = opcoes.map(o => `
    <button
      class="toggle-btn ${modoFiltro === o.id ? 'active' : ''}"
      onclick="filtrarRend('${o.id}')">
      ${o.label}
    </button>
  `).join('');
}

// ─── Render: gráfico ──────────────────────────────────────────────────────────
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

// ─── Render: lista de ativos ──────────────────────────────────────────────────
function renderAtivos() {
  const lista = filtrados();

  document.getElementById('ativoList').innerHTML = lista.map(a => {
    const compra  = Number(a.precoCompra);
    const atual   = Number(a.precoAtual);
    const qtd     = Number(a.quantidade);
    const diffPct = Number(a.variacaoPercent).toFixed(2);
    const pos     = atual >= compra;
    const cls     = pos ? 'lucro' : 'prejuizo';
    const seta    = pos ? '▲' : '▼';
    const msg     = pos ? 'Você obteve lucro neste ativo' : 'Você obteve prejuízo neste ativo';

    return `
      <div class="ativo-row">
        <div class="ativo-info">
          <strong>${a.ticker}</strong>
          <small>${qtd} cotas</small>
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
            <span class="badge-resultado ${cls}">${seta} ${pos ? '+' : ''}${diffPct}%</span>
            <span class="msg-resultado ${cls}">${msg}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── Filtro ───────────────────────────────────────────────────────────────────
function filtrarRend(id) {
  modoFiltro = id;
  renderToggles();
  renderChart();
  renderAtivos();
}

// ─── Inicialização ────────────────────────────────────────────────────────────
async function initRendimentos() {
  if (!document.getElementById('loadingState')) return;

  showLoading();

  try {
    const dados = await fetchComparativo();

    if (!Array.isArray(dados) || dados.length === 0) {
      showError('Nenhum ativo encontrado na sua carteira.');
      return;
    }

    // Normaliza o JSON aninhado { ativo: {...}, precoAtual, ... } para flat
    ativosRend = dados.map(normalizar);
    modoFiltro = 'todos';

    showContent();
    renderStats();
    renderToggles();
    renderChart();
    renderAtivos();

  } catch (err) {
    console.error('[Rendimentos] Erro:', err);
    showError(`Não foi possível carregar os dados: ${err.message}`);
  }
}