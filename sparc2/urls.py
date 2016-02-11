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
        r'^download$',
        views.download,
        name='download'),
    url(
        r'^about$',
        views.about,
        name='about'),
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

    # Data Services
    url(
        r'^data/local/admin0[.]json$',
        views.admin0_data.as_view(),
        name='admin0_data'),
    url(
        r'^data/local/country/(?P<iso_alpha3>[^/]+)/admin/(?P<level>[^/]+)[.]json$',
        views.data_local_country_admin.as_view(),
        name='data_local_country_admin'),
    url(
        r'^data/local/country/(?P<iso3>[^/]+)/hazard/(?P<hazard>[^/]+)[.]json$',
        views.countryhazard_data_local.as_view(),
        name='countryhazard_data_local'),
    url(
        r'^data/local/country/(?P<iso3>[^/]+)/hazard/(?P<hazard>[^/]+)/summary[.]json$',
        views.countryhazard_data_local_summary.as_view(),
        name='countryhazard_data_local_summary'),
    url(
        r'^data/emdat/country/(?P<iso3>[^/]+)/hazard/(?P<hazard>[^/]+)[.]json$',
        views.countryhazard_data_emdat.as_view(),
        name='countryhazard_data_emdat'),
    url(
        r'^events/local/country/(?P<iso3>[^/]+)/hazard/(?P<hazard>[^/]+)[.]json$',
        views.countryhazard_events_local,
        name='countryhazard_events_local'),

    # Cache control
    url(
        r'^cache/data/flush$',
        views.cache_data_flush,
        name='cache_data_flush'),

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
