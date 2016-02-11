CREATE TABLE IF NOT EXISTS drought.admin2_popatrisk (
    id serial NOT NULL,
    iso3 character(3),
    admin0_name text,  -- unknown codelist
    admin0_code text,  -- country name
    admin1_name text,
    admin1_code text,
    admin2_code text,
    admin2_name text,
    month character(3),
    prob double precision, -- probability
    popatrisk integer,
    CONSTRAINT admin2_popatrisk_pkey PRIMARY KEY (id)
);

INSERT INTO drought.admin2_popatrisk (
    iso3,
    admin0_code, admin0_name, admin1_code, admin1_name, admin2_code, admin2_name,
    month,
    prob,
    popatrisk
)
SELECT
    iso3,
    adm0_code, adm0_name, adm1_code, adm1_name, adm2_code, adm2_name,
    month,
    freq/100.0,
    pop
FROM sparc1.population_month_drought;
