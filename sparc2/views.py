import datetime
import requests
import yaml
import sys
import numpy
import binascii
import requests

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

from geodash.utils import extract


class api_countries(geodash_data_view):

    def _build_root(self, request, *args, **kwargs):
        return request.GET.get('root', None) or "countries"

    def _build_key(self, request, *args, **kwargs):
        return "data/local/countries/{extension}".format(**kwargs)

    def _build_attributes(self, request, *args, **kwargs):
        return [
          { "label": "iso_alpha2", "path": "iso.alpha2" },
          { "label": "iso_alpha3", "path": "iso.alpha3" },
          { "label": "iso_num ", "path": "iso.num", "type": "integer" },
          { "label": "dos_short", "path": "dos.short" },
          { "label": "dos_long", "path": "dos.long" },
          { "label": "gaul_admin0_code", "path": "gaul.admin0_code" },
          { "label": "gaul_admin0_name", "path": "gaul.admin0_name" },
          { "label": "gaul_extent", "path": "gaul.extent" }
        ]

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
                    'admin0_name': g.admin0_name,
                }
                if g.mpoly is not None:
                    y['gaul']['extent'] = [x for x in g.mpoly.extent]
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

    def _build_root(self, request, *args, **kwargs):
        return request.GET.get('root', None) or "hazards"

    def _build_key(self, request, *args, **kwargs):
        return "data/local/hazards/{extension}".format(**kwargs)

    def _build_attributes(self, request, *args, **kwargs):
        return [
          { "label": "id", "path": "id" },
          { "label": "title", "path": "title" }
        ]

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

class api_dashboard_home(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "dashboard/home".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):

        data = yaml.load(get_template("sparc2/maps/home.yml").render({}))

        return data


class api_dashboard_countryhazard(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "dashboard/country/{iso3}/hazard/{hazard}".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):

        data = None

        iso3 = kwargs.pop('iso3', None)
        hazard = kwargs.pop('hazard', None)
        month = kwargs.pop('month', None)

        now = datetime.datetime.now()
        current_month = now.month
        country_title = WFPCountry.objects.filter(thesaurus__iso_alpha3=iso3).values_list('gaul__admin0_name', flat=True)[0]
        hazard_title = [h for h in SPARC_HAZARDS_CONFIG if h["id"]==hazard][0]["title"]
        month_num = get_month_number(month)
        if month_num == -1:
            month_num = current_month
        month_title = MONTHS_SHORT3[month_num-1]
        ##############
        # This is inefficient, so would be better to rework
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
        #############
        data = yaml.load(get_template("sparc2/maps/countryhazardmonth_detail.yml").render({
            "iso_alpha3": iso3,
            "hazard_title": hazard_title,
            "country_title": country_title,
            "hazard": hazard,
            "maxValue": maxValue
        }))

        return data


class api_state_home(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "state/home".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):

        dashboard = yaml.load(get_template("sparc2/maps/home.yml").render({}))

        data = {
            "page": "home",
            "view": {
                "lat": dashboard["view"]["latitude"],
                "lon": dashboard["view"]["longitude"],
                "z": dashboard["view"]["zoom"],
                "baselayer": "osm",
                "featurelayers": ["wld_poi_facilities_wfp", "flood_events_all"]
            },
            "filters": {},
            "styles": {}
        }

        return data


