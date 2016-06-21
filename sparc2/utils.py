
import datetime
import psycopg2
import requests

from decimal import *
from jenks import jenks

from django.conf import settings
from django.template import Context
from django.template.loader import get_template

try:
    import simplejson as json
except ImportError:
    import json

from geodash.enumerations import MONTHS_SHORT3

from geodash.data import GeoDashDatabaseConnection, calc_breaks_natural, insertIntoObject, valuesByMonthToList, rowsToDict
from sparc2.data import data_local_country_admin, data_local_country_hazard_all, data_local_country_context_all
from sparc2.enumerations import URL_VAM


def get_month_number(month):
    month_num = -1
    if month:
        month_lc = month.lower()
        try:
            month_num = int(month_lc)
        except:
            try:
                month_num = [x.lower() for x in MONTHS_SHORT3].index(month_lc)
            except:
                pass
            if month_num == -1:
                try:
                    month_num = [x.lower() for x in MONTHS_LONG].index(month_lc)
                except:
                    pass

            if month_num != -1:
                month_num += 1

    return month_num

def get_json_admin0(request, template="sparc2/sql/_admin0_data.sql"):
    connection = psycopg2.connect(settings.GEODASH_DB_CONN_STR)
    cursor = connection.cursor()
    q = get_template(template).render({'admin0_data': "sparc2_country"})
    cursor.execute(q)
    results = cursor.fetchall()
    return results


def get_context_by_admin2(geodash_conn=None, iso_alpha3=None):
    context_by_admin2 = {}

    rows_context = geodash_conn.exec_query_multiple(
        get_template("sparc2/sql/_context_by_admin2.sql").render({
            'admin2_context': 'context.admin2_context',
            'iso_alpha3': iso_alpha3}))

    for row in rows_context:
        admin2_code, ldi, delta_negative, erosion_propensity = row
        context_by_admin2[str(admin2_code)] = {
            'ldi': ldi,
            'delta_negative': delta_negative,
            'erosion_propensity': erosion_propensity
        }
    return context_by_admin2

def get_vam_by_admin1(request=None, iso_alpha3=None):
    vam_by_admin1 = {}

    vam = get_geojson_vam(request, iso_alpha3=iso_alpha3)

    for feature in vam["features"]:
        attributes = feature["properties"]
        print attributes
        if "vam" in attributes:
            vam_by_admin1[str(attributes["admin1_code"])] = {}
        if "fcs" in attributes["vam"]:
            vam_by_admin1[str(attributes["admin1_code"])].update({
                "vam_fcs_year": attributes["vam"]["fcs"]["year"],
                "vam_fcs_month": attributes["vam"]["fcs"]["month"],
                "vam_fcs_source": attributes["vam"]["fcs"]["source"],
                "vam_fcs_poor": attributes["vam"]["fcs"]["poor"],
                "vam_fcs_borderline": attributes["vam"]["fcs"]["borderline"],
                "vam_fcs_acceptable": attributes["vam"]["fcs"]["acceptable"]
            })
        if "csi" in attributes["vam"]:
            vam_by_admin1[str(attributes["admin1_code"])].update({
                "vam_csi_year": attributes["vam"]["csi"]["year"],
                "vam_csi_month": attributes["vam"]["csi"]["month"],
                "vam_csi_source": attributes["vam"]["csi"]["source"],
                "vam_csi_no": attributes["vam"]["csi"]["no"],
                "vam_csi_low": attributes["vam"]["csi"]["low"],
                "vam_csi_medium": attributes["vam"]["csi"]["medium"],
                "vam_csi_high": attributes["vam"]["csi"]["high"]
            })
    return vam_by_admin1

