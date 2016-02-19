#!/bin/bash
read -p "Sure you want to reload (factory reset) the database?  y/n" -n 1 -r
echo    # (optional) move to a new line
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi
VENV=sparc2
# Drop Database
# Functions
create_schema(){
  SCHEMA=$1
  USER=$2
  sudo -u postgres psql -d sparc2 -c "CREATE SCHEMA $SCHEMA;"
  sudo -u postgres psql -d sparc2 -c "GRANT ALL ON SCHEMA $SCHEMA TO $USER;"
  sudo -u postgres psql -d sparc2 -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA $SCHEMA TO $USER;"
}
create_schemas(){
  SCHEMAS=$1
  USER=$2
  for SCHEMA in "${SCHEMAS[@]}"; do
    create_schema $SCHEMA $USER
  done
}
migrate(){
  APPS=$1
  rm -fr 'sparc2/migrations'
  PY='/home/vagrant/.venvs/sparc2/bin/python'
  $PY manage.py migrate --fake-initial
  for APP in "${APPS[@]}"; do
    $PY manage.py makemigrations $APP
  done
  for APP in "${APPS[@]}"; do
    $PY manage.py migrate $APP
  done
  ## OLD: $PY manage.py migrate sparc2 --run-syncdb
  ## OLD: $PY manage.py migrate sparc2 zero
}
load_fixtures(){
  FILES=$1
  PY='/home/vagrant/.venvs/sparc2/bin/python'
  for F in "${FILES[@]}"; do
    $PY manage.py loaddata "sparc2/fixtures/$F.yml"
  done
}
load_fixtures_default(){
  PY='/home/vagrant/.venvs/sparc2/bin/python'
  $PY manage.py loaddata "sparc2/fixtures/initial_data.yml"
}
##############
# Load Virtual Environment
source ~/.bash_aliases
workon sparc2
export DJANGO_SETTINGS_MODULE=sparc2.settings
##############
# Main
U=sparc2
sudo -u postgres psql -c "DROP DATABASE IF EXISTS sparc2;"
sudo -u postgres psql -c "CREATE DATABASE sparc2 ENCODING 'UTF8' TEMPLATE template_postgis;"
sudo -u postgres psql -d sparc2 -c "ALTER DATABASE sparc2 OWNER TO $U;"
sudo -u postgres psql -d sparc2 -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $U;"
SCHEMAS=(sparc1 gaul wfp cyclone flood drought)
create_schemas $SCHEMAS sparc2
APPS=(sparc2 wfppresencedjango lsibdjango gauldjango)
migrate $APPS
# load_fixtures
echo "###########################################"
bash "reload/load_legacy.sh"
# Create user
echo "Create Django superuser"
django-admin createsuperuser --username admin --email admin@example.com
##############################
FIXTURES=(wfp_regional_bureaus)
echo "Loading fixtures for WFP regional bureaus..."
load_fixtures $FIXTURES  # wfppresencedjango_wfpregionalbureau
##############################
bash "reload/load_shapefiles.sh"
bash "reload/reload_countries_and_boundaries.sh"
bash "reload/reload_disasters.sh"
