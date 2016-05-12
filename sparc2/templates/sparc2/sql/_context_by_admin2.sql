SELECT
  trim(admin2_code) as admin2_code,
  ldi,
  delta_negative,
  erosion_propensity
FROM {{ admin2_context }} where iso3='{{ iso_alpha3 }}';
