SELECT
  month,
  sum(popatrisk) as popatrisk
FROM {{ admin2_popatrisk }}
WHERE iso3='{{ iso3 }}' and prob < {{ prob_max }}
GROUP BY month
