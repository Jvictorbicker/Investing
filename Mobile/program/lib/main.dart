import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';

void main() => runApp(const InvestifyApp());

class AppConfig {
  static String apiBase = 'http://10.0.2.2:5227/api';
}

class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();
  final HttpClient _client = HttpClient()..connectionTimeout = const Duration(seconds: 12);
  final Map<String, String> _cookies = {};

  Future<dynamic> request(String path,
      {String method = 'GET', Map<String, dynamic>? body}) async {
    final uri = Uri.parse('${AppConfig.apiBase}$path');
    final req = await _client.openUrl(method, uri);
    req.headers.set(HttpHeaders.acceptHeader, 'application/json');
    if (_cookies.isNotEmpty) req.cookies.addAll(_cookies.entries.map((e) => Cookie(e.key, e.value)));
    if (body != null) {
      req.headers.contentType = ContentType.json;
      req.write(jsonEncode(body));
    }
    final response = await req.close().timeout(const Duration(seconds: 20));
    for (final cookie in response.cookies) {
      if (cookie.maxAge == 0 || cookie.value.isEmpty) {
        _cookies.remove(cookie.name);
      } else {
        _cookies[cookie.name] = cookie.value;
      }
    }
    final text = await response.transform(utf8.decoder).join();
    dynamic data;
    if (text.isNotEmpty) {
      try { data = jsonDecode(text); } catch (_) { data = text; }
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'Erro ${response.statusCode}.';
      if (data is String && data.isNotEmpty) message = data;
      if (data is Map && data['mensagem'] != null) message = data['mensagem'].toString();
      if (response.statusCode == 401) message = 'Sessão expirada. Entre novamente.';
      throw ApiException(message, response.statusCode);
    }
    return data;
  }
}

class ApiException implements Exception {
  final String message;
  final int status;
  ApiException(this.message, this.status);
  @override
  String toString() => message;
}

