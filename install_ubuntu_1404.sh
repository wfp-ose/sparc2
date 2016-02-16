#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
#===============#
OS_USER=vagrant
VENV=sparc2
DEPLOY_KEY_EMAIL="sparc@wfp.org"
DJ_PROJ="sparc2"
#===============#
bash "install/install_apt.sh"
#===============#
# Create Deploy Key
read -p "Do you need to create a deploy key?  y/n" -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
  ssh-keygen -t rsa -b 4096 -C $DEPLOY_KEY_EMAIL -q -N "" -f ~/.ssh/id_rsa
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
bash "install/install_postgis.sh"
bash "install/install_java.sh"
bash "install/install_static.sh"
bash "install/install_virtualenv.sh"
source ~/.bash_aliases
workon sparc2
bash "install/install_python_deps.sh"
bash "install/install_gdal.sh"
#===============#
# Install Front-end Dependencies (mostly gulp plugins)
cd "$DIR/$DJ_PROJ/static/$DJ_PROJ"
npm install # Removed -g Installs to global
sudo chown -R $OS_USER:$OS_USER ~/.npm/  # Fix any issues with dependencies hardcoding OS_USER
#===============#
# Install SPARC (sparc2)
cd ~
export DJANGO_SETTINGS_MODULE=$DJ_PROJ.settings
pip install -e sparc2.git
sudo mkdir -p /var/www/static
cd $DIR
sudo /home/$OS_USER/.venvs/$VENV/bin/python manage.py collectstatic  --noinput -i gulpfile.js -i package.json -i temp -i node_modules
# need to harcode python, b/c sudo.  It's complicated.
#===============#
read -p "Do you want to reload the database at this time?  y/n" -n 1 -r
echo    # (optional) move to a new line
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi
bash reload_data.sh
