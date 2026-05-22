-- ============================================================================
-- Sibbë-2 MVP — Seed data (norm rules + catálogo global)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 10 reglas normativas (CBH-87 / NB 1225001 / NB 777 / NB 55001 / NB-RIDAA)
-- ---------------------------------------------------------------------------
insert into public.norm_rules (code, norm_reference, severity, description, condition_json, suggestion) values
  ('NORM-001', 'CBH-87 Art. 10.1.2', 'CRITICAL',
   'Resistencia hormigón columnas insuficiente (fc'' < 210 kg/cm²)',
   '{"item_contains": ["COLUMNA", "H°A°"], "fc_min": 210}'::jsonb,
   'Cambiar especificación a fc''=210 o superior. Considerar fc''=250 para edificios > 4 plantas.'),
  ('NORM-002', 'CBH-87 Art. 10.1.2', 'CRITICAL',
   'Resistencia H°A° en cimentación insuficiente (fc'' < 210 kg/cm²)',
   '{"item_contains_any": ["ZAPATA", "CIMIENTO", "FUNDACION"], "and_contains": ["H°A°"], "fc_min": 210}'::jsonb,
   'Especificar fc''=210 mínimo. Para suelos agresivos considerar fc''=250.'),
  ('NORM-003', 'CBH-87 Art. 9.2', 'HIGH',
   'Acero de refuerzo grado insuficiente (fy < 4200)',
   '{"item_contains": ["ACERO"], "fy_min": 4200}'::jsonb,
   'Especificar fy=4200 (corrugado). Acero liso fy=2400 solo para estribos en estructuras secundarias.'),
  ('NORM-004', 'CBH-87 Art. 11.4.4', 'HIGH',
   'Losa de H°A° sin acero de refuerzo asociado',
   '{"if_has": ["LOSA"], "then_must_have": ["ACERO"]}'::jsonb,
   'Agregar ítem "ACERO DE REFUERZO fy=4200" al capítulo de losas. Cuantía mínima 0.18% sección bruta.'),
  ('NORM-005', 'CBH-87 Art. 12.3', 'MEDIUM',
   'Recubrimiento mínimo armaduras no especificado',
   '{"tech_spec_mentions": "recubrimiento", "min": {"interior": 2, "exterior": 3, "suelo": 5}}'::jsonb,
   'Recubrimiento: 2cm interior, 3cm exterior, 5cm contacto suelo. Agregar en Especificaciones Técnicas.'),
  ('NORM-006', 'NB 55001 + Ley 16998 Art. 23', 'HIGH',
   'Plan de Seguridad y Salud Ocupacional obligatorio en obras > Bs 1M',
   '{"if_total_cost_gt": 1000000, "then_must_have": ["SEGURIDAD", "SYSO"]}'::jsonb,
   'Agregar ítem "PLAN DE SEGURIDAD Y SALUD OCUPACIONAL" (GLB) al capítulo Varios.'),
  ('NORM-007', 'NB 1225001 Cap. 11', 'CRITICAL',
   'Diseño sísmico obligatorio en edificios > 2 plantas',
   '{"if_plantas_gt": 2, "if_total_cost_gt": 500000, "then_must_have": ["CALCULO ESTRUCTURAL", "ESTUDIO SISMICO"]}'::jsonb,
   'Agregar ítem de cálculo estructural o adjuntar memoria sísmica al expediente.'),
  ('NORM-008', 'NB 777 Sección 6', 'CRITICAL',
   'Instalación eléctrica sin sistema de puesta a tierra',
   '{"if_has_any": ["LUMINARIA", "INTERRUPTOR", "TABLERO ELECTRICO"], "then_must_have_any": ["TIERRA FISICA", "PUESTA A TIERRA", "ATERRAMIENTO"]}'::jsonb,
   'Agregar ítem "SISTEMA DE PUESTA A TIERRA" (GLB) — varilla copperweld + conductor + mejorador de suelo.'),
  ('NORM-009', 'NB-RIDAA / APNB 689', 'MEDIUM',
   'Pendiente mínima desagües sanitarios no especificada',
   '{"if_has": ["TUBERIA SANITARIA"], "tech_must_mention": "pendiente"}'::jsonb,
   'Pendiente mínima: 2% para Ø ≤ 2", 1% para Ø ≥ 4". Documentar en Especificaciones Técnicas.'),
  ('NORM-010', 'CBH-87 Art. 9.1 / NB 011', 'MEDIUM',
   'Tipo de cemento para elementos en contacto con suelo',
   '{"if_has_any": ["ZAPATA", "CIMIENTO", "MURO DE CONTENCION"], "tech_must_mention_any": ["IP-30", "PUZOLANICO", "SULFATO", "MH/HS"]}'::jsonb,
   'Especificar cemento Portland IP-30 (puzolánico) o tipo MH/HS según agresividad del suelo.');

