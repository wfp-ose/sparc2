SELECT row_to_json(fin)
FROM (
    SELECT row_to_json(row)
    FROM (
        SELECT
            iso3,
            trim(admin2_code) as admin2_code,
            rp,
            jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec,
            0 as active_month
        FROM {{ admin2_popatrisk }} where iso3='{{ iso_alpha3 }}'
    ) row
) fin;
