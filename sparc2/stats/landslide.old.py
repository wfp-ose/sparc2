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


def get_summary_landslide(table_popatrisk=None, iso_alpha3=None):
    now = datetime.datetime.now()
    current_month = now.strftime("%b").lower()

    if (not table_popatrisk) or (not iso_alpha3):
        raise Exception("Missing table_popatrisk or iso3 for get_summary_flood.")

    summary = {
        'all': {
            "max": {
              'at_country_month': None,
              'at_admin2_month': None
            },
            'breakpoints': {
                'natural': None,
                'natural_adjusted': None
            },
            "by_month": None
        },
        "admin2": {}
    }

    num_breakpoints = 5

    connection = psycopg2.connect(settings.GEODASH_DB_CONN_STR)
    cursor = connection.cursor()

    values = data_local_country_hazard_all().get(
        cursor=cursor,
        iso_alpha3=iso_alpha3,
        hazard="landslide",
        template="sparc2/sql/_hazard_data_all.sql",
        table=table_popatrisk)

    natural = calc_breaks_natural(values, num_breakpoints)
    values_as_integer = [int(x) for x in values]
    natural_adjusted = natural

    summary["all"]["max"]["at_admin2_month"] = max(values_as_integer)
    summary["all"]["breakpoints"]["natural"] = natural
    summary["all"]["breakpoints"]["natural_adjusted"] =  [0] + natural_adjusted + [max(values_as_integer)]

    with GeoDashDatabaseConnection() as geodash_conn:
        values = geodash_conn.exec_query_single_aslist(
            get_template("sparc2/sql/_landslide_data_by_month.sql").render({
                'admin2_popatrisk': 'landslide.admin2_popatrisk',
                'iso_alpha3': iso_alpha3}))

        print "values by month: ", values

        summary["all"]["by_month"] = [int(x) for x in values]

        rows = geodash_conn.exec_query_multiple(
            get_template("sparc2/sql/_landslide_data_by_admin2_month_asjson.sql").render({
                'admin2_popatrisk': 'landslide.admin2_popatrisk',
                'iso_alpha3': iso_alpha3}))

        values_by_admin2 = {}
        for row in rows:
            admin2_code, data = row
            data.pop(u"admin2_code")
            summary["admin2"][str(admin2_code)] = {}
            summary["admin2"][str(admin2_code)]["by_month"] = valuesByMonthToList(data)


    return summary
