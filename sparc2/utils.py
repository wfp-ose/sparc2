import datetime
import psycopg2
import requests

from jenks import jenks

from django.conf import settings
from django.template import Context
from django.template.loader import get_template

try:
    import simplejson as json
except ImportError:
    import json

from geosite.enumerations import MONTHS_SHORT3

from geosite.data import GeositeDatabaseConnection, calc_breaks_natural, insertIntoObject
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
    connection = psycopg2.connect(settings.GEOSITE_DB_CONN_STR)
    cursor = connection.cursor()
    q = get_template(template).render({'admin0_data': "sparc2_country"})
    cursor.execute(q)
    results = cursor.fetchall()
    return results

def get_geojson_cyclone(request, iso_alpha3=None):
    collection = None
    with GeositeDatabaseConnection() as geosite_conn:
        collection = data_local_country_admin().get(cursor=geosite_conn.cursor, iso_alpha3=iso_alpha3, level=2)
        rows_popatrisk = geosite_conn.exec_query_multiple(
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

        rows_context = geosite_conn.exec_query_multiple(
            get_template("sparc2/sql/_context_by_admin2.sql").render({
                'admin2_context': 'context.admin2_context',
                'iso_alpha3': iso_alpha3}))

        context_by_admin2 = {}
        for row in rows_context:
            admin2_code, ldi, delta_negative, erosion_propensity = row
            context_by_admin2[str(admin2_code)] = {
                'ldi': ldi,
                'delta_negative': delta_negative,
                'erosion_propensity': erosion_propensity
            }

        for feature in collection["features"]:
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


            #print "admin2_code: ", feature["properties"]["admin2_code"]
            #print "admin2_code type: ", type(feature["properties"]["admin2_code
            #print "rows_popatrisk: ", rows_popatrisk
            #for rb in rows_popatrisk:
            #    newRow = json.loads(rb[0]) if (type(rb[0]) is not dict) else rb[0]
            #    print "newRow: ", newRow
            #    if admin2_code == int(newRow[u"admin2_code"]):
            #        feature["properties"]["addinfo"].append(newRow)
                    #if newRow["category_min"] == 1 and newRow["category_max"] == 5 and newRow["prob_class"] == '0.01-0.1':
                #        feature["properties"]["active_month"] += newRow[current_month]

    return collection


def get_summary_cyclone(table_popatrisk=None, iso_alpha3=None):
    now = datetime.datetime.now()
    current_month = now.strftime("%b").lower()

    if (not table_popatrisk) or (not iso_alpha3):
        raise Exception("Missing table_popatrisk or iso_alpha3 for get_summary_cyclone.")

    summary = None

    with GeositeDatabaseConnection() as geosite_conn:

        #values = data_local_country_hazard_all().get(
        #    cursor=cursor,
        #    iso_alpha3=iso_alpha3,
        #    hazard="flood",
        #    template="sparc2/sql/_hazard_data_all.sql",
        #    table=table_popatrisk)

        values = geosite_conn.exec_query_single_aslist(
            get_template("sparc2/sql/_cyclone_data_all_at_admin2.sql").render({
                'admin2_popatrisk': table_popatrisk,
                'iso_alpha3': iso_alpha3}))

        #print "Values: ", values

        values = [float(x) for x in values]
        num_breakpoints = 5
        natural = calc_breaks_natural(values, num_breakpoints)
        natural_adjusted = natural

        summary = {
            'all': {
                "max": {
                  'at_country_month': None,
                  'at_admin2_month': None
                },
                'breakpoints': {
                    'natural': natural,
                    'natural_adjusted': [0] + natural_adjusted
                }
            },
            "prob_class": {},
            "admin2": {}
        }

        summary["all"]["max"]["at_admin2_month"] = max(values)

        prob_classes = [
          "0.01-0.1",
          "0.1-0.2",
          "0.2-0.3",
          "0.3-0.4",
          "0.4-0.5",
          "0.5-0.6",
          "0.6-0.7",
          "0.7-0.8",
          "0.8-0.9",
          "0.9-1.0"]

        for prob_class in prob_classes:

            values = geosite_conn.exec_query_single_aslist(
                get_template("sparc2/sql/_cyclone_data_by_prob_class_month.sql").render({
                    'admin2_popatrisk': table_popatrisk,
                    'iso_alpha3': iso_alpha3,
                    'prob_class': prob_class}))

            summary["prob_class"][prob_class] = {};
            summary["prob_class"][prob_class]['by_month'] = [float(x) for x in values]

            rows = geosite_conn.exec_query_multiple(
                get_template("sparc2/sql/_cyclone_data_by_group_prob_class_month.sql").render({
                    'admin2_popatrisk': table_popatrisk,
                    'iso_alpha3': iso_alpha3,
                    'prob_class': prob_class,
                    'group': 'admin2_code'}))

            for row in rows:
                admin2_code, values = row
                if admin2_code not in summary["admin2"]:
                  summary["admin2"][admin2_code] = {"prob_class":{}}
                if "prob_class" not in summary["admin2"][admin2_code]:
                  summary["admin2"][admin2_code]["prob_class"] = {}
                if prob_class not in summary["admin2"][admin2_code]["prob_class"]:
                  summary["admin2"][admin2_code]["prob_class"][prob_class] = {}
                summary["admin2"][admin2_code]["prob_class"][prob_class]['by_month'] = [float(x) for x in values.split(",")]

    return summary

def get_geojson_drought(request, iso_alpha3=None):
    collection = None
    with GeositeDatabaseConnection() as geosite_conn:
        collection = data_local_country_admin().get(cursor=geosite_conn.cursor, iso_alpha3=iso_alpha3, level=2)
        for feature in collection["features"]:
            feature["properties"]["addinfo"] = []

        for month in MONTHS_SHORT3:
            rows = geosite_conn.exec_query_multiple(
                get_template("sparc2/sql/_drought_data_by_admin2_month_asjson.sql").render({
                    'admin2_popatrisk': 'drought.admin2_popatrisk',
                    'iso_alpha3': iso_alpha3,
                    'month': month}))
            values_by_admin2 = {}
            for row in rows:
                admin2_code, data = row
                data.pop(u"admin2_code")
                data["month"] = month
                values_by_admin2[str(admin2_code)] = data

            for feature in collection["features"]:
                value = values_by_admin2.get(str(feature["properties"]["admin2_code"]), None)
                if value:
                    feature["properties"]["addinfo"].append(value)

    return collection


def get_summary_drought(table_popatrisk=None, iso_alpha3=None):
    now = datetime.datetime.now()
    current_month = now.strftime("%b").lower()

    if (not table_popatrisk) or (not iso_alpha3):
        raise Exception("Missing table_popatrisk or iso3 for get_summary_drought.")

    connection = psycopg2.connect(settings.GEOSITE_DB_CONN_STR)
    cursor = connection.cursor()

    values = data_local_country_hazard_all().get(
        cursor=cursor,
        iso_alpha3=iso_alpha3,
        hazard="drought",
        template="sparc2/sql/_drought_data_all.sql",
        table=table_popatrisk)

    num_breakpoints = 5

    summary = {
        'all': {
            'breakpoints': {
                'natural': calc_breaks_natural(values, num_breakpoints)
            }
        },
        "prob_max": {},
        "admin2": {}
    }

    probability_breakpoints = [.02, .04, .06, .08, .10, .15, .20, .25, .50, 1.0]
    values_by_prob_max = {}
    for prob_max in probability_breakpoints:
        q2 = get_template("sparc2/sql/_drought_data_all_at_admin2.sql").render({
            'admin2_popatrisk': table_popatrisk,
            'iso3': iso_alpha3,
            'prob_max': prob_max})
        cursor.execute(q2)
        values = None
        try:
            values = cursor.fetchone()[0].split(",")
        except:
            values = []  # No values since not effected by that disaster, e.g., Afghanistan and cyclones
        values_by_prob_max[str(prob_max)] = [float(x) for x in values]

    for prob_max in probability_breakpoints:
        # Breakpoints by RP
        summary["prob_max"][str(int(prob_max*100.0))] = {
            'breakpoints': {
                'natural': calc_breaks_natural(values_by_prob_max[str(prob_max)], num_breakpoints)
            }
        }
        # Flood data by RP x month
        q3 = get_template("sparc2/sql/_drought_data_by_probmax_month.sql").render({
            'admin2_popatrisk': table_popatrisk,
            'iso3': iso_alpha3,
            'prob_max': prob_max})
        print "Q3:"
        print q3
        cursor.execute(q3)
        rows = None
        try:
            rows = cursor.fetchall()
        except:
            rows = []  # No values since not effected by that disaster, e.g., Afghanistan and cyclones
        values_by_month = {}
        for row in rows:
            month, popatrisk = row
            values_by_month[month] = popatrisk
        summary["prob_max"][str(int(prob_max*100.0))]['by_month'] = valuesByMonthToList(values_by_month)

    #################
    # Summary by Admin2 x prob_max X month
    for prob_max in probability_breakpoints:
        q4 = get_template("sparc2/sql/_drought_data_by_admin2_probmax_month.sql").render({
            'admin2_popatrisk': table_popatrisk,
            'iso3': iso_alpha3,
            'prob_max': prob_max})
        cursor.execute(q4)
        values_by_admin2_month = rowsToDict(cursor.fetchall(), 2)

        for admin2_code in values_by_admin2_month:
            values_by_month = values_by_admin2_month[admin2_code]
            keys = [admin2_code, "prob_max", str(int(prob_max*100.0)), 'by_month']
            value = valuesByMonthToList(values_by_month)
            summary["admin2"] = insertIntoObject(summary["admin2"], keys, value)

    return summary


def get_geojson_flood(request, iso_alpha3=None):
    collection = None
    with GeositeDatabaseConnection() as geosite_conn:
        collection = data_local_country_admin().get(cursor=geosite_conn.cursor, iso_alpha3=iso_alpha3, level=2)

        returnPeriods = [25, 50, 100, 200, 500, 1000]
        for rp in returnPeriods:
            rows = geosite_conn.exec_query_multiple(
                get_template("sparc2/sql/_flood_data_by_admin2_rp_month_asjson.sql").render({
                    'admin2_popatrisk': 'flood.admin2_popatrisk',
                    'iso_alpha3': iso_alpha3,
                    'rp': rp}))
            values_by_admin2 = {}
            for row in rows:
                admin2_code, data = row
                data.pop(u"admin2_code")
                values_by_admin2[str(admin2_code)] = data

            rows_context = geosite_conn.exec_query_multiple(
                get_template("sparc2/sql/_context_by_admin2.sql").render({
                    'admin2_context': 'context.admin2_context',
                    'iso_alpha3': iso_alpha3}))

            context_by_admin2 = {}
            for row in rows_context:
                admin2_code, ldi, delta_negative, erosion_propensity = row
                context_by_admin2[str(admin2_code)] = {
                    'ldi': ldi,
                    'delta_negative': delta_negative,
                    'erosion_propensity': erosion_propensity
                }

            for feature in collection["features"]:
                admin2_code = str(feature["properties"]["admin2_code"])
                feature["properties"]["RP"+str(rp)] = values_by_admin2[admin2_code]
                if admin2_code in context_by_admin2:
                    feature["properties"]["ldi"] = context_by_admin2[admin2_code]["ldi"]
                    feature["properties"]["delta_negative"] = context_by_admin2[admin2_code]["delta_negative"]
                    feature["properties"]["erosion_propensity"] = context_by_admin2[admin2_code]["erosion_propensity"]

    return collection


def get_summary_flood(table_popatrisk=None, iso_alpha3=None):
    now = datetime.datetime.now()
    current_month = now.strftime("%b").lower()

    if (not table_popatrisk) or (not iso_alpha3):
        raise Exception("Missing table_popatrisk or iso3 for get_summary_flood.")

    num_breakpoints = 5

    connection = psycopg2.connect(settings.GEOSITE_DB_CONN_STR)
    cursor = connection.cursor()

    values = data_local_country_hazard_all().get(
        cursor=cursor,
        iso_alpha3=iso_alpha3,
        hazard="flood",
        template="sparc2/sql/_hazard_data_all.sql",
        table=table_popatrisk)

    natural = calc_breaks_natural(values, num_breakpoints)
    natural_adjusted = []

    summary = {
        'all': {
            "max": {
              'at_country_month': None,
              'at_admin2_month': None
            },
            'breakpoints': {
                'natural': natural,
                'natural_adjusted': None
            }
        },
        "rp": {},
        "admin2": {}
    }

    returnPeriods = [25, 50, 100, 200, 500, 1000]
    values_by_rp = {}
    for rp in returnPeriods:
        q2 = get_template("sparc2/sql/_flood_data_all_at_admin2.sql").render({
            'admin2_popatrisk': table_popatrisk,
            'iso_alpha3': iso_alpha3,
            'rp': rp})
        cursor.execute(q2)
        values = None
        try:
            values = cursor.fetchone()[0].split(",")
        except:
            values = []  # No values since not effected by that disaster, e.g., Afghanistan and cyclones
        values_by_rp[str(rp)] = [float(x) for x in values]

    values = values_by_rp["25"]
    breakpoints = calc_breaks_natural(values, num_breakpoints-2)
    natural_adjusted.extend(breakpoints)
    #
    values = values + values_by_rp["50"] + values_by_rp["100"]
    breakpoints = calc_breaks_natural(values, num_breakpoints-1)
    natural_adjusted.append(breakpoints[-2])
    #
    values = values + values_by_rp["200"] + values_by_rp["500"] + values_by_rp["1000"]
    breakpoints = calc_breaks_natural(values, num_breakpoints)
    natural_adjusted.append(breakpoints[-2])
    #
    summary["all"]["max"]["at_admin2_month"] = max(values)
    summary["all"]["breakpoints"]["natural_adjusted"] = [0] + natural_adjusted + [max(values)]

    for rp in returnPeriods:
        # Breakpoints by RP
        summary["rp"][str(rp)] = {
            'breakpoints': {
                'natural': calc_breaks_natural(values_by_rp[str(rp)], num_breakpoints)
            }
        }
        ##########
        # Flood data by RP x month
        q3 = get_template("sparc2/sql/_flood_data_by_rp_month.sql").render({
            'admin2_popatrisk': table_popatrisk,
            'iso3': iso_alpha3,
            'rp': rp})
        cursor.execute(q3)
        values = None
        try:
            values = cursor.fetchone()[0].split(",")
        except:
            values = []  # No values since not effected by that disaster, e.g., Afghanistan and cyclones
        summary["rp"][str(rp)]['by_month'] = [float(x) for x in values]
        ##########
        # Flood data by admin2 x RP x month
        q4 = get_template("sparc2/sql/_flood_data_by_admin2_rp_month.sql").render({
            'admin2_popatrisk': table_popatrisk,
            'iso3': iso_alpha3,
            'rp': rp})
        cursor.execute(q4)
        for row in cursor.fetchall():
            admin2_code, values = row
            keys = [admin2_code, "rp", str(rp), 'by_month']
            value = [float(x) for x in values.split(",")]
            summary["admin2"] = insertIntoObject(summary["admin2"], keys, value)

    return summary


def get_events_cyclone(iso3=None):
    connection = psycopg2.connect(settings.GEOSITE_DB_CONN_STR)
    cursor = connection.cursor()
    q = get_template("sparc2/sql/_cyclone_events.sql").render(context=Context({'iso3': iso3}))
    cursor.execute(q)
    results = cursor.fetchone()
    return results

def get_events_flood(iso3=None):
    connection = psycopg2.connect(settings.GEOSITE_DB_CONN_STR)
    cursor = connection.cursor()
    q = get_template("sparc2/sql/_flood_events_by_admin2.sql").render(context=Context({'iso3': iso3}))
    cursor.execute(q)
    results = cursor.fetchone()
    return results

def get_events_landslide(iso3=None):
    connection = psycopg2.connect(settings.GEOSITE_DB_CONN_STR)
    cursor = connection.cursor()
    q = get_template("sparc2/sql/_landslide_events.sql").render(context=Context({'iso3': iso3}))
    cursor.execute(q)
    results = cursor.fetchone()
    return results


def get_geojson_context(request, iso_alpha3=None):
    collection = None
    with GeositeDatabaseConnection() as geosite_conn:
        collection = data_local_country_admin().get(cursor=geosite_conn.cursor, iso_alpha3=iso_alpha3, level=2)
        rows_context = geosite_conn.exec_query_multiple(
            get_template("sparc2/sql/_context.sql").render({
                'admin2_context': 'context.admin2_context',
                'iso_alpha3': iso_alpha3}))

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

    connection = psycopg2.connect(settings.GEOSITE_DB_CONN_STR)
    cursor = connection.cursor()

    values_delta_mean = data_local_country_context_all().get(
        cursor=cursor,
        iso_alpha3=iso_alpha3,
        attribute="delta_mean",
        template="sparc2/sql/_admin2_data_all.sql",
        table=table_context)
    values_delta_mean = [float(x) for x in values_delta_mean]
    natural_mean = calc_breaks_natural(values_delta_mean, 6)
    natural_mean_negative = calc_breaks_natural([x for x in values_delta_mean if x <= 0.0], 2)
    natural_mean_positive = calc_breaks_natural([x for x in values_delta_mean if x >= 0.0], 2)
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
    natural_forest_negative = calc_breaks_natural([x for x in values_delta_forest if x <= 0.0], 2)
    natural_forest_positive = calc_breaks_natural([x for x in values_delta_forest if x >= 0.0], 2)
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
                'natural_erosion_propensity': natural_erosion_propensity,
                'natural_crop': natural_crop_negative + [0] + natural_crop_positive,
                'natural_forest': natural_forest_negative + [0] + natural_forest_positive
            }
        }
    }

    return summary


def get_geojson_vam(request, iso_alpha3=None):
    collection = None
    with GeositeDatabaseConnection() as geosite_conn:
        collection = data_local_country_admin().get(cursor=geosite_conn.cursor, iso_alpha3=iso_alpha3, level=1)
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
                    "poor": vam_data_fcs["FCS_poor"],
                    "borderline": vam_data_fcs["FCS_borderline"],
                    "acceptable": vam_data_fcs["FCS_acceptable"]
                }
            if vam_data_csi:
                vam_data_csi = vam_data_csi[0]
                vam["csi"] = {
                    "no": vam_data_csi["CSI_rNoCoping"],
                    "low": vam_data_csi["CSI_rLowCoping"],
                    "medium": vam_data_csi["CSI_rMediumCoping"],
                    "high": vam_data_csi["CSI_rHighCoping"]
                }
            feature["properties"]["vam"] = vam

    return collection
