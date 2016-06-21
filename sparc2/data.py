import errno
import psycopg2

from socket import error as socket_error
from jenks import jenks

from django.conf import settings
from django.template.loader import get_template

from geodash.enumerations import MONTHS_SHORT3

from geodash.cache import provision_memcached_client

from geodash.data import data_local_country


class data_local_country_admin(data_local_country):

    key = None

    def _build_key(self, *args, **kwargs):
        return "data/local/country/{iso_alpha3}/admin/{level}/geojson".format(**kwargs)

    def _build_data(self, *args, **kwargs):
        cursor = kwargs.get('cursor', None)
        iso_alpha3 = kwargs.get('iso_alpha3', None)
        level = kwargs.get('level', None)
        results = None
        if level == 2:
            q = get_template("sparc2/sql/_admin2_polygons.sql").render({
                'tolerance': '.002',
                'iso_alpha3': iso_alpha3})
            cursor.execute(q)
            res = cursor.fetchone()
            results = json.loads(res[0]) if (type(res[0]) is not dict) else res[0]
        elif level == 1:
            q = get_template("sparc2/sql/_admin1_polygons.sql").render({
                'tolerance': '.01',
                'iso_alpha3': iso_alpha3})
            cursor.execute(q)
            res = cursor.fetchone()
            results = json.loads(res[0]) if (type(res[0]) is not dict) else res[0]
        return results


class data_local_country_hazard_all(data_local_country):

    key = None
    content_type = "application/json"

    def _build_key(self, *args, **kwargs):
        return "data/local/country/{iso_alpha3}/hazard/{hazard}/all".format(**kwargs)

    def _build_data(self, *args, **kwargs):
        cursor = kwargs.get('cursor', None)
        iso_alpha3 = kwargs.get('iso_alpha3', None)
        table = kwargs.get('table', None)
        template = kwargs.get('template', None)

        q = get_template(template).render({
            'admin2_popatrisk': table,
            'iso_alpha3': iso_alpha3})
        cursor.execute(q)

        values = None
        try:
            values = cursor.fetchone()[0].split(",")
        except:
            values = []  # No values since not effected by that disaster, e.g., Afghanistan and cyclones

        return values


class data_local_country_context_all(data_local_country):

    key = None
    content_type = "application/json"

    def _build_key(self, *args, **kwargs):
        return "data/local/country/{iso_alpha3}/context/{attribute}/all".format(**kwargs)

    def _build_data(self, *args, **kwargs):
        cursor = kwargs.get('cursor', None)
        iso_alpha3 = kwargs.get('iso_alpha3', None)
        attribute = kwargs.get('attribute', None)
        table = kwargs.get('table', None)
        template = kwargs.get('template', None)

        q = get_template(template).render({
            'admin2_data': table,
            'iso_alpha3': iso_alpha3,
            'attribute': attribute})
        cursor.execute(q)

        values = None
        try:
            values = cursor.fetchone()[0].split(",")
        except:
            values = []  # No values since not effected by that disaster, e.g., Afghanistan and cyclones

        return values
