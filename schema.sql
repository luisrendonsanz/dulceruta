-- Ejecutar una sola vez en Cloudflare D1 > Console.
CREATE TABLE IF NOT EXISTS puntos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  direccion TEXT NOT NULL,
  horario TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('casa','local'))
);
CREATE TABLE IF NOT EXISTS meta (
  id INTEGER PRIMARY KEY CHECK (id=1),
  revision INTEGER NOT NULL DEFAULT 0,
  op_token TEXT
);
INSERT OR IGNORE INTO meta (id,revision,op_token) VALUES (1,0,NULL);
