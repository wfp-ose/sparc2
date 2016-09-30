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


def get_summary_cyclone(table_popatrisk=None, iso_alpha3=None):
    now = datetime.datetime.now()
    current_month = now.strftime("%b").lower()

    if (not table_popatrisk) or (not iso_alpha3):
        raise Exception("Missing table_popatrisk or iso_alpha3 for get_summary_cyclone.")

    summary = None

    with GeoDashDatabaseConnection() as geodash_conn:

        values = geodash_conn.exec_query_single_aslist(
            get_template("sparc2/sql/_cyclone_data_all_at_admin2.sql").render({
                'admin2_popatrisk': table_popatrisk,
                'iso_alpha3': iso_alpha3}))

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

            values = geodash_conn.exec_query_single_aslist(
                get_template("sparc2/sql/_cyclone_data_by_prob_class_month.sql").render({
                    'admin2_popatrisk': table_popatrisk,
                    'iso_alpha3': iso_alpha3,
                    'prob_class': prob_class}))

            summary["prob_class"][prob_class] = {};
            summary["prob_class"][prob_class]['by_month'] = [float(x) for x in values]

            rows = geodash_conn.exec_query_multiple(
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

    summary['header'] = {
        'all_breakpoints_natural': len(summary["all"]["breakpoints"]["natural"]),
        'all_breakpoints_natural_adjusted': len(summary["all"]["breakpoints"]["natural_adjusted"]),
        'admin2': len(summary["admin2"].keys()),
        'prob_classes': prob_classes
    }

    return summary
