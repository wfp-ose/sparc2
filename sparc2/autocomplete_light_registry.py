import autocomplete_light.shortcuts as autocomplete_light

from sparc2.models import SPARCCountry

class SPARCCountryAutocomplete(autocomplete_light.AutocompleteGenericBase):
    search_fields=['^name']
    model=SPARCCountry
    attrs={
        'placeholder': 'Other model name ?',
        'data-autocomplete-minimum-characters': 1
    }
    widget_attrs={
        'data-widget-maximum-values': 4,
        'class': 'modern-style'
    }
autocomplete_light.register(SPARCCountryAutocomplete)
