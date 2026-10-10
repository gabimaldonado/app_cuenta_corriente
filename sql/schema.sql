-- Este archivo arma la base de datos de la app: crea la base y las
-- 6 tablas donde se guarda todo (usuarios, clientas, prendas,
-- entregas, prendas de cada entrega y pagos).

-- PARTE 1: crear la base de datos


-- Crea una base llamada "cuenta_corriente" (si ya existe, no hace nada).
-- utf8mb4 sirve para que se guarden bien los acentos y la ñ.
CREATE DATABASE IF NOT EXISTS cuenta_corriente
  CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- "Entrá a esa base": todo lo que sigue se crea adentro de ella.
USE cuenta_corriente;


-- PARTE 2: borrar las tablas viejas (si existen)
-- Así el archivo se puede ejecutar varias veces sin dar error.
-- NOTA: también borra los datos. Después hay que importar datos_prueba.sql
-- Se borran en este orden porque una tabla no se puede borrar
-- si otra tabla depende de ella.

DROP TABLE IF EXISTS entrega_items;
DROP TABLE IF EXISTS entregas;
DROP TABLE IF EXISTS pagos;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS usuarios;

-- PARTE 3: crear las 6 tablas

-- TABLA 1: usuarios
-- Las personas que pueden entrar a la app (la dueña del negocio).
CREATE TABLE usuarios (
  id             INT AUTO_INCREMENT PRIMARY KEY,  -- número de cada usuario, MySQL lo pone solo
  nombre         VARCHAR(100) NOT NULL,           -- nombre (obligatorio)
  email          VARCHAR(100) NOT NULL UNIQUE,    -- mail para entrar; no puede repetirse
  password_hash  VARCHAR(255) NOT NULL,           -- la contraseña "disfrazada" con password_hash()
  token          VARCHAR(64)  NULL UNIQUE,        -- la "pulsera" que recibe al hacer login
  token_vence    DATETIME     NULL                -- hasta cuándo sirve esa pulsera
) ENGINE=InnoDB;                                  -- InnoDB permite conectar tablas entre sí


-- TABLA 2: clientes

CREATE TABLE clientes (
  id         INT AUTO_INCREMENT PRIMARY KEY,  -- número de cada clienta, MySQL lo pone solo
  nombre     VARCHAR(100) NOT NULL,           -- nombre (obligatorio)
  telefono   VARCHAR(20)  NOT NULL,           -- celular para WhatsApp, ej: 5492914123456
  dni        VARCHAR(15)  NULL UNIQUE,        -- DNI (opcional, pero no puede repetirse)
  direccion  VARCHAR(150) NULL,               -- dirección (opcional)
  notas      VARCHAR(255) NULL,               -- cualquier observación (opcional)
  ciudad     VARCHAR(100) NULL,               -- ciudad (opcional); se convierte en coordenadas
  latitud    DECIMAL(9,6) NULL,               -- las completa la geocodificación (servicio externo)
  longitud   DECIMAL(9,6) NULL,               -- si el servicio no responde, quedan vacías
  activo     TINYINT(1)   NOT NULL DEFAULT 1  -- 1 = activa, 0 = dada de baja
                                              -- (no se borra para no perder lo que compró y pagó)
) ENGINE=InnoDB;


-- TABLA 3: productos

CREATE TABLE productos (
  id           INT AUTO_INCREMENT PRIMARY KEY,                     -- número de cada prenda
  descripcion  VARCHAR(100)  NOT NULL,                             -- ej: "Jean recto"
  talle        VARCHAR(10)   NULL,                                 -- ej: "M" o "38"
  color        VARCHAR(30)   NULL,                                 -- ej: "Azul"
  precio       DECIMAL(10,2) NOT NULL CHECK (precio >= 0),         -- precio con 2 decimales; no puede ser negativo
  stock        INT           NOT NULL DEFAULT 0 CHECK (stock >= 0) -- cuántas hay en el local; no puede ser negativo
) ENGINE=InnoDB;


-- TABLA 4: entregas

CREATE TABLE entregas (
  id          INT      AUTO_INCREMENT PRIMARY KEY,           -- número de cada entrega
  cliente_id  INT      NOT NULL,                             -- QUÉ clienta se las llevó (su id)
  fecha       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- día y hora; si no se indica, pone la de ahora
  estado      ENUM('abierta','cerrada') NOT NULL DEFAULT 'abierta',
              -- solo acepta 2 valores:
              -- abierta = todavía tiene las prendas a prueba
              -- cerrada = ya avisó con cuáles se queda

  -- Conexión con la tabla clientes: cliente_id tiene que ser
  -- el id de una clienta que exista. Si no existe, MySQL no deja guardar.
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
) ENGINE=InnoDB;


-- TABLA 5: entrega_items
-- Cada prenda que va dentro de una entrega.
-- Ej: si Laura se llevó 5 prendas, esa entrega tiene 5 filas acá.
CREATE TABLE entrega_items (
  id               INT AUTO_INCREMENT PRIMARY KEY,   -- número de cada fila
  entrega_id       INT           NOT NULL,           -- a qué entrega pertenece
  producto_id      INT           NOT NULL,           -- qué prenda es
  precio_unitario  DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
                   -- el precio que tenía ESE día (si después sube, no cambia lo que debe)
  estado           ENUM('en_prueba','comprada','devuelta') NOT NULL DEFAULT 'en_prueba',
                   -- solo acepta 3 valores:
                   -- en_prueba = se la llevó a probar (todavía no debe nada)
                   -- comprada  = se la quedó (suma a lo que debe)
                   -- devuelta  = la devolvió (vuelve al local)

  -- Conexión con entregas: si se borra una entrega, se borran también
  -- sus prendas (eso hace ON DELETE CASCADE, "borrado en cascada").
  FOREIGN KEY (entrega_id)  REFERENCES entregas(id) ON DELETE CASCADE,
  -- Conexión con productos: tiene que ser una prenda que exista.
  FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;


-- TABLA 6: pagos

CREATE TABLE pagos (
  id           INT AUTO_INCREMENT PRIMARY KEY,                 -- número de cada pago
  cliente_id   INT           NOT NULL,                         -- qqué clienta pagó
  fecha        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP, -- día y hora del pago
  monto        DECIMAL(10,2) NOT NULL CHECK (monto > 0),       -- cuánto pagó; tiene que ser mayor a 0
  medio        ENUM('efectivo','transferencia','tarjeta','otro') NOT NULL DEFAULT 'efectivo',
               -- cómo pagó (solo esas 4 opciones)
  observacion  VARCHAR(255)  NULL,                             -- nota opcional, ej: "primera cuota"

  -- Conexión con clientes: tiene que ser una clienta que exista.
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
) ENGINE=InnoDB;
