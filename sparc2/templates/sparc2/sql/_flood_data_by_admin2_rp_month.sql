SELECT
  admin2_code,
  array_to_string(
      array[
          sum(jan), sum(feb), sum(mar), sum(apr), sum(may), sum(jun), sum(jul), sum(aug), sum(sep), sum(oct), sum(nov), sum("dec")
      ], ','
   ) as values
FROM {{ admin2_popatrisk }}
WHERE iso3='{{ iso3 }}' and rp <= {{ rp }}
GROUP BY admin2_code
ORDER BY admin2_code ASC