class InvestifyApp extends StatelessWidget {
  const InvestifyApp({super.key});
  static const purple = Color(0xFF7900A8);
  static const deepPurple = Color(0xFF560078);
  static const background = Color(0xFFF6F4FA);
  static const palePurple = Color(0xFFF0E3F7);

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Investify',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: background,
      colorScheme: ColorScheme.fromSeed(seedColor: purple, primary: purple),
      appBarTheme: const AppBarTheme(backgroundColor: background, foregroundColor: deepPurple, elevation: 0),
      inputDecorationTheme: InputDecorationTheme(
        filled: true, fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE6DFEC))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE6DFEC))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: purple, width: 1.5)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      ),
    ),
    home: const AuthGate(),
  );
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override State<AuthGate> createState() => _AuthGateState();
}
class _AuthGateState extends State<AuthGate> {
  bool loading = true;
  bool logged = false;
  @override void initState() { super.initState(); _check(); }
  Future<void> _check() async {
    try { await ApiClient.instance.request('/auth/me'); logged = true; }
    catch (_) { logged = false; }
    if (mounted) setState(() => loading = false);
  }
  void signedIn() => setState(() => logged = true);
  void signedOut() => setState(() => logged = false);
  @override Widget build(BuildContext context) {
    if (loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return logged ? MainShell(onLogout: signedOut) : LoginPage(onLogin: signedIn);
  }
}

class LoginPage extends StatefulWidget {
  final VoidCallback onLogin;
  const LoginPage({super.key, required this.onLogin});
  @override State<LoginPage> createState() => _LoginPageState();
}
class _LoginPageState extends State<LoginPage> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool busy = false, obscure = true;
  String? error;
  Future<void> login() async {
    if (email.text.trim().isEmpty || password.text.isEmpty) { setState(() => error = 'Informe e-mail e senha.'); return; }
    setState(() { busy = true; error = null; });
    try {
      await ApiClient.instance.request('/auth/login', method: 'POST',
          body: {'email': email.text.trim(), 'senha': password.text});
      widget.onLogin();
    } catch (e) { setState(() => error = e is ApiException ? e.message : 'Não foi possível conectar ao servidor.'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override void dispose() { email.dispose(); password.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) => Scaffold(
    body: SafeArea(child: Center(child: SingleChildScrollView(padding: const EdgeInsets.all(24), child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 440), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const SizedBox(height: 22),
      Container(width: 76, height: 76, decoration: BoxDecoration(color: InvestifyApp.palePurple, borderRadius: BorderRadius.circular(24)),
          child: const Icon(Icons.trending_up_rounded, color: InvestifyApp.purple, size: 42)),
      const SizedBox(height: 22),
      const Text('Investify', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: InvestifyApp.deepPurple)),
      const SizedBox(height: 6),
      Text('Seus investimentos, organizados.', style: TextStyle(color: Colors.grey.shade700, fontSize: 16)),
      const SizedBox(height: 32),
      const Text('Bem-vindo de volta', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
      const SizedBox(height: 20),
      TextField(controller: email, keyboardType: TextInputType.emailAddress, autocorrect: false,
          decoration: const InputDecoration(labelText: 'E-mail', prefixIcon: Icon(Icons.mail_outline))),
      const SizedBox(height: 14),
      TextField(controller: password, obscureText: obscure, onSubmitted: (_) => login(),
          decoration: InputDecoration(labelText: 'Senha', prefixIcon: const Icon(Icons.lock_outline),
              suffixIcon: IconButton(icon: Icon(obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined), onPressed: () => setState(() => obscure = !obscure)))),
      if (error != null) ...[const SizedBox(height: 12), ErrorBanner(error!)],
      const SizedBox(height: 20),
      FilledButton(onPressed: busy ? null : login, style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
          child: busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Entrar')),
      const SizedBox(height: 12),
      OutlinedButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterPage())),
          style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 15)), child: const Text('Criar uma conta')),
      const SizedBox(height: 28),
      TextButton.icon(onPressed: _configureApi, icon: const Icon(Icons.settings_ethernet), label: const Text('Configurar endereço do servidor')),
    ]),
    )))),
  );
  Future<void> _configureApi() async {
    final c = TextEditingController(text: AppConfig.apiBase);
    final value = await showDialog<String>(context: context, builder: (ctx) => AlertDialog(
      title: const Text('Servidor da API'),
      content: TextField(controller: c, decoration: const InputDecoration(labelText: 'URL base', hintText: 'http://10.0.2.2:5227/api')),
      actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
        FilledButton(onPressed: () => Navigator.pop(ctx, c.text.trim()), child: const Text('Salvar'))],
    ));
    if (value != null && value.isNotEmpty) setState(() => AppConfig.apiBase = value.replaceFirst(RegExp(r'/$'), ''));
  }
}

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});
  @override State<RegisterPage> createState() => _RegisterPageState();
}
class _RegisterPageState extends State<RegisterPage> {
  final name = TextEditingController(), email = TextEditingController(), password = TextEditingController(), confirm = TextEditingController();
  bool busy = false;
  String? error;
  Future<void> register() async {
    if ([name.text.trim(), email.text.trim(), password.text, confirm.text].any((v) => v.isEmpty)) { setState(() => error = 'Preencha todos os campos.'); return; }
    if (password.text != confirm.text) { setState(() => error = 'As senhas não coincidem.'); return; }
    if (password.text.length < 6) { setState(() => error = 'Use uma senha com pelo menos 6 caracteres.'); return; }
    setState(() { busy = true; error = null; });
    try {
      final result = await ApiClient.instance.request('/auth/register', method: 'POST',
          body: {'nome': name.text.trim(), 'email': email.text.trim(), 'senha': password.text});
      if (!mounted) return;
      await showDialog<void>(context: context, builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.check_circle_outline, color: Colors.green, size: 44),
        title: const Text('Solicitação enviada'),
        content: Text(result is Map ? (result['mensagem']?.toString() ?? 'Aguarde a aprovação de um administrador.') : 'Aguarde a aprovação de um administrador.'),
        actions: [FilledButton(onPressed: () { Navigator.pop(ctx); Navigator.pop(context); }, child: const Text('Voltar ao login'))],
      ));
    } catch (e) { setState(() => error = e is ApiException ? e.message : 'Falha de conexão com o servidor.'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override void dispose() { name.dispose(); email.dispose(); password.dispose(); confirm.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Criar conta')),
      body: SafeArea(child: ListView(padding: const EdgeInsets.all(24), children: [
        const Text('Comece por aqui', style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8), const Text('Sua solicitação será enviada para aprovação.'),
        const SizedBox(height: 24),
        TextField(controller: name, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Nome completo', prefixIcon: Icon(Icons.person_outline))),
        const SizedBox(height: 14), TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'E-mail', prefixIcon: Icon(Icons.mail_outline))),
        const SizedBox(height: 14), TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Senha', prefixIcon: Icon(Icons.lock_outline))),
        const SizedBox(height: 14), TextField(controller: confirm, obscureText: true, decoration: const InputDecoration(labelText: 'Confirmar senha', prefixIcon: Icon(Icons.lock_reset))),
        if (error != null) ...[const SizedBox(height: 12), ErrorBanner(error!)],
        const SizedBox(height: 22), FilledButton(onPressed: busy ? null : register, child: Padding(padding: const EdgeInsets.all(12), child: busy ? const CircularProgressIndicator(color: Colors.white) : const Text('Enviar solicitação'))),
      ])));
}

