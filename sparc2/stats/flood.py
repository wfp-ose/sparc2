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

from geodash.enumerations import MONTHS_SHORT3

from geodash.data import GeoDashDatabaseConnection, calc_breaks_natural, insertIntoObject, valuesByMonthToList, rowsToDict
from sparc2.data import data_local_country_admin, data_local_country_hazard_all, data_local_country_context_all
from sparc2.enumerations import URL_VAM


def get_summary_flood(table_popatrisk=None, iso_alpha3=None):
    now = datetime.datetime.now()
    current_month = now.strftime("%b").lower()

    if (not table_popatrisk) or (not iso_alpha3):
        raise Exception("Missing table_popatrisk or iso3 for get_summary_flood.")

    num_breakpoints = 5

    connection = psycopg2.connect(settings.GEODASH_DB_CONN_STR)
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

    summary['header'] = {
        'all_breakpoints_natural': len(summary["all"]["breakpoints"]["natural"]),
        'all_breakpoints_natural_adjusted': len(summary["all"]["breakpoints"]["natural_adjusted"]),
        'admin2': len(summary["admin2"].keys()),
        'returnPeriods': returnPeriods
    }

    return summary
