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
        raise Exception("Missing table_popatrisk or iso3 for get_summary_drought.")

    summary = None

    prob_classes = [
      { "code": 1, "label": "low" },
      { "code": 2, "label": "medium" },
      { "code": 3, "label": "high" },
      { "code": 4, "label": "very_high" }
    ]

    values_all = []
    values_float = []
    natural = []
    natural_adjusted = []
    values_by_prob_class = {}
    values_by_prob_class_by_month = {}
    values_by_admin2_by_prob_class_by_month = {}
    with GeoDashDatabaseConnection() as geodash_conn:
        for prob_class in prob_classes:
            values = geodash_conn.exec_query_single_aslist(
                get_template("sparc2/sql/_landslide_data_all_at_admin2_for_probclass.sql").render({
                    'admin2_popatrisk': table_popatrisk,
                    'prob_min': str(prob_class["code"]),
                    'prob_max': str(4),
                    'iso_alpha3': iso_alpha3}))
            values_by_prob_class[prob_class['label']] = values

        for prob_class in prob_classes:
            values_all = values_all + values_by_prob_class[prob_class['label']]

        values_float = [float(x) for x in values_all]
        num_breakpoints = 5
        natural = calc_breaks_natural(values_float, num_breakpoints)
        natural_adjusted = natural

        for prob_class in prob_classes:
            rows = geodash_conn.exec_query_multiple(
                get_template("sparc2/sql/_landslide_data_all_at_admin2_by_month_for_probclass.sql").render({
                    'admin2_popatrisk': table_popatrisk,
                    'prob_min': str(prob_class["code"]),
                    'prob_max': str(prob_class["code"]),
                    'iso_alpha3': iso_alpha3}))
            if prob_class["label"] not in values_by_prob_class_by_month:
                values_by_prob_class_by_month[prob_class["label"]] = {}
            for r in rows:
                month, value = r
                values_by_prob_class_by_month[prob_class["label"]][month] = value

            rows = geodash_conn.exec_query_multiple(
                get_template("sparc2/sql/_landslide_data_by_admin2_by_month_for_probclass.sql").render({
                    'admin2_popatrisk': table_popatrisk,
                    'prob_min': str(prob_class["code"]),
                    'prob_max': str(prob_class["code"]),
                    'iso_alpha3': iso_alpha3}))
            for r in rows:
                admin2_code, month, value = r
                if admin2_code not in values_by_admin2_by_prob_class_by_month:
                    values_by_admin2_by_prob_class_by_month[admin2_code] = {}
                if prob_class["label"] not in values_by_admin2_by_prob_class_by_month[admin2_code]:
                    values_by_admin2_by_prob_class_by_month[admin2_code][prob_class["label"]] = {}
                values_by_admin2_by_prob_class_by_month[admin2_code][prob_class["label"]][month] = value

    summary = {
        'all': {
            "max": {
              'at_country_month': None,
              'at_admin2_month': max(values_float)
            },
            'breakpoints': {
                'natural': natural,
                'natural_adjusted': [0] + natural_adjusted
            }
        },
        "prob_class": {},
        "admin2": {}
    }

    for prob_class in prob_classes:
        if prob_class["label"] not in summary["prob_class"]:
            summary["prob_class"][prob_class["label"]] = {
                "by_month": []
            }
        summary["prob_class"][prob_class["label"]]["by_month"] = [values_by_prob_class_by_month[prob_class["label"]].get(x, 0) for x in MONTHS_SHORT3]

    for admin2_code in values_by_admin2_by_prob_class_by_month:
        for prob_class in values_by_admin2_by_prob_class_by_month[admin2_code]:
            values_by_month = [values_by_admin2_by_prob_class_by_month[admin2_code][prob_class].get(x, 0) for x in MONTHS_SHORT3]
            summary["admin2"] = insertIntoObject(
                summary["admin2"],
                [admin2_code, "prob_class", prob_class, 'by_month'],
                values_by_month)

    return summary
