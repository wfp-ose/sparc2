SELECT row_to_json(fc)
FROM (
    SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features
    FROM (
        SELECT
            'Feature' As type,
            ST_AsGeoJSON(E.wkb_geometry)::json As geometry,
            row_to_json((SELECT l FROM (SELECT id) As l)) As properties
        FROM landslide.events As E
        LEFT JOIN
        (
          	SELECT
                LSIB.iso_alpha3,
                G0A.mpoly
        	  FROM gauldjango_gauladmin0 as G0A
        	  LEFT JOIN lsibdjango_geographicthesaurusentry as LSIB ON G0A.admin0_code = LSIB.gaul
        ) as G0B ON ST_Intersects(G0B.mpoly, E.wkb_geometry)
        WHERE G0B.iso_alpha3='{{ iso3 }}'
    ) AS f
)
AS fc;
