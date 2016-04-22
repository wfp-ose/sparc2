SELECT string_agg(B.values,',')
FROM
(
    SELECT {{ attribute }}::text as values
    FROM {{ admin2_data }} AS A
    WHERE iso3='{{ iso_alpha3 }}'
) as B
