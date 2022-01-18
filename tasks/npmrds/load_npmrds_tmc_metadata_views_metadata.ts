import { join } from 'path';

import { Client } from 'pg';
import format from 'pg-format';
import dotenv from 'dotenv';
import _ from 'lodash';

import {
  StateAbbreviation,
  Year,
  TimestampString,
  PreviousVersionComparisonResult,
} from '../domain/types';

const node_env = process.env.NODE_ENV || 'development';

const configPath =
  node_env === 'production'
    ? join(__dirname, '../../config/postgres.env.pluto')
    : join(__dirname, '../../config/postgres.env.dev');

dotenv.config({ path: configPath });

const db = new Client();

const tmcMetadataSourceName = 'NPMRDS:TMC_METADATA';
const data_type = 'TABULAR';
const interval_version = 'YEAR';
const publisher = 'AVAIL';

type TmcMetadataViewPreviousVersionComparison =
  null | PreviousVersionComparisonResult;

type TmcMetadataViewStatistics = {
  previous_version_comparison: TmcMetadataViewPreviousVersionComparison;
};

type TimestampsByStateByYear = Record<
  StateAbbreviation,
  Record<Year, Record<TimestampString, TmcMetadataViewStatistics>>
>;

async function getTmcMetadataSourceId(): Promise<number> {
  const sql = `
    SELECT
        id
      FROM data_manager.sources
      WHERE ( name = $1 )
  `;

  const {
    rows: [{ id }],
  } = await db.query(sql, [tmcMetadataSourceName]);

  return id;
}

async function getTmcMetadataDownloadTimestamps(): Promise<TimestampsByStateByYear> {
  const yearFrom = 'tmc_metadata_'.length + 1;
  const timestampFrom = 'tmc_metadata_YYYY_v'.length + 1;

  const sql = `
    SELECT
        schemaname AS state,
        substring( tablename from ${yearFrom} for 4  )::SMALLINT as year,
        substring( tablename from ${timestampFrom} for 14 ) AS creation_timestamp_str
      FROM pg_tables
      WHERE (
        ( schemaname ~ '^[a-z]{2}$' )
        AND
        ( tablename ~ '^tmc_metadata_\\d{4}_v' )
      )
      ORDER BY 1, 2, 3;
  `;

  const { rows } = await db.query(sql);

  const byStateByYear = rows.reduce(
    (acc, { state, year, creation_timestamp_str }) => {
      acc[state] = acc[state] || {};
      acc[state][year] = acc[state][year] || {};

      acc[state][year][creation_timestamp_str] = {};

      return acc;
    },
    {},
  );

  return byStateByYear;
}

