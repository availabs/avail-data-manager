/*
  See:
    * https://www.postgresql.org/docs/11/catalog-pg-attribute.html
    * https://gis.stackexchange.com/a/94083
*/
BEGIN ;

CREATE SCHEMA IF NOT EXISTS _data_manager_admin ;

--  DROP VIEW IF EXISTS _data_manager_admin.table_column_types CASCADE ;
CREATE OR REPLACE VIEW _data_manager_admin.table_column_types
  AS
    SELECT
        a.relnamespace::regnamespace::TEXT AS table_schema,
        a.relname::TEXT AS table_name,
        b.attname AS column_name,
        format_type(b.atttypid, b.atttypmod) AS column_type,
        b.attnotnull AS column_not_null,
        b.attnum AS column_number
      FROM pg_catalog.pg_class AS a
        INNER JOIN pg_catalog.pg_attribute AS b
          ON (a.oid = b.attrelid)
      WHERE (
        ( NOT b.attisdropped )
        AND
        ( b.attnum > 0 )
      )
;

--  DROP VIEW IF EXISTS _data_manager_admin.table_column_types_with_json_types CASCADE ;
CREATE OR REPLACE VIEW _data_manager_admin.table_column_types_with_json_types
  AS
    SELECT
        table_schema,
        table_name,
        column_name,
        column_type,
        column_not_null,
        column_number,

        CASE
          WHEN ( is_array )
            THEN
              jsonb_build_object(
                'type',       'array',
                'items',      item_type,
                '$comment',   column_type
              )
            ELSE item_type
        END AS json_type
      FROM (
        SELECT
            a.table_schema,
            a.table_name,
            a.column_name,
            a.column_type,
            a.column_not_null,
            a.column_number,

            CASE

              WHEN ( b.json_schema IS NOT NULL )
                THEN b.json_schema

              WHEN (
                a.column_type = 'boolean'
              ) THEN
                  jsonb_build_object(
                    'type',   'boolean'
                  )

            -- Character Types (See https://www.postgresql.org/docs/11/datatype-character.html)
              WHEN (
                starts_with(a.column_type, '"char"')
              ) THEN
                  jsonb_build_object(
                    'type',       'string',
                    'minLength',  1,
                    'maxLength',  1
                  )

              WHEN (
                starts_with(a.column_type, 'character(')
              ) THEN
                  jsonb_build_object(
                    'type',       'string',
                    'minLength',  substring(a.column_type, '\d+')::INTEGER,
                    'maxLength',  substring(a.column_type, '\d+')::INTEGER,
                    '$comment',   regexp_replace(a.column_type, '\[\]$', '')
                  )

              -- variable-length with limit
              WHEN (
                starts_with(a.column_type, 'character varying(')
              ) THEN
                  jsonb_build_object(
                    'type',       'string',
                    'minLength',  0,
                    'maxLength',  substring(a.column_type, '\d+')::INTEGER,
                    '$comment',   regexp_replace(a.column_type, '\[\]$', '')
                  )

              WHEN (
                ( starts_with(a.column_type, 'character varying') )
                OR
                ( starts_with(a.column_type, 'text' ) )
              ) THEN
                  jsonb_build_object(
                    'type',       'string',
                    'minLength',  0,
                    '$comment',   regexp_replace(a.column_type, '\[\]$', '')
                  )

            -- Numeric Types: See https://www.postgresql.org/docs/11/datatype-numeric.html
              WHEN (
                starts_with(a.column_type, 'smallint')
              ) THEN
                  jsonb_build_object(
                    'type',       'integer',
                    'minimum',    -32768,
                    'maximum',    32767,
                    '$comment',   regexp_replace(a.column_type, '\[\]$', '')
                  )

              WHEN (
                starts_with(a.column_type, 'integer')
              ) THEN
                  jsonb_build_object(
                    'type',       'integer',
                    'minimum',    -2147483648,
                    'maximum',    2147483647,
                    '$comment',   regexp_replace(a.column_type, '\[\]$', '')
                  )

              WHEN (
                starts_with(a.column_type, 'bigint')
              ) THEN
                  jsonb_build_object(
                    'type',       'integer',
                    'minimum',    -9223372036854775808,
                    'maximum',    9223372036854775807,
                    '$comment',   regexp_replace(a.column_type, '\[\]$', '')
                  )

              WHEN (
                starts_with(a.column_type, 'smallserial')
              ) THEN
                  jsonb_build_object(
                    'type',       'integer',
                    'minimum',    1,
                    'maximum',    32767,
                    '$comment',   regexp_replace(a.column_type, '\[\]$', '')
                  )

              WHEN (
                starts_with(a.column_type, 'serial')
              ) THEN
                  jsonb_build_object(
                    'type',       'integer',
                    'minimum',    1,
                    'maximum',    2147483647,
                    '$comment',   regexp_replace(a.column_type, '\[\]$', '')
                  )

              WHEN (
                starts_with(a.column_type, 'bigserial')
              ) THEN
                  jsonb_build_object(
                    'type',       'integer',
                    'minimum',    1,
                    'maximum',    9223372036854775807,
                    '$comment',   regexp_replace(a.column_type, '\[\]$', '')
                  )

              WHEN (
                ( starts_with(a.column_type, 'double precision') )
                OR
                ( starts_with(a.column_type, 'numeric') )
                OR
                ( starts_with(a.column_type, 'real') )
              ) THEN
                  jsonb_build_object(
                    'type',        'number',
                    '$comment',    regexp_replace(a.column_type, '\[\]$', '')
                  )

              WHEN (
                starts_with(a.column_type, 'json')
              ) THEN
                  jsonb_build_object(
                    'type',       json_build_array(
                                    'string',
                                    'number',
                                    'integer',
                                    'object',
                                    'array',
                                    'boolean',
                                    'null'
                                  ),
                    '$comment',   regexp_replace(a.column_type, '\[\]$', '')
                  )

              WHEN (
                a.column_type IN (
                  'date',
                  'timestamp without time zone',
                  'timestamp with time zone'
                )
              ) THEN
                  jsonb_build_object(
                    'type',           'string',
                    'format',         'date-time',
                    'description',    a.column_type
                  )

              ELSE
                  jsonb_build_object(
                    'type',       json_build_array(
                                    'string',
                                    'number',
                                    'integer',
                                    'object',
                                    'array',
                                    'boolean',
                                    'null'
                                  ),
                    '$comment',   regexp_replace(a.column_type, '\[\]$', '')
                  )
            END AS item_type,

            ( a.column_type LIKE '%[]' ) AS is_array

          FROM _data_manager_admin.table_column_types AS a
            LEFT OUTER JOIN _data_manager_admin.geojson_json_schemas AS b
              ON (
                ( a.column_type ~ ('.*geometry\(' || b.geojson_type || '.*\)$') )
              )
      ) AS t
;

--  DROP VIEW IF EXISTS _data_manager_admin.table_json_schema ;
CREATE OR REPLACE VIEW _data_manager_admin.table_json_schema
  AS
    SELECT
        table_schema,
        table_name,
        jsonb_build_object(
          '$schema',      'http://json-schema.org/draft-07/schema#',
          'type',         'object',
          'properties',   jsonb_object_agg(
                            column_name,
                            json_type
                          ),
          'required',     json_agg(
                            column_name ORDER BY column_name
                          ) FILTER (WHERE column_not_null)
          ) AS table_json_schema,
          jsonb_agg(
            jsonb_build_object(
              'name',     column_name,
              'type',     json_type->'type',
              'desc',     null
            )
            ORDER BY column_number
          ) AS table_simplified_schema

      FROM _data_manager_admin.table_column_types_with_json_types
      GROUP BY table_schema, table_name
;

COMMIT ;
