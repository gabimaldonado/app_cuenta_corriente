-- Consulta para calcular el saldo de cuenta corriente de las clientes
-- Lógica: Saldo = Total Comprado (prendas confirmadas) - Total Pagado

-- 1. Saldo de todas los clientes activas (para el panel de deudores)
SELECT 
  c.id,
  c.nombre,
  c.telefono,
  COALESCE((
    SELECT SUM(ei.precio_unitario)
    FROM entrega_items ei
    JOIN entregas e ON e.id = ei.entrega_id
    WHERE e.cliente_id = c.id AND ei.estado = 'comprada'
  ), 0) AS total_compras,
  COALESCE((
    SELECT SUM(p.monto)
    FROM pagos p
    WHERE p.cliente_id = c.id
  ), 0) AS total_pagos,
  (
    COALESCE((
      SELECT SUM(ei.precio_unitario)
      FROM entrega_items ei
      JOIN entregas e ON e.id = ei.entrega_id
      WHERE e.cliente_id = c.id AND ei.estado = 'comprada'
    ), 0) -
    COALESCE((
      SELECT SUM(p.monto)
      FROM pagos p
      WHERE p.cliente_id = c.id
    ), 0)
  ) AS saldo
FROM clientes c
WHERE c.activo = 1;

-- 2. Saldo de un cliente en particular (para la ficha del cliente)
-- Se reemplaza el ID por el parametro :cliente_id
SELECT 
  c.id,
  c.nombre,
  c.telefono,
  COALESCE((
    SELECT SUM(ei.precio_unitario)
    FROM entrega_items ei
    JOIN entregas e ON e.id = ei.entrega_id
    WHERE e.cliente_id = c.id AND ei.estado = 'comprada'
  ), 0) AS total_compras,
  COALESCE((
    SELECT SUM(p.monto)
    FROM pagos p
    WHERE p.cliente_id = c.id
  ), 0) AS total_pagos,
  (
    COALESCE((
      SELECT SUM(ei.precio_unitario)
      FROM entrega_items ei
      JOIN entregas e ON e.id = ei.entrega_id
      WHERE e.cliente_id = c.id AND ei.estado = 'comprada'
    ), 0) -
    COALESCE((
      SELECT SUM(p.monto)
      FROM pagos p
      WHERE p.cliente_id = c.id
    ), 0)
  ) AS saldo
FROM clientes c
WHERE c.id = :cliente_id;