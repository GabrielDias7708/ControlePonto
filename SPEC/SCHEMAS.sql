-- ==========================================
-- CRIAÇÃO DAS TABELAS DO SISTEMA DE PONTO
-- ==========================================

-- 1. Tabela de Escalas de Trabalho
CREATE TABLE public.escalas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(50) NOT NULL,
    dias_trabalho INT[] NOT NULL, -- Exemplo: [1, 2, 3, 4, 5] para Segunda a Sexta
    carga_horaria_diaria INTERVAL NOT NULL,
    tolerancia_minutos INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Funcionários
CREATE TABLE public.funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    escala_id UUID REFERENCES public.escalas(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Registros de Ponto
CREATE TABLE public.registros_ponto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA_INTERVALO', 'RETORNO_INTERVALO', 'SAIDA')),
    timestamp_registro TIMESTAMP WITH TIME ZONE NOT NULL,
    foto_url TEXT,
    localizacao JSONB, -- Exemplo: {"latitude": -23.5505, "longitude": -46.6333}
    modo_envio VARCHAR(20) DEFAULT 'ONLINE' CHECK (modo_envio IN ('ONLINE', 'OFFLINE_SYNC')),
    hash_validacao VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Alertas e Segurança (Emergências e Ocorrências)
CREATE TABLE public.alertas_seguranca (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
    tipo_alerta VARCHAR(50) NOT NULL, -- Exemplo: 'EMERGENCIA_ACIONADA', 'FALHA_FOTO', 'TENTATIVA_INSPECAO'
    detalhes JSONB,
    foto_evidencia_url TEXT,
    resolvido BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- POLÍTICAS DE SEGURANÇA (Row Level Security)
-- ==========================================

ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_seguranca ENABLE ROW LEVEL SECURITY;

-- Exemplo de política de leitura e inserção aberta para a API pública (Ajustar conforme regras do Supabase Auth)
CREATE POLICY "Permitir leitura de funcionarios" ON public.funcionarios FOR SELECT USING (true);
CREATE POLICY "Permitir insercao de ponto" ON public.registros_ponto FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir insercao de alertas" ON public.alertas_seguranca FOR INSERT WITH CHECK (true);