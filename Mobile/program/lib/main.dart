
import 'package:flutter/material.dart';

void main() {
  runApp(const InvestifyApp());
}

class InvestifyApp extends StatelessWidget {
  const InvestifyApp({super.key});

  static const roxo = Color(0xFF8A05BE);
  static const roxoEscuro = Color(0xFF6A0392);
  static const fundo = Color(0xFFF4F6FB);
  static const lilas = Color(0xFFF3E6FA);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Investify',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: fundo,
        colorScheme: ColorScheme.fromSeed(
          seedColor: roxo,
          primary: roxo,
        ),
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int paginaSelecionada = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: InvestifyApp.fundo,
        title: const Text(
          'Investify',
          style: TextStyle(
            color: InvestifyApp.roxo,
            fontSize: 26,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: () {
              setState(() {
                paginaSelecionada = 1;
              });
            },
            tooltip: 'Perfil',
            icon: const Icon(Icons.person_outline),
            color: InvestifyApp.roxo,
          ),
          const SizedBox(width: 8),
        ],
      ),

      body: paginaSelecionada == 0
          ? const HomeContent()
          : const ProfileContent(),

      bottomNavigationBar: NavigationBar(
        backgroundColor: Colors.white,
        indicatorColor: InvestifyApp.lilas,
        selectedIndex: paginaSelecionada,
        onDestinationSelected: (index) {
          setState(() {
            paginaSelecionada = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Principal',
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
}

class HomeContent extends StatelessWidget {
  const HomeContent({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: const [
        SectionWidget(
          titulo: 'Carteiras',
          icone: Icons.account_balance_wallet_outlined,
        ),
        SizedBox(height: 24),
        SectionWidget(
          titulo: 'Usuários',
          icone: Icons.people_outline,
        ),
      ],
    );
  }
}

class SectionWidget extends StatelessWidget {
  final String titulo;
  final IconData icone;

  const SectionWidget({
    super.key,
    required this.titulo,
    required this.icone,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFFE6E6E6),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.025),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                icone,
                color: InvestifyApp.roxo,
                size: 26,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  titulo,
                  style: const TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF333333),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Os dados serão carregados pela API.
          const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'Nenhum dado carregado.',
                style: TextStyle(
                  color: Color(0xFF777777),
                  fontSize: 14,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ProfileContent extends StatelessWidget {
  const ProfileContent({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text(
        'Perfil',
        style: TextStyle(
          color: InvestifyApp.roxo,
          fontSize: 22,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
