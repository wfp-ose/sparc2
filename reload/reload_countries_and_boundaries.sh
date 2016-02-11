exec_sql_cmd(){
  CMD=$1
  sudo -u postgres PGPASSWORD=sparc2 psql -h localhost -U sparc2 sparc2 -c "$CMD"
}
exec_sql_file(){
  F=$1
  sudo -u postgres PGPASSWORD=sparc2 psql -h localhost -U sparc2 sparc2 -f $F
}
exec_sql_files(){
  FILES=$1
  for F in "${FILES[@]}"; do
    exec_sql_file $F
  done
}
##############################
export DJANGO_SETTINGS_MODULE=sparc2.settings
echo "Clear Country & Boundary Django Models..."
exec_sql_cmd "DELETE FROM sparc2_sparccountry;"
exec_sql_cmd "DELETE FROM wfppresencedjango_wfpcountry;"
exec_sql_cmd "DELETE FROM lsibdjango_geographicthesaurusentry;"
exec_sql_cmd "DELETE FROM gauldjango_gauladmin2;"
exec_sql_cmd "DELETE FROM gauldjango_gauladmin1;"
exec_sql_cmd "DELETE FROM gauldjango_gauladmin0;"
echo "Transforming raw GAUL data into Django models..."
exec_sql_file "reload/countries_and_boundaries/gaul_raw2django.sql"
echo "Reloading LSIB Theusaurus"
/home/vagrant/.venvs/sparc2/bin/python "reload/countries_and_boundaries/reload_lsib.py"
echo "Building WFP countries (linking to LSIB, GAUL, and regional bureaus)."
exec_sql_file "reload/countries_and_boundaries/wfp_raw2django.sql"
echo "Load SPARC Countries"
/home/vagrant/.venvs/sparc2/bin/python "reload/countries_and_boundaries/sparc_countries.py"
