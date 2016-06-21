SELECT
    admin2_code,
    month,
    sum(popatrisk) as value
FROM {{ admin2_popatrisk }}
WHERE iso3='{{ iso_alpha3 }}' and prob_class_int >= {{ prob_min }} and prob_class_int <= {{ prob_max }}
GROUP BY admin2_code, month;
