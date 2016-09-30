import datetime
import requests
import yaml
import sys
import numpy
import binascii

from django.conf import settings
from django.views.generic import View
from django.shortcuts import HttpResponse, render_to_response
from django.template import RequestContext
from django.template.loader import get_template
from django.http import Http404

try:
    import simplejson as json
except ImportError:
    import json

from wfppresencedjango.models import WFPCountry
from lsibdjango.models import GeographicThesaurusEntry
from gauldjango.models import GAULAdmin0

from geodash.enumerations import MONTHS_SHORT3
from geodash.views import geodash_data_view

from geodash.cache import provision_memcached_client
from geodash.transport import writeToByteArray
from sparc2.enumerations import URL_EMDAT_BY_HAZARD, SPARC_HAZARDS_CONFIG
from sparc2.models import SPARCCountry
from sparc2.utils import get_month_number, get_json_admin0, get_geojson_cyclone, get_geojson_drought, get_geojson_flood, get_geojson_landslide, get_geojson_context, get_summary_context, get_events_cyclone, get_events_flood, get_events_landslide, get_geojson_vam
from sparc2.stats.cyclone import get_summary_cyclone
from sparc2.stats.drought import get_summary_drought
from sparc2.stats.flood import get_summary_flood
from sparc2.stats.landslide import get_summary_landslide

ENDPOINTS_PATH = "sparc2/static/sparc2/build/api/endpoints.yml"


