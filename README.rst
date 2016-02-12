Spatial Analysis Risk Calendar, Version 2.x (sparc2)
====================================================

.. image:: https://travis-ci.org/wfp-ose/sparc2.png
    :target: https://travis-ci.org/wfp-ose/sparc2

Description
-----------

Spatial Analysis Risk Calendar, Version 2.x (sparc2)

Development Environment
-----------------------

These instructions are for an Ubuntu 14.04 development environment and assume
use of vagrant and virtualbox.

First, link your local git repo into the guest Ubuntu 14.04, such as below:

.. code-block::

    config.vm.synced_folder "~/workspaces/sparc/sparc2.git", "/home/vagrant/sparc2.git"

Launch the virtual machine and run the following script.  This will install all dependencies.

.. code-block:: bash

    cd ~/sparc2.git
    bash install_ubuntu_1404.sh

Then, open up the PostGIS access file.

.. code-block:: bash

    sudo vim /etc/postgresql/9.3/main/pg_hba.conf

and change to:

.. code-block::

    local all postgres peer
    local sparc2 sparc2 md5
    host sparc2 sparc2 127.0.0.1/32 md5

Restart PostGIS:

.. code-block:: bash

    sudo /etc/init.d/postgresql restart

The database should already be initialized, but to reload all data run:

.. codeblock:: bash

    bash reload_data.sh

Next, configure nginx with the following.  Open with:

.. code-block:: bash

    sudo vim /etc/nginx/sites-available/default

.. code-block:: bash

    location / {
        proxy_pass http://localhost:8000/;
    }

    location /static {
        alias /var/www/static;
    }

Then, restart NGINX:

.. code-block:: bash

    sudo /etc/init.d/nginx restart

To add anoter Django admin user, do the following, but reload_data.sh should
prompt to add an admin user.

.. code-block:: bash

    workon sparc2
    django-admin createsuperuser
    # use username/password admin/admin

Collect static (use the following, since sudo python won't load environment).

.. code-block:: bash

    sudo /home/vagrant/.venvs/sparc2/bin/python manage.py collectstatic

Launch SPARC!

.. code-block:: bash

    python manage.py runserver [::]:8000

Production  Environment
-----------------------

TODO

.. code-block:: bash

    pip install git+git://github.com/wfp-ose/sparc2.git@master
