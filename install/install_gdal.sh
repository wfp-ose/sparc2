#!/bin/bash
source ~/.bash_aliases
VENV=sparc2
workon $VENV
#############
pip install --no-install GDAL==1.10.0
cd ~/.venvs/sparc2/build/GDAL
sed -i "s/\.\.\/\.\.\/apps\/gdal-config/\/usr\/bin\/gdal-config/g" setup.cfg
python setup.py build_ext --include-dirs=/usr/include/gdal
pip install --no-download GDAL==1.10
