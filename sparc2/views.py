import datetime
import requests
import yaml
import sys
import numpy
import binascii
import requests
import ogr

from django.conf import settings
from django.core.urlresolvers import reverse
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

from geodash.cache import provision_memcached_client
from geodash.enumerations import MONTHS_SHORT3, MONTHS_LONG, GEOMETRY_TYPE_TO_OGR
from geodash.transport import writeToByteArray
from geodash.utils import extract, getRequestParameter, getRequestParameterAsInteger, getRequestParameterAsFloat, getRequestParameterAsList, getRequestParameters
from geodash.views import geodash_data_view

from sparc2.enumerations import URL_EMDAT_BY_HAZARD, SPARC_HAZARDS_CONFIG
from sparc2.models import SPARCCountry
from sparc2.utils import get_month_number, get_json_admin0, get_geojson_cyclone, get_geojson_drought, get_geojson_flood, get_geojson_landslide, get_geojson_context, get_summary_context, get_events_cyclone, get_events_flood, get_events_landslide, get_geojson_vam
from sparc2.stats.cyclone import get_summary_cyclone
from sparc2.stats.drought import get_summary_drought
from sparc2.stats.flood import get_summary_flood
from sparc2.stats.landslide import get_summary_landslide

ENDPOINTS_PATH = "sparc2/static/sparc2/build/api/endpoints.yml"


class api_data(geodash_data_view):

    def _build_root(self, request, *args, **kwargs):
        return request.GET.get('root', None) or kwargs.get('dataset')

    def _build_key(self, request, *args, **kwargs):
        return "data/local/{dataset}/{extension}".format(**kwargs)

    def _build_dataset(self, request, *args, **kwargs):
        ds = None
        dataset = kwargs.get("dataset")
        url = reverse("api_metadata", kwargs={"dataset": dataset, "extension": "json"})
        if url:
            response = requests.get(settings.SITEURL[:-1]+url)
            if response:
                ds = response.json()

        return ds

    def _build_data(self, request, *args, **kwargs):

        dataset = kwargs.pop('dataset', None)
        extension = kwargs.pop('extension', None)
        ext_lc = extension.lower()

        data = {}

        if dataset == "countries":
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
            data[dataset] = countries

        elif dataset == "hazards":
            hazards = []
            for x in SPARC_HAZARDS_CONFIG:
                if x['id'] in settings.SPARC_HAZARDS:
                    y = {
                        'id': x['id'],
                        'title': x['title']
                    }
                    hazards.append(y)
            data[dataset] = hazards

        return data


class api_metadata(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "metadata/local/dataset/{dataset}".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):
        ds = yaml.load(get_template("sparc2/datasets/{dataset}.yml".format(**kwargs)).render({}))
        return ds

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
        response = requests.get(settings.SITEURL+"api/data/countries.json?grep=iso.alpha3%3D"+iso3)
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

    def _build_dataset(self, request, *args, **kwargs):
        ds = None

        iso3 = kwargs.pop('iso3', None)
        dataset = kwargs.pop('dataset', None)

        url = reverse("api_metadata_country", kwargs={
            "iso3": iso3,
            "dataset": dataset,
            "extension": "json"
        })
        if url:
            response = requests.get(settings.SITEURL[:-1]+url)
            if response:
                ds = response.json()
                if dataset == "context":
                    attributes_filter_include_string = request.GET.get('attributes') or request.GET.get('include') or request.GET.get('columns')
                    attributes_filter_exclude_string = request.GET.get('exclude') or request.GET.get('attributes_exclude') or request.GET.get('columns_exclude')
                    if ds.get('attributes'):
                        if isinstance(attributes_filter_include_string, basestring) and len(attributes_filter_include_string) > 0:
                            attributes_filter_include_list = attributes_filter_include_string.split(",")
                            ds['attributes'] = [x for x in ds['attributes'] if x.get('path') in attributes_filter_include_list]
                        if isinstance(attributes_filter_exclude_string, basestring) and len(attributes_filter_exclude_string) > 0:
                            attributes_filter_exclude_list = attributes_filter_exclude_string.split(",")
                            ds['attributes'] = [x for x in ds['attributes'] if x.get('path') not in attributes_filter_exclude_list]
        return ds


    def _build_geometry_path(self, request, *args, **kwargs):
        path = None

        url = reverse("api_metadata_countryhazard", kwargs={
            "iso3": kwargs.get('iso3', None),
            "hazard": kwargs.get('hazard', None),
            "dataset": kwargs.get('dataset', None),
            "extension": "json"
        })
        if url:
            response = requests.get(settings.SITEURL[:-1]+url)
            if response:
                ds = response.json()
                path = extract("geometry.path", ds , None)

        return path


    def _build_geometry_type(self, request, *args, **kwargs):
        geometryType = None
        url = reverse("api_metadata_countryhazard", kwargs={
            "iso3": kwargs.get('iso3', None),
            "hazard": kwargs.get('hazard', None),
            "dataset": kwargs.get('dataset', None),
            "extension": "json"
        })
        if url:
            response = requests.get(settings.SITEURL[:-1]+url)
            if response:
                ds = response.json()
                if ds:
                    geometryType = GEOMETRY_TYPE_TO_OGR.get(extract("geometry.type", ds , "").lower())

        return geometryType


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


