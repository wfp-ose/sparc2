SELECT
    B.admin2_code,
    row_to_json(B)
FROM
(
    SELECT
        admin2_code,
        jan,
        feb,
        mar,
        apr,
        may,
        jun,
        jul,
        aug,
        sep,
        oct,
        nov,
        "dec"
    FROM {{ admin2_popatrisk }}
    WHERE iso3='{{ iso_alpha3 }}'
    ORDER BY admin2_code ASC
) as B;
