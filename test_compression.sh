curl -H "Accept-Encoding: gzip,deflate" -so /dev/null 'http://localhost:8000/data/local/country/PHL/hazard/cyclone/summary.geodash' -w '%{size_download}'; echo
curl -H "Accept-Encoding: gzip,deflate" -so /dev/null 'http://localhost:8000/data/local/country/PHL/hazard/cyclone/summary.json' -w '%{size_download}'; echo