class MainShell extends StatefulWidget {
  final VoidCallback onLogout;
  const MainShell({super.key, required this.onLogout});
  @override State<MainShell> createState() => _MainShellState();
}
class _MainShellState extends State<MainShell> {
  int selected = 0;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Investify', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w800, color: InvestifyApp.purple)),
      actions: [
        IconButton(
          tooltip: 'Atualizar',
          onPressed: () => setState(() {}),
          icon: const Icon(Icons.refresh),
        ),
        const SizedBox(width: 6),
      ],
    ),
    body: IndexedStack(
      index: selected,
      children: [
        PortfoliosPage(
          key: const ValueKey('portfolios'),
          onOpenProfile: () => setState(() => selected = 2),
        ),
        const UserManagementPage(),
        ProfilePage(onLogout: widget.onLogout),
      ],
    ),
    bottomNavigationBar: NavigationBar(
      backgroundColor: Colors.white,
      indicatorColor: InvestifyApp.palePurple,
      selectedIndex: selected,
      onDestinationSelected: (i) => setState(() => selected = i),
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.account_balance_wallet_outlined),
          selectedIcon: Icon(Icons.account_balance_wallet),
          label: 'Carteiras',
        ),
        NavigationDestination(
          icon: Icon(Icons.manage_accounts_outlined),
          selectedIcon: Icon(Icons.manage_accounts),
          label: 'Usuários',
        ),
        NavigationDestination(
          icon: Icon(Icons.person_outline),
          selectedIcon: Icon(Icons.person),
          label: 'Perfil',
        ),
      ],
    ),
  );
}

// Gestão de usuários. Os caminhos abaixo precisam corresponder aos endpoints
// administrativos existentes no backend ASP.NET Core.
class UserManagementPage extends StatefulWidget {
  const UserManagementPage({super.key});

  @override
  State<UserManagementPage> createState() => _UserManagementPageState();
}

class _UserManagementPageState extends State<UserManagementPage> {
  bool loading = true;
  bool showingRequests = false;
  String? error;
  List<Map<String, dynamic>> users = [];
  List<Map<String, dynamic>> requests = [];

  @override
  void initState() {
    super.initState();
    loadUsers();
  }

  int _id(Map<String, dynamic> item) =>
      (item['id'] ?? item['Id'] ?? item['solicitacaoId'] ?? item['idSolicitacao'] ?? 0) is num
          ? ((item['id'] ?? item['Id'] ?? item['solicitacaoId'] ?? item['idSolicitacao'] ?? 0) as num).toInt()
          : int.tryParse((item['id'] ?? item['Id'] ?? item['solicitacaoId'] ?? item['idSolicitacao'] ?? '0').toString()) ?? 0;

  String _value(Map<String, dynamic> item, List<String> keys, {String fallback = ''}) {
    for (final key in keys) {
      final value = item[key];
      if (value != null && value.toString().trim().isNotEmpty) return value.toString();
    }
    return fallback;
  }

