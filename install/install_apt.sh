#!/bin/bash
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