class api_metadata_country(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "metadata/local/country/{iso3}/dataset/{dataset}".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):

        dataset = kwargs.get('dataset', None)
        extension = kwargs.get('extension', None)
        ext_lc = extension.lower()

        ds = yaml.load(get_template("sparc2/datasets/{dataset}.yml".format(**kwargs)).render({}))
        return ds


class api_data_countryhazard(geodash_data_view):

    def _build_root(self, request, *args, **kwargs):
        return request.GET.get('root', None) or "features"

    def _build_key(self, request, *args, **kwargs):
        return "data/local/country/{iso3}/hazard/{hazard}/dataset/{dataset}".format(**kwargs)

    def _build_dataset(self, request, *args, **kwargs):
        ds = None

        iso3 = kwargs.pop('iso3', None)
        hazard = kwargs.pop('hazard', None)
        dataset = kwargs.pop('dataset', None)

        url = reverse("api_metadata_countryhazard", kwargs={
            "iso3": iso3,
            "hazard": hazard,
            "dataset": dataset,
            "extension": "json"
        })
        if url:
            response = requests.get(settings.SITEURL[:-1]+url)
            if response:
                ds = response.json()
                if dataset == "popatrisk" or dataset == u"popatrisk":
                    month = getRequestParameterAsInteger(request, "month", None)
                    attribute = None
                    if hazard == "cyclone":
                        category = getRequestParameter(request, "cat", "cat1_5")
                        prob_class_max = getRequestParameterAsFloat(request, "prob_class_max", None)
                        if month and category and (prob_class_max is not None):
                            attribute = {
                                "label": "POPATRISK_"+MONTHS_SHORT3[month-1].upper()+"_"+str(int(prob_class_max*100)),
                                "label_shp": MONTHS_SHORT3[month-1].upper()+"_"+str(int(prob_class_max*100)),
                                "path": "properties.addinfo",
                                "type": "float",
                                "reduce": [{
                                    "attributes": [
                                        {'path': "prob_class_min", 'type': 'float'},
                                        {'path': unicode(MONTHS_SHORT3[month-1].lower()), 'type': 'integer'}
                                    ],
                                    "grep": ["category="+category, "prob_class_min>="+str(prob_class_max)],
                                    "path": unicode(MONTHS_SHORT3[month-1].lower()),
                                    "operation": "sum"
                                }],
                                "description": "The population at risk for "+hazard+" in "+MONTHS_LONG[month-1]+" at the admin 2 level with a probability greater than or equal to probability level "+str(prob_class_max)+"."
                            }
                    elif hazard == "drought":
                        prob_class_max = getRequestParameterAsFloat(request, "prob_class_max", None)
                        if month and (prob_class_max is not None):
                            attribute = {
                                "label": "POPATRISK_"+MONTHS_SHORT3[month-1].upper()+"_"+str(int(prob_class_max*100)),
                                "label_shp": MONTHS_SHORT3[month-1].upper()+"_"+str(int(prob_class_max*100)),
                                "path": "properties.addinfo",
                                "type": "float",
                                "reduce": [{
                                    "attributes": [
                                        {'path': "prob_class_min", 'type': 'float'},
                                        {'path': unicode(MONTHS_SHORT3[month-1].lower()), 'type': 'integer'}
                                    ],
                                    "grep": ["prob_class_min>="+str(prob_class_max)],
                                    "path": unicode(MONTHS_SHORT3[month-1].lower()),
                                    "operation": "sum"
                                }],
                                "description": "The population at risk for "+hazard+" in "+MONTHS_LONG[month-1]+" at the admin 2 level with a probability greater than or equal to probability level "+str(prob_class_max)+"."
                            }
                    elif hazard == "flood":
                        rp = getRequestParameterAsInteger(request, "rp", None)
                        if month and rp:
                            path = ".".join(["properties", "RP"+str(rp), MONTHS_SHORT3[month-1].lower()])
                            attribute = {
                                "label": "POPATRISK_"+MONTHS_SHORT3[month-1].upper()+"_RP"+str(rp),
                                "label_shp": MONTHS_SHORT3[month-1].upper()+"_RP"+str(rp),
                                "path": path,
                                "type": "float",
                                "reduce": [],
                                "description": "The population at risk of "+hazard+" for "+MONTHS_LONG[month-1]+" at the admin 2 level with a return period (rp) greater than or equal to"+str(rp)+" years."
                            }
                    elif hazard == "landslide":
                        prob_class_max = getRequestParameterAsInteger(request, "prob_class_max", None)
                        if month and (prob_class_max is not None):
                            attribute = {
                                "label": "POPATRISK_"+MONTHS_SHORT3[month-1].upper()+"_"+str(prob_class_max),
                                "label_shp": MONTHS_SHORT3[month-1].upper()+"_"+str(prob_class_max),
                                "path": "properties.addinfo",
                                "type": "float",
                                "reduce": [{
                                    "attributes": [
                                        {'path': "prob_class_min", 'type': 'float'},
                                        {'path': unicode(MONTHS_SHORT3[month-1].lower()), 'type': 'integer'}
                                    ],
                                    "grep": ["prob_class_min>="+str(prob_class_max)],
                                    "path": unicode(MONTHS_SHORT3[month-1].lower()),
                                    "operation": "sum"
                                }],
                                "description": "The population at risk for "+hazard+" in "+MONTHS_LONG[month-1]+" at the admin 2 level with a probability greater than or equal to probability level "+str(prob_class_max)+"."
                            }

                    if attribute:
                        fcs = getRequestParameterAsList(request, "fcs", None)
                        if fcs:
                            ds['attributes'].append({
                                "label": "vam_fcs_filter",
                                "label_shp": "fcs_filter",
                                "value": ",".join(fcs),
                                "type": "string",
                                "description": "The selected VAM Food Consumption Score (FCS) classes."
                            });
                            attribute['reduce'].append({
                                "operation": "profile",
                                "paths": ["properties.vam_fcs_"+x for x in fcs],
                                "denominator": 100
                            })
                        csi = getRequestParameterAsList(request, "csi", None)
                        if csi:
                            ds['attributes'].append({
                                "label": "vam_csi_filter",
                                "label_shp": "csi_filter",
                                "value": ",".join(csi),
                                "type": "string",
                                "description": "The selected VAM Coping Strategies Index (CSI) classes."
                            });
                            attribute['reduce'].append({
                                "operation": "profile",
                                "paths": ["properties.vam_csi_"+x for x in csi],
                                "denominator": 100
                            })
                        ds['attributes'].append(attribute)

        return ds


    def _build_geometry_path(self, request, *args, **kwargs):
        path = None

        url = reverse("api_metadata_countryhazard", kwargs={
            "iso3": kwargs.get('iso3', None),
            "hazard": kwargs.get('hazard', None),
            "dataset": kwargs.get('dataset', None),
            "extension": "json"
        })
        if url:
            response = requests.get(settings.SITEURL[:-1]+url)
            if response:
                ds = response.json()
                path = extract("geometry.path", ds , None)

        return path


    def _build_geometry_type(self, request, *args, **kwargs):
        geometryType = None
        url = reverse("api_metadata_countryhazard", kwargs={
            "iso3": kwargs.get('iso3', None),
            "hazard": kwargs.get('hazard', None),
            "dataset": kwargs.get('dataset', None),
            "extension": "json"
        })
        if url:
            response = requests.get(settings.SITEURL[:-1]+url)
            if response:
                ds = response.json()
                if ds:
                    geometryType = GEOMETRY_TYPE_TO_OGR.get(extract("geometry.type", ds , "").lower())

        return geometryType


    def _build_grep_post_attributes(self, request, *args, **kwargs):
        iso3 = kwargs.pop('iso3', None)
        hazard = kwargs.pop('hazard', None)
        dataset = kwargs.pop('dataset', None)
        extension = kwargs.pop('extension', None)

        attributes = []
        popatrisk = getRequestParameterAsList(request, "popatrisk", None)
        if popatrisk:
            month = getRequestParameterAsInteger(request, "month", None)
            if hazard == "cyclone":
                category = getRequestParameter(request, "cat", "cat1_5")
                prob_class_max = getRequestParameterAsFloat(request, "prob_class_max", None)
                if month and category and (prob_class_max is not None):
                    if extension == "zip":
                        attributes.append({
                            "path": "properties."+MONTHS_SHORT3[month-1].upper()+"_"+str(int(prob_class_max*100)),
                            "type": "integer"
                        })
                    else:
                        attributes.append({
                            "path": "properties.POPATRISK_"+MONTHS_SHORT3[month-1].upper()+"_"+str(int(prob_class_max*100)),
                            "type": "integer"
                        })
            elif hazard == "drought":
                prob_class_max = getRequestParameterAsFloat(request, "prob_class_max", None)
                if month and (prob_class_max is not None):
                    if extension == "zip":
                        attributes.append({
                            "path": "properties."+MONTHS_SHORT3[month-1].upper()+"_"+str(int(prob_class_max*100)),
                            "type": "integer"
                        })
                    else:
                        attributes.append({
                            "path": "properties.POPATRISK_"+MONTHS_SHORT3[month-1].upper()+"_"+str(int(prob_class_max*100)),
                            "type": "integer"
                        })
            elif hazard == "flood":
                rp = getRequestParameterAsInteger(request, "rp", None)
                if month and rp:
                    if extension == "zip":
                        attributes.append({
                            "path": "properties."+MONTHS_SHORT3[month-1].upper()+"_RP"+str(rp),
                            "type": "integer"
                        })
                    else:
                        attributes.append({
                            "path": "properties.POPATRISK_"+MONTHS_SHORT3[month-1].upper()+"_RP"+str(rp),
                            "type": "integer"
                        })
            elif hazard == "landslide":
                prob_class_max = getRequestParameterAsInteger(request, "prob_class_max", None)
                if month and (prob_class_max is not None):
                    if extension == "zip":
                        attributes.append({
                            "path": "properties."+MONTHS_SHORT3[month-1].upper()+"_"+str(prob_class_max),
                            "type": "integer"
                        })
                    else:
                        attributes.append({
                            "path": "properties.POPATRISK_"+MONTHS_SHORT3[month-1].upper()+"_"+str(prob_class_max),
                            "type": "integer"
                        })

        return attributes

    def _build_grep_post_filters(self, request, *args, **kwargs):
        iso3 = kwargs.pop('iso3', None)
        hazard = kwargs.pop('hazard', None)
        dataset = kwargs.pop('dataset', None)
        extension = kwargs.pop('extension', None)

        grep_post = []
        popatrisk = getRequestParameterAsList(request, "popatrisk", None)
        if popatrisk:
            month = getRequestParameterAsInteger(request, "month", None)
            if hazard == "cyclone":
                category = getRequestParameter(request, "cat", "cat1_5")
                prob_class_max = getRequestParameterAsFloat(request, "prob_class_max", None)
                if month and category and (prob_class_max is not None):
                    if extension == "zip":
                        grep_post.append("properties."+MONTHS_SHORT3[month-1].upper()+"_"+str(int(prob_class_max*100))+" between "+str(popatrisk[0])+" and "+str(popatrisk[1]))
                    else:
                        grep_post.append("properties.POPATRISK_"+MONTHS_SHORT3[month-1].upper()+"_"+str(int(prob_class_max*100))+" between "+str(popatrisk[0])+" and "+str(popatrisk[1]))
            elif hazard == "drought":
                prob_class_max = getRequestParameterAsFloat(request, "prob_class_max", None)
                if month and (prob_class_max is not None):
                    if extension == "zip":
                        grep_post.append("properties."+MONTHS_SHORT3[month-1].upper()+"_"+str(int(prob_class_max*100))+" between "+str(popatrisk[0])+" and "+str(popatrisk[1]))
                    else:
                        grep_post.append("properties.POPATRISK_"+MONTHS_SHORT3[month-1].upper()+"_"+str(int(prob_class_max*100))+" between "+str(popatrisk[0])+" and "+str(popatrisk[1]))
            elif hazard == "flood":
                rp = getRequestParameterAsInteger(request, "rp", None)
                if month and rp:
                    if extension == "zip":
                        grep_post.append("properties."+MONTHS_SHORT3[month-1].upper()+"_RP"+str(rp)+" between "+str(popatrisk[0])+" and "+str(popatrisk[1]))
                    else:
                        grep_post.append("properties.POPATRISK_"+MONTHS_SHORT3[month-1].upper()+"_RP"+str(rp)+" between "+str(popatrisk[0])+" and "+str(popatrisk[1]))
            elif hazard == "landslide":
                prob_class_max = getRequestParameterAsInteger(request, "prob_class_max", None)
                if month and (prob_class_max is not None):
                    if extension == "zip":
                        grep_post.append("properties."+MONTHS_SHORT3[month-1].upper()+"_"+str(prob_class_max)+" between "+str(popatrisk[0])+" and "+str(popatrisk[1]))
                    else:
                        grep_post.append("properties.POPATRISK_"+MONTHS_SHORT3[month-1].upper()+"_"+str(prob_class_max)+" between "+str(popatrisk[0])+" and "+str(popatrisk[1]))

        return grep_post


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


class api_metadata_countryhazard(geodash_data_view):

    def _build_key(self, request, *args, **kwargs):
        return "metadata/local/country/{iso3}/hazard/{hazard}/dataset/{dataset}".format(**kwargs)

    def _build_data(self, request, *args, **kwargs):

        iso3 = kwargs.get('iso3', None)
        hazard = kwargs.get('hazard', None)
        dataset = kwargs.get('dataset', None)
        extension = kwargs.get('extension', None)
        ext_lc = extension.lower()

        country_title = WFPCountry.objects.filter(thesaurus__iso_alpha3=iso3).values_list('gaul__admin0_name', flat=True)[0]

        ds = yaml.load(get_template("sparc2/datasets/{dataset}.yml".format(**kwargs)).render({
            "iso3": iso3,
            "hazard": hazard,
            "country_title": country_title
        }))
        return ds


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
            "url": reverse("api_data_countryhazard", kwargs={
                "iso3": iso3,
                "hazard": hazard,
                "dataset": "summary",
                "title": iso3.upper()+"_NHR_PopAtRisk_"+hazard.title()+"_Summary",
                "extension": "json"
            })
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
