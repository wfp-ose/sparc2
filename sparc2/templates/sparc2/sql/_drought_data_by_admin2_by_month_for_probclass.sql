SELECT
    admin2_code,
    month,
    sum(popatrisk) as value
FROM {{ admin2_popatrisk }}
WHERE iso3='{{ iso_alpha3 }}' and prob >= {{ prob_min }} and prob <= {{ prob_max }}
GROUP BY month, admin2_code