def get_geojson_cyclone(request, iso_alpha3=None):
    collection = None
    with GeoDashDatabaseConnection() as geodash_conn:
        # Admin 2 Districts
        collection = data_local_country_admin().get(cursor=geodash_conn.cursor, iso_alpha3=iso_alpha3, level=2)
        # Vam Data
        vam_by_admin1 = get_vam_by_admin1(request, iso_alpha3=iso_alpha3)
        # Population at Risk Data
        rows_popatrisk = geodash_conn.exec_query_multiple(
            get_template("sparc2/sql/_cyclone.sql").render({
                'admin2_popatrisk': 'cyclone.admin2_popatrisk',
                'iso_alpha3': iso_alpha3}))

        popatrisk_by_admin2 = {}
        for row in rows_popatrisk:
            newRow = json.loads(row[0]) if (type(row[0]) is not dict) else row[0]
            admin2_code = newRow.pop(u"admin2_code", None);
            newRow.pop(u"iso3", None)
            if admin2_code not in popatrisk_by_admin2:
                popatrisk_by_admin2[admin2_code] = []
            popatrisk_by_admin2[admin2_code].append(newRow)

        context_by_admin2 = get_context_by_admin2(geodash_conn=geodash_conn, iso_alpha3=iso_alpha3)

        for feature in collection["features"]:
            admin1_code = str(feature["properties"]["admin1_code"])
            admin2_code = str(feature["properties"]["admin2_code"])
            if admin2_code in context_by_admin2:
                feature["properties"]["ldi"] = context_by_admin2[admin2_code]["ldi"]
                feature["properties"]["delta_negative"] = context_by_admin2[admin2_code]["delta_negative"]
                feature["properties"]["erosion_propensity"] = context_by_admin2[admin2_code]["erosion_propensity"]

            feature["properties"].update({
                "FCS": 0,
                "FCS_border": 0,
                "FCS_acceptable": 0,
                "CSI_no": 0,
                "CSI_low": 0,
                "CSI_med": 0,
                "CSI_high": 0
            })
            feature["properties"]["addinfo"] = popatrisk_by_admin2[admin2_code] if admin2_code in popatrisk_by_admin2 else [];
            if admin1_code in vam_by_admin1:
                feature["properties"].update(vam_by_admin1[admin1_code])

    return collection


def get_geojson_drought(request, iso_alpha3=None):
    collection = None

    prob_classes = [
      { "min": 0.01, "max": .05, "label": "0.01-0.05" },
      { "min": .06, "max": .10, "label": "0.06-0.10" },
      { "min": .11, "max": .19, "label": "0.11-0.19" },
      { "min": .2, "max": 1.0, "label": "0.20-1.0" }
    ]

    with GeoDashDatabaseConnection() as geodash_conn:
        # Admin 2 Districts
        collection = data_local_country_admin().get(cursor=geodash_conn.cursor, iso_alpha3=iso_alpha3, level=2)
        # Vam Data
        vam_by_admin1 = get_vam_by_admin1(request, iso_alpha3=iso_alpha3)
        # Context Data
        context_by_admin2 = get_context_by_admin2(geodash_conn=geodash_conn, iso_alpha3=iso_alpha3)
        # Population at Risk Data

        popatrisk_by_admin2_probclass_month = {}
        for prob_class in prob_classes:
            rows_popatrisk = geodash_conn.exec_query_multiple(
                get_template("sparc2/sql/_drought_data_by_admin2_for_probclass.sql").render({
                    'admin2_popatrisk': 'drought.admin2_popatrisk',
                    'prob_min': prob_class["min"],
                    'prob_max': prob_class["max"],
                    'iso_alpha3': iso_alpha3}))
            for r in rows_popatrisk:
                admin2_code, month, value = r
                if admin2_code not in popatrisk_by_admin2_probclass_month:
                    popatrisk_by_admin2_probclass_month[admin2_code] = {}
                if prob_class["label"] not in popatrisk_by_admin2_probclass_month[admin2_code]:
                    popatrisk_by_admin2_probclass_month[admin2_code][prob_class["label"]] = {}
                popatrisk_by_admin2_probclass_month[admin2_code][prob_class["label"]][month] = value

        for feature in collection["features"]:
            admin1_code = str(feature["properties"]["admin1_code"])
            admin2_code = str(feature["properties"]["admin2_code"])
            if admin2_code in context_by_admin2:
                feature["properties"]["ldi"] = context_by_admin2[admin2_code]["ldi"]
                feature["properties"]["delta_negative"] = context_by_admin2[admin2_code]["delta_negative"]
                feature["properties"]["erosion_propensity"] = context_by_admin2[admin2_code]["erosion_propensity"]

            feature["properties"].update({
                "FCS": 0,
                "FCS_border": 0,
                "FCS_acceptable": 0,
                "CSI_no": 0,
                "CSI_low": 0,
                "CSI_med": 0,
                "CSI_high": 0
            })
            if admin1_code in vam_by_admin1:
                feature["properties"].update(vam_by_admin1[admin1_code])
            feature["properties"]["addinfo"] = [];
            for prob_class in prob_classes:
                includeX = False
                x = {
                    "prob_class": prob_class["label"],
                    "prob_class_min": prob_class["min"],
                    "prob_class_max": prob_class["max"]
                }
                for month in MONTHS_SHORT3:
                    if admin2_code in popatrisk_by_admin2_probclass_month:
                        if prob_class["label"] in popatrisk_by_admin2_probclass_month[admin2_code]:
                          x[month] = popatrisk_by_admin2_probclass_month[admin2_code][prob_class["label"]].get(month, 0)
                          includeX = True
                if includeX:
                    feature["properties"]["addinfo"].append(x);

    return collection


