# Relatório de QA - MeOrganiza API

## 1. Introdução
Este documento descreve as atividades de Garantia de Qualidade (QA) realizadas na API do projeto "MeOrganiza". O objetivo foi validar as principais funcionalidades do sistema através de testes automatizados de integração, garantindo a confiabilidade e estabilidade do backend.

## 2. Estratégia de Testes
Foram adotados testes de integração para validar o fluxo completo das requisições HTTP, desde a entrada na API (Rotas/Controllers) até a persistência no banco de dados (Prisma/PostgreSQL).

### 2.1 Ferramentas Utilizadas
- **Jest**: Framework de testes em JavaScript, utilizado para estruturar e executar os testes.
- **Supertest**: Biblioteca para realizar requisições HTTP aos endpoints da API de forma programática.
- **Prisma**: ORM utilizado para interagir com o banco de dados de teste.
- **Cross-env**: Para gerenciar variáveis de ambiente (NODE_ENV=test) de forma compatível entre sistemas operacionais.

### 2.2 Ambiente de Teste
- Foi configurado um banco de dados dedicado para testes (`meorganiza_test`) para evitar interferência nos dados de desenvolvimento ou produção.
- O ambiente de teste é resetado e populado conforme a necessidade de cada suíte de testes.

## 3. Cobertura de Testes
Os testes cobriram os seguintes módulos principais da API:

### 3.1 Autenticação (`auth.test.js`)
- **Registro de Usuário**: Validação da criação de novos usuários (`POST /user`).
- **Login**: Validação da autenticação com credenciais válidas e inválidas (`POST /login`).
- **Segurança**: Verificação do hash de senhas e geração de tokens JWT.

### 3.2 Categorias (`categories.test.js`)
- **Listagem**: Recuperação das categorias do usuário autenticado (`GET /categories`).
- **Criação**: Adição de novas categorias de despesa/receita (`POST /categories`).

### 3.3 Transações (`transactions.test.js`)
- **Criação**: Registro de novas transações financeiras (`POST /transaction`).
- **Listagem**: Consulta do histórico de transações (`GET /transaction`).

### 3.4 Contas (`accounts.test.js`)
- **Criação**: Cadastro de contas bancárias (`POST /account`).
- **Listagem**: Visualização das contas cadastradas (`GET /account`).

## 4. Resultados
Todos os testes implementados foram executados com sucesso.

**Resumo da Execução:**
- **Total de Suítes de Teste**: 4
- **Total de Testes**: 9
- **Status**: ✅ APROVADO (All Passed)

### Evidência de Execução
```bash
PASS  tests/auth.test.js
PASS  tests/categories.test.js
PASS  tests/transactions.test.js
PASS  tests/accounts.test.js

Test Suites: 4 passed, 4 total
Tests:       9 passed, 9 total
Snapshots:   0 total
Time:        1.811 s
```

## 5. Conclusão
A API demonstrou comportamento correto e esperado para os cenários testados. A infraestrutura de testes configurada permite a fácil adição de novos casos de teste no futuro, contribuindo para a manutenção da qualidade do software.
