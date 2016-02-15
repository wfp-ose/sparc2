from django.contrib import admin

from sparc2.models import SPARCCountry, CountryGeneralInfo, FloodPopAtRisk, DroughtPopAtRisk, CyclonesByCountryCategory

class SPARCCountryAdmin(admin.ModelAdmin):
    model = SPARCCountry
    list_display_links = ('id', 'iso_alpha3',)
    list_display = ('id', 'iso_alpha3', 'name',)


class CountryGeneralInfoAdmin(admin.ModelAdmin):
    model = CountryGeneralInfo
    list_display_links = ('country',)
    list_display = ('country', 'tot_pop', 'gdp_per_cap', 'hdi',)


class FloodPopAtRiskAdmin(admin.ModelAdmin):
    model = FloodPopAtRisk
    list_display_links = ('id', )
    list_display = ('id', 'country', 'adm2name', 'adm2code',)


class DroughtPopAtRiskAdmin(admin.ModelAdmin):
    model = DroughtPopAtRisk
    list_display_links = ('id',)
    list_display = ('id', 'country', 'adm2name', 'adm2code',)


class CyclonesByCountryCategoryAdmin(admin.ModelAdmin):
    model = CyclonesByCountryCategory
    list_display_links = ('id',)
    list_display = ('id', 'country', 'category',)


admin.site.register(SPARCCountry, SPARCCountryAdmin)
admin.site.register(CountryGeneralInfo, CountryGeneralInfoAdmin)
admin.site.register(FloodPopAtRisk, FloodPopAtRiskAdmin)
admin.site.register(DroughtPopAtRisk, DroughtPopAtRiskAdmin)
admin.site.register(CyclonesByCountryCategory, CyclonesByCountryCategoryAdmin)
