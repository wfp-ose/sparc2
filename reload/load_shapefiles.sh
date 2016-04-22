DB_HOST=localhost
DB_NAME=sparc2
DB_USER=sparc2
DB_PASS=sparc2
####
echo "Importing raw WFP presence data..."
SHP="/home/vagrant/data/wfp/wld_bnd_presence_wfp/wld_bnd_presence_wfp.shp"
TABLE="wfp.presence_polygons"
#ogr2ogr -overwrite -f "PostgreSQL" \
PG:"host=$DB_HOST user=$DB_USER dbname=$DB_NAME password=$DB_PASS" \
-nln $TABLE -nlt "MULTIPOLYGON" \
-select iso3,wfp_rb \
$SHP
####
echo "Importing GAUL shapefiles..."
SHP="/home/vagrant/data/gaul2015/wld_bnd_adm0_gaul_2015.shp"
TABLE="gaul.admin0_polygons"
#ogr2ogr -overwrite -f "PostgreSQL" PG:"host=$DB_HOST user=$DB_USER dbname=$DB_NAME password=$DB_PASS" -nln $TABLE -nlt "MULTIPOLYGON" $SHP
####
SHP="/home/vagrant/data/gaul2015/wld_bnd_adm1_gaul_2015.shp"
TABLE="gaul.admin1_polygons"
#ogr2ogr -overwrite -f "PostgreSQL" PG:"host=$DB_HOST user=$DB_USER dbname=$DB_NAME password=$DB_PASS" -nln $TABLE -nlt "MULTIPOLYGON" $SHP
####
SHP="/home/vagrant/data/gaul2015/wld_bnd_adm2_gaul_2015.shp"
TABLE="gaul.admin2_polygons"
#ogr2ogr -overwrite -f "PostgreSQL" PG:"host=$DB_HOST user=$DB_USER dbname=$DB_NAME password=$DB_PASS" -nln $TABLE -nlt "MULTIPOLYGON" $SHP
####
echo "Importing Context Layer shapefiles..."
####
SHP="/home/vagrant/data/context/sparc_contextlayers_2015.shp"
TABLE="context.admin2_polygons"
ogr2ogr -overwrite -f "PostgreSQL" PG:"host=$DB_HOST user=$DB_USER dbname=$DB_NAME password=$DB_PASS" -nln $TABLE -nlt "MULTIPOLYGON" -lco PRECISION=FALSE $SHP
#
