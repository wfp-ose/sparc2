import datetime
import requests
import yaml

import errno
from socket import error as socket_error

from django.conf import settings
from django.views.generic import View
from django.shortcuts import HttpResponse, render_to_response
from django.template import RequestContext
from django.template.loader import get_template

try:
    import simplejson as json
except ImportError:
    import json

from wfppresencedjango.models import WFPCountry

from geosite.enumerations import MONTHS_SHORT3

from geosite.cache import provision_memcached_client
from sparc2.enumerations import URL_EMDAT_BY_HAZARD, TEMPLATES_BY_HAZARD, SPARC_HAZARDS_CONFIG, POPATRISK_BY_HAZARD
from sparc2.models import SPARCCountry
from sparc2.utils import get_month_number, get_json_admin0, get_geojson_cyclone, get_geojson_drought, get_geojson_flood, get_summary_cyclone, get_summary_drought, get_summary_flood, get_events_flood

def home(request, template="home.html"):
    ctx = {}
    return render_to_response(template, RequestContext(request, ctx))

def explore(request, template="explore.html"):
    now = datetime.datetime.now()

    map_config = {
        "latitude": settings.SPARC_MAP_DEFAULTS.get("latitude", 0),
        "longitude": settings.SPARC_MAP_DEFAULTS.get("longitude", 0),
        "zoom": settings.SPARC_MAP_DEFAULTS.get("zoom", 0),
        "baselayers": settings.SPARC_MAP_DEFAULTS.get("baselayers", []),
    }
    ctx = {
        "map_config": json.dumps(map_config),
        'current_month': now.strftime("%B")
    }
    return render_to_response(template, RequestContext(request, ctx))

def about(request, template="about.html"):
    ctx = {}
    return render_to_response(template, RequestContext(request, ctx))

def download(request, template="download.html"):
    ctx = {}
    return render_to_response(template, RequestContext(request, ctx))

def country_detail(request, iso3=None, template="country_detail.html"):
    now = datetime.datetime.now()

    country_title = SPARCCountry.objects.get(country__thesaurus__iso3=iso3).dos_short

    map_config = {
        "latitude": settings.SPARC_MAP_DEFAULTS.get("latitude", 0),
        "longitude": settings.SPARC_MAP_DEFAULTS.get("longitude", 0),
        "zoom": settings.SPARC_MAP_DEFAULTS.get("zoom", 0),
        "baselayers": settings.SPARC_MAP_DEFAULTS.get("baselayers", []),
        "legend": {
            "colors": settings.SPARC_MAP_DEFAULTS["legend"]["colors"]
        }
    }
    ctx = {
        "iso3": iso3,
        "country_title": country_title,
        "map_config": json.dumps(map_config),
        'current_month': now.strftime("%B")
    }
    return render_to_response(template, RequestContext(request, ctx))

def hazard_detail(request, iso3=None, template="hazard_detail.html"):
    raise NotImplementedError

def countryhazardmonth_detail(request, iso3=None, hazard=None, month=None):
    now = datetime.datetime.now()
    #current_month = now.strftime("%B")
    current_month = now.month

    t = TEMPLATES_BY_HAZARD.get(hazard, None)
    if not t:
        raise Exception("Could not find template for hazard")

    country_title = WFPCountry.objects.filter(thesaurus__iso_alpha3=iso3).values_list('gaul__admin0_name', flat=True)[0]

    hazard_title = [h for h in SPARC_HAZARDS_CONFIG if h["id"]==hazard][0]["title"]
    month_num = get_month_number(month)
    if month_num == -1:
        month_num = current_month
    month_title = MONTHS_SHORT3[month_num-1]

    print "hazard: ", hazard

    ##############
    # This is inefficient, since not hitting cache.  Need to rework
    summary = None
    if hazard == "cyclone":
        summary = get_summary_cyclone(table_popatrisk=POPATRISK_BY_HAZARD[hazard], iso_alpha3=iso3)
    elif hazard == "drought":
        summary = get_summary_drought(table_popatrisk=POPATRISK_BY_HAZARD[hazard], iso_alpha3=iso3)
    elif hazard == "flood":
        summary = get_summary_flood(table_popatrisk=POPATRISK_BY_HAZARD[hazard], iso_alpha3=iso3)
    #############

    map_config_yml = get_template("sparc2/maps/countryhazardmonth_detail.yml").render({
        "iso_alpha3": iso3,
        "hazard_title": hazard_title,
        "country_title": country_title,
        "hazard": hazard,
        "maxValue": summary["all"]["max"]["at_admin2_month"]
    })
    map_config = yaml.load(map_config_yml)

    ctx = {
        "state": {
            "view": {
                "latitude": map_config["view"]["latitude"],
                "longitude": map_config["view"]["longitude"],
                "zoom": map_config["view"]["zoom"]
            }
        },
        "iso3": iso3,
        "hazard": hazard,
        "month_num": month_num,
        "country_title": country_title,
        "hazard_title": hazard_title,
        "month_title": month_title,
        "map_config": map_config,
        "map_config_json": json.dumps(map_config),
        "maxValue": summary["all"]["max"]["at_admin2_month"]
    }
    print "filters: ", map_config["featurelayers"]["popatrisk"]["filters"]

    #if hazard:
    #     ctx["data_filters"] = [h for h in SPARC_HAZARDS_CONFIG if h["id"]==hazard][0]["filters"]

    return render_to_response(t, RequestContext(request, ctx))

