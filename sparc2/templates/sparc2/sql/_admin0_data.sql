SELECT row_to_json(fin)
FROM (
    SELECT row_to_json(row)
    FROM (SELECT * FROM {{ admin0_data }}) row
) fin
