async function buscarDados() {
    const response = await fetch(`http://localhost:5000/api/ativos/cotacoes?tickers=${tickers}`);
    const data = await response.json();
    console.log(data);
}

buscarDados();