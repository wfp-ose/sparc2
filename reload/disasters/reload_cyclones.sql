CREATE TABLE IF NOT EXISTS cyclone.admin2_popatrisk (
    id serial NOT NULL,
    iso3 character(3),
    admin0_name text,  -- unknown codelist
    admin0_code text,  -- country name
    admin1_name text,
    admin1_code text,
    admin2_code text,
    admin2_name text,
    category_min integer,
    category_max integer,
    prob_class text,
    prob_class_min double precision,
    prob_class_max double precision,
    annual integer,
    jan integer,
    feb integer,
    mar integer,
    apr integer,
    may integer,
    jun integer,
    jul integer,
    aug integer,
    sep integer,
    oct integer,
    nov integer,
    "dec" integer,
    CONSTRAINT admin2_popatrisk_pkey PRIMARY KEY (id)
);

INSERT INTO cyclone.admin2_popatrisk (
    iso3,
    admin0_code, admin0_name, admin1_code, admin1_name, admin2_code, admin2_name,
    category_min, category_max,
    prob_class, prob_class_min, prob_class_max,
    annual,
    jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, "dec"
)
SELECT
    iso3,
    adm0_code, adm0_name, adm1_code, adm1_name, adm2_code, adm2_name,
    substr(category, 4, 1)::integer, substr(category, 6)::integer,
    -- Probability Classes
    prob_class,
    CASE prob_class WHEN '0' THEN 0.0 ELSE substr(prob_class, 0, position('-' in prob_class))::double precision END,
    CASE prob_class WHEN '0' THEN 0.0 ELSE substr(prob_class, position('-' in prob_class)+1)::double precision END,
    --
    annual,
    jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, "dec"
FROM sparc1.admin2_cyclones_exposed_population;
