-- Migra valores antigos do campo plano para a nova nomenclatura
UPDATE profiles SET plano = 'plus' WHERE plano IN ('pro', 'enterprise');

-- Garante que valores inválidos virem 'free'
UPDATE profiles SET plano = 'free' WHERE plano NOT IN ('free', 'basic', 'plus');

-- Adiciona constraint para os valores válidos
ALTER TABLE profiles
  ADD CONSTRAINT profiles_plano_check CHECK (plano IN ('free', 'basic', 'plus'));
