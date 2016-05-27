SELECT
  array_to_string(
      array[
          sum(jan), sum(feb), sum(mar), sum(apr), sum(may), sum(jun), sum(jul), sum(aug), sum(sep), sum(oct), sum(nov), sum("dec")
      ], ','
   ) as values
FROM {{ admin2_popatrisk }}
WHERE iso3='{{ iso_alpha3 }}'