  Future<void> loadUsers() async {
    if (mounted) setState(() { loading = true; error = null; });
    try {
      final data = await ApiClient.instance.request('/admin/usuarios');
      users = (data as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    } catch (e) {
      error = e is ApiException
          ? e.message
          : 'Não foi possível carregar os usuários. Verifique a conexão com a API.';
    }
    if (mounted) setState(() => loading = false);
  }

  Future<void> loadRequests() async {
    if (mounted) setState(() { loading = true; error = null; });
    try {
      final data = await ApiClient.instance.request('/admin/solicitacoes');
      requests = (data as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    } catch (e) {
      error = e is ApiException
          ? e.message
          : 'Não foi possível carregar as solicitações.';
    }
    if (mounted) setState(() => loading = false);
  }

  Future<void> _approve(Map<String, dynamic> request) async {
    final id = _id(request);
    if (id <= 0) {
      showMessage(context, 'A solicitação não possui um identificador válido.');
      return;
    }
    try {
      await ApiClient.instance.request('/admin/solicitacoes/$id/aprovar', method: 'POST');
      if (!mounted) return;
      showMessage(context, 'Solicitação aprovada.');
      await loadRequests();
    } catch (e) {
      if (mounted) showMessage(context, 'Não foi possível aprovar: $e');
    }
  }

  Future<void> _reject(Map<String, dynamic> request) async {
    final id = _id(request);
    if (id <= 0) {
      showMessage(context, 'A solicitação não possui um identificador válido.');
      return;
    }
    final ok = await confirm(
      context,
      'Recusar solicitação?',
      'Deseja recusar a solicitação de ${_value(request, ['nome', 'Nome'], fallback: 'este usuário')}?',
    );
    if (!ok) return;
    try {
      await ApiClient.instance.request('/admin/solicitacoes/$id/recusar', method: 'POST');
      if (!mounted) return;
      showMessage(context, 'Solicitação recusada.');
      await loadRequests();
    } catch (e) {
      if (mounted) showMessage(context, 'Não foi possível recusar: $e');
    }
  }

  void _toggleView(bool requestsView) {
    setState(() => showingRequests = requestsView);
    if (requestsView) {
      loadRequests();
    } else {
      loadUsers();
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = showingRequests ? requests : users;
    return RefreshIndicator(
      onRefresh: showingRequests ? loadRequests : loadUsers,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 24),
        children: [
          Text(
            showingRequests ? 'Solicitações de usuários' : 'Gerenciar usuários',
            style: const TextStyle(fontSize: 25, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 5),
          Text(
            showingRequests
                ? 'Analise os pedidos de criação de conta.'
                : 'Consulte os usuários cadastrados no sistema.',
            style: TextStyle(color: Colors.grey.shade700),
          ),
          const SizedBox(height: 18),
          SizedBox(
            height: 48,
            child: FilledButton.icon(
              onPressed: () => _toggleView(!showingRequests),
              icon: Icon(showingRequests ? Icons.people_outline : Icons.mark_email_unread_outlined),
              label: Text(showingRequests ? 'Ver todos os usuários' : 'Ver solicitações de usuários'),
            ),
          ),
          const SizedBox(height: 16),
          if (loading)
            const Padding(
              padding: EdgeInsets.all(36),
              child: Center(child: CircularProgressIndicator()),
            ),
          if (!loading && error != null)
            ErrorPanel(
              message: error!,
              onRetry: showingRequests ? loadRequests : loadUsers,
            ),
          if (!loading && error == null && items.isEmpty)
            EmptyState(
              icon: showingRequests ? Icons.mark_email_read_outlined : Icons.people_outline,
              title: showingRequests ? 'Nenhuma solicitação pendente' : 'Nenhum usuário encontrado',
              subtitle: showingRequests
                  ? 'As novas solicitações aparecerão aqui.'
                  : 'Os usuários cadastrados aparecerão aqui.',
            ),
          if (!loading && error == null)
            ...items.map((item) {
              final name = _value(item, ['nome', 'Nome', 'name', 'Name'], fallback: 'Usuário sem nome');
              final email = _value(item, ['email', 'Email', 'eMail'], fallback: 'E-mail não informado');
              final id = _id(item);
              final subtitle = showingRequests
                  ? email
                  : '$email${_value(item, ['telefone', 'Telefone']).isNotEmpty ? '\n${_value(item, ['telefone', 'Telefone'])}' : ''}';
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Card(
                  color: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: const BorderSide(color: Color(0xFFEAE4F0)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: InvestifyApp.palePurple,
                          child: Text(
                            name.trim().isEmpty ? '?' : name.trim().substring(0, 1).toUpperCase(),
                            style: const TextStyle(color: InvestifyApp.purple, fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              const SizedBox(height: 4),
                              Text(subtitle, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                              if (!showingRequests && id > 0)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Text('ID: $id', style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                                ),
                            ],
                          ),
                        ),
                        if (showingRequests) ...[
                          IconButton(
                            tooltip: 'Recusar solicitação',
                            onPressed: () => _reject(item),
                            icon: const Icon(Icons.close_rounded, color: Colors.redAccent),
                          ),
                          IconButton(
                            tooltip: 'Aprovar solicitação',
                            onPressed: () => _approve(item),
                            icon: const Icon(Icons.check_circle_outline, color: Colors.green),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}

class Portfolio {
  final int id; final String name; final int assets;
  Portfolio({required this.id, required this.name, required this.assets});
  factory Portfolio.fromJson(Map<String, dynamic> j) => Portfolio(id: (j['id'] as num).toInt(), name: (j['nome'] ?? '').toString(), assets: (j['qtdAtivos'] as num? ?? 0).toInt());
}
class Investment {
  final int id; final String ticker; final double purchase, quantity, current, variation;
  Investment({required this.id, required this.ticker, required this.purchase, required this.quantity, this.current = 0, this.variation = 0});
  factory Investment.fromJson(Map<String, dynamic> j, {bool comparative = false}) {
    final a = comparative && j['ativo'] is Map ? Map<String, dynamic>.from(j['ativo']) : j;
    return Investment(id: (a['id'] as num? ?? 0).toInt(), ticker: (a['ticker'] ?? '').toString(),
        purchase: (a['precoCompra'] as num? ?? 0).toDouble(), quantity: (a['quantidade'] as num? ?? 0).toDouble(),
        current: comparative ? (j['precoAtual'] as num? ?? 0).toDouble() : 0,
        variation: comparative ? (j['variacaoPercent'] as num? ?? 0).toDouble() : 0);
  }
}

class PortfoliosPage extends StatefulWidget {
  final VoidCallback onOpenProfile;
  const PortfoliosPage({super.key, required this.onOpenProfile});
  @override State<PortfoliosPage> createState() => _PortfoliosPageState();
}
class _PortfoliosPageState extends State<PortfoliosPage> {
  bool loading = true; String? error; List<Portfolio> portfolios = [];
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    setState(() { loading = true; error = null; });
    try {
      final data = await ApiClient.instance.request('/carteiras');
      portfolios = (data as List).map((e) => Portfolio.fromJson(Map<String, dynamic>.from(e))).toList();
    } catch (e) { error = e is ApiException ? e.message : 'Não foi possível carregar as carteiras. Confira a conexão e o endereço da API.'; }
    if (mounted) setState(() => loading = false);
  }
  Future<void> createPortfolio() async {
    final c = TextEditingController();
    final name = await showDialog<String>(context: context, builder: (ctx) => AlertDialog(title: const Text('Nova carteira'),
        content: TextField(controller: c, autofocus: true, textCapitalization: TextCapitalization.sentences, decoration: const InputDecoration(labelText: 'Nome da carteira', hintText: 'Ex.: Longo prazo')),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')), FilledButton(onPressed: () => Navigator.pop(ctx, c.text.trim()), child: const Text('Criar'))]));
    if (name == null || name.isEmpty) return;
    try { await ApiClient.instance.request('/carteiras', method: 'POST', body: {'nome': name}); await load(); }
    catch (e) { if (mounted) showMessage(context, e.toString()); }
  }
  Future<void> deletePortfolio(Portfolio p) async {
    final ok = await confirm(context, 'Excluir carteira?', 'A carteira “${p.name}” será excluída.');
    if (!ok) return;
    try { await ApiClient.instance.request('/carteiras/${p.id}', method: 'DELETE'); await load(); }
    catch (e) { if (mounted) showMessage(context, e.toString()); }
  }
  @override Widget build(BuildContext context) => RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.fromLTRB(18, 8, 18, 24), children: [
    const Text('Minhas carteiras', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w800)),
    const SizedBox(height: 5), Text('Acompanhe e organize seus investimentos.', style: TextStyle(color: Colors.grey.shade700)),
    const SizedBox(height: 20),
    SizedBox(height: 50, child: FilledButton.icon(onPressed: createPortfolio, icon: const Icon(Icons.add), label: const Text('Nova carteira'))),
    const SizedBox(height: 18),
    if (loading) const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator())),
    if (!loading && error != null) ErrorPanel(message: error!, onRetry: load),
    if (!loading && error == null && portfolios.isEmpty) const EmptyState(icon: Icons.account_balance_wallet_outlined, title: 'Nenhuma carteira ainda', subtitle: 'Crie sua primeira carteira para começar a organizar seus investimentos.'),
    if (!loading) ...portfolios.map((p) => Padding(padding: const EdgeInsets.only(bottom: 12), child: Card(
      color: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: const BorderSide(color: Color(0xFFEAE4F0))),
      child: InkWell(borderRadius: BorderRadius.circular(18), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PortfolioDetailPage(portfolio: p))).then((_) => load()),
        child: Padding(padding: const EdgeInsets.all(18), child: Row(children: [
          Container(width: 52, height: 52, decoration: BoxDecoration(color: InvestifyApp.palePurple, borderRadius: BorderRadius.circular(15)), child: const Icon(Icons.show_chart, color: InvestifyApp.purple, size: 28)),
          const SizedBox(width: 14), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(p.name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)), const SizedBox(height: 5),
            Text('${p.assets} ${p.assets == 1 ? 'ativo' : 'ativos'}', style: TextStyle(color: Colors.grey.shade600)),
          ])),
          PopupMenuButton<String>(onSelected: (v) { if (v == 'delete') deletePortfolio(p); }, itemBuilder: (_) => const [PopupMenuItem(value: 'delete', child: Text('Excluir carteira'))]),
          const Icon(Icons.chevron_right, color: Colors.grey),
        ])),
      ),
    ))),
  ]));
}

class PortfolioDetailPage extends StatefulWidget {
  final Portfolio portfolio;
  const PortfolioDetailPage({super.key, required this.portfolio});
  @override State<PortfolioDetailPage> createState() => _PortfolioDetailPageState();
}
class _PortfolioDetailPageState extends State<PortfolioDetailPage> {
  bool loading = true; String? error; List<Investment> investments = [];
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    setState(() { loading = true; error = null; });
    try {
      final data = await ApiClient.instance.request('/carteiras/${widget.portfolio.id}/ativos/comparativo');
      investments = (data as List).map((e) => Investment.fromJson(Map<String, dynamic>.from(e), comparative: true)).toList();
    } catch (e) { error = e is ApiException ? e.message : 'Não foi possível carregar os ativos.'; }
    if (mounted) setState(() => loading = false);
  }
  double get invested => investments.fold(0, (s, a) => s + a.purchase * a.quantity);
  double get current => investments.fold(0, (s, a) => s + (a.current > 0 ? a.current : a.purchase) * a.quantity);
  Future<void> addInvestment() async {
    final ticker = TextEditingController(), quantity = TextEditingController(text: '1');
    final values = await showDialog<List<String>>(context: context, builder: (ctx) => AlertDialog(title: const Text('Adicionar ativo'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: ticker, textCapitalization: TextCapitalization.characters, decoration: const InputDecoration(labelText: 'Ticker', hintText: 'Ex.: PETR4')),
          const SizedBox(height: 12), TextField(controller: quantity, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Quantidade')),
        ]),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')), FilledButton(onPressed: () => Navigator.pop(ctx, [ticker.text.trim().toUpperCase(), quantity.text.trim()]), child: const Text('Adicionar'))]));
    if (values == null) return;
    final q = double.tryParse(values[1].replaceAll(',', '.'));
    if (values[0].isEmpty || q == null || q <= 0) { if (mounted) showMessage(context, 'Informe um ticker e uma quantidade válida.'); return; }
    try {
      await ApiClient.instance.request('/carteiras/${widget.portfolio.id}/ativos', method: 'POST', body: {'ticker': values[0], 'quantidade': q});
      await load();
    } catch (e) { if (mounted) showMessage(context, e.toString()); }
  }
  Future<void> deleteInvestment(Investment a) async {
    if (!await confirm(context, 'Remover ativo?', 'Deseja remover ${a.ticker} desta carteira?')) return;
    try { await ApiClient.instance.request('/ativos/${a.id}', method: 'DELETE'); await load(); }
    catch (e) { if (mounted) showMessage(context, e.toString()); }
  }
  @override Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.portfolio.name, maxLines: 1, overflow: TextOverflow.ellipsis)),
    floatingActionButton: FloatingActionButton.extended(onPressed: addInvestment, icon: const Icon(Icons.add), label: const Text('Adicionar ativo')),
    body: RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(18), children: [
      Container(padding: const EdgeInsets.all(20), decoration: BoxDecoration(gradient: const LinearGradient(colors: [InvestifyApp.deepPurple, InvestifyApp.purple]), borderRadius: BorderRadius.circular(22)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Valor investido', style: TextStyle(color: Colors.white70)),
            const SizedBox(height: 7), Text(brl(invested), style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
            const SizedBox(height: 18), Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('Valor estimado atual', style: TextStyle(color: Colors.white70, fontSize: 12)), const SizedBox(height: 4), Text(brl(current), style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w600))])),
              Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: Colors.white.withValues(alpha: .14), borderRadius: BorderRadius.circular(12)), child: const Icon(Icons.trending_up, color: Colors.white)),
            ]),
          ])),
      const SizedBox(height: 22), const Text('Seus ativos', style: TextStyle(fontSize: 21, fontWeight: FontWeight.bold)),
      const SizedBox(height: 10),
      if (loading) const Padding(padding: EdgeInsets.all(30), child: Center(child: CircularProgressIndicator())),
      if (!loading && error != null) ErrorPanel(message: error!, onRetry: load),
      if (!loading && error == null && investments.isEmpty) const EmptyState(icon: Icons.show_chart, title: 'Nenhum ativo cadastrado', subtitle: 'Adicione um ticker para acompanhar a cotação e a quantidade.'),
      if (!loading) ...investments.map((a) => Card(color: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFFEAE4F0))),
          child: Padding(padding: const EdgeInsets.all(15), child: Row(children: [
            CircleAvatar(backgroundColor: InvestifyApp.palePurple, child: Text(a.ticker.length > 3 ? a.ticker.substring(0, 3) : a.ticker, style: const TextStyle(color: InvestifyApp.purple, fontWeight: FontWeight.bold))),
            const SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(a.ticker, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4), Text('${a.quantity.toStringAsFixed(a.quantity.truncateToDouble() == a.quantity ? 0 : 2)} unidades · Compra ${brl(a.purchase)}', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              const SizedBox(height: 5), Text('Atual ${brl(a.current)}  ·  ${a.variation >= 0 ? '+' : ''}${a.variation.toStringAsFixed(2)}%', style: TextStyle(color: a.variation >= 0 ? Colors.green.shade700 : Colors.red.shade700, fontWeight: FontWeight.w600)),
            ])),
            IconButton(onPressed: () => deleteInvestment(a), tooltip: 'Remover ativo', icon: const Icon(Icons.delete_outline, color: Colors.redAccent)),
          ])))),
    ])),
  );
}

