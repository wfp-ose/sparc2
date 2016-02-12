SELECT row_to_json(fin)
FROM (
    SELECT row_to_json(row)
    FROM (
        SELECT
            iso3,
            trim(admin2_code) as admin2_code,
            ('cat'||category_min||'_'||category_max) as category,
            category_min,
            category_max,
            trim(prob_class) as prob_class,
            prob_class_min,
            prob_class_max,
            annual,
            jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec
        FROM {{ admin2_popatrisk }} where iso3='{{ iso_alpha3 }}'
    ) row
) fin;
