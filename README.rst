Spatial Analysis Risk Calendar, Version 2.x (sparc2)
====================================================

.. image:: https://travis-ci.org/wfp-ose/sparc2.png
    :target: https://travis-ci.org/wfp-ose/sparc2

Description
-----------

Spatial Analysis Risk Calendar, Version 2.x (sparc2)

Development Environment
-----------------------

To set up a development environment, use the sparc2-ansible Ansible_ project.  Follow the installation_ instructions from the Ansible website to set up Ansible on your host machine.

.. _Ansible: https://www.ansible.com/
.. _installation: http://docs.ansible.com/ansible/intro_installation.html#installation

First, clone the repo into your local environment.

.. code-block:: bash

    git clone https://github.com/wfp-ose/sparc2-ansible.git sparc2-ansible.git
    # or
    git clone git@github.com:wfp-ose/sparc2-ansible.git sparc2-ansible.git

Then, configure your local Vagrantfile_ and Ansible vars_ for your environment.

.. _Vagrantfile:  https://github.com/wfp-ose/sparc2-ansible/blob/master/Vagrantfile.
.. _vars: https://github.com/wfp-ose/sparc2-ansible/blob/master/group_vars/all.yml

Then, to deploy, simply run vagrant up within the directory.

.. code-block:: bash

    # cd into sparc2-ansible directory
    vagrant up

If you need to re-provision for any idea, just run vagrant provision and the ansible script will run again.

.. code-block:: bash

    # cd into sparc2-ansible directory
    vagrant provision

By default, the guest server's web UI is available on port 8000 (http://localhost:8000/) and PostGIS is available on port 5432 with db / user / pass (sparc2 / sparc2 / sparc2).

Production  Environment
-----------------------

TODO

.. code-block:: bash

    pip install git+git://github.com/wfp-ose/sparc2.git@master



Static Development
-----------------------

For static development, go to the sparc2/static/sparc2/ folder.

If you haven't already upgraded NodeJS to the latest version, you can do it with the following.

http://askubuntu.com/questions/426750/how-can-i-update-my-nodejs-to-the-latest-version

.. code-block:: bash

    sudo npm cache clean -f
    sudo npm install -g n
    sudo n stable

    # Following is optional line.  Not usually required for gulp.
    sudo ln -sf /usr/local/n/versions/node/<VERSION>/bin/node /usr/bin/node
