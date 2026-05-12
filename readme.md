# Investify

Aplicação de controle de carteira de investimentos com API em ASP.NET Core e frontend em HTML/CSS/JS.

---

## Pré-requisitos

Antes de começar, instale:

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Um navegador (Chrome, Firefox, Edge...)

Não é necessário instalar .NET, Node.js ou Postgres — tudo roda dentro do Docker.

---

## Como rodar

### 1. No terminal, clone o repositório

```bash
git clone https://github.com/seu-usuario/seu-repositorio.git
cd seu-repositorio
```

### 2. Configure o token da Brapi  (Ignore isso)

Abra o arquivo `docker-compose.yml` e substitua `YOUR_TOKEN_HERE` pelo seu token da [Brapi](https://brapi.dev):

```yaml
- Brapi__Token=YOUR_TOKEN_HERE
```

### 3. Suba a API e o banco de dados

```bash
docker-compose up --build
```

> Na primeira vez esse comando vai baixar as dependências do .NET e do Postgres automaticamente. Pode demorar alguns minutos.

Aguarde até aparecer no terminal:

```
investing_api | Now listening on: http://[::]:8080
```

Isso significa que a API está rodando.

### 4. Verifique os containers

Em outro terminal, rode:

```bash
docker ps
```

Você deve ver dois containers ativos:

| CONTAINER | STATUS |
|---|---|
| `investing_api` | Up |
| `postgres_investing` | Up |

### 5. Abra o frontend

Abra o arquivo `index.html` no navegador. Você pode fazer isso diretamente pelo explorador de arquivos ou arrastando o arquivo para o navegador.

A aplicação estará disponível e conectada à API em `http://localhost:5000`.

---

## Parar a aplicação

```bash
docker-compose down
```

Para parar e **apagar os dados do banco**:

```bash
docker-compose down -v
```

---

## Estrutura do projeto

```
projeto/
├── docker-compose.yml
├── index.html
├── assets/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── script.js
│       └── rendimentos.js
└── Backend/
    ├── Dockerfile
    ├── Investing.csproj
    └── ...
```

---

## Problemas comuns

**EXECUTE O ARQUIVO HTML COM LIVE SERVER**

**A API não responde**
Verifique se os containers estão rodando com `docker ps`. Se não estiver, rode `docker-compose up` novamente.

**Erro de token da Brapi**
Confirme que substituiu `YOUR_TOKEN_HERE` no `docker-compose.yml` por um token válido obtido em [brapi.dev](https://brapi.dev).

**Porta 5000 ocupada**
Mude a porta no `docker-compose.yml`:
```yaml
ports:
  - "5001:8080"  # troque 5000 por outra porta livre
```
E atualize a variável `API` no `script.js` para a nova porta.