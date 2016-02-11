DELETE FROM wfppresencedjango_wfpcountry;
INSERT INTO wfppresencedjango_wfpcountry (
  thesaurus_id,
  regionalbureau_id,
  gaul_id,
  opweb
)
SELECT
    thesaurus_id,
    regionalbureau_id,
    G.id as gaul_id,
    0 as opweb
FROM (
    SELECT
        TH.id as thesaurus_id,
        RB.id as regionalbureau_id,
        TH.gaul as gaul_admin0_code
    FROM (SELECT iso3, wfp_rb FROM wfp.presence_polygons GROUP BY iso3, wfp_rb) as C
    INNER JOIN lsibdjango_geographicthesaurusentry as TH ON lower(C.iso3) = lower(TH.iso_alpha3)
    LEFT JOIN wfppresencedjango_wfpregionalbureau AS RB ON lower(C.wfp_rb) = lower(RB.code)
) as C2
LEFT JOIN gauldjango_gauladmin0 as G ON C2.gaul_admin0_code = G.admin0_code;
