#!/bin/bash
VENV=sparc2
# Install Virtual Environment Wrapper and paver
sudo pip install virtualenvwrapper paver
# Set defaults for virutal environment management
echo 'export VIRTUALENVWRAPPER_PYTHON=/usr/bin/python' >> ~/.bash_aliases
echo 'export WORKON_HOME=~/.venvs' >> ~/.bash_aliases
echo 'source /usr/local/bin/virtualenvwrapper.sh'>> ~/.bash_aliases
echo 'export PIP_DOWNLOAD_CACHE=$HOME/.pip-downloads' >> ~/.bash_aliases
source ~/.bash_aliases
mkvirtualenv $VENV
