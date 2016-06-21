# See https://docs.djangoproject.com/en/1.9/topics/settings/
import django
import os

django.setup()

from unidecode import unidecode
from gauldjango.models import GAULAdmin0
from lsibdjango.models import GeographicThesaurusEntry

def foldWord(a):
    return unidecode(a)


def cleanWord(a):
    return ''.join(x for x in a if x.isalnum())


def cleanSet(a):
    for x in ['a', 'an', 'and', 'et', 'the', 'of']:
        try:
            a.remove(x)
        except:
            pass
    return a


def isSubset(nameA, nameB):
    setA = cleanSet(set([foldWord(cleanWord(x)) for x in nameA.lower().split()]))
    setB = cleanSet(set([foldWord(cleanWord(x)) for x in nameB.lower().split()]))
    return setA <= setB or setB <= setA


def getValue(header, values, column, type):
    try:
        if type == "int" or type == "integer":
            return int(values[header.index(column)]) if (header.index(column) < len(values) and len(values[header.index(column)]) > 0) else None
        elif type == "boolean":
            return (values[header.index(column)] == "t") if header.index(column) < len(values) else None
        else:
            return values[header.index(column)] if header.index(column) < len(values) else None
    except Exception, err:
        print "Header: ", header
        print "Values: ", values
        print "Column: ", column
        print "Type: ", type
        raise err


GeographicThesaurusEntry.objects.all().delete()

lines = None
with open("initial_data/lsib_thesaurus_utf8.txt", 'r') as f:
    lines = f.readlines()
h = map(str.strip, lines[0].split("\t"))  # pop header
print "Header: ",h
print "Number of Lines: ", len(lines[1:])
for line in lines[1:]:
    if line:
        values = map(str.strip, line.split("\t"))
        entry = GeographicThesaurusEntry(
            id=values[h.index("id")],
            fips=getValue(h, values, "fips", "string"),
            iso_alpha2=getValue(h, values, "iso_alpha2", "string"),
            iso_alpha3=getValue(h, values, "iso_alpha3", "string"),
            iso_num=getValue(h, values, "iso_num", "int"),
            stanag=getValue(h, values, "stanag", "string"),
            tld=getValue(h, values, "tld", "string"),
            gaul=None,
            dos_short_extended=getValue(h, values, "dos_short_extended", "string"),
            dos_short=getValue(h, values, "dos_short", "string"),
            dos_long=getValue(h, values, "dos_long", "string"),
            capital=getValue(h, values, "capital", "string"),
            sovereignty=getValue(h, values, "sovereignty", "boolean"),
            independent_state=getValue(h, values, "independent_state", "boolean"),
            un=getValue(h, values, "un", "boolean"),
            relations=getValue(h, values, "relations", "string"),
            note=getValue(h, values, "note", "string"))
        entry.save()

print "Finding gaul code..."
thesaurusEntries = GeographicThesaurusEntry.objects.exclude(dos_short__isnull=True).exclude(dos_short__exact='')
gaulEntries = GAULAdmin0.objects.all()
for entryA in thesaurusEntries:
    #if entryA.dos_short == "United States":
    #    print "Looking up GAUL code for ", entryA.dos_short
    candidates = []
    candidate_diff = None
    #
    nameA = entryA.dos_short.lower()
    setA = cleanSet(set([foldWord(cleanWord(x)) for x in nameA.split()]))
    for entryB in gaulEntries:
        #if entryA.dos_short == "United States":
        #    print "Checking against ", entryB.admin0_name, " ..."
        nameB = entryB.admin0_name.lower()
        setB = cleanSet(set([foldWord(cleanWord(x)) for x in nameB.split()]))

        diff = len(setA - setB) + len(setB - setA)
        #if entryA.dos_short == "United States":
        #    print "Set A: ", setA
        #    print "Set B: ", setB
        #    print '- Difference is ', str(diff)
        if candidate_diff is None:
            candidates.append(entryB)
            candidate_diff = diff
            if diff == 0:
                break
        elif diff == candidate_diff:
            candidates.append(entryB)
            candidate_diff = diff
            if diff == 0:
                break
        elif diff < candidate_diff:
            candidates = [entryB]
            candidate_diff = diff
            if diff == 0:
                break

    if len(candidates) == 1:
        entryA.gaul = candidates[0].admin0_code
    else:
        subsets = []
        for c in candidates:
            if isSubset(entryA.dos_short, entryB.admin0_name):
                subsets.append(c)
        if len(subsets) > 0:
            entryA.gaul = subsets[0].admin0_code
        else:
            entryA.gaul = None

    entryA.save()

print "Hardcoding known values"

GeographicThesaurusEntry.objects.filter(dos_short="Burma").update(gaul=171)
GeographicThesaurusEntry.objects.filter(dos_short="Laos").update(gaul=139)
GeographicThesaurusEntry.objects.filter(dos_short="United Kingdom").update(gaul=256)
GeographicThesaurusEntry.objects.filter(dos_short="Korea, North").update(gaul=67)