def get_geojson_flood(request, iso_alpha3=None):
    collection = None
    with GeoDashDatabaseConnection() as geodash_conn:
        # Admin 2 Districts
        collection = data_local_country_admin().get(cursor=geodash_conn.cursor, iso_alpha3=iso_alpha3, level=2)
        # Vam Data
        vam_by_admin1 = get_vam_by_admin1(request, iso_alpha3=iso_alpha3)
        # Population at Risk Data
        returnPeriods = [25, 50, 100, 200, 500, 1000]
        for rp in returnPeriods:
            rows = geodash_conn.exec_query_multiple(
                get_template("sparc2/sql/_flood_data_by_admin2_rp_month_asjson.sql").render({
                    'admin2_popatrisk': 'flood.admin2_popatrisk',
                    'iso_alpha3': iso_alpha3,
                    'rp': rp}))
            values_by_admin2 = {}
            for row in rows:
                admin2_code, data = row
                data.pop(u"admin2_code")
                values_by_admin2[str(admin2_code)] = data

            context_by_admin2 = get_context_by_admin2(geodash_conn=geodash_conn, iso_alpha3=iso_alpha3)

            for feature in collection["features"]:
                admin1_code = str(feature["properties"]["admin1_code"])
                admin2_code = str(feature["properties"]["admin2_code"])
                feature["properties"]["RP"+str(rp)] = values_by_admin2[admin2_code]
                if admin2_code in context_by_admin2:
                    feature["properties"]["ldi"] = context_by_admin2[admin2_code]["ldi"]
                    feature["properties"]["delta_negative"] = context_by_admin2[admin2_code]["delta_negative"]
                    feature["properties"]["erosion_propensity"] = context_by_admin2[admin2_code]["erosion_propensity"]
                if admin1_code in vam_by_admin1:
                    feature["properties"].update(vam_by_admin1[admin1_code])


    return collection


