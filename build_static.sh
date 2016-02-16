#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
#===============#
OS_USER=vagrant
VENV=sparc2
DEPLOY_KEY_EMAIL="sparc@wfp.org"
DJ_PROJ="sparc2"
#===============#
BUILD_BOOTSTRAP=0
while getopts ":b" opt; do
  case $opt in
    b)
      BUILD_BOOTSTRAP=1
      echo "-b was triggered!" >&2
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      ;;
  esac
done

echo "BUILD_BOOTSTRAP (-b): $BUILD_BOOTSTRAP"
cd "$DIR/$DJ_PROJ/static/$DJ_PROJ"
gulp
if [[ BUILD_BOOTSTRAP -eq 1 ]]; then
    echo "Compiling Bootstrap"
    gulp bootstrap:compile
fi
cd $DIR
PY=/home/vagrant/.venvs/$VENV/bin/python
sudo $PY manage.py collectstatic --noinput -i gulpfile.js -i package.json -i temp -i node_modules
#sudo /home/vagrant/.venvs/sparc2/bin/python manage.py collectstatic --noinput -i gulpfile.js -i package.json -i temp -i node_modules