async function getPreviousVersionComparisons(
  byStateByYear: TimestampsByStateByYear,
) {
  const states = Object.keys(byStateByYear);

  for (const state of states) {
    console.log('state:', state);
    const years = Object.keys(byStateByYear[state]).sort();

    for (const year of years) {
      console.log('  year:', year);

      const timestamps = Object.keys(byStateByYear[state][year]).sort();

      console.log(JSON.stringify(timestamps, null, 4));

      for (let i = 0; i < timestamps.length; ++i) {
        const timestamp = timestamps[i];

        console.log('    timestamp:', timestamp);

        if (i === 0) {
          byStateByYear[state][year][timestamp].previous_version_comparison =
            PreviousVersionComparisonResult.INITIAL_VERSION;
          continue;
        }

        const previousTimestamp = timestamps[i - 1];

        const prevTableName = `tmc_metadata_${year}_v${previousTimestamp}`;
        const curTableName = `tmc_metadata_${year}_v${timestamp}`;

        const schemaChangedSql = `
          SELECT EXISTS (

            SELECT
                column_name
              FROM (
                SELECT
                    column_name
                  FROM information_schema.columns
                  WHERE (
                    ( table_schema = $1 )
                    AND
                    ( table_name = $2 )
                  )

                EXCEPT ALL

                SELECT
                    column_name
                  FROM information_schema.columns
                  WHERE (
                    ( table_schema = $1 )
                    AND
                    ( table_name = $3 )
                  )
              ) AS t

            UNION ALL

            SELECT
                column_name
              FROM (
                SELECT
                    column_name
                  FROM information_schema.columns
                  WHERE (
                    ( table_schema = $1 )
                    AND
                    ( table_name = $3 )
                  )

                EXCEPT ALL

                SELECT
                    column_name
                  FROM information_schema.columns
                  WHERE (
                    ( table_schema = $1 )
                    AND
                    ( table_name = $2 )
                  )
              ) AS t

          ) AS schema_changed ;
        `;

        const {
          rows: [{ schema_changed }],
        } = await db.query(schemaChangedSql, [
          state,
          prevTableName,
          curTableName,
        ]);

        if (schema_changed) {
          byStateByYear[state][year][timestamp].previous_version_comparison =
            PreviousVersionComparisonResult.SCHEMA_CHANGED;
          continue;
        }

        const {
          rows: [{ column_names }],
        } = await db.query(
          `
            SELECT
                json_agg(column_name) AS column_names
              FROM information_schema.columns
              WHERE (
                ( table_schema = $1 )
                AND
                ( table_name = $2 )
              )
          `,
          [state, curTableName],
        );

        const columnNamesPlaceHolders = column_names.map((col: string) =>
          col === 'bounding_box' ? '%I::TEXT AS bounding_box' : '%I',
        );

        const dataChangedSql = format(
          `
          SELECT EXISTS (
            SELECT
                ${columnNamesPlaceHolders} 
              FROM %I.%I

            EXCEPT ALL

            SELECT
                ${columnNamesPlaceHolders} 
              FROM %I.%I
          ) AS data_changed ;
        `,
          ...column_names,
          state,
          prevTableName,
          ...column_names,
          state,
          curTableName,
        );

        const {
          rows: [{ data_changed }],
        } = await db.query(dataChangedSql);

        if (data_changed) {
          byStateByYear[state][year][timestamp].previous_version_comparison =
            PreviousVersionComparisonResult.DATA_CHANGED;
          continue;
        }

        byStateByYear[state][year][timestamp].previous_version_comparison =
          PreviousVersionComparisonResult.UNCHANGED;
      }
    }
  }

  return byStateByYear;
}

async function insertTmcMetadataViewsMetadata(
  byStateByYear: TimestampsByStateByYear,
) {
  const tmcMetadataSourceId = await getTmcMetadataSourceId();

  const sql = format(
    `
      INSERT INTO data_manager.views (
        source_id,
        data_type,
        interval_version,
        publisher,

        geography_version,
        version,
        start_date,
        end_date,
        last_updated,
        data_table,
        statistics
      ) VALUES (
         %L,
         %L,
         %L,
         %L,
         
         $1,
         $2,
         $3::DATE,
         $4::DATE,
         $5::TIMESTAMP,
         $6,
         $7
      ) ;
    `,
    tmcMetadataSourceId,
    data_type,
    interval_version,
    publisher,
  );

  const states = Object.keys(byStateByYear);

  for (const state of states) {
    const {
      rows: [{ state_code }],
    } = await db.query(
      `
        SELECT DISTINCT
            state_code
          FROM public.fips_codes
          WHERE ( state = $1 )
      `,
      [state],
    );

    const years = Object.keys(byStateByYear[state]).sort();

    for (let i = 0; i < years.length; ++i) {
      const year = years[i];

      const timestamps = Object.keys(byStateByYear[state][year]).sort();

      for (let j = 0; j < timestamps.length; ++j) {
        const timestamp = timestamps[j];

        const statistics = byStateByYear[state][year][timestamp];

        const formattedTimestamp =
          timestamp.substring(0, 8) + 'T' + timestamp.substring(8);

        await db.query(sql, [
          state_code,
          i,
          `${year}-01-01`,
          `${year}-12-31`,
          formattedTimestamp,
          `"${state}".tmc_metadata_${year}_v${timestamp}`,
          statistics,
        ]);
      }
    }
  }
}

(async function main() {
  try {
    await db.connect();

    const byStateByYear = await getTmcMetadataDownloadTimestamps();

    await getPreviousVersionComparisons(byStateByYear);

    await db.query('BEGIN;');
    await insertTmcMetadataViewsMetadata(byStateByYear);
    await db.query('COMMIT;');
  } catch (err) {
    console.error(err);
  } finally {
    await db.end();
  }
})();
