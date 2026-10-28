# Investify Mobile (Flutter)

Aplicativo mobile do Investify integrado ao backend ASP.NET Core existente.

## Funcionalidades implementadas

- Login e solicitação de cadastro (o cadastro segue o fluxo de aprovação do backend).
- Sessão por cookie HTTP para compatibilidade com a autenticação atual da API.
- Listagem, criação e exclusão de carteiras.
- Visualização de ativos e comparativo de cotação por carteira.
- Cadastro e remoção de ativos.
- Visualização e atualização de dados do perfil e alteração opcional de senha.
- Estados de carregamento, atualização por gesto, mensagens de erro e navegação inferior.

## Executar

1. Inicie o backend e confirme que a API está acessível na porta configurada (por padrão, `5227`).
2. Abra `Mobile/program` no Android Studio ou terminal com Flutter instalado.
3. Execute `flutter pub get` e depois `flutter run`.
4. No login, abra **Configurar endereço do servidor** caso precise alterar a URL da API.

URL padrão configurada: `http://10.0.2.2:5227/api`, adequada ao emulador Android acessando o computador host. Em um celular físico, use o IP local do computador na rede Wi-Fi, por exemplo `http://192.168.0.10:5227/api`; o backend/firewall também precisa permitir conexões nessa interface.

O backend atual utiliza HTTP e autenticação por cookie. Para publicação em produção, configure HTTPS e revise a política de armazenamento/expiração de sessão.
