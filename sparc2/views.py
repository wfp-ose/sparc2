import datetime
import requests
import yaml

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

from geodash.enumerations import MONTHS_SHORT3
from geodash.views import geodash_data_view

from geodash.cache import provision_memcached_client
from sparc2.enumerations import URL_EMDAT_BY_HAZARD, SPARC_HAZARDS_CONFIG
from sparc2.models import SPARCCountry
from sparc2.utils import get_month_number, get_json_admin0, get_geojson_cyclone, get_geojson_drought, get_geojson_flood, get_geojson_landslide, get_geojson_context, get_summary_cyclone, get_summary_drought, get_summary_flood, get_summary_landslide, get_summary_context, get_events_cyclone, get_events_flood, get_events_landslide, get_geojson_vam

def home(request, template="home.html"):
    raise NotImplementedError

def explore(request):
    now = datetime.datetime.now()
    current_month = now.month

    t = "sparc2/explore.html"

    map_config_yml = get_template("sparc2/maps/explore.yml").render({})
    map_config = yaml.load(map_config_yml)

    ##############
    initial_state = {
        "page": "explore",
        "view": {
            "lat": map_config["view"]["latitude"],
            "lon": map_config["view"]["longitude"],
            "z": map_config["view"]["zoom"],
            "baselayer": None,
            "featurelayers": []
        },
        "filters": {},
        "styles": {}
    }
    state_schema = {
        "view": {
          "lat": "float",
          "lon": "float",
          "z": "integer"
        },
        "filters": {},
        "styles": {}
    }

    ctx = {
        "map_config": map_config,
        "map_config_json": json.dumps(map_config),
        "state": initial_state,
        "state_json": json.dumps(initial_state),
        "state_schema": state_schema,
        "state_schema_json": json.dumps(state_schema),
        "init_function": "init_explore"
    }

    return render_to_response(t, RequestContext(request, ctx))


def country_detail(request, iso3=None, hazard=None, month=None):
    now = datetime.datetime.now()
    current_month = now.month

    t = "sparc2/country_detail.html"

    country_title = WFPCountry.objects.filter(thesaurus__iso_alpha3=iso3).values_list('gaul__admin0_name', flat=True)[0]

    map_config_yml = get_template("sparc2/maps/country_detail.yml").render({
        "iso_alpha3": iso3,
        "country_title": country_title
    })
    map_config = yaml.load(map_config_yml)

    ##############
    initial_state = {
        "page": "country_detail",
        "iso3": iso3,
        "view": {
            "lat": map_config["view"]["latitude"],
            "lon": map_config["view"]["longitude"],
            "z": map_config["view"]["zoom"],
            "baselayer": None,
            "featurelayers": []
        },
        "filters": {},
        "styles": {
            "context": "delta_mean"
        }
    }
    state_schema = {
        "iso3": "string",
        "view": {
          "lat": "float",
          "lon": "float",
          "z": "integer"
        },
        "filters": {},
        "styles": {
            "context": "string"
        }
    }

    ctx = {
        "map_config": map_config,
        "map_config_json": json.dumps(map_config),
        "state": initial_state,
        "state_json": json.dumps(initial_state),
        "state_schema": state_schema,
        "state_schema_json": json.dumps(state_schema),
        "init_function": "init_country"
    }

    ctx.update({
        "iso3": iso3,
        "country_title": country_title
    })

    return render_to_response(t, RequestContext(request, ctx))

def hazard_detail(request, iso3=None, template="hazard_detail.html"):
    raise NotImplementedError

