SELECT
    {{ group }} as group,
    string_agg(B.values, ',') as values
FROM
(
    SELECT
        {{ group }},
        array_to_string(array[jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, "dec"],',') as values
    FROM {{ admin2_popatrisk }} AS A
    WHERE iso3='{{ iso3 }}'
) as B
GROUP BY {{ group }}
ORDER BY {{ group }} ASC
