async function buscarDados() {
    const response = await fetch("http://localhost:8080/api/dados");
    const data = await response.json();
    console.log(data);
}

buscarDados();