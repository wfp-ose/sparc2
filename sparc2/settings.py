from __future__ import absolute_import
import os

import sparc2


VERSION = sparc2.get_version()

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

SECRET_KEY = '9u$pbamv*a1s09(5grvnko2)n)isa50=uui@lm3syhp6)jyrhg'

DEBUG = True

FIXTURE_DIRS = ()

SERIALIZATION_MODULES = {
    'yml': "django.core.serializers.pyyaml"
}

#######################################
# TEMPLATES
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(BASE_DIR, "sparc2/templates")
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'sparc2.context_processors.sparc2',
                'geosite.context_processors.geosite',
                'django.contrib.auth.context_processors.auth',
                'django.template.context_processors.debug',
                'django.template.context_processors.i18n',
                'django.template.context_processors.media',
                'django.template.context_processors.static',
                'django.template.context_processors.tz',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]
#######################################
# STATIC
DEBUG_STATIC = True
STATIC_ROOT = '/var/www/static/'
STATIC_URL = '/static/'
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, "sparc2/static"),
]
ALLOWED_HOSTS = []

INSTALLED_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.gis',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'pinax_theme_bootstrap',
    'django_forms_bootstrap',

    'autocomplete_light',

    'leaflet',

    'corsheaders',
    'jquery',
    #'taggit',
    #'taggit_templatetags',
)

WFP_APPS = (
    'wfppresencedjango',
    'lsibdjango',
    'gauldjango',
    'geosite'
)

SPARC_APPS = (
    'sparc2',
)

INSTALLED_APPS = INSTALLED_APPS + WFP_APPS + SPARC_APPS

MIDDLEWARE_CLASSES = (
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

ROOT_URLCONF = 'sparc2.urls'

WSGI_APPLICATION = 'sparc2.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'sparc2',
        'USER': 'sparc2',
        'PASSWORD': 'sparc2',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
#######################################
# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_L10N = True
USE_TZ = True
#######################################
SITEURL = "http://localhost:8000/"

CORS_ORIGIN_ALLOW_ALL = True

PROXY_ALLOWED_HOSTS = (
    'tile.openstreetmap.org',
    'tile.openstreetmap.fr',
    'tiles.virtualearth.net',
    'tiles.mapbox.com',
    'hiu-maps.net',
    'geonode.wfp.org',
    'sparc.wfp.org')

PROXY_URL = '/proxy/?url='

# Site id in the Django sites framework
SITE_ID = 1

# Leaflet

LEAFLET_CONFIG = {
    'TILES': [
        (
            'OSM',
            'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        ),
    ],
    'PLUGINS': {
        'esri-leaflet': {
            'js': 'sparc1/js/esri-leaflet.js',
            'auto-include': True,
        },
        'leaflet-fullscreen': {
            'css': 'sparc1/css/leaflet.fullscreen.css',
            'js': 'sparc1/js/Leaflet.fullscreen.min.js',
            'auto-include': True,
        },
    }
}
#######################################
# SPARC 2.0

# SPARC_HAZARDS is used for configuring what hazards are enabled.
# Additional configuration is in enumerations.py
SPARC_HAZARDS = ["cyclone", "drought", "flood"]
SPARC_MAP_DEFAULTS = {
    "latitude": 0,
    "longitude": 30,
    "zoom": 3,
    "baselayers": [
        {
            "title": 'OSM',
            "url": "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "attribution": "&copy; <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
        }
    ],
    "symbology": {
        "popatrisk": {
            # colors is used by /summary.json to decide number of breakpoints
            #"colors": ["#FF0000", "#FFA500", '#eff76a', '#76f579', '#e1d3d3', '#FFFFFF']
            "opacity": 0.8,
            "fillOpacity": 0.4,
            "colors": ["#FF0000", "#fef0d9", '#fdcc8a', '#fc8d59', '#d7301f']
        },
        "context": {
            # colors is used by /summary.json to decide number of breakpoints
            #"colors": ["#FF0000", "#FFA500", '#eff76a', '#76f579', '#e1d3d3', '#FFFFFF']
            "opacity": 0.8,
            "fillOpacity": 0.4,
            "colors": ['#cb181d', '#fb6a4a', '#fcae91', '#aaaaaa', '#bdd7e7','#6baed6','#2171b5']
        }
    }
}

GEOSITE_DB_CONN_STR = "dbname='sparc2' user='sparc2' host='localhost' password='sparc2'"
GEOSITE_CACHE_DATA = True
GEOSITE_MEMCACHED_HOST = 'localhost'
GEOSITE_MEMCACHED_PORT = 11212  # So doesn't interfer with root/built-in memcached
#-----------------------------
# DNS Prefetch
GEOSITE_DNS_PREFETCH = [
    '//wfp.org',
    '//mapbox.com', '//api.mapbox.com',
    '//thunderforest.com',
    '//openstreetmap.org', '//openstreetmap.fr'
]
#-----------------------------
# Dependencies Management
SPARC_STATIC_VERSION="1.0.0"
GEOSITE_STATIC_VERSION="1.0.0"
GEOSITE_STATIC_DEPS = {
    "angular": {
        "version": "1.4.0-beta.4"
    },
    "c3": {
        "version": "0.4.10"
    },
    "d3": {
        "version": "3.5.14"
    },
    "fontawesome": {
        "version": "4.5.0"
    },
    "jquery": {
        "version": "1.9.1"
    },
    "jqueryui": {
        "version": "1.11.4",
        "theme": "cupertino"
    },
    "select2": {
        "version": "4.0.1"
    }
}
#-----------------------------
# Debugging & Testing
SPARC_STATIC_DEBUG = {
    "main": True
}

GEOSITE_STATIC_DEBUG = {
    "polyfill": False,
    "main": True,
    "angular": False,
    "c3": False,
    "d3": False,
    "bootstrap": False,
    "jquery": False,
    "leaflet": True
}
#######################################