-- ---------------------------------------------------------------------------
-- MATERIALES globales (subset representativo del catálogo de 150)
-- Lista completa en research/catalogo-base.md, precios LP mayo 2026
-- ---------------------------------------------------------------------------
insert into public.materials (code, name, unit, base_price, category) values
  ('MAT-001', 'Cemento Portland IP-30 (bolsa 50kg)', 'BLS', 55, 'aridos_aglomerantes'),
  ('MAT-002', 'Cemento Portland MH/HS resistente sulfatos', 'BLS', 75, 'aridos_aglomerantes'),
  ('MAT-003', 'Arena fina lavada', 'M3', 180, 'aridos_aglomerantes'),
  ('MAT-004', 'Arena gruesa lavada', 'M3', 165, 'aridos_aglomerantes'),
  ('MAT-005', 'Grava 3/4"', 'M3', 195, 'aridos_aglomerantes'),
  ('MAT-006', 'Grava 1"', 'M3', 200, 'aridos_aglomerantes'),
  ('MAT-013', 'Acero corrugado Ø10mm fy=4200', 'KG', 9.00, 'acero'),
  ('MAT-014', 'Acero corrugado Ø12mm fy=4200', 'KG', 9.00, 'acero'),
  ('MAT-015', 'Acero corrugado Ø16mm fy=4200', 'KG', 8.90, 'acero'),
  ('MAT-017', 'Alambre de amarre N°16', 'KG', 14, 'acero'),
  ('MAT-019', 'Ladrillo 6 huecos 12x18x25', 'PZA', 2.20, 'mamposteria'),
  ('MAT-020', 'Ladrillo 6 huecos 18x18x25', 'PZA', 3.00, 'mamposteria'),
  ('MAT-022', 'Ladrillo gambote visto', 'PZA', 4.50, 'mamposteria'),
  ('MAT-027', 'Tabla 1" mara (uso 4 veces)', 'PT', 8, 'encofrado'),
  ('MAT-029', 'Puntal eucalipto 3m', 'PZA', 35, 'encofrado'),
  ('MAT-030', 'Triplex fenólico 18mm 1.22x2.44m', 'PZA', 380, 'encofrado'),
  ('MAT-033', 'Pintura látex interior blanco (galón)', 'GAL', 95, 'pintura_acabados'),
  ('MAT-034', 'Pintura látex exterior blanco (galón)', 'GAL', 145, 'pintura_acabados'),
  ('MAT-037', 'Masilla plástica interior (kg)', 'KG', 12, 'pintura_acabados'),
  ('MAT-045', 'Cerámica nacional piso 30x30', 'M2', 65, 'pisos_ceramicas'),
  ('MAT-047', 'Porcelanato 60x60 nacional', 'M2', 145, 'pisos_ceramicas'),
  ('MAT-049', 'Piso flotante HDF 8.3mm', 'M2', 95, 'pisos_ceramicas'),
  ('MAT-051', 'Pegamento cerámico (bolsa 25kg)', 'BLS', 65, 'pisos_ceramicas'),
  ('MAT-088', 'Cable THHN AWG 14 (rollo 100m)', 'ROLLO', 165, 'electrica'),
  ('MAT-098', 'Panel LED 60x60 60W blanco frío', 'PZA', 145, 'electrica'),
  ('MAT-102', 'Varilla copperweld tierra física 5/8"x1.8m', 'PZA', 95, 'electrica'),
  ('MAT-103', 'Placa drywall estándar 10mm 1.22x2.44m', 'PZA', 95, 'drywall_cielos'),
  ('MAT-073', 'Inodoro nacional con tanque bajo', 'PZA', 480, 'sanitaria_plomeria'),
  ('MAT-077', 'Tubería PVC sanitaria Ø2" (6m)', 'PZA', 95, 'sanitaria_plomeria'),
  ('MAT-079', 'Tubería PVC presión Ø1/2" (6m)', 'PZA', 55, 'sanitaria_plomeria');

-- ---------------------------------------------------------------------------
-- MANO DE OBRA global (precios La Paz, hora-hombre)
-- ---------------------------------------------------------------------------
insert into public.labor (code, name, unit, base_wage) values
  ('MO-001', 'Arquitecto residente', 'HRS', 85),
  ('MO-002', 'Ingeniero civil residente', 'HRS', 95),
  ('MO-003', 'Maestro mayor (capataz)', 'HRS', 45),
  ('MO-004', 'Albañil', 'HRS', 28),
  ('MO-005', 'Ayudante de albañil', 'HRS', 18),
  ('MO-006', 'Encofrador especializado', 'HRS', 32),
  ('MO-007', 'Fierrero (armado acero)', 'HRS', 32),
  ('MO-008', 'Concretero', 'HRS', 30),
  ('MO-009', 'Pintor', 'HRS', 28),
  ('MO-010', 'Yesero / drywallero', 'HRS', 30),
  ('MO-011', 'Cerámista / azulejero', 'HRS', 32),
  ('MO-012', 'Carpintero', 'HRS', 35),
  ('MO-013', 'Carpintero metálico / soldador', 'HRS', 38),
  ('MO-014', 'Plomero', 'HRS', 35),
  ('MO-015', 'Electricista', 'HRS', 35),
  ('MO-016', 'Vidriero', 'HRS', 32),
  ('MO-017', 'Topógrafo', 'HRS', 65),
  ('MO-018', 'Operador maquinaria pesada', 'HRS', 55),
  ('MO-019', 'Peón / ayudante general', 'HRS', 16),
  ('MO-020', 'Sereno (jornal nocturno)', 'DIA', 120);

