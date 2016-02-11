# See https://docs.djangoproject.com/en/1.9/topics/settings/
import django
import os

django.setup()

from sparc2.models import SPARCCountry
from wfppresencedjango.models import WFPCountry

SPARCCountry.objects.all().delete()

c = SPARCCountry(
  id=1,
  country=WFPCountry.objects.get(thesaurus__iso_alpha3='HTI'))
c.save()
c = SPARCCountry(
  id=2,
  country=WFPCountry.objects.get(thesaurus__iso_alpha3='PHL'))
c.save()
c = SPARCCountry(
  id=3,
  country=WFPCountry.objects.get(thesaurus__iso_alpha3='NPL'))
c.save()
c = SPARCCountry(
  id=4,
  country=WFPCountry.objects.get(thesaurus__iso_alpha3='BGD'))
c.save()
