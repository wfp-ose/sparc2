SELECT
    B.admin2_code,
    row_to_json(B)
FROM
(
    SELECT
        admin2_code,
        sum(jan) as jan,
        sum(feb) as feb,
        sum(mar) as mar,
        sum(apr) as apr,
        sum(may) as may,
        sum(jun) as jun,
        sum(jul) as jul,
        sum(aug) as aug,
        sum(sep) as sep,
        sum(oct) as oct,
        sum(nov) as nov,
        sum("dec") as dec
    FROM {{ admin2_popatrisk }}
    WHERE iso3='{{ iso_alpha3 }}' and rp <= {{ rp }}
    GROUP BY admin2_code
    ORDER BY admin2_code ASC
) as B;
