INSERT INTO public.categories (name, slug, sort_order)
VALUES
  ('Fully Electric Bed', 'fully-electric-bed', 0),
  ('Semi Electric Bed', 'semi-electric-bed', 1),
  ('Bariatric Bed', 'bariatric-bed', 2),
  ('Burn Bed', 'burn-bed', 3),
  ('Birthing Bed', 'birthing-bed', 4),

  ('EMS Stretcher', 'ems-stretcher', 5),
  ('ER Stretcher', 'er-stretcher', 6),
  ('Surgery Stretcher', 'surgery-stretcher', 7),
  ('Bariatric Stretcher', 'bariatric-stretcher', 8),
  ('EVAC Stretcher', 'evac-stretcher', 9),
  ('Eye Surgery Stretcher', 'eye-surgery-stretcher', 10),
  ('Birthing Stretcher', 'birthing-stretcher', 11),

  ('Bed Side Table', 'bedside-table', 12),
  ('Bed Over Table', 'bed-over-table', 13),
  ('Wheel Chair', 'wheelchair', 14),
  ('Patient Recliner', 'patient-recliner', 15)
ON CONFLICT (name) DO NOTHING;
