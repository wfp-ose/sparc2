#!/bin/bash
migrate(){
  APPS=$1
  rm -fr 'sparc2/migrations'
  PY='/home/sparc/.venvs/sparc2/bin/python'
  $PY manage.py migrate --fake-initial
  for APP in "${APPS[@]}"; do
    $PY manage.py makemigrations $APP
  done
  for APP in "${APPS[@]}"; do
    $PY manage.py migrate $APP
  done
}
APPS=(sparc2 wfppresencedjango lsibdjango gauldjango)
migrate $APPS
