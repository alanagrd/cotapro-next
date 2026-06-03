# CotaPro — Next.js + Supabase

## 🚀 Setup em 5 passos

### 1. Criar projeto no Supabase
1. Acesse [app.supabase.com](https://app.supabase.com)
2. Clique em **New Project**
3. Escolha nome, senha e região (Brazil South é a mais próxima)

### 2. Executar o schema SQL
1. No painel do Supabase → **SQL Editor**
2. Copie e execute o conteúdo de `supabase/migrations/001_initial.sql`
3. Aguarde as tabelas, views, triggers e políticas RLS serem criadas

### 3. Configurar variáveis de ambiente
```bash
cp .env.local.example .env.local
```
Edite `.env.local` e preencha:
- `NEXT_PUBLIC_SUPABASE_URL` → Settings → API → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Settings → API → anon key

### 4. Configurar autenticação no Supabase
1. Supabase → **Authentication → Settings**
2. **Site URL**: `http://localhost:3000` (dev) ou seu domínio em prod
3. **Redirect URLs**: adicione `http://localhost:3000/**`
4. (Opcional) Ative provedores OAuth: Google, GitHub

### 5. Instalar dependências e rodar
```bash
cd cotapro-next
npm install
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000)

---

## 📁 Estrutura do projeto

```
cotapro-next/
├── app/
│   ├── (auth)/          ← Login, Signup, Forgot Password
│   │   ├── login/
│   │   ├── signup/
│   │   └── forgot-password/
│   ├── (app)/           ← Páginas autenticadas (com Sidebar)
│   │   ├── dashboard/
│   │   ├── ativos/
│   │   ├── cotas/
│   │   ├── semanas/
│   │   ├── receitas/
│   │   ├── custos/
│   │   ├── rci/
│   │   ├── programas/
│   │   ├── movimentacoes/
│   │   ├── reservas/
│   │   ├── relatorios/
│   │   └── configuracoes/
│   └── layout.tsx
├── components/
│   ├── Sidebar.tsx      ← Navegação lateral
│   └── Topbar.tsx       ← Barra superior
├── lib/supabase/
│   ├── client.ts        ← Cliente browser (hooks/componentes)
│   └── server.ts        ← Cliente server (Server Components)
├── middleware.ts         ← Proteção de rotas + sessão
├── types/
│   └── database.ts      ← Tipos TypeScript do banco
└── supabase/migrations/
    └── 001_initial.sql  ← Schema completo do banco
```

---

## 🗄️ Banco de dados

| Tabela | Descrição |
|---|---|
| `profiles` | Perfil do usuário (extends auth.users) |
| `ativos` | Empreendimentos e programas |
| `cotas` | Frações de multipropriedades |
| `semanas` | Semanas por cota |
| `receitas` | Receitas das locações |
| `custos` | Taxas e despesas |
| `programas_pontos` | Clubes de férias e pontos |
| `movimentacoes_pontos` | Extrato de pontos |
| `reservas_pontos` | Hospedagens com pontos |
| `rci` | Trocas RCI |

### Views calculadas
- `vw_saldo_programas` — saldo atual de pontos por programa
- `vw_receita_por_ativo` — receita líquida agrupada por ativo

### Triggers automáticos
- Ao salvar semana com `valor_recebido > 0` → cria/atualiza receita
- Ao criar reserva com pontos → cria movimentação de saída
- `updated_at` atualizado automaticamente em todas as tabelas

### Segurança (RLS)
- Cada usuário vê **apenas seus próprios dados** (`user_id = auth.uid()`)
- Isolamento completo multi-usuário

---

## 🚢 Deploy (Vercel)

```bash
npm install -g vercel
vercel
```

Configure as variáveis de ambiente no painel da Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Atualize o **Site URL** no Supabase para seu domínio de produção.