class ProfilePage extends StatefulWidget {
  final VoidCallback onLogout;
  const ProfilePage({super.key, required this.onLogout});
  @override State<ProfilePage> createState() => _ProfilePageState();
}
class _ProfilePageState extends State<ProfilePage> {
  bool loading = true, saving = false; String? error;
  Map<String, dynamic> profile = {};
  final name = TextEditingController(), email = TextEditingController(), phone = TextEditingController(), currentPassword = TextEditingController(), newPassword = TextEditingController();
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    setState(() { loading = true; error = null; });
    try {
      profile = Map<String, dynamic>.from(await ApiClient.instance.request('/auth/perfil'));
      name.text = (profile['nome'] ?? '').toString(); email.text = (profile['email'] ?? '').toString(); phone.text = (profile['telefone'] ?? '').toString();
    } catch (e) { error = e.toString(); }
    if (mounted) setState(() => loading = false);
  }
  Future<void> save() async {
    setState(() { saving = true; error = null; });
    try {
      await ApiClient.instance.request('/auth/perfil', method: 'PUT', body: {
        'nome': name.text.trim(), 'email': email.text.trim(), 'telefone': phone.text.trim(),
        'senhaAtual': currentPassword.text.isEmpty ? null : currentPassword.text,
        'novaSenha': newPassword.text.isEmpty ? null : newPassword.text,
      });
      currentPassword.clear(); newPassword.clear();
      if (mounted) showMessage(context, 'Perfil atualizado com sucesso.');
    } catch (e) { setState(() => error = e.toString()); }
    finally { if (mounted) setState(() => saving = false); }
  }
  Future<void> logout() async {
    try { await ApiClient.instance.request('/auth/logout', method: 'POST'); } catch (_) {}
    widget.onLogout();
  }
  @override void dispose() { name.dispose(); email.dispose(); phone.dispose(); currentPassword.dispose(); newPassword.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) => loading ? const Center(child: CircularProgressIndicator()) : ListView(padding: const EdgeInsets.all(20), children: [
    const Text('Minha conta', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w800)),
    const SizedBox(height: 5), Text('Mantenha seus dados atualizados.', style: TextStyle(color: Colors.grey.shade700)),
    const SizedBox(height: 22),
    Center(child: CircleAvatar(radius: 38, backgroundColor: InvestifyApp.palePurple, child: const Icon(Icons.person, size: 42, color: InvestifyApp.purple))),
    const SizedBox(height: 22),
    TextField(controller: name, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Nome', prefixIcon: Icon(Icons.person_outline))),
    const SizedBox(height: 13), TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'E-mail', prefixIcon: Icon(Icons.mail_outline))),
    const SizedBox(height: 13), TextField(controller: phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Telefone', prefixIcon: Icon(Icons.phone_outlined))),
    const SizedBox(height: 22), const Text('Alterar senha (opcional)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
    const SizedBox(height: 12), TextField(controller: currentPassword, obscureText: true, decoration: const InputDecoration(labelText: 'Senha atual', prefixIcon: Icon(Icons.lock_outline))),
    const SizedBox(height: 13), TextField(controller: newPassword, obscureText: true, decoration: const InputDecoration(labelText: 'Nova senha', prefixIcon: Icon(Icons.lock_reset))),
    if (error != null) ...[const SizedBox(height: 12), ErrorBanner(error!)],
    const SizedBox(height: 20), FilledButton(onPressed: saving ? null : save, child: Padding(padding: const EdgeInsets.all(13), child: saving ? const CircularProgressIndicator(color: Colors.white) : const Text('Salvar alterações'))),
    const SizedBox(height: 10), OutlinedButton.icon(onPressed: logout, icon: const Icon(Icons.logout), label: const Text('Sair da conta'), style: OutlinedButton.styleFrom(foregroundColor: Colors.redAccent, padding: const EdgeInsets.all(13))),
  ]);
}

