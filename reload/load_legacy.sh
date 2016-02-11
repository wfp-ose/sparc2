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
transform_legacy_schema(){
  F=$1
  sed -i 's/\spublic\.countrybyhazard_/ sparc1\./g' $F
  sed -i 's/ADD\sCONSTRAINT\scountrybyhazard_/ADD CONSTRAINT  sparc1_/g' $F
  sed -i 's/CREATE\sINDEX\scountrybyhazard_/CREATE INDEX  sparc1_/g' $F
  sed -i "s/'countrybyhazard_/'sparc1./g" $F
  sed -i 's/\scountrybyhazard_/ sparc1\./g' $F
  sed -i 's/\spublic\.sparc_/ sparc1\./g' $F
  sed -i 's/ADD\sCONSTRAINT\ssparc_/ADD CONSTRAINT  sparc1_/g' $F
  sed -i 's/CREATE\sINDEX\ssparc_/CREATE INDEX  sparc1_/g' $F
  sed -i "s/'sparc_/'sparc1./g" $F
  sed -i "s/'admin2_/'sparc1.admin2_/g" $F
  sed -i "s/public.admin2_/sparc1.admin2_/g" $F
  sed -i 's/\ssparc_/ sparc1\./g' $F
  sed -i 's/geonode/sparc2/g' $F  # replace owner geonode with owner sparc2
  sed -i 's/OWNER\sTO\spostgres/OWNER TO sparc2/g' $F  # replace owner geonode with owner sparc2
  sed -i 's/CREATE\sSEQUENCE\sadmin2_/CREATE SEQUENCE sparc1.admin2_/g' $F
  sed -i 's/ALTER\sSEQUENCE\sadmin2_/ALTER SEQUENCE sparc1.admin2_/g' $F
}
transform_legacy_data(){
  F=$1
  sed -i 's/COPY\scountrybyhazard_/COPY sparc1\./g' $F
  sed -i "s/'countrybyhazard_/'sparc1./g" $F
  sed -i 's/COPY\ssparc_/COPY sparc1\./g' $F
  sed -i "s/'sparc_/'sparc1./g" $F
  sed -i "s/'admin2_/'sparc1.admin2_/g" $F
  sed -i "s/public.admin2_/sparc1.admin2_/g" $F
}

echo "Transforming legacy data for import"
SPARC1_DB_SCHEMA='/home/vagrant/data/sparc1_db_schema.sql'
SPARC1_DB_DATA='/home/vagrant/data/sparc1_db_data.sql'
SPARC1_DB_DROUGHT='/home/vagrant/data/drought_plain.sql'
echo "Transforming legacy data"
read -p "Do you need to transform the legacy data (sed *)?  y/n" -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
  transform_legacy_schema $SPARC1_DB_SCHEMA
  transform_legacy_data $SPARC1_DB_DATA
  transform_legacy_schema $SPARC1_DB_DROUGHT
  transform_legacy_data $SPARC1_DB_DROUGHT
fi
echo "Importing legacy data"
exec_sql_file $SPARC1_DB_SCHEMA
exec_sql_file $SPARC1_DB_DATA
exec_sql_file $SPARC1_DB_DROUGHT
