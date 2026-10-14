--- Datos de prueba: 10 clientes y 20 prendas ---
--- Ejecutar despues de crear las tablas --- 

INSERT INTO clientes (nombre, telefono, dni, direccion, notas, activo) VALUES
('María Gómez',      '5491145678901', '30123456', 'Av. Corrientes 1234, CABA',     'Prefiere que la llamen por la tarde', 1),
('Lucía Fernández',  '5491156789012', '32456789', 'Calle Mitre 456, Quilmes',      NULL, 1),
('Carolina Pérez',   '5491167890123', '28345678', NULL,                            'Talle M en todo', 1),
('Sofía Rodríguez',  '5491178901234', '35678901', 'San Martín 789, Lanús',         NULL, 1),
('Valentina López',  '5491189012345', '33789012', 'Belgrano 321, Avellaneda',      'Paga siempre en efectivo', 1),
('Julieta Díaz',     '5491190123456', '31890123', NULL,                            NULL, 1),
('Camila Martínez',  '5491101234567', '36901234', 'Rivadavia 654, Morón',          NULL, 1),
('Florencia Sosa',   '5491112345678', '29012345', 'Sarmiento 987, Lomas de Zamora','Pide siempre prendas de verano', 1),
('Agustina Romero',  '5491123456789', '34123456', NULL,                            NULL, 1),
('Paula Torres',     '5491134567890', '27234567', 'Mitre 159, Banfield',           'Clienta antigua, ya no compra', 0);

INSERT INTO productos (descripcion, talle, color, precio, stock, foto, activo) VALUES
('Jean',     '38', 'Azul',    45000.00,  4, NULL, 1),
('Jean',     '40', 'Azul',    45000.00,  6, NULL, 1),
('Jean',     '42', 'Negro',   47000.00,  3, NULL, 1),
('Jean',     '38', 'Celeste', 43000.00,  0, NULL, 1),
('Remera',   'M',  'Blanca',  18000.00, 12, NULL, 1),
('Remera',   'S',  'Negra',   18000.00,  8, NULL, 1),
('Remera',   'L',  'Gris',    19000.00,  5, NULL, 1),
('Remera',   'M',  'Rosa',    18500.00,  7, NULL, 1),
('Campera',  'L',  'Negra',   85000.00,  0, NULL, 1),
('Campera',  'M',  'Verde',   82000.00,  2, NULL, 1),
('Campera',  'S',  'Beige',   79000.00,  3, NULL, 1),
('Vestido',  'S',  'Rojo',    52000.00,  3, NULL, 1),
('Vestido',  'M',  'Negro',   54000.00,  4, NULL, 1),
('Vestido',  'L',  'Floreado',56000.00,  2, NULL, 1),
('Pollera',  'M',  'Negra',   32000.00,  5, NULL, 1),
('Pollera',  'S',  'Jean',    34000.00,  4, NULL, 1),
('Camisa',   'M',  'Celeste', 38000.00,  6, NULL, 1),
('Camisa',   'L',  'Blanca',  38000.00,  0, NULL, 1),
('Buzo',     'M',  'Gris',    41000.00,  9, NULL, 1),
('Buzo',     'L',  'Bordó',   42000.00,  1, NULL, 1);