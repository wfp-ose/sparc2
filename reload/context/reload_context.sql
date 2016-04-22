CREATE TABLE IF NOT EXISTS context.admin2_context (
    id serial NOT NULL,
    iso3 character(3),
    admin0_name text,  -- unknown codelist
    admin0_code text,  -- country name
    admin1_name text,
    admin1_code text,
    admin2_code text,
    admin2_name text,
    delta_negative double precision,
    delta_positive double precision,
    delta_mean double precision,
    delta_forest double precision,
    delta_crop double precision,
    erosion_propensity double precision,
    ldi integer,
    mask integer,
    CONSTRAINT admin2_context_pkey PRIMARY KEY (id)
);

INSERT INTO context.admin2_context (
    iso3,
    admin0_code, admin0_name, admin1_code, admin1_name, admin2_code, admin2_name,
    delta_negative, delta_positive, delta_mean, delta_forest, delta_crop,
    erosion_propensity, ldi,
    mask
)
SELECT
    iso3,
    adm0_code, adm0_name, adm1_code, adm1_name, adm2_code, adm2_name,
    nch1_12, pch1_12, mean_12,
    For_2,
    Crop_2,
    erosion1_2,
    ldi,
    nochng_2
FROM context.admin2_polygons;