class ErrorBanner extends StatelessWidget {
  final String message; const ErrorBanner(this.message, {super.key});
  @override Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xFFFFEDEC), borderRadius: BorderRadius.circular(12)), child: Text(message, style: const TextStyle(color: Color(0xFFB42318))));
}
class ErrorPanel extends StatelessWidget {
  final String message; final VoidCallback onRetry;
  const ErrorPanel({super.key, required this.message, required this.onRetry});
  @override Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(20), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)), child: Column(children: [
    const Icon(Icons.cloud_off_outlined, size: 34, color: Colors.grey), const SizedBox(height: 10), Text(message, textAlign: TextAlign.center),
    const SizedBox(height: 12), OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Tentar novamente')),
  ]));
}
class EmptyState extends StatelessWidget {
  final IconData icon; final String title, subtitle;
  const EmptyState({super.key, required this.icon, required this.title, required this.subtitle});
  @override Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 34, horizontal: 14), child: Column(children: [
    Icon(icon, size: 46, color: InvestifyApp.purple.withValues(alpha: .65)), const SizedBox(height: 12),
    Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
    const SizedBox(height: 6), Text(subtitle, style: TextStyle(color: Colors.grey.shade600), textAlign: TextAlign.center),
  ]));
}
Future<bool> confirm(BuildContext context, String title, String message) async =>
    await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(title: Text(title), content: Text(message),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')), FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Excluir'))])) ?? false;
void showMessage(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), behavior: SnackBarBehavior.floating));
}
String brl(double value) => 'R\$ ${value.toStringAsFixed(2).replaceAll('.', ',').replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+,)'), (m) => '${m[1]}.')}';
