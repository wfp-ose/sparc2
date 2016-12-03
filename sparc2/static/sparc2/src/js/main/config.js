geodash.config = {
  'bootloader': {
    "loaders": [sparc2.loaders, geodash.bootloader.loaders],
    "ui": {
      "padding": "4px",
      "heading": "h6",
      "fontSize": "2rem"
    }
  },
  'click_radius': 2.0,
  'search': {
    'datasets': [sparc2.typeahead.datasets, geodash.typeahead.datasets],
    'codecs': [sparc2.bloodhound.codec, geodash.bloodhound.codec]
  },
  'charts': {
    'tooltips': [sparc2.charts.tooltips]
  },
  'dynamicStyleFunctionWorkspaces': [
    sparc2.dynamicStyleFn,
    geodash.dynamicStyleFn
  ],
  'transport':
  {
    'littleEndian': false
  },
  'classifier': sparc2.classifier.default,
  'popup':
  {
    'height': '309px',
    'context': {
      'e': extract,
      'extract': extract,
      'extractFloat': extractFloat,
      'popatrisk': sparc2.calc.popatrisk,
      'filters': [
        'vam_filter_fcs',
        'vam_filter_csi'
      ],
      "vam": function(admin1_code, x)
      {
        return extract('data.vam.admin1.'+admin1_code+'.'+x, geodash.initial_data, '');
      },
      "context": function(admin1_code, admin2_code, x)
      {
        if(angular.isDefined(admin1_code) && angular.isDefined(admin2_code) && angular.isDefined(x))
        {
          var keyChain = ['data', 'context', 'admin1', admin1_code, 'admin2', admin2_code, x];
          return extract(keyChain, geodash.initial_data, "");
        }
        else
        {
          return "";
        }
      }
    },
    'listeners': {
      'show': [
        sparc2.popup.initChart
      ]
    }
  }
};
