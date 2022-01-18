BEGIN;

CREATE SCHEMA IF NOT EXISTS data_manager ;

CREATE TABLE IF NOT EXISTS data_manager.views (
  id                  SERIAL PRIMARY KEY,

  source_id           INTEGER NOT NULL
                        REFERENCES data_manager.sources (id)
                        ON DELETE CASCADE,
  data_type           TEXT,
  interval_version    TEXT, -- could be year, or year-month
  geography_version   TEXT, -- mostly 2 digit state codes, sometimes null
  version             TEXT, -- default 1
  source_url          TEXT, -- external source url
  publisher           TEXT,
  data_table          TEXT, -- schema.table of internal destination
  download_url        TEXT, -- url for client download
  tiles_url           TEXT, -- tiles
  start_date          DATE,
  end_date            DATE,
  last_updated        TIMESTAMP,
  statistics          JSONB
) ;

COMMIT ;
