-- TODO: Make as a PROCEDURE. _data_manager_admin.initialize_sources_metadata(schemaname)

BEGIN;

CREATE OR REPLACE PROCEDURE _data_manager_admin.initialize_sources_metadata(schemaname_param TEXT)
  AS $$

      WITH cte_src_meta AS (
        SELECT
            b.source_id AS id,
            a.table_simplified_schema AS metadata
          FROM _data_manager_admin.table_json_schema AS a
            INNER JOIN (
              SELECT
                  source_id,
                  regexp_split_to_array(
                    regexp_replace(
                      max(data_table)::TEXT,
                      '"',
                      '',
                      'g'
                    ),
                    '\.'
                  ) AS table_name_arr
                FROM data_manager.views
                GROUP BY 1
            ) AS b
              ON (
                ( a.table_schema = b.table_name_arr[1] )
                AND
                ( a.table_schema = schemaname_param )
                AND
                ( a.table_name = b.table_name_arr[2] )
              )
      )
        UPDATE data_manager.sources AS a
          SET metadata = b.metadata
          FROM cte_src_meta AS b
          WHERE (
            ( a.id = b.id )
            AND
            ( a.metadata IS NULL )
          )
      ;

  $$ LANGUAGE SQL
;

COMMIT;
