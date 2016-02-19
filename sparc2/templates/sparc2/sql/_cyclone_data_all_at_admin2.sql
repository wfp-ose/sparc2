SELECT string_agg(B.values, ',')
FROM
(
    SELECT
      array_to_string(
          array[
              sum(jan), sum(feb), sum(mar), sum(apr), sum(may), sum(jun), sum(jul), sum(aug), sum(sep), sum(oct), sum(nov), sum("dec")
          ], ','
       ) as values
    FROM {{ admin2_popatrisk }}
    WHERE iso3='{{ iso_alpha3 }}' and category_min=1 and category_max=5 and prob_class!='0'
    GROUP BY admin2_code
) as B;
