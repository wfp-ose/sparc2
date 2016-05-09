#!/bin/bash
source ~/.bash_aliases
VENV=sparc2
workon $VENV
#############
# Install Django Dependencies
rm -fr /home/vagrant/.venvs/$VENV/build/  # Clear old builds if they failed for some reason
pip install cython  # Need to have installed before running requirements for some reason
pip install -r requirements.txt
#pip install git+https://github.com/perrygeo/jenks.git#egg=jenks
pip install git+https://github.com/wfp-ose/jenks.git#egg=jenks
# cython requirement assumes apt-get install cython was already reload_countries
# So order is apt-get install cython; pip install cython; pip install ... jenks
