SELECT C as value, count(*) as count
FROM unnest(string_to_array(
(
    SELECT string_agg(B.values,',')
    FROM
    (
        SELECT array_to_string(array[jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, "dec"],',') as values
        FROM {{  }} AS A
        WHERE iso3='{{ iso3 }}'
    ) as B
 ), ',')::integer[]) as C
 GROUP BY C
 ORDER BY count DESC
