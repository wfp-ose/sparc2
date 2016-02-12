import bleach
import markdown
import re

try:
    import simplejson as json
except ImportError:
    import json

from django import template
from django.template.loader import get_template

register = template.Library()
