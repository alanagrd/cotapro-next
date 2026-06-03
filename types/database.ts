export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ── Row types (standalone, sem auto-referência) ───────────────────────────────

type ProfileRow = {
  id: string; nome: string; email: string; telefone: string | null
  avatar_url: string | null; notif_email: boolean; notif_dias: number
  plano: string; created_at: string; updated_at: string
}

type AtivoRow = {
  id: string; user_id: string; nome: string
  tipo: 'Multipropriedade' | 'Programa de Pontos'
  cidade: string | null; estado: string | null; pais: string | null
  portal: string | null; observacoes: string | null
  status: 'Ativo' | 'Inativo'; created_at: string; updated_at: string
}

type CotaRow = {
  id: string; user_id: string; ativo_id: string; unidade: string
  fracao: string | null; descricao: string | null; semanas_por_ano: number
  valor_aquisicao: number; taxa_manutencao: number
  status: 'Ativa' | 'Inativa'; created_at: string; updated_at: string
}

type SemanaRow = {
  id: string; user_id: string; cota_id: string; ano: number
  numero_semana: number; data_inicio: string; data_fim: string
  categoria: 'Baixa' | 'Média' | 'Alta' | 'Super Alta' | null
  status: string; canal: string | null
  valor_previsto: number; valor_recebido: number
  data_prevista: string | null; data_recebimento: string | null
  hospede: string | null; codigo_reserva: string | null
  taxa_comissao: number; observacoes: string | null
  receita_id: string | null; created_at: string; updated_at: string
}

type ReceitaRow = {
  id: string; user_id: string; semana_id: string | null; ativo_id: string | null
  descricao: string | null; valor_bruto: number; taxas: number; valor_liquido: number
  data_competencia: string | null; data_recebimento: string | null
  canal: string | null; status: string; observacoes: string | null
  created_at: string; updated_at: string
}

type CustoRow = {
  id: string; user_id: string; ativo_id: string | null; cota_id: string | null
  ano: number; tipo: string; descricao: string | null; valor: number
  data_pagamento: string | null; status: 'Pago' | 'Pendente'
  observacoes: string | null; created_at: string; updated_at: string
}

type ProgramaPontosRow = {
  id: string; user_id: string; ativo_id: string | null; nome: string
  saldo_inicial: number; data_inicio: string | null; observacoes: string | null
  emoji: string; cor_fundo: string; created_at: string; updated_at: string
}

type MovimentacaoPontosRow = {
  id: string; user_id: string; programa_id: string; data: string
  tipo: 'Entrada' | 'Saída'; categoria: string | null; quantidade: number
  validade: string | null; descricao: string | null; nome_indicado: string | null
  reserva_id: string | null; created_at: string
}

type ReservaPontosRow = {
  id: string; user_id: string; programa_id: string; hotel: string
  cidade: string | null; data_checkin: string | null; data_checkout: string | null
  pontos_utilizados: number; valor_estimado: number; observacoes: string | null
  movimentacao_id: string | null; created_at: string; updated_at: string
}

type RCIRow = {
  id: string; user_id: string; semana_id: string | null; data_troca: string
  pontos_recebidos: number; pontos_utilizados: number
  data_expiracao: string | null; destino: string | null
  observacoes: string | null; created_at: string
}

// ── Database interface ────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Omit<ProfileRow, 'created_at' | 'updated_at'>
        Update: Partial<Omit<ProfileRow, 'created_at' | 'updated_at'>>
      }
      ativos: {
        Row: AtivoRow
        Insert: Omit<AtivoRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<AtivoRow, 'id' | 'created_at' | 'updated_at'>>
      }
      cotas: {
        Row: CotaRow
        Insert: Omit<CotaRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CotaRow, 'id' | 'created_at' | 'updated_at'>>
      }
      semanas: {
        Row: SemanaRow
        Insert: Omit<SemanaRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SemanaRow, 'id' | 'created_at' | 'updated_at'>>
      }
      receitas: {
        Row: ReceitaRow
        Insert: Omit<ReceitaRow, 'id' | 'valor_liquido' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ReceitaRow, 'id' | 'valor_liquido' | 'created_at' | 'updated_at'>>
      }
      custos: {
        Row: CustoRow
        Insert: Omit<CustoRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CustoRow, 'id' | 'created_at' | 'updated_at'>>
      }
      programas_pontos: {
        Row: ProgramaPontosRow
        Insert: Omit<ProgramaPontosRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ProgramaPontosRow, 'id' | 'created_at' | 'updated_at'>>
      }
      movimentacoes_pontos: {
        Row: MovimentacaoPontosRow
        Insert: Omit<MovimentacaoPontosRow, 'id' | 'created_at'>
        Update: Partial<Omit<MovimentacaoPontosRow, 'id' | 'created_at'>>
      }
      reservas_pontos: {
        Row: ReservaPontosRow
        Insert: Omit<ReservaPontosRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ReservaPontosRow, 'id' | 'created_at' | 'updated_at'>>
      }
      rci: {
        Row: RCIRow
        Insert: Omit<RCIRow, 'id' | 'created_at'>
        Update: Partial<Omit<RCIRow, 'id' | 'created_at'>>
      }
    }
    Views: {
      vw_saldo_programas: {
        Row: { id: string; user_id: string; nome: string; saldo_inicial: number; total_movimentacoes: number; saldo_atual: number }
      }
      vw_receita_por_ativo: {
        Row: { ativo_id: string; user_id: string; ativo_nome: string; receita_liquida_total: number; receita_bruta_total: number; total_receitas: number }
      }
    }
  }
}
