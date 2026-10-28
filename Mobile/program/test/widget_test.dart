import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:program/main.dart';

void main() {
  testWidgets('tela de login apresenta campos e ação de entrada', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: LoginPage(onLogin: _noop)));
    expect(find.text('Investify'), findsOneWidget);
    expect(find.text('Entrar'), findsOneWidget);
    expect(find.text('Criar uma conta'), findsOneWidget);
  });
}

void _noop() {}
