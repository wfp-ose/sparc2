-- Clear Existing Data
DELETE FROM gauldjango_gauladmin0;
DELETE FROM gauldjango_gauladmin1;
DELETE FROM gauldjango_gauladmin2;
-- Load New Data
INSERT INTO gauldjango_gauladmin0 (
    admin0_code,
    admin0_name,
    status,
    disp_area,
    mpoly
)
SELECT
    adm0_code,
    adm0_name,
    status,
    disp_area,
    wkb_geometry
FROM gaul.admin0_polygons;

INSERT INTO gauldjango_gauladmin1 (
    admin0_id,
    admin1_code,
    admin1_name,
    status,
    disp_area,
    mpoly
)
SELECT
    A0.id,
    A1.adm1_code,
    A1.adm1_name,
    A1.status,
    A1.disp_area,
    A1.wkb_geometry
FROM gaul.admin1_polygons as A1
LEFT JOIN gauldjango_gauladmin0 as A0 ON A1.adm0_code = A0.admin0_code;

INSERT INTO gauldjango_gauladmin2 (
    admin1_id,
    admin2_code,
    admin2_name,
    status,
    disp_area,
    mpoly
)
SELECT
    A1.id,
    A2.adm2_code,
    A2.adm2_name,
    A2.status,
    A2.disp_area,
    A2.wkb_geometry
FROM gaul.admin2_polygons as A2
LEFT JOIN gauldjango_gauladmin1 as A1 ON A2.adm1_code = A1.admin1_code;
