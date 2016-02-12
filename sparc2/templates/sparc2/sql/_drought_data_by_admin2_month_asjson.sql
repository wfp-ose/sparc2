SELECT
    B.admin2_code,
    row_to_json(B)
FROM
(
    SELECT
        admin2_code,
        prob,
        popatrisk
    FROM {{ admin2_popatrisk }}
    WHERE iso3='{{ iso_alpha3 }}' and month='{{ month }}'
    ORDER BY admin2_code, prob ASC
) as B;
