#!/usr/bin/env python

from setuptools import setup

setup(
    name='sparc2',
    version='2.0.0',
    install_requires=[],
    author='Patrick Dufour',
    author_email='pjdufour.dev@gmail.com',
    license='BSD License',
    url='https://github.com/wfp-ose/sparc2',
    keywords='python gis sparc',
    description='Spatial Analysis Risk Calendar, Version 2.x',
    long_description=open('README.rst').read(),
    download_url="https://github.com/wfp-ose/sparc2/zipball/master",
    packages=[
        "sparc2",
        "sparc2.tests"],
    classifiers = [
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: BSD License',
        'Topic :: Software Development :: Libraries :: Python Modules'
    ]
)