-- ---------------------------------------------------------------------------
-- EQUIPO global (hora-equipo)
-- ---------------------------------------------------------------------------
insert into public.equipment (code, name, unit, hourly_rate, potencia, costo_basico_hora, costo_repuestos_hora, costo_combustible_hora, costo_otros_hora) values
  ('EQ-001', 'Mezcladora hormigón 1 bolsa', 'HRS', 65, '5 HP', 35, 8, 18, 4),
  ('EQ-002', 'Mezcladora hormigón 2 bolsas', 'HRS', 95, '8 HP', 50, 12, 28, 5),
  ('EQ-003', 'Vibrador inmersión a gasolina', 'HRS', 45, '4 HP', 25, 5, 12, 3),
  ('EQ-005', 'Compactador vibratorio plancha (rana)', 'HRS', 75, '5.5 HP', 40, 10, 20, 5),
  ('EQ-007', 'Retroexcavadora CAT 416', 'HRS', 380, '87 HP', 180, 65, 110, 25),
  ('EQ-011', 'Camión volquete 6m³', 'HRS', 185, '240 HP', 95, 25, 55, 10),
  ('EQ-013', 'Camión mixer 7m³', 'HRS', 295, '280 HP', 150, 40, 85, 20),
  ('EQ-017', 'Cortadora cerámica eléctrica', 'HRS', 25, '1.5 HP', 15, 3, 5, 2),
  ('EQ-018', 'Amoladora 4 1/2"', 'HRS', 18, '0.8 HP', 12, 2, 3, 1),
  ('EQ-019', 'Taladro percutor industrial', 'HRS', 22, '1.2 HP', 14, 3, 4, 1),
  ('EQ-020', 'Martillo eléctrico demoledor', 'HRS', 45, '2.5 HP', 25, 8, 8, 4),
  ('EQ-021', 'Soldadora eléctrica 250A', 'HRS', 55, null, 30, 8, 12, 5),
  ('EQ-024', 'Pistola pintura airless', 'HRS', 38, '1 HP', 20, 5, 8, 5),
  ('EQ-029', 'Estación total (topografía)', 'DIA', 380, null, 250, 50, 30, 50);

-- ---------------------------------------------------------------------------
-- APUs globales (subset representativo del seed de 75)
-- Lista completa en research/apus-seed.md
-- ---------------------------------------------------------------------------
insert into public.apus (code, codigo_sicoes, name, unit, is_global) values
  ('01.01', null, 'Instalación de faenas', 'GLB', true),
  ('01.02', null, 'Replanteo y trazado', 'M2', true),
  ('01.04', '823301', 'Limpieza general y retiro de escombros', 'GLB', true),
  ('01.07', '823294', 'Demolición de muro de ladrillo', 'M2', true),
  ('02.01', null, 'Excavación manual suelo semiduro 0-2m', 'M3', true),
  ('02.03', null, 'Relleno y compactado manual con material del lugar', 'M3', true),
  ('03.01', null, 'Hormigón pobre H10 para nivelación', 'M3', true),
  ('03.03', null, 'Zapata aislada H°A° fc''=210 kg/cm²', 'M3', true),
  ('03.04', null, 'Columna H°A° fc''=210 kg/cm²', 'M3', true),
  ('03.07', null, 'Losa maciza H°A° fc''=210 kg/cm² e=15cm', 'M2', true),
  ('03.12', null, 'Acero de refuerzo fy=4200 kg/cm²', 'KG', true),
  ('04.01', null, 'Muro ladrillo 6 huecos e=12cm', 'M2', true),
  ('04.05', '823296', 'Muro drywall 2 caras 12 cm', 'M2', true),
  ('04.06', '823176', 'Cielo falso drywall 1 cara e=10mm', 'M2', true),
  ('05.03', '823175', 'Pintura látex interior muros 2 manos + masillado', 'M2', true),
  ('05.04', '823174', 'Pintura látex interior cielo falso 2 manos + masillado', 'M2', true),
  ('06.02', null, 'Piso porcelanato 60x60', 'M2', true),
  ('06.03', '823297', 'Piso flotante HDF 8.3mm', 'M2', true),
  ('06.05', '823180', 'Zócalo PVC', 'ML', true),
  ('08.05', '823189', 'Tubería agua potable PVC 1/2"', 'ML', true),
  ('08.06', '823188', 'Tubería sanitaria PVC 2"', 'ML', true),
  ('09.01', '823183', 'Luminaria panel LED 60x60 60W', 'PTO', true),
  ('09.04', '823185', 'Interruptor simple', 'PTO', true),
  ('09.08', null, 'Tablero eléctrico distribución 12 polos', 'PZA', true),
  ('11.04', null, 'Plan de seguridad y salud ocupacional', 'GLB', true);
