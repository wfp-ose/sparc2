SELECT row_to_json(FC)
FROM
(
    SELECT 'FeatureCollection' As type, array_to_json(array_agg(F)) As features
    FROM
    (
        SELECT
            'Feature' As type,
            row_to_json((
                SELECT X FROM (SELECT G0B.iso_alpha3, G0B.admin0_code, G0B.admin0_name, G1A.admin1_code, G1A.admin1_name) as X
            )) As properties,
            ST_AsGeoJSON(ST_Simplify(G1A.mpoly, {{ tolerance }}))::json as geometry
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
        WHERE G0B.iso_alpha3 = '{{ iso_alpha3 }}'
    ) AS F
) AS FC;
