from django.conf import settings
from django.contrib.sites.models import Site

from wfppresencedjango.models import WFPRegionalBureau

from geosite.enumerations import MONTHS_NUM, MONTHS_LONG, MONTHS_SHORT3, MONTHS_ALL, DAYSOFTHEWEEK

from sparc2.enumerations import SPARC_HAZARDS_CONFIG, SPARC_BREADCRUMBS
from sparc2.models import SPARCCountry

try:
    import simplejson as json
except ImportError:
    import json

def sparc2(request):
    """Global values to pass to templates"""
    site = Site.objects.get_current()
    defaults = dict(
        STATIC_URL=settings.STATIC_URL,
        VERSION="2.0.0",
        SITE_NAME=site.name,
        SITE_DOMAIN=site.domain,
        DEBUG_STATIC=getattr(
            settings,
            "DEBUG_STATIC",
            False),
        MONTHS_NUM=MONTHS_NUM,
        MONTHS_SHORT3=MONTHS_SHORT3,
        MONTHS_LONG=MONTHS_LONG,
        MONTHS_ALL=MONTHS_ALL,
        DAYSOFTHEWEEK=DAYSOFTHEWEEK,
        GEOSITE_STATIC_DEBUG=settings.GEOSITE_STATIC_DEBUG,
        SPARC_STATIC_VERSION=settings.SPARC_STATIC_VERSION,
        GEOSITE_STATIC_DEBUG=settings.GEOSITE_STATIC_DEBUG,
        GEOSITE_DNS_PREFETCH=settings.GEOSITE_DNS_PREFETCH,
        SPARC_BREADCRUMBS=SPARC_BREADCRUMBS,
        SPARC_HAZARDS=settings.SPARC_HAZARDS,
        SPARC_HAZARDS_CONFIG=[c for c in SPARC_HAZARDS_CONFIG if c['id'] in settings.SPARC_HAZARDS],
        SPARC_COUNTRIES_SELECT2=json.dumps([{'text': rb.name, 'children':[{'id':c.country.thesaurus.iso_alpha3, 'text': c.country.gaul.admin0_name} for c in SPARCCountry.objects.all().select_related('country') if c.country.regionalbureau == rb]} for rb in WFPRegionalBureau.objects.all()]),
        SPARC_HAZARDS_SELECT2=json.dumps([{'id':c['id'], 'text':c['title']} for c in SPARC_HAZARDS_CONFIG if c['id'] in settings.SPARC_HAZARDS])
    )

    return defaults
