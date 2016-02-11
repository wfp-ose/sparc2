from pymemcache.client.base import Client

from django.conf import settings

try:
    import simplejson as json
except ImportError:
    import json

def sparc_serializer(key, value):
     if type(value) == str:
         return value, 1
     return json.dumps(value), 2


def sparc_deserializer(key, value, flags):
    if flags == 1:
        return value
    if flags == 2:
        return json.loads(value)
    raise Exception("Unknown serialization format")


def provision_memcached_client():
    print settings.SPARC_MEMCACHED_HOST, settings.SPARC_MEMCACHED_PORT
    client = Client(
        (settings.SPARC_MEMCACHED_HOST, settings.SPARC_MEMCACHED_PORT),
        serializer=sparc_serializer,
        deserializer=sparc_deserializer)
    print client
    return client
