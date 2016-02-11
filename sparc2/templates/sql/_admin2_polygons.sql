SELECT row_to_json(FC)
FROM
(
    SELECT 'FeatureCollection' As type, array_to_json(array_agg(F)) As features
    FROM
    (
        SELECT
            'Feature' As type,
            row_to_json((
                SELECT X FROM (SELECT G1B.iso_alpha3, G1B.admin0_code, G1B.admin0_name, G1B.admin1_code, G1B.admin1_name, G2.admin2_code, G2.admin2_name) as X
            )) As properties,
            ST_AsGeoJSON(ST_Simplify(G2.mpoly, {{ tolerance }}))::json as geometry
        FROM gauldjango_gauladmin2 as G2
        LEFT JOIN
        (
            SELECT
                G0B.iso_alpha3,
                G0B.admin0_id,
                G0B.admin0_code,
                G0B.admin0_name,
                G1A.id as admin1_id,
                G1A.admin1_code,
                G1A.admin1_name
            FROM gauldjango_gauladmin1 as G1A
            LEFT JOIN
            (
              SELECT
                  LSIB.iso_alpha3,
                  G0A.id as admin0_id,
                  G0A.admin0_code,
                  G0A.admin0_name
              FROM gauldjango_gauladmin0 as G0A
              LEFT JOIN lsibdjango_geographicthesaurusentry as LSIB ON G0A.admin0_code = LSIB.gaul
            ) as G0B ON G1A.admin0_id = G0B.admin0_id
        ) as G1B ON G2.admin1_id = G1B.admin1_id
        WHERE G1B.iso_alpha3 = '{{ iso_alpha3 }}'
    ) AS F
) AS FC;
