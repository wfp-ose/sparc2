SELECT row_to_json(fc)
FROM (
    SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features
    FROM (
        SELECT
            'Feature' As type,
            ST_AsGeoJSON(lg.geom)::json As geometry,
            row_to_json((SELECT l FROM (SELECT adm2_name, count) As l)) As properties
        FROM flood.events As lg where lg.iso3='{{ iso3 }}'
    ) AS f
)
AS fc
