geodash.config = {
  'click_radius': 2.0,
  'search': {
    'datasets': [sparc2.typeahead.datasets, geodash.typeahead.datasets],
    'codecs': [sparc2.bloodhound.codec, geodash.bloodhound.codec]
  },
  'dynamicStyleFunctionWorkspaces': [
    sparc2.dynamicStyleFn,
    geodash.dynamicStyleFn
  ],
  'transport':
  {
    'littleEndian': false
  },
  'popup':
  {
    'height': '309px',
    'context': {
      'e': extract,
      'extract': extract,
      'popatrisk': sparc2.calc.popatrisk,
      'filters': [
        'vam_filter_fcs',
        'vam_filter_csi'
      ],
      "vam": function(admin1_code, x) {
        return extract('data.vam.admin1.'+admin1_code+'.'+x, geodash.initial_data, '');
      }
    },
    'listeners': {
      'show': [
        sparc2.popup.initChart
      ]
    }
  }
};
