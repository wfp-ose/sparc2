from django import VERSION
from django.conf.urls import patterns, include, url
from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.views.i18n import javascript_catalog
from django.views.generic import TemplateView

from . import views

admin.autodiscover()

js_info_dict = {
    'domain': 'djangojs',
    'packages': ('sparc2',)
}

sitemaps = {
}

urlpatterns = [
    # Web Pages
    url(
        r'^$',
        views.home,
        name='home'),
    url(
        r'^explore$',
        views.explore,
        name='explore'),
    url(
        r'^country/(?P<iso3>[^/]+)$',
        views.country_detail,
        name='country_detail'),
    url(
        r'^hazard/(?P<hazard>[^/]+)$',
        views.hazard_detail,
        name='hazard_detail'),
    url(
        r'^country/(?P<iso3>[^/]+)/hazard/(?P<hazard>[^/]+)$',
        views.countryhazardmonth_detail,
        name='countryhazard_detail'),
    url(
        r'^country/(?P<iso3>[^/]+)/hazard/(?P<hazard>[^/]+)/month/(?P<month>[^/]+)$',
        views.countryhazardmonth_detail,
        name='countryhazardmonth_detail'),

    # SPARC-specific APIS
    url(
        r'^api/countries[.](?P<extension>[^.]+)$',
        views.api_countries.as_view(),
        name='api_countries'),

    url(
        r'^api/hazards[.](?P<extension>[^.]+)$',
        views.api_hazards.as_view(),
        name='api_hazards'),

    url(
        r'^api/data/country/(?P<iso3>[^/]+)/dataset/(?P<dataset>[^/]+)[.](?P<extension>[^.]+)$',
        views.api_data_country.as_view(),
        name='api_data_country'),

    url(
        r'^api/data/country/(?P<iso3>[^/]+)/hazard/(?P<hazard>[^/]+)/dataset/(?P<dataset>[^/]+)[.](?P<extension>[^.]+)$',
        views.api_data_countryhazard.as_view(),
        name='api_data_countryhazard'),

    url(
        r'^api/cache/data/flush$',
        views.api_cache_data_flush,
        name='api_cache_data_flush'),

    # Data Services
    url(
        r'^data/local/admin0[.](?P<extension>[^.]+)$',
        views.admin0_data.as_view(),
        name='admin0_data'),

    url(
        r'^data/local/country/(?P<iso3>[^/]+)/hazard/(?P<hazard>[^/]+)/summary[.](?P<extension>[^.]+)$',
        views.countryhazard_data_local_summary.as_view(),
        name='countryhazard_data_local_summary'),

    ## Emdat APIS
    url(
        r'^data/emdat/country/(?P<iso3>[^/]+)/hazard/(?P<hazard>[^/]+)[.](?P<extension>[^.]+)$',
        views.countryhazard_data_emdat.as_view(),
        name='countryhazard_data_emdat'),

    # Django urls
    url(
        r'^sitemap\.xml$',
        sitemap,
        {'sitemaps': sitemaps},
        name='sitemap'),
    url(
        r'^lang\.js$',
        TemplateView.as_view(template_name='lang.js', content_type='text/javascript'),
        name='lang'),
    url(r'^jsi18n/$', javascript_catalog, js_info_dict, name='jscat'),
    url(r'^i18n/', include('django.conf.urls.i18n')),
    url(r'^autocomplete/', include('autocomplete_light.urls')),
    # Admin URLS Specific @ https://github.com/django/django/blob/master/django/contrib/admin/sites.py#L270
    url(r'^admin/', include(admin.site.urls)),
]

if VERSION < (1, 9):
    urlpatterns = patterns('', *urlpatterns)
