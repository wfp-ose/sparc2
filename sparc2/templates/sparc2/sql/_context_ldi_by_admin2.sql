SELECT
  trim(admin2_code) as admin2_code,
  ldi
FROM {{ admin2_context }} where iso3='{{ iso_alpha3 }}';
