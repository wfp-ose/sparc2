import requests

from django.conf import settings
from django.core.urlresolvers import reverse

from geodash.utils import extract

def get_country(iso_alpha3=None):
    result = None
    if iso_alpha3:
        iso_alpha3_uc = iso_alpha3.upper()
        url = reverse("api_data", kwargs={"dataset": "countries", "extension": "json"})
        if url:
            response = requests.get(settings.SITEURL[:-1]+url+"?grep=iso.alpha3%3D"+iso_alpha3_uc)
            if response:
                data = response.json()
                countries = extract("countries", data, None)
                if countries:
                    if len(countries) == 1:
                        result = countries[0]

    return result
