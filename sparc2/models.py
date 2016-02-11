from django.db import models

from wfppresencedjango.models import WFPCountry
from lsibdjango.models import GeographicThesaurusEntry
from gauldjango.models import GAULAdmin0

class SPARCCountry(models.Model):
    id = models.IntegerField(primary_key=True)
    country = models.OneToOneField(WFPCountry)

    @property
    def iso_alpha2(self):
        if self.country.thesaurus_id:
            return GeographicThesaurusEntry.objects.filter(pk=self.country.thesaurus_id).values_list('iso_alpha2', flat=True)[0]
        else:
            return None

    @property
    def iso_alpha3(self):
        if self.country.thesaurus_id:
            return GeographicThesaurusEntry.objects.filter(pk=self.country.thesaurus_id).values_list('iso_alpha3', flat=True)[0]
        else:
            return None

    @property
    def name(self):
        if self.country.gaul_id:
            return GAULAdmin0.objects.filter(pk=self.country.gaul_id).values_list('admin0_name', flat=True)[0]
        else:
            return None

    @property
    def regionalbureau_name(self):
        if self.country.regionalbureau_id:
            return self.country.regionalbureau.name
        else:
            return None

    def __str__(self):
        return "%s" % self.country.thesaurus.dos_short.encode('utf-8')

    class Meta:
        ordering = ("country__thesaurus__iso_alpha3",)
        verbose_name = ("SPARC Country")
        verbose_name_plural = ("SPARC Countries")

class CountryGeneralInfo(models.Model):
    country = models.OneToOneField(SPARCCountry)
    tot_pop = models.IntegerField(null=True, blank=True)
    gdp_per_cap = models.DecimalField(null=True, blank=True, max_digits=12, decimal_places=2)
    hdi = models.DecimalField(null=True, blank=True, max_digits=12, decimal_places=2)
    num_cat_0_5_cyclones = models.IntegerField(null=True, blank=True)
    num_cat_1_5_cyclones = models.IntegerField(null=True, blank=True)
    exposed_pop = models.IntegerField(null=True, blank=True)
    storm_surge_exposed_pop = models.IntegerField(null=True, blank=True)
    low_risk_cyclone = models.IntegerField(null=True, blank=True)
    low_med_risk_cyclone = models.IntegerField(null=True, blank=True)
    med_risk_cyclone = models.IntegerField(null=True, blank=True)
    med_high_risk_cyclone = models.IntegerField(null=True, blank=True)
    high_risk_cyclone = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return "%s" % self.country.name.encode('utf-8')

    class Meta:
        ordering = ("country",)
        verbose_name_plural = ("General Info by Country")


class FloodPopAtRisk(models.Model):
    id = models.IntegerField(primary_key=True)
    country = models.ForeignKey(SPARCCountry)
    adm2code = models.CharField(max_length=8)
    adm2name = models.CharField(max_length=255)
    rper = models.IntegerField(null=True, blank=True)
    mjan = models.IntegerField(null=True, blank=True)
    mfeb = models.IntegerField(null=True, blank=True)
    mmar = models.IntegerField(null=True, blank=True)
    mapr = models.IntegerField(null=True, blank=True)
    mmay = models.IntegerField(null=True, blank=True)
    mjun = models.IntegerField(null=True, blank=True)
    mjul = models.IntegerField(null=True, blank=True)
    maug = models.IntegerField(null=True, blank=True)
    msep = models.IntegerField(null=True, blank=True)
    moct = models.IntegerField(null=True, blank=True)
    mnov = models.IntegerField(null=True, blank=True)
    mdes = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return "%s" % self.adm2name.encode('utf-8')

    class Meta:
        ordering = ("country", "adm2name", )
        verbose_name_plural = ("Population at Risk of Flood by Admin 2")


class DroughtPopAtRisk(models.Model):
    id = models.IntegerField(primary_key=True)
    country = models.ForeignKey(SPARCCountry)
    adm2code = models.CharField(max_length=8)
    adm2name = models.CharField(max_length=255)
    freq = models.IntegerField(null=True, blank=True)
    mjan = models.IntegerField(null=True, blank=True)
    mfeb = models.IntegerField(null=True, blank=True)
    mmar = models.IntegerField(null=True, blank=True)
    mapr = models.IntegerField(null=True, blank=True)
    mmay = models.IntegerField(null=True, blank=True)
    mjun = models.IntegerField(null=True, blank=True)
    mjul = models.IntegerField(null=True, blank=True)
    maug = models.IntegerField(null=True, blank=True)
    msep = models.IntegerField(null=True, blank=True)
    moct = models.IntegerField(null=True, blank=True)
    mnov = models.IntegerField(null=True, blank=True)
    mdes = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ("country", "adm2name", )
        verbose_name_plural = ("Population at Risk of Drought by Admin 2")


class CyclonesByCountryCategory(models.Model):
    id = models.IntegerField(primary_key=True)
    country = models.ForeignKey(SPARCCountry)
    category = models.IntegerField()
    jan = models.IntegerField(null=True, blank=True)
    feb = models.IntegerField(null=True, blank=True)
    mar = models.IntegerField(null=True, blank=True)
    apr = models.IntegerField(null=True, blank=True)
    may = models.IntegerField(null=True, blank=True)
    jun = models.IntegerField(null=True, blank=True)
    jul = models.IntegerField(null=True, blank=True)
    aug = models.IntegerField(null=True, blank=True)
    sep = models.IntegerField(null=True, blank=True)
    oct = models.IntegerField(null=True, blank=True)
    nov = models.IntegerField(null=True, blank=True)
    dec = models.IntegerField(null=True, blank=True)
    storm_serial = models.TextField(null=True, blank=True)

    def __str__(self):
        return "%s - Category %s" % (self.country.name.encode('utf-8'), self.category, )

    class Meta:
        ordering = ("country", "category", )
        verbose_name_plural = ("Cyclones by Country-Category")