def get_geojson_landslide(request, iso_alpha3=None):
    collection = None

    prob_classes = [
      { "code": 1, "label": "low" },
      { "code": 2, "label": "medium" },
      { "code": 3, "label": "high" },
      { "code": 4, "label": "very_high" }
    ]

    with GeoDashDatabaseConnection() as geodash_conn:
        # Admin 2 Districts
        collection = data_local_country_admin().get(cursor=geodash_conn.cursor, iso_alpha3=iso_alpha3, level=2)
        # Vam Data
        vam_by_admin1 = get_vam_by_admin1(request, iso_alpha3=iso_alpha3)
        # Context Data
        context_by_admin2 = get_context_by_admin2(geodash_conn=geodash_conn, iso_alpha3=iso_alpha3)
        # Population at Risk Data

        popatrisk_by_admin2_probclass_month = {}
        for prob_class in prob_classes:
            rows_popatrisk = geodash_conn.exec_query_multiple(
                get_template("sparc2/sql/_landslide_data_by_admin2_for_probclass.sql").render({
                    'admin2_popatrisk': 'landslide.admin2_popatrisk',
                    'prob_min': str(prob_class["code"]),
                    'prob_max': str(prob_class["code"]),
                    'iso_alpha3': iso_alpha3}))
            for r in rows_popatrisk:
                admin2_code, month, value = r
                if admin2_code not in popatrisk_by_admin2_probclass_month:
                    popatrisk_by_admin2_probclass_month[admin2_code] = {}
                if prob_class["label"] not in popatrisk_by_admin2_probclass_month[admin2_code]:
                    popatrisk_by_admin2_probclass_month[admin2_code][prob_class["label"]] = {}
                popatrisk_by_admin2_probclass_month[admin2_code][prob_class["label"]][month] = value

        for feature in collection["features"]:
            admin1_code = str(feature["properties"]["admin1_code"])
            admin2_code = str(feature["properties"]["admin2_code"])
            if admin2_code in context_by_admin2:
                feature["properties"]["ldi"] = context_by_admin2[admin2_code]["ldi"]
                feature["properties"]["delta_negative"] = context_by_admin2[admin2_code]["delta_negative"]
                feature["properties"]["erosion_propensity"] = context_by_admin2[admin2_code]["erosion_propensity"]

            feature["properties"].update({
                "FCS": 0,
                "FCS_border": 0,
                "FCS_acceptable": 0,
                "CSI_no": 0,
                "CSI_low": 0,
                "CSI_med": 0,
                "CSI_high": 0
            })
            if admin1_code in vam_by_admin1:
                feature["properties"].update(vam_by_admin1[admin1_code])
            feature["properties"]["addinfo"] = [];
            for prob_class in prob_classes:
                includeX = False
                x = {
                    "prob_class": prob_class["label"],
                    "prob_class_min": str(prob_class["code"]),
                    "prob_class_max": str(prob_class["code"])
                }
                for month in MONTHS_SHORT3:
                    if admin2_code in popatrisk_by_admin2_probclass_month:
                        if prob_class["label"] in popatrisk_by_admin2_probclass_month[admin2_code]:
                          x[month] = popatrisk_by_admin2_probclass_month[admin2_code][prob_class["label"]].get(month, 0)
                          includeX = True
                if includeX:
                    feature["properties"]["addinfo"].append(x);

    return collection


def get_events_cyclone(iso3=None):
    connection = psycopg2.connect(settings.GEODASH_DB_CONN_STR)
    cursor = connection.cursor()
    sql = "sparc2/sql/_cyclone_events_all.sql" if iso3 == "all" else "sparc2/sql/_cyclone_events.sql"
    q = get_template(sql).render(context=Context({'iso3': iso3}))
    cursor.execute(q)
    r = cursor.fetchone()
    data = json.loads(r[0]) if (type(r[0]) is not dict) else r[0]
    return data

def get_events_flood(iso3=None):
    connection = psycopg2.connect(settings.GEODASH_DB_CONN_STR)
    cursor = connection.cursor()
    sql = "sparc2/sql/_flood_events_all_at_admin2.sql" if iso3 == "all" else "sparc2/sql/_flood_events_by_admin2.sql"
    q = get_template(sql).render(context=Context({'iso3': iso3}))
    print "SQL Command to run", q
    cursor.execute(q)
    #results = cursor.fetchone()
    #return results
    r = cursor.fetchone()
    data = json.loads(r[0]) if (type(r[0]) is not dict) else r[0]
    return data

def get_events_landslide(iso3=None):
    connection = psycopg2.connect(settings.GEODASH_DB_CONN_STR)
    cursor = connection.cursor()
    q = get_template("sparc2/sql/_landslide_events.sql").render(context=Context({'iso3': iso3}))
    cursor.execute(q)
    #results = cursor.fetchone()
    #return results
    r = cursor.fetchone()
    data = json.loads(r[0]) if (type(r[0]) is not dict) else r[0]
    return data


