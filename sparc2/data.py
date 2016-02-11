import psycopg2

from jenks import jenks

from django.conf import settings
from django.template.loader import get_template

from sparc2.cache import provision_memcached_client
from sparc2.enumerations import MONTHS_SHORT3

class data_local_country(object):

    key = None

    def _build_key(self, *args, **kwargs):
        raise NotImplementedError

    def _build_data(self, *args, **kwargs):
        raise NotImplementedError

    def get(self, *args, **kwargs):
        data = None
        if settings.SPARC_CACHE_DATA:
            client = provision_memcached_client()
            if client:
                key = self._build_key(*args, **kwargs)
                print "Checking cache with key ", key

                data = None
                try:
                    data = client.get(key)
                except socket_error as serr:
                    data = None
                    print "Error getting data from in-memory cache."
                    if serr.errno == errno.ECONNREFUSED:
                        print "Memcached is likely not running.  Start memcached with supervisord."
                    raise serr

                if not data:
                    print "Data not found in cache."
                    data = self._build_data(*args, **kwargs)
                    try:
                        client.set(key, data)
                    except socket_error as serr:
                        print "Error saving data to in-memory cache."
                        if serr.errno == errno.ECONNREFUSED:
                            print "Memcached is likely not running or the data exceeds memcached item size limit.  Start memcached with supervisord."
                        raise serr
                else:
                    print "Data found in cache."
            else:
                print "Could not connect to memcached client.  Bypassing..."
                data = self._build_data(*args, **kwargs)
        else:
            print "Not caching data (settings.SPARC_CACHE_DATA set to False)."
            data = self._build_data(*args, **kwargs)

        return data


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
            q = get_template("sql/_admin2_polygons.sql").render({
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


def calc_breaks_natural(values, breaks):
    natural = None
    if values:
        natural = [float(bp) for bp in jenks(values, breaks)]
    else:
        natural = []
    return natural


def valuesByMonthToList(values, nodata="0"):
    return [float(values_by_month.get(x, nodata)) for x in MONTHS_SHORT3]

def rowsToDict(rows, keys):
    rowsAsDict = {}
    if keys == 1:
        for row in rows:
            keyA, values = row
            rowsAsDict[keyA] = values
    elif keys == 2:
        for row in cursor.fetchall():
            keyA, keyB, values = row
            if keyA not in rowsAsDict:
                rowsAsDict[keyA] = {}
            rowsAsDict[keyA][keyB] = values
    elif keys == 3:
        for row in rows:
            keyA, keyB, keyC, values = row
            if keyA not in rowsAsDict:
                rowsAsDict[keyA] = {}
            if keyB not in rowsAsDict[keyA]:
                rowsAsDict[keyA][keyB] = {}
            rowsAsDict[keyA][keyB][keyC] = values
    return rowsAsDict

def assertBranch(obj, keys):
    current = obj
    numberOfKeys = len(keys)
    for i in range(numberOfKeys):
        key = keys[i]
        if key not in current:
            if i < numberOfKeys - 1:
                current[key] = {}
            else:
                current[key] = None
        current = current[key]
    return obj

def insertIntoObject(obj, keys, value):
    obj = assertBranch(obj, keys)
    numberOfKeys = len(keys)
    current = obj
    for i in range(numberOfKeys) - 1:
        current = current[keys[i]]
    current[keys[numberOfKeys-1]] = value
    return obj



class SPARCDatabaseConnection(object):

    connection = None
    cursor = None

    def exec_query_multiple(self, sql):
        self.cursor.execute(sql)
        return self.cursor.fetchall()

    def exec_query_single(self, sql):
        self.cursor.execute(sql)
        return self.cursor.fetchone()

    def exec_update(self, sql):
        self.cursor.execute(sql)

    def __init__(self):
        self.connection = psycopg2.connect(settings.SPARC_DB_CONN_STR)
        self.cursor = self.connection.cursor()

    def __enter__(self):
        return self

    def __exit__(self, *args, **kwargs):
        self.cursor.close()
        del self.cursor
        self.connection.close()
