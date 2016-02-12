SELECT string_agg(B.values,',')
FROM
(
    SELECT array_to_string(array[jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, "dec"],',') as values
    FROM {{ admin2_popatrisk }} AS A
    WHERE iso3='{{ iso_alpha3 }}'
) as B
