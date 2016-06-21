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
                'geodash.context_processors.geodash',
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
    'geodash'
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
SPARC_HAZARDS = ["cyclone", "drought", "flood", "landslide"]
SPARC_COLOR_RAMP = ['#fee5d9', '#fde79c', '#fcbba1', '#fc8d59', '#d7301f','#8162c6','#290051'];
#######################################
#-----------------------------
# Mapping Library
GEODASH_MAPPING_LIBRARY = "ol3"
#-----------------------------
# Database
GEODASH_DB_CONN_STR = "dbname='sparc2' user='sparc2' host='localhost' password='sparc2'"
GEODASH_CACHE_DATA = True
GEODASH_MEMCACHED_HOST = 'localhost'
GEODASH_MEMCACHED_PORT = 11212  # So doesn't interfer with root/built-in memcached
#-----------------------------
# Performance & Caching
GEODASH_CLIP_DECIMAL_PLACES = 4
GEODASH_REGEX_CLIP_COORDS_PATTERN = '(?P<prefix>"coordinates"\\:\\s*\\[)(?P<x>\\d+([.]\\d{0,'+str(GEODASH_CLIP_DECIMAL_PLACES)+'})?)(.*?)(,\s*?)(?P<y>\\d+([.]\\d{0,'+str(GEODASH_CLIP_DECIMAL_PLACES)+'})?)(.*?)(?P<suffix>\\])'
GEODASH_REGEX_CLIP_COORDS_REPL = '\\g<prefix>\\g<x>,\\g<y>\\g<suffix>'
#-----------------------------
# DNS Prefetch
GEODASH_DNS_PREFETCH = [
    '//wfp.org',
    '//mapbox.com', '//api.mapbox.com',
    '//thunderforest.com',
    '//openstreetmap.org', '//openstreetmap.fr'
]
#-----------------------------
# Static Management
GEODASH_STATIC_MONOLITH_CSS = False
GEODASH_STATIC_MONOLITH_JS = True

SPARC_STATIC_VERSION = "0.0.1"
GEODASH_STATIC_VERSION = "0.0.1"
#-----------------------------
# Dependencies Management
SPARC_STATIC_VERSION="0.0.1"
GEODASH_STATIC_VERSION="0.0.1"
GEODASH_STATIC_DEPS = {
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
    "main": True,
    "polyfill": False
}

GEODASH_STATIC_DEBUG = {
    "angular": True,
    "c3": False,
    "d3": False,
    "bootstrap": False,
    "jquery": False,
    "leaflet": True,
    "select2": True,
    "monolith": True
}
#######################################