class api_countries(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/local/countries/{extension}".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):
        extension = kwargs.pop('extension', None)
        ext_lc = extension.lower()

        countries = []
        for x in GeographicThesaurusEntry.objects.all():
            g = None
            try:
                g = GAULAdmin0.objects.get(admin0_code=x.gaul)
            except:
                g = None

            y = {
                'iso': {
                    'alpha2': x.iso_alpha2,
                    'alpha3': x.iso_alpha3,
                    'num': x.iso_num  # 2 bytes for 3 digits
                },
                'dos': {
                    'short': x.dos_short,
                    'long': x.dos_long
                }
            }
            if g is not None:
                y['gaul'] = {
                    'admin0_code': g.admin0_code,
                    'admin0_name': g.admin0_name
                }
            countries.append(y)


        data = {
            'countries': countries
        }

        if ext_lc == "geodash":

            sizes = {
              'dos_short': 0,
              'dos_long': 0,
              'gaul_admin0_name': 0
            }
            for x in data["countries"]:
                try:
                    y = len(x["dos"]["short"])
                    if y > sizes["dos_short"]:
                        sizes["dos_short"] = y
                except:
                    pass
                try:
                    y = len(x["dos"]["long"])
                    if y > sizes["dos_long"]:
                        sizes["dos_long"] = y
                except:
                    pass
                try:
                    y = len(x["gaul"]["admin0_name"])
                    if y > sizes["gaul_admin0_name"]:
                        sizes["gaul_admin0_name"] = y
                except:
                    pass
            #####################
            # Calculate Size of Byte Array
            numberOfCountries = len(data["countries"])
            bytes_header = 4 * 4 # Integers for number of countries, length of dos_short, length of dos_long, length of gaul_admin0_name
            bytes_iso_alpha2 =  4 * 2
            bytes_iso_alpha3 =  4 * 3
            bytes_iso_num = 2
            bytes_dos_short = 4 * sizes["dos_short"]
            bytes_dos_long = 4 * sizes['dos_long']
            bytes_gaul_admin0_code = 4 * 1
            bytes_gaul_admin0_name = 4 * sizes["gaul_admin0_name"] * numberOfCountries
            bytes_data = 4 * numberOfCountries * (bytes_iso_alpha2 + bytes_iso_alpha3 + bytes_iso_num + bytes_dos_short + bytes_dos_long + bytes_gaul_admin0_code + bytes_gaul_admin0_name)
            numberOfBytes = bytes_header + bytes_data
            #####################
            # Allocate Byte Array
            print "Number of Bytes: ", numberOfBytes
            data = bytearray(numberOfBytes)


        return data


class api_hazards(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/local/hazards/{extension}".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):
        hazards = []

        for x in SPARC_HAZARDS_CONFIG:
            if x['id'] in settings.SPARC_HAZARDS:
                y = {
                    'id': x['id'],
                    'title': x['title']
                }
                hazards.append(y)

        data = {
            'hazards': hazards
        }

        return data


class api_data_country(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/local/country/{iso3}/dataset/{dataset}".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):

        iso3 = kwargs.pop('iso3', None)
        dataset = kwargs.pop('dataset', None)

        data = None

        if dataset.startswith("admin__"):
            level == int(dataset.split("__")[1])
            data = get_geojson_admin2(request, iso_alpha3=iso_alpha3, level=level)
        if dataset == "context":
            data = get_geojson_context(request, iso_alpha3=iso3)
        elif dataset == "context_summary":
            data = get_summary_context(table_context='context.admin2_context', iso_alpha3=iso3)
        elif dataset == "vam":
            data = get_geojson_vam(request, iso_alpha3=iso3)

        return data


class api_data_countryhazard(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/local/country/{iso3}/hazard/{hazard}/dataset/{dataset}".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):

        iso3 = kwargs.pop('iso3', None)
        hazard = kwargs.pop('hazard', None)
        dataset = kwargs.pop('dataset', None)

        data = None

        if dataset == "events" or dataset == u"events":
            if hazard == u'cyclone':
                data = get_events_cyclone(iso3=iso3)
            elif hazard == u'flood':
                data = get_events_flood(iso3=iso3)
            elif hazard == u'landslide':
                data = get_events_landslide(iso3=iso3)
        elif dataset == "popatrisk":
            if hazard == u'cyclone':
                data = get_geojson_cyclone(request, iso_alpha3=iso3)
            elif hazard == u'drought':
                data = get_geojson_drought(request, iso_alpha3=iso3)
            elif hazard == u'flood':
                data = get_geojson_flood(request, iso_alpha3=iso3)
            elif hazard == u'landslide':
                data = get_geojson_landslide(request, iso_alpha3=iso3)
        elif dataset == "summary":
            if hazard == "cyclone":
                data = get_summary_cyclone(table_popatrisk="cyclone.admin2_popatrisk", iso_alpha3=iso3)
            elif hazard == "drought":
                data = get_summary_drought(table_popatrisk="drought.admin2_popatrisk", iso_alpha3=iso3)
            elif hazard == "flood":
                data = get_summary_flood(table_popatrisk="flood.admin2_popatrisk", iso_alpha3=iso3)
            elif hazard == "landslide":
                data = get_summary_landslide(table_popatrisk="landslide.admin2_popatrisk", iso_alpha3=iso3)
        return data


def api_cache_data_flush(request):
    client = provision_memcached_client()
    success = client.flush_all()
    return HttpResponse(json.dumps({'success':success}), content_type='application/json')


def home(request, template="sparc2/home.html"):
    now = datetime.datetime.now()
    current_month = now.month

    map_config_yml = get_template("sparc2/maps/home.yml").render({})
    map_config = yaml.load(map_config_yml)
    endpoints = yaml.load(file(ENDPOINTS_PATH, 'r'))

    ##############
    initial_state = {
        "page": "home",
        "view": {
            "lat": map_config["view"]["latitude"],
            "lon": map_config["view"]["longitude"],
            "z": map_config["view"]["zoom"],
            "baselayer": "osm",
            "featurelayers": ["wld_poi_facilities_wfp", "flood_events_all"]
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
        "endpoints_json": json.dumps(endpoints),
        "init_function": "init_explore",
        "geodash_main_id": "geodash-main",
        "include_sidebar_left": False
    }

    return render_to_response(template, RequestContext(request, ctx))

def explore(request):
    now = datetime.datetime.now()
    current_month = now.month

    t = "sparc2/explore.html"

    map_config_yml = get_template("sparc2/maps/explore.yml").render({})
    map_config = yaml.load(map_config_yml)
    endpoints = yaml.load(file(ENDPOINTS_PATH, 'r'))

    ##############
    initial_state = {
        "page": "explore",
        "view": {
            "lat": map_config["view"]["latitude"],
            "lon": map_config["view"]["longitude"],
            "z": map_config["view"]["zoom"],
            "baselayer": "osm",
            "featurelayers": ["wld_poi_facilities_wfp", "flood_events_all"]
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
        "endpoints_json": json.dumps(endpoints),
        "init_function": "init_explore",
        "geodash_main_id": "geodash-main",
        "include_sidebar_left": False
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
    endpoints = yaml.load(file(ENDPOINTS_PATH, 'r'))

    ##############
    initial_state = {
        "page": "country_detail",
        "iso3": iso3,
        "view": {
            "lat": map_config["view"]["latitude"],
            "lon": map_config["view"]["longitude"],
            "z": map_config["view"]["zoom"],
            "baselayer": "osm",
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
        "endpoints_json": json.dumps(endpoints),
        "init_function": "init_country",
        "geodash_main_id": "geodash-main",
        "include_sidebar_left": False
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
    maxValue = summary["all"]["max"]["at_admin2_month"]
    map_config_yml = get_template("sparc2/maps/countryhazardmonth_detail.yml").render({
        "iso_alpha3": iso3,
        "hazard_title": hazard_title,
        "country_title": country_title,
        "hazard": hazard,
        "maxValue": maxValue
    })
    map_config = yaml.load(map_config_yml)
    endpoints = yaml.load(file(ENDPOINTS_PATH, 'r'))
    popatrisk_range = [0.0, summary["all"]["max"]["at_admin2_month"]]
    ##############
    initial_state = {
        "page": "countryhazardmonth_detail",
        "iso3": iso3,
        "country_title": country_title,
        "hazard": hazard,
        "hazard_title": hazard_title,
        "month": month_num,
        "view": {
            "lat": map_config["view"].get("latitude", 0),
            "lon": map_config["view"].get("longitude", 0),
            "z": map_config["view"]["zoom"],
            "baselayer": "osm",
            "featurelayers": ["popatrisk"]
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
          "z": "integer",
          "baselayer": "string",
          "featurelayers": "stringarray"
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
        initial_state["filters"]["popatrisk"]["prob_class_max"] = 0.1
        state_schema["filters"]["popatrisk"]["prob_class_max"] = "float"
    elif hazard == "flood":
        initial_state["filters"]["popatrisk"]["rp"] = 200
        state_schema["filters"]["popatrisk"]["rp"] = "integer"
    elif hazard == "landslide":
        initial_state["filters"]["popatrisk"]["prob_class_max"] = 1
        state_schema["filters"]["popatrisk"]["prob_class_max"] = "integer"
    #############


    ctx = {
        "map_config": map_config,
        "map_config_json": json.dumps(map_config),
        "state": initial_state,
        "state_json": json.dumps(initial_state),
        "state_schema": state_schema,
        "state_schema_json": json.dumps(state_schema),
        "endpoints_json": json.dumps(endpoints),
        "sidebar_left_open": True,
        "init_function": "init_countryhazardmonth",
        "geodash_main_id": "geodash-main",
        "include_sidebar_left": True
    }

    ctx.update({
        "iso3": iso3,
        "hazard": hazard,
        "month_num": month_num,
        "country_title": country_title,
        "hazard_title": hazard_title,
        "month_title": month_title,
        "maxValue": maxValue
    })

    #print "filters: ", map_config["featurelayers"]["popatrisk"]["filters"]

    #if hazard:
    #     ctx["data_filters"] = [h for h in SPARC_HAZARDS_CONFIG if h["id"]==hazard][0]["filters"]

    return render_to_response(t, RequestContext(request, ctx))


class admin0_data(geodash_data_view):

    key = "data/local/admin0/{extension}"

    def _build_data(self, request, *args, **kwargs):
        return get_json_admin0(request)


class data_local_country_admin(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/local/country/{iso_alpha3}/admin/{level}/{extension}".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):
        print kwargs
        level = kwargs.pop('level', None)
        iso_alpha3 = kwargs.pop('iso_alpha3', None)
        data = None
        if int(level) == 2:
            data = get_geojson_admin2(request, iso_alpha3=iso_alpha3, level=level)
        return data


class countryhazard_data_local_summary(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/local/country/{iso3}/hazard/{hazard}/summary/{extension}".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):
        print "Building data"
        hazard = kwargs.pop('hazard', None)
        iso3 = kwargs.pop('iso3', None)
        extension = kwargs.pop('extension', 'None')

        data = None
        if hazard == "cyclone":
            data = get_summary_cyclone(table_popatrisk="cyclone.admin2_popatrisk", iso_alpha3=iso3)
        elif hazard == "drought":
            data = get_summary_drought(table_popatrisk="drought.admin2_popatrisk", iso_alpha3=iso3)
        elif hazard == "flood":
            data = get_summary_flood(table_popatrisk="flood.admin2_popatrisk", iso_alpha3=iso3)
        elif hazard == "landslide":
            data = get_summary_landslide(table_popatrisk="landslide.admin2_popatrisk", iso_alpha3=iso3)

        if extension == "geodash":
            #####################
            # Calculate Size of Byte Array
            bytes_header = 4 * 5
            bytes_max = 4 * 1
            bytes_breakpoints = 4 * (data["header"]["all_breakpoints_natural"] + data["header"]["all_breakpoints_natural_adjusted"])
            sizeOfProbClassName = 0
            for x in data["header"]["prob_classes"]:
                y = len(x["label"])
                if y > sizeOfProbClassName:
                    sizeOfProbClassName = y
            bytes_prob_classes_names = 4 * len(data["header"]["prob_classes"]) * sizeOfProbClassName
            bytes_prob_classes_data = 4 * len(data["header"]["prob_classes"]) * 12
            bytes_admin2_codes = 4 * data['header']["admin2"]  #  They are integers like 40788
            bytes_admin2_prob_class_data = 4 * data['header']["admin2"] * len(data["header"]["prob_classes"]) * 12
            numberOfBytes = bytes_header + bytes_max + bytes_breakpoints + bytes_prob_classes_names + bytes_prob_classes_data + bytes_admin2_codes + bytes_admin2_prob_class_data
            #####################
            # Allocate Byte Array
            print "Number of Bytes: ", numberOfBytes
            encoded = bytearray(numberOfBytes)
            #####################
            # Header
            i = 0
            encoded, i = writeToByteArray(encoded, sizeOfProbClassName, i)  # Size of Probability Class Names
            encoded, i = writeToByteArray(encoded, len(data['header']["prob_classes"]), i)  # Number of Probability Classes
            encoded, i = writeToByteArray(encoded, data['header']["admin2"], i)  # Number of Admin 2 Districts
            encoded, i = writeToByteArray(encoded, data['header']["all_breakpoints_natural"], i)  # Number of Natural Breakpoints
            encoded, i = writeToByteArray(encoded, data['header']["all_breakpoints_natural_adjusted"], i)  # Number of Natural Adjusted Breakpoints
            # Maximum Value at Admin-2 Month
            encoded, i = writeToByteArray(encoded, data['all']["max"]["at_admin2_month"], i)
            # Breakpoints
            encoded, i = writeToByteArray(encoded, data["all"]["breakpoints"]["natural"], i)
            encoded, i = writeToByteArray(encoded, data["all"]["breakpoints"]["natural_adjusted"], i)
            # Probability Classes
            for x in data["header"]["prob_classes"]:
                y = [ord(c) for c in x["label"]]
                p = [t for t in numpy.zeros(sizeOfProbClassName - len(y), dtype=int)]
                y = y + p
                encoded, i = writeToByteArray(encoded, y, i)
            for x in data["header"]["prob_classes"]:
                for y in data["prob_class"][x["label"]]["by_month"]:
                    encoded, i = writeToByteArray(encoded, y, i)

            admin2_codes = sorted([int(x) for x in data["admin2"].keys()])
            for x in admin2_codes:
                encoded, i = writeToByteArray(encoded, x, i)

            for admin2_code in admin2_codes:
                for x in data["header"]["prob_classes"]:
                    prob_class = x["label"];
                    if prob_class in data["admin2"][str(admin2_code)]["prob_class"]:
                        for y in data["admin2"][str(admin2_code)]["prob_class"][prob_class]["by_month"]:
                            encoded, i = writeToByteArray(encoded, y, i)
                    else:
                        encoded, i = writeToByteArray(encoded, [t for t in numpy.zeros(12, dtype=int)], i)

            data = encoded;

        return data


class countryhazard_data_emdat(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "data/emdat/{iso3}/{hazard}/{extension}".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):
        hazard = kwargs.pop('hazard', None)
        iso3 = kwargs.pop('iso3', None)
        url = URL_EMDAT_BY_HAZARD.get(hazard, None)
        if not url:
            raise Exception("Could not find url for country-hazard.")
        response = requests.get(url=url.format(iso3=iso3))
        return response.json()



def jdefault(o):
    return o.__dict__