def get_geojson_context(request, iso_alpha3=None):
    collection = None
    with GeoDashDatabaseConnection() as geodash_conn:
        collection = data_local_country_admin().get(cursor=geodash_conn.cursor, iso_alpha3=iso_alpha3, level=2)
        rows_context = geodash_conn.exec_query_multiple(
            get_template("sparc2/sql/_context.sql").render({
                'admin2_context': 'context.admin2_context',
                'iso_alpha3': iso_alpha3}))

        if "features" in collection:
            for feature in collection["features"]:
                for row_context in rows_context:
                    json_context = json.loads(row_context[0]) if (type(row_context[0]) is not dict) else row_context[0]
                    if int(json_context["admin2_code"]) == feature["properties"]["admin2_code"]:
                        feature["properties"].update(json_context)

    return collection


def get_summary_context(table_context=None, iso_alpha3=None):
    now = datetime.datetime.now()
    current_month = now.strftime("%b").lower()

    if (not table_context) or (not iso_alpha3):
        raise Exception("Missing table_context or iso3 for get_summary_context.")

    num_breakpoints = 7

    connection = psycopg2.connect(settings.GEODASH_DB_CONN_STR)
    cursor = connection.cursor()

    values_delta_mean = data_local_country_context_all().get(
        cursor=cursor,
        iso_alpha3=iso_alpha3,
        attribute="delta_mean",
        template="sparc2/sql/_admin2_data_all.sql",
        table=table_context)
    values_delta_mean = [float(x) for x in values_delta_mean]
    values_delta_mean_negative = [x for x in values_delta_mean if x <= 0.0]
    values_delta_mean_positive = [x for x in values_delta_mean if x >= 0.0]
    natural_mean = calc_breaks_natural(values_delta_mean, 6)
    if len(values_delta_mean_negative) == 0:
        natural_mean_negative = [0, 0, 0]
    elif len(values_delta_mean_negative) == 1:
        natural_mean_negative = [
            values_delta_mean_negative[0],
            values_delta_mean_negative[0],
            values_delta_mean_negative[0]]
    else:
        natural_mean_negative = calc_breaks_natural(values_delta_mean_negative, 2)
    if len(values_delta_mean_positive) == 0:
        natural_mean_positive = [0, 0, 0]
    elif len(values_delta_mean_positive) == 1:
        natural_mean_positive = [
            values_delta_mean_positive[0],
            values_delta_mean_positive[0],
            values_delta_mean_positive[0]]
    else:
        natural_mean_positive = calc_breaks_natural(values_delta_mean_positive, 2)
    #####
    values_delta_negative = data_local_country_context_all().get(
        cursor=cursor,
        iso_alpha3=iso_alpha3,
        attribute="delta_negative",
        template="sparc2/sql/_admin2_data_all.sql",
        table=table_context)
    values_delta_negative = [float(x) for x in values_delta_negative]
    natural_negative = calc_breaks_natural(values_delta_negative, 3)
    #####
    values_delta_positive = data_local_country_context_all().get(
        cursor=cursor,
        iso_alpha3=iso_alpha3,
        attribute="delta_positive",
        template="sparc2/sql/_admin2_data_all.sql",
        table=table_context)
    values_delta_positive = [float(x) for x in values_delta_positive]
    natural_positive = calc_breaks_natural(values_delta_positive, 3)
    #####
    values_erosion_propensity = data_local_country_context_all().get(
        cursor=cursor,
        iso_alpha3=iso_alpha3,
        attribute="erosion_propensity",
        template="sparc2/sql/_admin2_data_all.sql",
        table=table_context)
    values_erosion_propensity = [float(x) for x in values_erosion_propensity]
    natural_erosion_propensity = calc_breaks_natural(values_erosion_propensity, 3)
    #####
    values_delta_crop = data_local_country_context_all().get(
        cursor=cursor,
        iso_alpha3=iso_alpha3,
        attribute="delta_crop",
        template="sparc2/sql/_admin2_data_all.sql",
        table=table_context)
    values_delta_crop = [float(x) for x in values_delta_crop]
    natural_crop_negative = calc_breaks_natural([x for x in values_delta_crop if x <= 0.0], 2)
    natural_crop_positive = calc_breaks_natural([x for x in values_delta_crop if x >= 0.0], 2)
    #####
    values_delta_forest = data_local_country_context_all().get(
        cursor=cursor,
        iso_alpha3=iso_alpha3,
        attribute="delta_forest",
        template="sparc2/sql/_admin2_data_all.sql",
        table=table_context)
    values_delta_forest = [float(x) for x in values_delta_forest]
    #############
    # values_delta_forest_negative
    values_delta_forest_negative = [x for x in values_delta_forest if x <= 0.0]
    if len(values_delta_forest_negative) == 0:
        natural_forest_negative = [0, 0, 0]
    elif len(values_delta_forest_negative) == 1:
        natural_forest_negative = [
            values_delta_forest_negative[0],
            values_delta_forest_negative[0],
            values_delta_forest_negative[0]]
    else:
        natural_forest_negative = calc_breaks_natural(values_delta_forest_negative, 2)
    #############
    # values_delta_forest_positive
    values_delta_forest_positive = [x for x in values_delta_forest if x >= 0.0]
    if len(values_delta_forest_positive) == 0:
        natural_forest_positive = [0, 0, 0]
    elif len(values_delta_forest_positive) == 1:
        natural_forest_positive = [
            values_delta_forest_positive[0],
            values_delta_forest_positive[0],
            values_delta_forest_positive[0]]
    else:
        natural_forest_positive = calc_breaks_natural(values_delta_forest_positive, 2)
    #####

    summary = {
        'all': {
            "min": {
              'at_admin2_month': (min(values_delta_mean) if values_delta_mean else None)
            },
            "max": {
              'at_admin2_month': (max(values_delta_mean) if values_delta_mean else None)
            },
            'breakpoints': {
                'natural': natural_mean,
                'natural_adjusted': natural_mean_negative + [0] + natural_mean_positive,
                'natural_negative': natural_negative,
                'natural_positive': natural_positive,
                'natural_erosion_propensity': [0] + natural_erosion_propensity,
                'natural_crop': natural_crop_negative + [0] + natural_crop_positive,
                'natural_forest': natural_forest_negative + [0] + natural_forest_positive
            }
        }
    }

    return summary