class sparc2_view(View):

    key = None
    content_type = "application/json"

    def _build_key(self, request, *args, **kwargs):
        return self.key

    def _build_data(self):
        raise Exception('SparcView._build_data should be overwritten')

    def get(self, request, *args, **kwargs):
        data = None
        if settings.GEOSITE_CACHE_DATA:
            client = provision_memcached_client()
            if client:
                key = self._build_key(request, *args, **kwargs)
                print "Checking cache with key ", key

                data = None
                try:
                    data = client.get(key)
                except socket_error as serr:
                    data = None
                    print "Error getting data from in-memory cache."
                    if serr.errno == errno.ECONNREFUSED:
                        print "Memcached is likely not running.  Start memcached with supervisord."
                    raise serr

                if not data:
                    print "Data not found in cache."
                    data = self._build_data(request, *args, **kwargs)
                    try:
                        client.set(key, data)
                    except socket_error as serr:
                        print "Error saving data to in-memory cache."
                        if serr.errno == errno.ECONNREFUSED:
                            print "Memcached is likely not running or the data exceeds memcached item size limit.  Start memcached with supervisord."
                        raise serr
                else:
                    print "Data found in cache."
            else:
                print "Could not connect to memcached client.  Bypassing..."
                data = self._build_data(request, *args, **kwargs)
        else:
            print "Not caching data (settings.GEOSITE_CACHE_DATA set to False)."
            data = self._build_data(request, *args, **kwargs)
        return HttpResponse(json.dumps(data, default=jdefault), content_type=self.content_type)

class admin0_data(sparc2_view):

    key = "data/local/admin0/json"

    def _build_data(self, request, *args, **kwargs):
        return get_json_admin0(request)


class data_local_country_admin(sparc2_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/local/country/{iso_alpha3}/admin/{level}/json".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):
        print kwargs
        level = kwargs.pop('level', None)
        iso_alpha3 = kwargs.pop('iso_alpha3', None)
        data = None
        if int(level) == 2:
            data = get_geojson_admin2(request, iso_alpha3=iso_alpha3, level=level)
        return data


class countryhazard_data_local(sparc2_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/local/{iso3}/{hazard}/json".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):
        print kwargs
        hazard = kwargs.pop('hazard', None)
        iso3 = kwargs.pop('iso3', None)
        data = None
        if hazard == u'cyclone':
            data = get_geojson_cyclone(request, iso_alpha3=iso3)
        elif hazard == u'drought':
            data = get_geojson_drought(request, iso_alpha3=iso3)
        elif hazard == u'flood':
            data = get_geojson_flood(request, iso_alpha3=iso3)
        return data

class countryhazard_data_local_summary(sparc2_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/local/{iso3}/{hazard}/summary/json".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):
        print "Building data"
        hazard = kwargs.pop('hazard', None)
        iso3 = kwargs.pop('iso3', None)
        data = None
        if hazard == "cyclone":
            data = get_summary_cyclone(table_popatrisk=POPATRISK_BY_HAZARD[hazard], iso_alpha3=iso3)
        elif hazard == "drought":
            data = get_summary_drought(table_popatrisk=POPATRISK_BY_HAZARD[hazard], iso_alpha3=iso3)
        elif hazard == "flood":
            data = get_summary_flood(table_popatrisk=POPATRISK_BY_HAZARD[hazard], iso_alpha3=iso3)
        return data

class countryhazard_data_emdat(sparc2_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/emdat/{iso3}/{hazard}/json".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):
        hazard = kwargs.pop('hazard', None)
        iso3 = kwargs.pop('iso3', None)
        url = URL_EMDAT_BY_HAZARD.get(hazard, None)
        if not url:
            raise Exception("Could not find url for country-hazard.")
        response = requests.get(url=url.format(iso3=iso3))
        return response.json()


def cache_data_flush(request):
    client = provision_memcached_client()
    success = client.flush_all()
    return HttpResponse(json.dumps({'success':success}), content_type='application/json')


def countryhazard_events_local(request, iso3=None, hazard=None):
    data = None
    if hazard == "flood":
        data = get_events_flood(iso3=iso3)
    return HttpResponse(json.dumps(data, default=jdefault), content_type='application/json')


def jdefault(o):
    return o.__dict__