class api_state_countryhazardmonth(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "state/country/{iso3}/hazard/{hazard}/month/{month}".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):

        data = None

        iso3 = kwargs.pop('iso3', None)
        hazard = kwargs.pop('hazard', None)
        month = kwargs.pop('month', None)

        now = datetime.datetime.now()
        current_month = now.month
        country_title = WFPCountry.objects.filter(thesaurus__iso_alpha3=iso3).values_list('gaul__admin0_name', flat=True)[0]
        hazard_title = [h for h in SPARC_HAZARDS_CONFIG if h["id"]==hazard][0]["title"]
        month_num = get_month_number(month)
        if month_num == -1:
            month_num = current_month
        month_title = MONTHS_SHORT3[month_num-1]
        ##############
        # This is inefficient, so would be better to rework
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
        #############
        popatrisk_range = [0.0, summary["all"]["max"]["at_admin2_month"]]
        #############
        dashboard = yaml.load(get_template("sparc2/maps/countryhazardmonth_detail.yml").render({
            "iso_alpha3": iso3,
            "hazard_title": hazard_title,
            "country_title": country_title,
            "hazard": hazard,
            "maxValue": maxValue
        }))
        #############
        view = {
            "baselayer": "osm",
            "featurelayers": ["popatrisk"]
        }
        response = requests.get(settings.SITEURL+"api/countries.json?grep=iso.alpha3%3D"+iso3)
        extent = extract(["countries", 0, "gaul", "extent"], response.json(), None)
        if extent is None:
            view["lat"] = dashboard["view"].get("latitude", 0)
            view["lon"] = dashboard["view"].get("longitude", 0)
            view["z"] = dashboard["view"]["zoom"]
        else:
            view["extent"] = extent
        #############
        data = {
            "page": "countryhazardmonth_detail",
            "iso3": iso3,
            "country_title": country_title,
            "hazard": hazard,
            "hazard_title": hazard_title,
            "month": month_num,
            "view": view,
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

        if hazard == "cyclone":
            data["filters"]["popatrisk"]["prob_class_max"] = 0.1
            data["filters"]["popatrisk"]["category"] = "cat1_5"
        elif hazard == "drought":
            data["filters"]["popatrisk"]["prob_class_max"] = 0.1
        elif hazard == "flood":
            data["filters"]["popatrisk"]["rp"] = 200
        elif hazard == "landslide":
            data["filters"]["popatrisk"]["prob_class_max"] = 1

        return data

class api_state_schema(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "state/schema/hazard/{hazard}".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):

        data = None

        hazard = kwargs.pop('hazard', None)

        data = {
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
            data["filters"]["popatrisk"]["prob_class_max"] = "float"
            data["filters"]["popatrisk"]["category"] = "string"
        elif hazard == "drought":
            data["filters"]["popatrisk"]["prob_class_max"] = "float"
        elif hazard == "flood":
            data["filters"]["popatrisk"]["rp"] = "integer"
        elif hazard == "landslide":
            data["filters"]["popatrisk"]["prob_class_max"] = "integer"


        return data


class api_data_country(geodash_data_view):

    def _build_root(self, request, *args, **kwargs):

        iso3 = kwargs.pop('iso3', None)
        dataset = kwargs.pop('dataset', None)

        if dataset == "context":
            return request.GET.get('root', None) or "features"
        else:
            return None

    def _build_key(self, request, *args, **kwargs):
        return "data/local/country/{iso3}/dataset/{dataset}".format(**kwargs)

    def _build_attributes(self, request, *args, **kwargs):
        iso3 = kwargs.pop('iso3', None)
        dataset = kwargs.pop('dataset', None)
        attributes_filter_include_string = request.GET.get('attributes') or request.GET.get('include') or request.GET.get('columns')
        attributes_filter_exclude_string = request.GET.get('exclude') or request.GET.get('attributes_exclude') or request.GET.get('columns_exclude')

        if dataset == "context":
            attributes = [
                { "label": "iso_alpha3", "path": "properties.iso_alpha3" },
                { "label": "gaul_admin0_code", "path": "properties.admin0_code" },
                { "label": "gaul_admin0_name", "path": "properties.admin0_name" },
                { "label": "gaul_admin1_code", "path": "properties.admin1_code" },
                { "label": "gaul_admin1_name", "path": "properties.admin1_name" },
                { "label": "gaul_admin2_code", "path": "properties.admin2_code" },
                { "label": "gaul_admin2_name", "path": "properties.admin2_name" },
                { "label": "context_ldi", "path": "properties.ldi", "type": "integer" },
                { "label": "context_delta_mean", "path": "properties.delta_mean", "type": "float" },
                { "label": "context_delta_negative", "path": "properties.delta_negative", "type": "float" },
                { "label": "context_delta_positive", "path": "properties.delta_positive", "type": "float" },
                { "label": "context_delta_forest", "path": "properties.delta_forest", "type": "float" },
                { "label": "context_delta_crop", "path": "properties.delta_crop", "type": "float" },
                { "label": "context_erosion_propensity", "path": "properties.erosion_propensity", "type": "float" }
            ]
            if attributes:
                if isinstance(attributes_filter_include_string, basestring) and len(attributes_filter_include_string) > 0:
                    attributes_filter_include_list = attributes_filter_include_string.split(",")
                    attributes = [x for x in attributes if x['path'] in attributes_filter_include_list]
                if isinstance(attributes_filter_exclude_string, basestring) and len(attributes_filter_exclude_string) > 0:
                    attributes_filter_exclude_list = attributes_filter_exclude_string.split(",")
                    attributes = [x for x in attributes if x['path'] not in attributes_filter_exclude_list]
            return attributes
        else:
            return None

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

    def _build_root(self, request, *args, **kwargs):
        return request.GET.get('root', None) or "features"

    def _build_key(self, request, *args, **kwargs):
        return "data/local/country/{iso3}/hazard/{hazard}/dataset/{dataset}".format(**kwargs)

    def _build_attributes(self, request, *args, **kwargs):
        return [
            { "label": "iso_alpha3", "path": "properties.iso_alpha3" },
            { "label": "gaul_admin0_code", "path": "properties.admin0_code" },
            { "label": "gaul_admin0_name", "path": "properties.admin0_name" },
            { "label": "gaul_admin1_code", "path": "properties.admin1_code" },
            { "label": "gaul_admin1_name", "path": "properties.admin1_name" },
            { "label": "gaul_admin2_code", "path": "properties.admin2_code" },
            { "label": "gaul_admin2_name", "path": "properties.admin2_name" },
            { "label": "context_ldi", "path": "properties.ldi", "type": "integer" },
            { "label": "context_delta_mean", "path": "properties.delta_mean", "type": "float" },
            { "label": "context_delta_negative", "path": "properties.delta_negative", "type": "float" },
            { "label": "context_delta_positive", "path": "properties.delta_positive", "type": "float" },
            { "label": "context_delta_forest", "path": "properties.delta_forest", "type": "float" },
            { "label": "context_delta_crop", "path": "properties.delta_crop", "type": "float" },
            { "label": "context_erosion_propensity", "path": "properties.erosion_propensity", "type": "float" }
        ]

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

    dashboard = yaml.load(get_template("sparc2/maps/home.yml").render({}))
    endpoints = yaml.load(file(ENDPOINTS_PATH, 'r'))

    ##############
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
        "dashboard_url": "/api/dashboard/home.json",
        "state_url": "/api/state/home.json",
        "state_schema": state_schema,
        "endpoints": endpoints,
        "geodash_main_id": "geodash-main",
        "include_sidebar_left": False,
        "modal_welcome": True
    }

    ctx.update({
      "endpoints_json": json.dumps(ctx["endpoints"]),
      "state_schema_json": json.dumps(ctx["state_schema"])
    })

    ctx.update({
      "server_templates": json.dumps({
          "main.tpl.html": get_template("sparc2/home/main.tpl.html").render(ctx)
      })
    })

    return render_to_response(template, RequestContext(request, ctx))


def explore(request, template="sparc2/home.html"):
    now = datetime.datetime.now()
    current_month = now.month

    dashboard = yaml.load(get_template("sparc2/maps/home.yml").render({}))
    endpoints = yaml.load(file(ENDPOINTS_PATH, 'r'))

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
        "dashboard_url": "/api/dashboard/home.json",
        "state_schema": state_schema,
        "endpoints": endpoints,
        "geodash_main_id": "geodash-main",
        "include_sidebar_left": False,
        "modal_welcome": True
    }

    ctx.update({
      "endpoints_json": json.dumps(ctx["endpoints"]),
      "state_schema_json": json.dumps(ctx["state_schema"])
    })

    ctx.update({
      "server_templates": json.dumps({
          "main.tpl.html": get_template("sparc2/home/main.tpl.html").render(ctx)
      })
    })

    return render_to_response(template, RequestContext(request, ctx))


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

    endpoints = yaml.load(file(ENDPOINTS_PATH, 'r'))
    ##############

    #############


    #ctx = {
    #    "map_config": map_config,
    #    "map_config_json": json.dumps(map_config),
    #    "state": initial_state,
    #    "state_json": json.dumps(initial_state),
    #    "state_schema": state_schema,
    #    "state_schema_json": json.dumps(state_schema),
    #    "endpoints_json": json.dumps(endpoints),
    #    "sidebar_left_open": True,
    #    "init_function": "init_countryhazardmonth",
    #    "geodash_main_id": "geodash-main",
    #    "include_sidebar_left": True
    #}

    dashboard_resources = [
        {
            "loader": "popatrisk_summary",
            "url": "/api/data/country/{iso3}/hazard/{hazard}/dataset/summary.json".format(iso3=iso3, hazard=hazard)
        },
        {
            "loader": "context_summary",
            "url": "/api/data/country/{iso3}/dataset/context_summary.json".format(iso3=iso3)
        },
        {
            "loader": "context_geojson",
            "url": "/api/data/country/{iso3}/dataset/context.json".format(iso3=iso3)
        },
        {
            "loader": "vam_geojson",
            "url": "/api/data/country/{iso3}/dataset/vam.json".format(iso3=iso3)
        }
    ];
    #geojson: {% endverbatim %}{ url: "/api/data/country/{{ iso_alpha3|upper }}/dataset/context.json" }{% verbatim %}
    ctx = {
        "dashboard_url": "/api/dashboard/country/{iso3}/hazard/{hazard}.json".format(iso3=iso3, hazard=hazard),
        "state_url": "/api/state/country/{iso3}/hazard/{hazard}/month/{month}.json".format(iso3=iso3, hazard=hazard, month=month_num),
        "state_schema_url": "/api/state/schema/hazard/{hazard}.json".format(hazard=hazard),
        "endpoints": endpoints,
        "geodash_main_id": "geodash-main",
        "include_sidebar_left": True,
        "sidebar_left_open": True,
        "modal_welcome": False
    }

    ctx.update({
      "endpoints_json": json.dumps(ctx["endpoints"]),
      "dashboard_resources_json": json.dumps(dashboard_resources)
    })

    ctx.update({
        "iso3": iso3,
        "hazard": hazard,
        "month_num": month_num,
        "country_title": country_title,
        "hazard_title": hazard_title,
        "month_title": month_title
    })

    ctx.update({
      "server_templates": json.dumps({
          "main.tpl.html": get_template("sparc2/countryhazardmonth/main.tpl.html").render(ctx)
      })
    })

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