def get_geojson_vam(request, iso_alpha3=None):
    collection = None
    with GeoDashDatabaseConnection() as geodash_conn:
        collection = data_local_country_admin().get(cursor=geodash_conn.cursor, iso_alpha3=iso_alpha3, level=1)
        for feature in collection["features"]:
            response = requests.get(url=URL_VAM["FCS"].format(
                admin0=feature["properties"]["admin0_code"],
                admin1=feature["properties"]["admin1_code"]))
            vam_data_fcs = response.json()
            response = requests.get(url=URL_VAM["CSI"].format(
                admin0=feature["properties"]["admin0_code"],
                admin1=feature["properties"]["admin1_code"]))
            vam_data_csi = response.json()
            vam = {}
            if vam_data_fcs:
                vam_data_fcs = vam_data_fcs[0]
                vam["fcs"] = {
                    "year": vam_data_fcs["FCS_year"],
                    "month": vam_data_fcs["FCS_month"],
                    "source": vam_data_fcs["FCS_dataSource"],
                    "poor": vam_data_fcs["FCS_poor"],
                    "borderline": vam_data_fcs["FCS_borderline"],
                    "acceptable": vam_data_fcs["FCS_acceptable"]
                }
            if vam_data_csi:
                vam_data_csi = vam_data_csi[0]
                vam["csi"] = {
                    "year": vam_data_csi["CSI_rYear"],
                    "month": vam_data_csi["CSI_rMonth"],
                    "source": vam_data_csi["CSI_rDataSource"],
                    "no": vam_data_csi["CSI_rNoCoping"],
                    "low": vam_data_csi["CSI_rLowCoping"],
                    "medium": vam_data_csi["CSI_rMediumCoping"],
                    "high": vam_data_csi["CSI_rHighCoping"]
                }
            feature["properties"]["vam"] = vam

    return collection
