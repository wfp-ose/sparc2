exec_sql_cmd(){
  CMD=$1
  sudo -u postgres PGPASSWORD=sparc2 psql -h localhost -U sparc2 sparc2 -c "$CMD"
}
exec_sql_file(){
  F=$1
  sudo -u postgres PGPASSWORD=sparc2 psql -h localhost -U sparc2 sparc2 -f $F
}
exec_sql_files(){
  FILES=$1
  for F in "${FILES[@]}"; do
    exec_sql_file $F
  done
}
# Reload Cyclones, Droughts, Floods, GAUl
##############################
exec_sql_file "reload/context/reload_context.sql"