def countryhazardmonth_detail(request, iso3=None, hazard=None, month=None):
    now = datetime.datetime.now()
    #current_month = now.strftime("%B")
    current_month = now.month

    t = "sparc2/countryhazardmonth_detail.html"

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
        summary = get_summary_cyclone(table_popatrisk="cyclone.admin2_popatrisk", iso_alpha3=iso3)
    elif hazard == "drought":
        summary = get_summary_drought(table_popatrisk="drought.admin2_popatrisk", iso_alpha3=iso3)
    elif hazard == "flood":
        summary = get_summary_flood(table_popatrisk="flood.admin2_popatrisk", iso_alpha3=iso3)
    elif hazard == "landslide":
        summary = get_summary_landslide(table_popatrisk="landslide.admin2_popatrisk", iso_alpha3=iso3)
    #############
    maxValue = summary["all"]["max"]["at_admin2_month"] if hazard != "drought" else 0
    map_config_yml = get_template("sparc2/maps/countryhazardmonth_detail.yml").render({
        "iso_alpha3": iso3,
        "hazard_title": hazard_title,
        "country_title": country_title,
        "hazard": hazard,
        "maxValue": maxValue
    })
    map_config = yaml.load(map_config_yml)
    popatrisk_range = [0.0, summary["all"]["max"]["at_admin2_month"]] if hazard != "drought" else [0, 0]
    ##############
    initial_state = {
        "page": "countryhazardmonth_detail",
        "iso3": iso3,
        "hazard": hazard,
        "month": month_num,
        "view": {
            "lat": map_config["view"]["latitude"],
            "lon": map_config["view"]["longitude"],
            "z": map_config["view"]["zoom"],
            "baselayer": None,
            "featurelayers": []
        },
        "filters": {
            "popatrisk":
            {
              "popatrisk_range": popatrisk_range,
              "ldi_range": [1, 9],
              "erosion_propensity_range": [0, 100],
              "landcover_delta_negative_range": [0, 100],
            }
        },
        "styles": {
            "popatrisk": "default",
            "context": "delta_mean"
        }
    }
    state_schema = {
        "iso3": "string",
        "hazard": "string",
        "month": "integer",
        "view": {
          "lat": "float",
          "lon": "float",
          "z": "integer"
        },
        "filters": {
            "popatrisk":
            {
              "popatrisk_range": "integerarray",
              "ldi_range": "integerarray",
              "erosion_propensity_range": "integerarray",
              "landcover_delta_negative_range": "integerarray",
              "fcs": "stringarray",
              "csi": "stringarray"
            }
        },
        "styles": {
            "popatrisk": "string",
            "context": "string"
        }
    }
    if hazard == "cyclone":
        initial_state["filters"]["popatrisk"]["prob_class_max"] = 0.1
        initial_state["filters"]["popatrisk"]["category"] = "cat1_5"
        state_schema["filters"]["popatrisk"]["prob_class_max"] = "float"
        state_schema["filters"]["popatrisk"]["category"] = "string"
    elif hazard == "drought":
        initial_state["filters"]["popatrisk"]["prob_class_max"] = 0.04
        state_schema["filters"]["popatrisk"]["prob_class_max"] = "float"
    elif hazard == "flood":
        initial_state["filters"]["popatrisk"]["rp"] = 200
        state_schema["filters"]["popatrisk"]["rp"] = "integer"
    #############


    ctx = {
        "map_config": map_config,
        "map_config_json": json.dumps(map_config),
        "state": initial_state,
        "state_json": json.dumps(initial_state),
        "state_schema": state_schema,
        "state_schema_json": json.dumps(state_schema),
        "init_function": "init_countryhazardmonth"
    }

    ctx.update({
        "iso3": iso3,
        "hazard": hazard,
        "month_num": month_num,
        "country_title": country_title,
        "hazard_title": hazard_title,
        "month_title": month_title,
        "maxValue": maxValue,
    })

    #print "filters: ", map_config["featurelayers"]["popatrisk"]["filters"]

    #if hazard:
    #     ctx["data_filters"] = [h for h in SPARC_HAZARDS_CONFIG if h["id"]==hazard][0]["filters"]

    return render_to_response(t, RequestContext(request, ctx))


class admin0_data(geodash_data_view):

    key = "data/local/admin0/json"

    def _build_data(self, request, *args, **kwargs):
        return get_json_admin0(request)


class data_local_country_admin(geodash_data_view):

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

class countryhazard_data_local_events(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/local/{iso3}/{hazard}/events/json".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):
        print kwargs
        hazard = kwargs.pop('hazard', None)
        iso3 = kwargs.pop('iso3', None)
        data = None
        if hazard == u'cyclone':
            data = get_events_cyclone(iso3=iso3)
        elif hazard == u'flood':
            data = get_events_flood(iso3=iso3)
        elif hazard == u'landslide':
            data = get_events_landslide(iso3=iso3)
        return data


class countryhazard_data_local_popatrisk(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/local/{iso3}/{hazard}/popatrisk/json".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):
        print kwargs
        hazard = kwargs.pop('hazard', None)
        iso3 = kwargs.pop('iso3', None)
        data = None
        if hazard == u'cyclone':
            data = get_geojson_cyclone(request, iso_alpha3=iso3)
        elif hazard == u'drought':
            #data = get_geojson_drought(request, iso_alpha3=iso3)
            data = {}
        elif hazard == u'flood':
            data = get_geojson_flood(request, iso_alpha3=iso3)
        elif hazard == u'landslide':
            data = get_geojson_landslide(request, iso_alpha3=iso3)
        return data

class countryhazard_data_local_summary(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/local/country/{iso3}/hazard/{hazard}/summary/json".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):
        print "Building data"
        hazard = kwargs.pop('hazard', None)
        iso3 = kwargs.pop('iso3', None)
        data = None
        if hazard == "cyclone":
            data = get_summary_cyclone(table_popatrisk="cyclone.admin2_popatrisk", iso_alpha3=iso3)
        elif hazard == "drought":
            #data = get_summary_drought(table_popatrisk="drought.admin2_popatrisk", iso_alpha3=iso3)
            data = {}
        elif hazard == "flood":
            data = get_summary_flood(table_popatrisk="flood.admin2_popatrisk", iso_alpha3=iso3)
        elif hazard == "landslide":
            data = get_summary_landslide(table_popatrisk="landslide.admin2_popatrisk", iso_alpha3=iso3)
        return data

class countrycontext_data_local(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/local/country/{iso3}/context/json".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):
        print kwargs
        iso3 = kwargs.pop('iso3', None)
        data = None
        data = get_geojson_context(request, iso_alpha3=iso3)
        return data

class countrycontext_data_local_summary(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/local/country/{iso3}/context/summary/json".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):
        print "Building data"
        iso3 = kwargs.pop('iso3', None)
        data = None
        data = get_summary_context(table_context='context.admin2_context', iso_alpha3=iso3)
        return data

class countryhazard_data_emdat(geodash_data_view):

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

class country_data_vam(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/vam/{iso3}/json".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):
        iso3 = kwargs.pop('iso3', None)
        data = None
        data = get_geojson_vam(request, iso_alpha3=iso3)
        return data


def cache_data_flush(request):
    client = provision_memcached_client()
    success = client.flush_all()
    return HttpResponse(json.dumps({'success':success}), content_type='application/json')



def jdefault(o):
    return o.__dict__
