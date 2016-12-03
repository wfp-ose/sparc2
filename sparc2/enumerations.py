SPARC_HAZARDS_CONFIG = [
    {
        "id": "cyclone",
        "title":"Cyclones"
    },
    {
        "id": "drought",
        "title": "Drought"
    },
    {
        "id": "flood",
        "title": "Floods"
    },
    {
        "id": "landslide",
        "title": "Landslides"
    }
]

SPARC_BREADCRUMBS = [
    {
        "id": "sparc-select-country",
        "placeholder": "Country...",
        "type": "country",
        "width": "resolve",
        "height": "50px",
        "output": "iso3",
        "data": "countries_select2_by_rb",
        "breadcrumbs": [
            {
                "name": "country",
                "value": "iso3"
            },
            {
                "name": "hazard",
                "value": "hazard"
            },
            {
                "name": "month",
                "value": "month_num"
            }
        ]
    },
    {
        "id": "sparc-select-hazard",
        "placeholder": "Hazard...",
        "type": "hazard",
        "width": "resolve",
        "height": "50px",
        "output": "hazard",
        "data": "hazards_select2",
        "breadcrumbs": [
            {
                "name": "country",
                "value": "iso3"
            },
            {
                "name": "hazard",
                "value": "hazard"
            },
            {
                "name": "month",
                "value": "month_num"
            }
        ]
    }
]

URL_EMDAT_BY_HAZARD = {
    "cyclone": "http://emdat.be/advanced_search/php/search.php?_dc=1452677383466&from=1900&to=2025&continent=&region=&country_name={iso3}&dis_group=Natural&dis_subgroup=Meteorological&dis_type=Storm&dis_subtype=&aggreg=start_year&page=1&start=0&limit=1000",  # noqa
    "drought": "http://emdat.be/advanced_search/php/search.php?_dc=1452677383466&from=1900&to=2025&continent=&region=&country_name={iso3}&dis_group=Natural&dis_subgroup=Climatological&dis_type=Drought&dis_subtype=&aggreg=start_year&page=1&start=0&limit=1000",  # noqa
    "flood": "http://emdat.be/advanced_search/php/search.php?_dc=1452677383466&from=1900&to=2025&continent=&region=&country_name={iso3}&dis_group=&dis_subgroup=Hydrological&dis_type=&dis_subtype=&aggreg=start_year&page=1&start=0&limit=1000&sort=%5B%7B%22property%22%3A%22occurrence%22%2C%22direction%22%3A%22ASC%22%7D%5D"  # noqa
}

URL_VAM = {
    "FCS": "http://reporting.vam.wfp.org/API/Get_FCS.aspx?adm0={admin0}&adm1={admin1}&indTypeID=2",
    "CSI":"http://reporting.vam.wfp.org/API/Get_CSI.aspx?type=cs&adm0={admin0}&adm1={admin1}&indTypeID=2"
}


ENDPOINTS = {
    "sparc2_vam_geojson": '/api/data/country/{{ iso3 }}/dataset/vam.json',
    "sparc2_context_geojson": '/api/data/country/{{ iso3 }}/dataset/context.json',
    "sparc2_context_summary": '/api/data/country/{{ iso3 }}/dataset/context_summary.json',
    "sparc2_popatrisk_geojson": '/api/data/country/{{ iso3 }}/hazard/{{ hazard }}/dataset/popatrisk.json',
    "sparc2_popatrisk_summary": '/api/data/country/{{ iso3 }}/hazard/{{ hazard }}/dataset/summary.json',
    "sparc2_countries_json": '/api/data/countries.json',
    "sparc2_hazards_json": "/api/data/hazards.json"
}

PAGES = {
    "home" : "/",
    "explore": "/explore",
    "country_detail": "/country/{{ iso3 }}",
    "countryhazard_detail": "/country/{{ iso3 }}/hazard/{{ hazard }}",
    "countryhazardmonth_detail": "/country/{{ iso3 }}/hazard/{{ hazard }}/month/{{ month }}"
}
