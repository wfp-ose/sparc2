import datetime
import psycopg2

from jenks import jenks

from django.conf import settings
from django.template import Context
from django.template.loader import get_template

try:
    import simplejson as json
except ImportError:
    import json

from sparc2.enumerations import MONTHS_SHORT3
from sparc2.data import SPARCDatabaseConnection, data_local_country_admin, data_local_country_hazard_all, calc_breaks_natural, insertIntoObject

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
    connection = psycopg2.connect(settings.SPARC_DB_CONN_STR)
    cursor = connection.cursor()
    q = get_template(template).render({'admin0_data': "sparc2_country"})
    cursor.execute(q)
    results = cursor.fetchall()
    return results

def get_geojson_cyclone(request, iso_alpha3=None):
    collection = None
    with SPARCDatabaseConnection() as sparc:
        collection = data_local_country_admin().get(cursor=sparc.cursor, iso_alpha3=iso_alpha3, level=2)
        rows = sparc.exec_query_multiple(
            get_template("sparc2/sql/_cyclone.sql").render({
                'admin2_popatrisk': 'cyclone.admin2_popatrisk',
                'iso_alpha3': iso_alpha3}))
        for feature in collection["features"]:

            feature["properties"].update({
                "addinfo": [],
                "FCS": 0,
                "FCS_border": 0,
                "FCS_acceptable": 0,
                "CSI_no": 0,
                "CSI_low": 0,
                "CSI_med": 0,
                "CSI_high": 0
            })
            #print "admin2_code: ", feature["properties"]["admin2_code"]
            #print "admin2_code type: ", type(feature["properties"]["admin2_code
            #print results2
            for rb in rows:
                newRow = json.loads(rb[0]) if (type(rb[0]) is not dict) else rb[0]
                if int(newRow["admin2_code"]) == feature["properties"]["admin2_code"]:
                    feature["properties"]["addinfo"].append(newRow)
                    #if newRow["category_min"] == 1 and newRow["category_max"] == 5 and newRow["prob_class"] == '0.01-0.1':
                #        feature["properties"]["active_month"] += newRow[current_month]

    return collection


def get_summary_cyclone(request, table_popatrisk=None, iso_alpha3=None):
    now = datetime.datetime.now()
    current_month = now.strftime("%b").lower()

    if (not table_popatrisk) or (not iso_alpha3):
        raise Exception("Missing table_popatrisk or iso_alpha3 for get_summary_cyclone.")

    connection = psycopg2.connect(settings.SPARC_DB_CONN_STR)
    cursor = connection.cursor()

    values = data_local_country_hazard_all().get(
        cursor=cursor,
        iso_alpha3=iso_alpha3,
        hazard="flood",
        template="sparc2/sql/_hazard_data_all.sql",
        table=table_popatrisk)

    num_breakpoints = len(settings.SPARC_MAP_DEFAULTS["symbology"]["popatrisk"]["colors"])

    summary = {
        'all': {
            'breakpoints': {
                'natural': calc_breaks_natural(values, num_breakpoints)
            }
        },
        "prob_class": {},
        "admin2": {}
    }
    for prob_class in ["0.01-0.1","0.1-0.2","0.2-0.3","0.3-0.4","0.4-0.5","0.5-0.6","0.6-0.7","0.7-0.8","0.8-0.9","0.9-1.0"]:
        q2 = get_template("sparc2/sql/_cyclone_data_by_prob_class_month.sql").render({
            'admin2_popatrisk': table_popatrisk,
            'iso3': iso_alpha3,
            'prob_class': prob_class})
        cursor.execute(q2)
        values = None
        try:
            values = cursor.fetchone()[0].split(",")
        except:
            values = []  # No values since not effected by that disaster, e.g., Afghanistan and cyclones
        summary["prob_class"][prob_class] = {};
        summary["prob_class"][prob_class]['by_month'] = [float(x) for x in values]

        q4 = get_template("sparc2/sql/_cyclone_data_by_group_prob_class_month.sql").render({
            'admin2_popatrisk': table_popatrisk,
            'iso3': iso_alpha3,
            'prob_class': prob_class,
            'group': 'admin2_code'})
        cursor.execute(q4)
        for row in cursor.fetchall():
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
    with SPARCDatabaseConnection() as sparc:
        collection = data_local_country_admin().get(cursor=sparc.cursor, iso_alpha3=iso_alpha3, level=2)
        for feature in collection["features"]:
            feature["properties"]["addinfo"] = []

        for month in MONTHS_SHORT3:
            rows = sparc.exec_query_multiple(
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


def get_summary_drought(request, table_popatrisk=None, iso_alpha3=None):
    now = datetime.datetime.now()
    current_month = now.strftime("%b").lower()

    if (not table_popatrisk) or (not iso_alpha3):
        raise Exception("Missing table_popatrisk or iso3 for get_summary_drought.")

    connection = psycopg2.connect(settings.SPARC_DB_CONN_STR)
    cursor = connection.cursor()

    values = data_local_country_hazard_all().get(
        cursor=cursor,
        iso_alpha3=iso_alpha3,
        hazard="drought",
        template="sparc2/sql/_drought_data_all.sql",
        table=table_popatrisk)

    num_breakpoints = len(settings.SPARC_MAP_DEFAULTS["symbology"]["popatrisk"]["colors"])

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
    with SPARCDatabaseConnection() as sparc:
        collection = data_local_country_admin().get(cursor=sparc.cursor, iso_alpha3=iso_alpha3, level=2)

        returnPeriods = [25, 50, 100, 200, 500, 1000]
        for rp in returnPeriods:
            rows = sparc.exec_query_multiple(
                get_template("sparc2/sql/_flood_data_by_admin2_rp_month_asjson.sql").render({
                    'admin2_popatrisk': 'flood.admin2_popatrisk',
                    'iso_alpha3': iso_alpha3,
                    'rp': rp}))
            values_by_admin2 = {}
            for row in rows:
                admin2_code, data = row
                data.pop(u"admin2_code")
                values_by_admin2[str(admin2_code)] = data

            for feature in collection["features"]:
                feature["properties"]["RP"+str(rp)] = values_by_admin2[str(feature["properties"]["admin2_code"])]

    return collection


def get_summary_flood(request, table_popatrisk=None, iso_alpha3=None):
    now = datetime.datetime.now()
    current_month = now.strftime("%b").lower()

    if (not table_popatrisk) or (not iso_alpha3):
        raise Exception("Missing table_popatrisk or iso3 for get_summary_flood.")

    num_breakpoints = len(settings.SPARC_MAP_DEFAULTS["symbology"]["popatrisk"]["colors"])

    connection = psycopg2.connect(settings.SPARC_DB_CONN_STR)
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
            "max": None,
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
    #maxValue = max(values)
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
    maxValue = max(values)
    #
    summary["all"]["max"] = maxValue
    summary["all"]["breakpoints"]["natural_adjusted"] = natural_adjusted

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


def get_events_flood(iso3=None):
    connection = psycopg2.connect(settings.SPARC_DB_CONN_STR)
    cursor = connection.cursor()
    q = get_template("sparc2/sql/_flood_events_by_admin2.sql").render(context=Context({'iso3': iso3}))
    cursor.execute(q)
    results = cursor.fetchone()
    return results
