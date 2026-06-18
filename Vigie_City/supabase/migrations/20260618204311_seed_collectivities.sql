-- Seed communes de test pour VigieCity
-- MIGRATION ONLY — do not execute without review

INSERT INTO public.collectivities (name, insee_code, postal_code) VALUES
  ('Paris 13e arrondissement', '75113', '75013'),
  ('Dunkerque', '59183', '59140'),
  ('Sorède', '66184', '66690'),
  ('Lyon 3e arrondissement', '69383', '69003'),
  ('Marseille 1er arrondissement', '13201', '13001')
ON CONFLICT (insee_code) DO NOTHING;
