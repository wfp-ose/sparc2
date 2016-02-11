bind = 'unix:///tmp/gunicorn.sock'
workers = 5
worker_class = 'gevent'
# worker_class = 'egg:gunicorn#gevent'
# Logging
loglevel = 'critical'
acces_logfile = "access.log"
error_logfile = "error.log"
# enable_stdio_inheritance = True
timeout = 360
