SELECT row_to_json(fin)
FROM (
    SELECT row_to_json(row)
    FROM (
        SELECT
            iso3,
            trim(admin2_code) as admin2_code,
            delta_negative,
            delta_positive,
            delta_mean,
            delta_forest,
            delta_crop,
            erosion_propensity,
            ldi,
            mask
        FROM {{ admin2_context }} where iso3='{{ iso_alpha3 }}'
    ) row
) fin;
