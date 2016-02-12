#!/bin/bash
# Initialize PostGIS
DB_NAME=sparc2
DB_USER=sparc2
DB_PASS=sparc2
sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "CREATE DATABASE template_postgis ENCODING 'UTF8' TEMPLATE template1;"
sudo -u postgres psql -d template_postgis -c "CREATE EXTENSION postgis;"
# Other PostGIS extensions are not needed
#psql -d template_postgis -c "CREATE EXTENSION postgis_topology;"
#psql -d template_postgis -c "CREATE EXTENSION fuzzystrmatch;"
#psql -d template_postgis -c "CREATE EXTENSION postgis_tiger_geocoder;"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME ENCODING 'UTF8' TEMPLATE template_postgis;"
sudo -u postgres psql -d $DB_NAME -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
