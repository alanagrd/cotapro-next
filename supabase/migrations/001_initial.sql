-- ============================================================
-- CotaPro — Schema PostgreSQL + Supabase RLS
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Profiles (extends auth.users) ──────────────────────────────────────────
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL,
  telefone    TEXT,
  avatar_url  TEXT,
  notif_email BOOLEAN DEFAULT TRUE,
  notif_dias  INT DEFAULT 7,
  plano       TEXT DEFAULT 'free', -- free | pro | enterprise
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Ativos ──────────────────────────────────────────────────────────────────
CREATE TABLE ativos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('Multipropriedade','Programa de Pontos')),
  cidade      TEXT,
  estado      TEXT,
  pais        TEXT DEFAULT 'Brasil',
  portal      TEXT,
  observacoes TEXT,
  status      TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo','Inativo')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Cotas ───────────────────────────────────────────────────────────────────
CREATE TABLE cotas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ativo_id        UUID NOT NULL REFERENCES ativos(id) ON DELETE CASCADE,
  unidade         TEXT NOT NULL,
  fracao          TEXT DEFAULT '1/52',
  descricao       TEXT,
  semanas_por_ano INT DEFAULT 1,
  valor_aquisicao NUMERIC(12,2) DEFAULT 0,
  taxa_manutencao NUMERIC(12,2) DEFAULT 0,
  status          TEXT DEFAULT 'Ativa' CHECK (status IN ('Ativa','Inativa')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Semanas ─────────────────────────────────────────────────────────────────
CREATE TABLE semanas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cota_id         UUID NOT NULL REFERENCES cotas(id) ON DELETE CASCADE,
  ano             INT NOT NULL,
  numero_semana   INT NOT NULL CHECK (numero_semana BETWEEN 1 AND 53),
  data_inicio     DATE NOT NULL,
  data_fim        DATE NOT NULL,
  categoria       TEXT CHECK (categoria IN ('Baixa','Média','Alta','Super Alta')),
  status          TEXT DEFAULT 'Disponível' CHECK (
    status IN ('Disponível','Pool','Reservada','Locada','Uso Próprio','RCI','Perdida','Cancelada')
  ),
  canal           TEXT,
  valor_previsto  NUMERIC(12,2) DEFAULT 0,
  valor_recebido  NUMERIC(12,2) DEFAULT 0,
  data_prevista   DATE,
  data_recebimento DATE,
  hospede         TEXT,
  codigo_reserva  TEXT,
  taxa_comissao   NUMERIC(5,2) DEFAULT 0,
  observacoes     TEXT,
  receita_id      UUID, -- link to receitas (set after receita is created)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Receitas ────────────────────────────────────────────────────────────────
CREATE TABLE receitas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semana_id       UUID REFERENCES semanas(id) ON DELETE SET NULL,
  ativo_id        UUID REFERENCES ativos(id) ON DELETE SET NULL,
  descricao       TEXT,
  valor_bruto     NUMERIC(12,2) NOT NULL DEFAULT 0,
  taxas           NUMERIC(12,2) DEFAULT 0,
  valor_liquido   NUMERIC(12,2) GENERATED ALWAYS AS (valor_bruto - taxas) STORED,
  data_competencia DATE,
  data_recebimento DATE,
  canal           TEXT,
  status          TEXT DEFAULT 'Previsto' CHECK (
    status IN ('Previsto','Recebido','Parcial','Cancelado')
  ),
  observacoes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Custos ──────────────────────────────────────────────────────────────────
CREATE TABLE custos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ativo_id        UUID REFERENCES ativos(id) ON DELETE SET NULL,
  cota_id         UUID REFERENCES cotas(id) ON DELETE SET NULL,
  ano             INT NOT NULL,
  tipo            TEXT NOT NULL,
  descricao       TEXT,
  valor           NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_pagamento  DATE,
  status          TEXT DEFAULT 'Pendente' CHECK (status IN ('Pago','Pendente')),
  observacoes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Programas de Pontos ─────────────────────────────────────────────────────
CREATE TABLE programas_pontos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ativo_id        UUID REFERENCES ativos(id) ON DELETE SET NULL,
  nome            TEXT NOT NULL,
  saldo_inicial   INT DEFAULT 0,
  data_inicio     DATE,
  observacoes     TEXT,
  emoji           TEXT DEFAULT '⭐',
  cor_fundo       TEXT DEFAULT '#fef9c3',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Movimentações de Pontos ─────────────────────────────────────────────────
CREATE TABLE movimentacoes_pontos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  programa_id     UUID NOT NULL REFERENCES programas_pontos(id) ON DELETE CASCADE,
  data            DATE NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('Entrada','Saída')),
  categoria       TEXT CHECK (
    categoria IN ('Compra','Bônus','Indicação','Utilização','Expiração','Ajuste')
  ),
  quantidade      INT NOT NULL CHECK (quantidade > 0),
  validade        DATE,
  descricao       TEXT,
  nome_indicado   TEXT,
  reserva_id      UUID, -- link to reservas_pontos
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Reservas com Pontos ─────────────────────────────────────────────────────
CREATE TABLE reservas_pontos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  programa_id         UUID NOT NULL REFERENCES programas_pontos(id) ON DELETE CASCADE,
  hotel               TEXT NOT NULL,
  cidade              TEXT,
  data_checkin        DATE,
  data_checkout       DATE,
  pontos_utilizados   INT DEFAULT 0,
  valor_estimado      NUMERIC(12,2) DEFAULT 0,
  observacoes         TEXT,
  movimentacao_id     UUID REFERENCES movimentacoes_pontos(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── RCI ─────────────────────────────────────────────────────────────────────
CREATE TABLE rci (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semana_id           UUID REFERENCES semanas(id) ON DELETE SET NULL,
  data_troca          DATE NOT NULL,
  pontos_recebidos    INT DEFAULT 0,
  pontos_utilizados   INT DEFAULT 0,
  data_expiracao      DATE,
  destino             TEXT,
  observacoes         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VIEWS úteis
-- ============================================================

-- Saldo atual por programa (calculado)
CREATE OR REPLACE VIEW vw_saldo_programas AS
SELECT
  p.id,
  p.user_id,
  p.nome,
  p.saldo_inicial,
  COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' THEN m.quantidade ELSE -m.quantidade END), 0) AS total_movimentacoes,
  p.saldo_inicial + COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' THEN m.quantidade ELSE -m.quantidade END), 0) AS saldo_atual
FROM programas_pontos p
LEFT JOIN movimentacoes_pontos m ON m.programa_id = p.id
GROUP BY p.id, p.user_id, p.nome, p.saldo_inicial;

-- Receita por ativo (agrupada)
CREATE OR REPLACE VIEW vw_receita_por_ativo AS
SELECT
  a.id AS ativo_id,
  a.user_id,
  a.nome AS ativo_nome,
  COALESCE(SUM(r.valor_liquido), 0) AS receita_liquida_total,
  COALESCE(SUM(r.valor_bruto), 0)   AS receita_bruta_total,
  COUNT(r.id)                        AS total_receitas
FROM ativos a
LEFT JOIN receitas r ON r.ativo_id = a.id AND r.status IN ('Recebido','Parcial')
GROUP BY a.id, a.user_id, a.nome;

-- ============================================================
-- TRIGGERS — updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','ativos','cotas','semanas','receitas','custos',
    'programas_pontos','reservas_pontos']
  LOOP
    EXECUTE format('
      CREATE TRIGGER trg_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

-- ── Trigger: criar receita automaticamente ao preencher semana ───────────────
CREATE OR REPLACE FUNCTION trg_semana_create_receita()
RETURNS TRIGGER AS $$
DECLARE new_receita_id UUID;
BEGIN
  -- Só executa quando valor_recebido é preenchido pela primeira vez
  IF NEW.valor_recebido > 0 AND (OLD.valor_recebido IS NULL OR OLD.valor_recebido = 0) THEN
    INSERT INTO receitas (user_id, semana_id, ativo_id, descricao, valor_bruto, taxas,
      data_competencia, data_recebimento, canal, status)
    SELECT
      NEW.user_id,
      NEW.id,
      c.ativo_id,
      'Sem. ' || NEW.numero_semana || '/' || NEW.ano,
      NEW.valor_recebido,
      ROUND(NEW.valor_recebido * NEW.taxa_comissao / 100, 2),
      NEW.data_inicio,
      NEW.data_recebimento,
      NEW.canal,
      'Recebido'
    FROM cotas c WHERE c.id = NEW.cota_id
    RETURNING id INTO new_receita_id;

    -- Link back
    NEW.receita_id = new_receita_id;
  END IF;

  -- Atualiza receita existente se valor mudou
  IF NEW.valor_recebido > 0 AND OLD.valor_recebido > 0 AND NEW.valor_recebido <> OLD.valor_recebido
     AND NEW.receita_id IS NOT NULL THEN
    UPDATE receitas SET
      valor_bruto = NEW.valor_recebido,
      taxas = ROUND(NEW.valor_recebido * NEW.taxa_comissao / 100, 2),
      data_recebimento = NEW.data_recebimento,
      canal = NEW.canal
    WHERE id = NEW.receita_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_semana_receita
BEFORE UPDATE ON semanas
FOR EACH ROW EXECUTE FUNCTION trg_semana_create_receita();

-- ── Trigger: criar movimentação ao criar reserva com pontos ─────────────────
CREATE OR REPLACE FUNCTION trg_reserva_create_movimentacao()
RETURNS TRIGGER AS $$
DECLARE new_mov_id UUID;
BEGIN
  IF NEW.pontos_utilizados > 0 AND NEW.movimentacao_id IS NULL THEN
    INSERT INTO movimentacoes_pontos (user_id, programa_id, data, tipo, categoria,
      quantidade, descricao, reserva_id)
    VALUES (
      NEW.user_id, NEW.programa_id,
      COALESCE(NEW.data_checkin, CURRENT_DATE),
      'Saída', 'Utilização',
      NEW.pontos_utilizados,
      'Reserva: ' || NEW.hotel,
      NEW.id
    ) RETURNING id INTO new_mov_id;

    NEW.movimentacao_id = new_mov_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reserva_movimentacao
BEFORE INSERT ON reservas_pontos
FOR EACH ROW EXECUTE FUNCTION trg_reserva_create_movimentacao();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — cada usuário vê só seus dados
-- ============================================================
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ativos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE semanas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE receitas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE custos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE programas_pontos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_pontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas_pontos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rci                ENABLE ROW LEVEL SECURITY;

-- Políticas genéricas (user_id = auth.uid())
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['ativos','cotas','semanas','receitas','custos',
    'programas_pontos','movimentacoes_pontos','reservas_pontos','rci']
  LOOP
    EXECUTE format('
      CREATE POLICY "%I_select" ON %I FOR SELECT USING (user_id = auth.uid());
      CREATE POLICY "%I_insert" ON %I FOR INSERT WITH CHECK (user_id = auth.uid());
      CREATE POLICY "%I_update" ON %I FOR UPDATE USING (user_id = auth.uid());
      CREATE POLICY "%I_delete" ON %I FOR DELETE USING (user_id = auth.uid());
    ', t, t, t, t, t, t, t, t);
  END LOOP;
END $$;

-- Profile: o usuário só acessa o próprio perfil
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- ── Trigger: criar profile automaticamente ao registrar ─────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- INDEXES para performance
-- ============================================================
CREATE INDEX idx_ativos_user        ON ativos(user_id);
CREATE INDEX idx_cotas_ativo        ON cotas(ativo_id);
CREATE INDEX idx_semanas_cota       ON semanas(cota_id);
CREATE INDEX idx_semanas_status     ON semanas(status);
CREATE INDEX idx_semanas_data       ON semanas(data_inicio);
CREATE INDEX idx_receitas_ativo     ON receitas(ativo_id);
CREATE INDEX idx_receitas_semana    ON receitas(semana_id);
CREATE INDEX idx_receitas_competencia ON receitas(data_competencia);
CREATE INDEX idx_movimentacoes_prog ON movimentacoes_pontos(programa_id);
CREATE INDEX idx_custos_ativo       ON custos(ativo_id);
