SPARC_HAZARDS_CONFIG= [
    {
        "id": "cyclone",
        "title":"Cyclones",
        "filters": [
            {
                "label": "Category",
                "description": "The category of the cyclone.  See http://www.srh.noaa.gov/jetstream/tropics/tc_classification.htm for more details.",
                "height": "34px",
                "type": "radio",
                "radio": {
                    "output": "category",
                    "options": [
                        {
                            "id": "sparc-cat1_5",
                            "name": "cat",
                            "value": "cat1_5",
                            "label": "1-5",
                            "checked": True
                        },
                        {
                            "id": "sparc-cat1_3",
                            "name": "cat",
                            "value": "cat1_3",
                            "label": "1-3"
                        },
                        {
                            "id": "sparc-cat4_5",
                            "name": "cat",
                            "value": "cat4_5",
                            "label": "4-5"
                        }
                    ]
                }
            },
            {
                "label": "Probability",
                "description": "The probability by admin2-month that a cyclone will hit.",
                "line_height": "36px",
                "height": "50px",
                "type": "slider",
                "slider": {
                    "id": "sparc-probabilities-slider",
                    "type": "continuous",
                    "width": "120px",
                    "range": "min",
                    "label": "&lt;= {value}",
                    "value": 0.1,
                    "min": 0,
                    "max": 1.0,
                    "step": 0.1,
                    "output":"prob_class_max"
                }
            }
        ]
    },
    {
        "id": "drought",
        "title": "Drought",
        "filters": []
    },
    {
        "id": "flood",
        "title": "Floods",
        "filters": [
            {
                "label": "Return Period",
                "description": "Probability is based on the concept of \"return period\".  A return period is an estimate of the likelihood of an event, such as a flood, to occur. The theoretical return period is the inverse of the probability that the event will be exceeded in any one year (or more accurately the inverse of the expected number of occurrences in a year). In this case, a 100 year flood has a 0.01 or 1% chance of being exceeded in any one year.",
                "line_height": "36px",
                "height": "50px",
                "type": "slider",
                "slider": {
                    "id": "sparc-probabilities-slider",
                    "type": "ordinal",
                    "width": "100px",
                    "range": "min",
                    "value": 50,
                    "label": "&lt;= {value} RP",
                    "options": [25, 50, 100, 200, 500, 1000],
                    "output": "rp"
                }
            }
        ]
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
        "data": "countries_select2",
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
    "fcs": "http://reporting.vam.wfp.org/API/Get_FCS.aspx?adm0={admin0}&adm1={admin1}&indTypeID=2"
}

TEMPLATES_BY_HAZARD = {
    "cyclone": "countryhazardmonth_detail.html",
    "drought": "countryhazardmonth_detail.html",
    "flood": "countryhazardmonth_detail.html"
}

POPATRISK_BY_HAZARD = {
    "cyclone": "cyclone.admin2_popatrisk",
    "drought": "drought.admin2_popatrisk",
    "flood": "flood.admin2_popatrisk"
}

MONTHS_NUM = range(0, 12)
MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]  # noqa
MONTHS_SHORT3 = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]  # noqa
MONTHS_ALL = [{'num': i+1, 'long': MONTHS_LONG[i], 'short3': MONTHS_SHORT3[i]} for i in MONTHS_NUM]  # noqa

DAYSOFTHEWEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']  # noqa
