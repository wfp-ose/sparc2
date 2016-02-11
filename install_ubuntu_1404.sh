#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SPARC_USER=vagrant
# Assert Latest Ubuntu
sudo apt-get update; sudo apt-get upgrade;
# Install Basic CLI
sudo apt-get install -y supervisor nginx make gcc curl vim git unzip
# Install Python Basics
sudo apt-get install -y python-software-properties
# Add GIS Repos
sudo add-apt-repository ppa:ubuntugis/ubuntugis-unstable
# Add respository for static development
sudo add-apt-repository -y ppa:chris-lea/node.js
sudo apt-get update
# Install Libraries
sudo apt-get install -y build-essential libxml2-dev libxslt1-dev libjpeg-dev gettext python-dev python-pip python-virtualenv
sudo apt-get install -y libgdal1h libgdal-dev libgeos-dev libproj-dev libpq-dev
sudo apt-get install -y python-gdal python-psycopg2 python-django python-django-extensions python-httplib2
sudo apt-get install -y cython
# Install Memcached
sudo apt-get install -y memcached supervisor
# Install GDAL/OGR CLI
sudo apt-get install -y gdal-bin
# Install PostGIS
sudo apt-get install -y postgresql-9.3-postgis-2.1
#===============#
# Create Deploy Key
read -p "Do you need to create a deploy key?  y/n" -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
  ssh-keygen -t rsa -b 4096 -C "sparc@wfp.org" -q -N "" -f ~/.ssh/id_rsa
  echo "Add the following deploy key to your git server."
  cat ~/.ssh/id_rsa.pub
fi
read -p "Ready to continue?  y/n" -n 1 -r
echo    # (optional) move to a new line
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi
#===============#
# Initialize PostGIS
sudo -u postgres psql -c "CREATE USER sparc2 WITH ENCRYPTED PASSWORD 'sparc2';"
sudo -u postgres psql -c "CREATE DATABASE template_postgis ENCODING 'UTF8' TEMPLATE template1;"
sudo -u postgres psql -d template_postgis -c "CREATE EXTENSION postgis;"
# Other PostGIS extensions are not needed
#psql -d template_postgis -c "CREATE EXTENSION postgis_topology;"
#psql -d template_postgis -c "CREATE EXTENSION fuzzystrmatch;"
#psql -d template_postgis -c "CREATE EXTENSION postgis_tiger_geocoder;"
sudo -u postgres psql -c "CREATE DATABASE sparc2 ENCODING 'UTF8' TEMPLATE template_postgis;"
sudo -u postgres psql -d sparc2 -c "ALTER DATABASE sparc2 OWNER TO sparc2;"
sudo -u postgres psql -d sparc2 -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sparc2;"
#===============#
# Install Java
sudo apt-get install -y --force-yes openjdk-6-jdk ant maven2 --no-install-recommends
#===============#
# Install Static Development Tools
sudo apt-get install -y nodejs
sudo npm install -y -g bower
sudo npm install -y -g gulp
# sudo ln -s /usr/bin/nodejs /usr/bin/node  # not needed
#===============#
# Install Virtual Environment Wrapper and paver
sudo pip install virtualenvwrapper paver
# Set defaults for virutal environment management
echo 'export VIRTUALENVWRAPPER_PYTHON=/usr/bin/python' >> ~/.bash_aliases
echo 'export WORKON_HOME=~/.venvs' >> ~/.bash_aliases
echo 'source /usr/local/bin/virtualenvwrapper.sh'>> ~/.bash_aliases
echo 'export PIP_DOWNLOAD_CACHE=$HOME/.pip-downloads' >> ~/.bash_aliases
source ~/.bash_aliases
# Make & Activate virtual environment for sparc2
mkvirtualenv sparc2
workon sparc2
#===============#
# Install Django Dependencies
cd $DIR
pip install -r requirements.txt
# cython requirement assumes apt-get install cython was already reload_countries
# So order is apt-get install cython; pip install cython; pip install ... jenks
#===============#
#Install GDAL
pip install --no-install GDAL==1.10.0
cd ~/.venvs/sparc2/build/GDAL
sed -i "s/\.\.\/\.\.\/apps\/gdal-config/\/usr\/bin\/gdal-config/g" setup.cfg
python setup.py build_ext --include-dirs=/usr/include/gdal
pip install --no-download GDAL==1.10
#===============#
# Install Front-end Dependencies (mostly gulp plugins)
cd "$DIR/sparc2/static/"
sudo npm install -g  # Installs to global
chown $SPARC_USER:$SPARC_USER ~/.npm/
#===============#
# Install SPARC (sparc2)
cd ~
export DJANGO_SETTINGS_MODULE=sparc2.settings
pip install -e sparc2.git
sudo mkdir -p /var/www/static
cd $DIR
sudo ~/.venvs/sparc2/bin/python manage.py collectstatic  # need to harcode python, b/c sudo.  It's complicated.
#===============#
# Load initial data
##python manage.py makemigrations sparc2
##python manage.py migrate
##PY='/home/vagrant/.venvs/sparc2/bin/python'
##$PY manage.py migrate --fake-initial
##$PY manage.py makemigrations sparc2
##$PY manage.py migrate sparc2
#----------------
#django-admin createsuperuser
#python manage.py loaddata sparc2/fixtures/initial_data.yml
#python reload_countries.py
read -p "Do you want to reload the database at this time?  y/n" -n 1 -r
echo    # (optional) move to a new line
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi
bash reload_data.sh
