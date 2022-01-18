import { join } from 'path';

import { Client } from 'pg';
import dotenv from 'dotenv';

import npmrdsMetadata from './sources_metadata/npmrds';
import tmcIdentificationMetadata from './sources_metadata/tmc_identification';
import npmrdsShapefileMetadata from './sources_metadata/npmrds_shapefile';
import tmcMetadataMetadata from './sources_metadata/tmc_metadata';

import { SourceMetadata } from '../domain/types';

const node_env = process.env.NODE_ENV || 'development';

const configPath =
  node_env === 'production'
    ? join(__dirname, '../../config/postgres.env.pluto')
    : join(__dirname, '../../config/postgres.env.dev');

dotenv.config({ path: configPath });

const db = new Client();

async function loadSourceMetadata({
  name,
  update_interval,
  category,
  description,
}: SourceMetadata) {
  const sql = `
    INSERT INTO data_manager.sources (
      name,
      update_interval,
      category,
      description,
      statistics,
      metadata
    )
      VALUES ( $1, $2, $3, $4, $5, $6 ) 
      ON CONFLICT DO NOTHING
    ;
  `;

  await db.query(sql, [
    name,
    update_interval,
    category,
    description,
    null,
    null,
  ]);
}

(async function main() {
  await db.connect();

  await loadSourceMetadata(npmrdsMetadata);
  await loadSourceMetadata(tmcIdentificationMetadata);
  await loadSourceMetadata(npmrdsShapefileMetadata);
  await loadSourceMetadata(tmcMetadataMetadata);

  await db.end();
})();
