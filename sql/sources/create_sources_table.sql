BEGIN;

CREATE SCHEMA IF NOT EXISTS data_manager ;

CREATE TABLE IF NOT EXISTS data_manager.sources (
  id                SERIAL PRIMARY KEY,

  name              TEXT NOT NULL UNIQUE,
  update_interval   TEXT,
  category          TEXT[],
  description       TEXT,
  statistics        JSONB,
  metadata          JSONB
) ;

COMMIT ;
