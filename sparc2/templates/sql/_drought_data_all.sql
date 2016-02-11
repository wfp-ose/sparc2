SELECT array_to_string(array_agg(popatrisk),',') as values
FROM {{ admin2_popatrisk }} AS A
WHERE iso3='{{ iso_alpha3 }}'
