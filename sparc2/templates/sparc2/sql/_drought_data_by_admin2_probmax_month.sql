SELECT
    admin2_code,
    month,
    sum(popatrisk) as value
FROM {{ admin2_popatrisk }}
WHERE iso3='{{ iso3 }}' and prob < '{{ prob_max }}'
GROUP BY admin2_code, month
ORDER BY admin2_code
