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

geodash.init_country = function(appName)
{

  var url_context_summary = geodash.api.getEndpoint("sparc2_context_summary")
    .replace("{{ iso3 }}", geodash.initial_state.iso3);

  $.when(
    $.ajax({dataType: "json", url: url_context_summary})
  ).done(function(response_context_summary)
  {
    geodash.initial_data["layers"]["context"]["data"]["summary"] = response_context_summary[0];

    geodash.breakpoints = {};

    $.each(geodash.initial_data["layers"]["context"]["data"]["summary"]["all"]["breakpoints"], function(k, v){
      geodash.breakpoints["context_"+k] = v;
    });

    geodash.init_country_main_app(appName);
  });
};

geodash.init_country_main_app = function(appName)
{
  geodash.app = app = angular.module(appName, ['ngRoute','ngSanitize']);

  var initFn = ['templates', 'filters', 'directives', 'factory'];
  for(var i = 0; i < initFn.length; i++)
  {
    geodash.init[initFn[i]](app);
  }

  // Initialize UI interaction for intents.
  // Listen's for events bubbling up to body element, so can initialize before children.
  geodash.init.listeners();

  /*
  init_sparc_controller_main will kick off a recursive search for controllers
  to add to the angular app/module.  However, the initialization code in
  app.controller(...function(){XXXXX}) won't actually execute until
  angular.bootstrap is called.  Therefore, each controller should Initialize
  in a breadth-first sequential order.

  If you miss a component with ng-controller, bootstrap will attempt
  to load it on its own within angular.bootstrap.  That'll error out
  and is not good.  So you NEED!!! to get to it first!!!!!!
  */

  geodash.init.controller_base(app);

  var mainController = $('#geodash-main');
  init_sparc_controller_main(mainController, app);

  angular.bootstrap(document, [appName]);
};

geodash.init_countryhazardmonth = function(appName)
{
  console.log("Running geodash.init_countryhazardmonth");

  var url_popatrisk_summary = geodash.api.getEndpoint("sparc2_popatrisk_summary")
    .replace("{{ iso3 }}", geodash.initial_state.iso3)
    .replace("{{ hazard }}", geodash.initial_state.hazard);

  var url_context_summary = geodash.api.getEndpoint("sparc2_context_summary")
    .replace("{{ iso3 }}", geodash.initial_state.iso3);

  var url_vam_geojson = geodash.api.getEndpoint("sparc2_vam_geojson")
    .replace("{{ iso3 }}", geodash.initial_state.iso3);

/*
$.ajax({
  url: url_popatrisk_summary,
  mimeType: "application/octet-stream",
  beforeSend: function(xhr){
    xhr.overrideMimeType('text\/plain; charset=x-user-defined');  // This is
  }
})
*/

  $.when(
    $.ajax({dataType: "json", url: url_popatrisk_summary}),
    $.ajax({dataType: "json", url: url_context_summary}),
    $.ajax({dataType: "json", url: url_vam_geojson})
  ).done(function(
    response_popatrisk_summary,
    response_context_summary,
    response_vam_geojson
    ){
    var response_popatrisk_summary_content_type = response_popatrisk_summary[2].getResponseHeader("Content-Type");
    if(response_popatrisk_summary_content_type == "application/json")
    {
      geodash.initial_data["layers"]["popatrisk"]["data"]["summary"] = response_popatrisk_summary[0];
    }
    else
    {
      geodash.initial_data["layers"]["popatrisk"]["data"]["summary"]  = sparc2.transport.decode.summary(response_popatrisk_summary[0]);
    }

    geodash.initial_data["layers"]["context"]["data"]["summary"] = response_context_summary[0];

    // Load VAM Data
   geodash.initial_data.layers.vam.data.geojson = response_vam_geojson[0];
   geodash.initial_data["data"]["vam"] = {
     "admin1": {}
   };
   var features = extract("layers.vam.data.geojson.features", geodash.initial_data, []);
   for(var i = 0; i < features.length; i++)
   {
     var admin1_code = extract("properties.admin1_code", features[i]);
     var admin1_vam = extract("properties.vam", features[i]);
     if(angular.isDefined(admin1_code) && angular.isDefined(admin1_vam))
     {
       geodash.initial_data.data.vam.admin1[""+admin1_code] = admin1_vam;
     }
   }

    // Load Breakpoints
    geodash.breakpoints = {};
    if("all" in geodash.initial_data["layers"]["popatrisk"]["data"]["summary"])
    {
      $.each(geodash.initial_data["layers"]["popatrisk"]["data"]["summary"]["all"]["breakpoints"], function(k, v){
        geodash.breakpoints["popatrisk_"+k] = v;
      });
    }
    if("all" in geodash.initial_data["layers"]["context"]["data"]["summary"])
    {
      $.each(geodash.initial_data["layers"]["context"]["data"]["summary"]["all"]["breakpoints"], function(k, v){
        geodash.breakpoints["context_"+k] = v;
      });
    }

    geodash.init_countryhazardmonth_main_app(appName);
  });
};

geodash.init_countryhazardmonth_main_app = function(appName)
{
  geodash.app = app = angular.module(appName, ['ngRoute','ngSanitize', 'ngCookies']);

  var initFn = ['templates', 'filters', 'directives', 'factory'];
  for(var i = 0; i < initFn.length; i++)
  {
    geodash.init[initFn[i]](app);
  }

  // Initialize UI interaction for intents.
  // Listen's for events bubbling up to body element, so can initialize before children.
  geodash.init.listeners();

  /*
  init_sparc_controller_main will kick off a recursive search for controllers
  to add to the angular app/module.  However, the initialization code in
  app.controller(...function(){XXXXX}) won't actually execute until
  angular.bootstrap is called.  Therefore, each controller should Initialize
  in a breadth-first sequential order.

  If you miss a component with ng-controller, bootstrap will attempt
  to load it on its own within angular.bootstrap.  That'll error out
  and is not good.  So you NEED!!! to get to it first!!!!!!
  */

  geodash.init.controller_base(app);

  var mainController = $('#geodash-main');
  init_sparc_controller_main(mainController, app);

  angular.bootstrap(document, [appName]);
};

geodash.init_explore = function(appName)
{
  geodash.app = app = angular.module(appName, ['ngRoute','ngSanitize']);

  var initFn = ['templates', 'filters', 'directives', 'factory'];
  for(var i = 0; i < initFn.length; i++)
  {
    geodash.init[initFn[i]](app);
  }

  // Initialize UI interaction for intents.
  // Listen's for events bubbling up to body element, so can initialize before children.
  geodash.init.listeners();

  /*
  init_sparc_controller_main will kick off a recursive search for controllers
  to add to the angular app/module.  However, the initialization code in
  app.controller(...function(){XXXXX}) won't actually execute until
  angular.bootstrap is called.  Therefore, each controller should Initialize
  in a breadth-first sequential order.

  If you miss a component with ng-controller, bootstrap will attempt
  to load it on its own within angular.bootstrap.  That'll error out
  and is not good.  So you NEED!!! to get to it first!!!!!!
  */

  geodash.init.controller_base(app);

  var mainController = $('#geodash-main');
  init_sparc_controller_main(mainController, app);

  angular.bootstrap(document, [appName]);

};

var init_sparc_controller = function(that, app)
{
  var controllerName = that.data('controllerName');
  var controllerType = that.data('controllerType');

  app.controller(controllerName, function($scope, $element) {

    init_intents($($element), $scope);

  });
};

geodash.meta = {};
geodash.meta.projects = [{"name":"geodash","version":"0.0.1","description":"geodash 0.0.1"},{"name":"sparc2","version":"0.0.1","description":"SPARC 2.x"}];
geodash.meta.plugins = [{"controllers":["GeoDashControllerBase.js","GeoDashControllerModal.js"],"directives":["svg.js","onLinkDone.js","onRepeatDone.js","geodashBtnClose.js","geodashBtnInfo.js","geodashBtn.js","geodashLabel.js","geodashTab.js","geodashTabs.js"],"enumerations":["dates.js"],"templates":["geodash_tab.tpl.html","geodash_tabs.tpl.html","geodash_btn_close.tpl.html","geodash_btn_info.tpl.html","geodash_btn.tpl.html","geodash_label.tpl.html"],"filters":[],"handlers":["clickedOnMap.js","filterChanged.js","hideLayer.js","hideLayers.js","layerLoaded.js","requestToggleComponent.js","selectStyle.js","showLayer.js","showLayers.js","stateChanged.js","switchBaseLayer.js","ol3/toggleComponent.js","viewChanged.js","zoomToLayer.js"],"schemas":["base.yml","baselayers.yml","featurelayers.yml","controls.yml","view.yml","servers.yml","pages.yml"],"modals":[],"project":"geodash","id":"base"},{"filters":["default.js","md2html.js","percent.js","tabLabel.js","as_float.js","add.js","title.js","as_array.js","sortItemsByArray.js","breakpoint.js","breakpoints.js","position_x.js","width_x.js","length.js","layer_is_visible.js","common/append.js","common/default_if_undefined.js","common/default_if_undefined_or_blank.js","common/extract.js","common/extractTest.js","common/inArray.js","common/not.js","common/prepend.js","common/parseTrue.js","common/ternary.js","common/ternary_defined.js","common/yaml.js","array/arrayToObject.js","array/join.js","array/first.js","array/last.js","array/choose.js","format/formatBreakPoint.js","format/formatFloat.js","format/formatInteger.js","format/formatArray.js","format/formatMonth.js","math/eq.js","math/lte.js","math/gte.js","math/gt.js","string/replace.js","string/split.js","url/url_shapefile.js","url/url_geojson.js","url/url_kml.js","url/url_describefeaturetype.js"],"project":"geodash","id":{"branch":"master","url":"https://github.com/geodashio/geodash-plugin-filters.git"}},{"name":"geodash-plugin-legend","controllers":["controller_legend.js"],"directives":["geodashModalLayerCarto.js","geodashModalLayerMore.js","geodashModalLayerConfig.js","geodashSymbolCircle.js","geodashSymbolEllipse.js","geodashSymbolGraduated.js","geodashSymbolGraphic.js","geodashLegendBaselayers.js","geodashLegendFeaturelayers.js"],"templates":["modal/geodash_modal_layer_carto.tpl.html","modal/geodash_modal_layer_more.tpl.html","modal/geodash_modal_layer_config.tpl.html","symbol/symbol_circle.tpl.html","symbol/symbol_ellipse.tpl.html","symbol/symbol_graduated.tpl.html","symbol/symbol_graphic.tpl.html","legend_baselayers.tpl.html","legend_featurelayers.tpl.html"],"less":["legend.less"],"schemas":["legend_schema.yml"],"project":"geodash","id":"geodash-plugin-legend"},{"controllers":[],"directives":["geodashModalWelcome.js"],"templates":["modal/geodash_modal_welcome.tpl.html"],"project":"geodash","id":"welcome"},{"controllers":[],"directives":["geodashModalAbout.js"],"templates":["geodash_modal_about.tpl.html"],"project":"geodash","id":"about"},{"controllers":[],"directives":["geodashModalDownload.js"],"templates":["geodash_modal_download.tpl.html"],"project":"geodash","id":"download"},{"controllers":[],"directives":["geodashMapOverlays.js"],"templates":["map_overlays.tpl.html"],"less":["map_overlays.less"],"schemas":["map_overlays_schema.yml"],"project":"geodash","id":{"version":"master","url":"https://github.com/geodashio/geodash-plugin-overlays.git"}},{"controllers":[],"directives":["geodashSidebarToggleLeft.js"],"templates":["geodash_sidebar_toggle_left.tpl.html"],"project":"geodash","id":"sidebar_toggle_left"},{"controllers":[],"directives":["geodashSidebarToggleRight.js"],"templates":["geodash_sidebar_toggle_right.tpl.html"],"project":"geodash","id":"sidebar_toggle_right"},{"name":"sparc2","endpoints":["endpoints.yml"],"project":"sparc2","id":"sparc2"},{"controllers":["SPARCControllerCalendar.js"],"directives":["sparcCalendar.js"],"templates":["sparc_calendar.tpl.html"],"less":["sparc_calendar.less"],"project":"sparc2","id":"https://github.com/wfp-ose/sparc2-plugin-calendar.git"},{"name":"geodash-plugin-map-map","controllers":[{"name":"controller_map_map","path":"controller_map_map.js","handlers":[{"event":"toggleComponent","handler":"toggleComponent"}]}],"directives":[],"templates":[],"less":["main_map.less"],"project":"sparc2","id":"geodash-plugin-map-map"},{"name":"sparc2-plugin-sidebar","controllers":["SPARCControllerSidebar.js"],"directives":["sparcSidebar.js","sparcSidebarFeatureLayer.js","sparcModalFilterMore.js","sparcFilterCheckbox.js","sparcFilterRadio.js","sparcFilterSlider.js"],"templates":["sparc_sidebar.tpl.html","sparc_sidebar_featurelayer.tpl.html","modal/modal_filter_more.tpl.html","filter/filter_checkbox.tpl.html","filter/filter_radio.tpl.html","filter/filter_slider.tpl.html"],"less":["sidebar.less","sidebar-toggle.less","filter.less"],"project":"sparc2","id":"sparc2-plugin-sidebar"},{"controllers":[{"name":"controller_main","path":"controller_main.js","handlers":[{"event":"clickedOnMap","handler":"clickedOnMap"},{"event":"filterChanged","handler":"filterChanged"},{"event":"hideLayer","handler":"hideLayer"},{"event":"hideLayers","handler":"hideLayers"},{"event":"layerLoaded","handler":"layerLoaded"},{"event":"requestToggleComponent","handler":"requestToggleComponent"},{"event":"selectStyle","handler":"selectStyle"},{"event":"showLayer","handler":"showLayer"},{"event":"showLayers","handler":"showLayers"},{"event":"stateChanged","handler":"stateChanged"},{"event":"switchBaseLayer","handler":"switchBaseLayer"},{"event":"viewChanged","handler":"viewChanged"},{"event":"zoomToLayer","handler":"zoomToLayer"}]}],"directives":[],"templates":[],"project":"sparc2","id":"main"},{"name":"sparc2-plugin-welcome","controllers":["SPARCControllerModalWelcome.js"],"directives":["sparcModalWelcome.js"],"templates":["sparc_modal_welcome.tpl.html"],"less":["sparc_welcome.less"],"modals":[{"name":"sparc_welcome","ui":{"mainClass":"","tabs":[{"target":"modal-sparc-welcome-intro","label":"Introduction"},{"target":"modal-sparc-welcome-about","label":"About"}]}}],"project":"sparc2","id":"sparc2-plugin-welcome"}];
geodash.meta.controllers = [{"name":"controller_map_map","handlers":[{"event":"toggleComponent","handler":"toggleComponent"}]},{"name":"controller_main","handlers":[{"event":"clickedOnMap","handler":"clickedOnMap"},{"event":"filterChanged","handler":"filterChanged"},{"event":"hideLayer","handler":"hideLayer"},{"event":"hideLayers","handler":"hideLayers"},{"event":"layerLoaded","handler":"layerLoaded"},{"event":"requestToggleComponent","handler":"requestToggleComponent"},{"event":"selectStyle","handler":"selectStyle"},{"event":"showLayer","handler":"showLayer"},{"event":"showLayers","handler":"showLayers"},{"event":"stateChanged","handler":"stateChanged"},{"event":"switchBaseLayer","handler":"switchBaseLayer"},{"event":"viewChanged","handler":"viewChanged"},{"event":"zoomToLayer","handler":"zoomToLayer"}]}];
geodash.meta.modals = [{"name":"sparc_welcome","ui":{"mainClass":"","tabs":[{"target":"modal-sparc-welcome-intro","label":"Introduction"},{"target":"modal-sparc-welcome-about","label":"About"}]}}];
geodash.templates = {};
geodash.templates["geodash_tab.tpl.html"] = "<li\n  role=\"presentation\"\n  ng-class=\"(active && active != \'false\') ? \'active\' : \'\'\">\n  <a\n    href=\"#{{ target }}\"\n    aria-controls=\"{{ target }}\"\n    role=\"tab\"\n    data-toggle=\"tab\"\n    style=\"padding-left:8px; padding-right: 8px; height: {{ height | default_if_undefined : \'auto\'}}\">{{ label }}</a>\n</li>\n";
geodash.templates["geodash_tabs.tpl.html"] = "<ul class=\"nav nav-tabs nav-justified\" role=\"tablist\">\n  <li\n    ng-repeat=\"x in ui.tabs track by $index\"\n    role=\"presentation\"\n    ng-class=\"$first ? \'active\' : \'\'\">\n    <a\n      href=\"#{{ x.target }}\"\n      aria-controls=\"{{ x.target }}\"\n      role=\"tab\"\n      data-toggle=\"tab\"\n      style=\"padding-left:8px; padding-right: 8px; height: {{ height | default_if_undefined : \'auto\'}}\">{{ x.label }}</a>\n  </li>\n</ul>\n";
geodash.templates["geodash_btn_close.tpl.html"] = "<button\n  type=\"button\"\n  class=\"close\"\n  data-dismiss=\"{{ dismiss | default_if_undefined: \'modal\' }}\"\n  aria-hidden=\"true\"><i class=\"fa fa-times\"></i></button>\n";
geodash.templates["geodash_btn_info.tpl.html"] = "<div\n  class=\"input-group-addon btn btn-primary\"\n  data-toggle=\"tooltip\"\n  data-placement=\"{{ placement | default_if_undefined : \'left\' }}\"\n  ng-attr-title=\"{{ info }}\">\n  <i class=\"fa fa-info-circle\"></i>\n</div>\n";
geodash.templates["geodash_btn.tpl.html"] = "<div\n  ng-class=\"[\'input-group-addon\',\'btn\',(\'btn-\'|add: mode),((mode == \'clear\' || mode ==\'off\') ? \'btn-danger\': \'\'),((mode == \'on\') ? \'btn-success\': \'\'),((mode == \'edit\') ? \'btn-primary btn-edit\': \'\')]\"\n  data-target=\"{{ target }}\"\n  data-toggle=\"{{ info | ternary_defined : \'tooltip\' : undefined }}\"\n  data-placement=\"{{ placement | default_if_undefined : \'left\' }}\"\n  ng-attr-title=\"{{ info }}\">\n  <i ng-class=\"[\'fa\',(mode == \'clear\' ? \'fa-times\' : \'\'),(mode == \'on\' ? \'fa-check\' : \'\'),(mode == \'off\' ? \'fa-circle-o\' : \'\'),(mode == \'edit\' ? \'fa-pencil-square-o\' : \'\')]\"></i>\n</div>\n";
geodash.templates["geodash_label.tpl.html"] = "<label for=\"{{ target }}\" class=\"col-sm-3 control-label\" ng-bind-html=\"content\"></label>\n";
geodash.templates["geodash_modal_layer_carto.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button geodash-btn-close></button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">Layer / {{ layer.title }} / Cartography</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <p class=\"navbar-text\" style=\"margin-bottom:0px;\"><b>Select</b><br><b>a Style:</b></p>\n          <li\n            role=\"presentation\"\n            ng-class=\"$first ? \'active\' : \'\'\"\n            ng-repeat=\"style in layer.cartography track by $index\">\n            <a\n              class=\"geodash-intent\"\n              href=\"#modal-layer-carto-style-{{ style.id }}\"\n              aria-controls=\"modal-layer-carto-style-{{ style.id }}\"\n              data-intent-name=\"selectStyle\"\n              data-intent-data=\"{&quot;layer&quot;:&quot;{{ layerID }}&quot;,&quot;style&quot;:&quot;{{ style.id }}&quot;}\"\n              data-intent-ctrl=\"geodash-map-legend\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\"\n              ng-bind-html=\"style.title | default:\'Default\' | tabLabel\"></a>\n          </li>\n        </ul>\n        <!-- Tab panes -->\n        <div class=\"tab-content\">\n          <div\n            ng-class=\"$first ? \'tab-pane fade in active\' : \'tab-pane fade\'\"\n            ng-repeat=\"style in layer.cartography track by $index\"\n            id=\"modal-layer-carto-style-{{ style.id }}\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span><b>Attribute: </b><span>{{ style.attribute | default:\"Not styled by attribute\" }}</span></span><br>\n            <span><b>Mask: </b><span ng-bind-html=\"style.mask | md2html | default:\'No Mask\'\"></span></span><br>\n            <span><b>Description: </b><span ng-bind-html=\"style.description | md2html | default:\'Not specified\'\"></span></span>\n            <br>\n            <br>\n            <div\n              ng-if=\"style.type == \'graduated\'\"\n              geodash-symbol-graduated\n              style=\"style\"\n              container-width=\"{{ \'392px\' }}\">\n            </div>\n            <div\n              ng-if=\"style.legend.symbol.type == \'circle\'\"\n              geodash-symbol-circle\n              style=\"style\">\n            </div>\n            <div\n              ng-if=\"style.legend.symbol.type == \'graphic\'\"\n              geodash-symbol-graphic\n              style=\"style\">\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geodash.templates["geodash_modal_layer_more.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button geodash-btn-close></button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">Layer / {{ layer.title }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li role=\"presentation\" class=\"active\">\n            <a\n              href=\"#modal-layer-more-general\"\n              aria-controls=\"modal-layer-more-general\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">General</a>\n          </li>\n          <li ng-if=\"layer.wfs\" role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-layer-more-attributes\"\n              aria-controls=\"modal-layer-more-attributes\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Attributes</a>\n          </li>\n          <li ng-if=\"layer.wms\" role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-layer-more-source\"\n              aria-controls=\"modal-layer-more-source\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Source</a>\n          </li>\n          <li ng-if=\"layer.wms\" role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-layer-more-wms\"\n              aria-controls=\"modal-layer-more-wms\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">WMS</a>\n          </li>\n          <li ng-if=\"layer.wfs\" role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-layer-more-wfs\"\n              aria-controls=\"modal-layer-more-wfs\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">WFS</a>\n          </li>\n          <li ng-if=\"layer.wfs\" role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-layer-more-download\"\n              aria-controls=\"modal-layer-more-download\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Download</a>\n          </li>\n        </ul>\n        <div class=\"tab-content\">\n          <div\n            id=\"modal-layer-more-general\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"layer.description | md2html | default:\'No description given.\'\"></span>\n            <br><br><b>Type:</b> {{ layer.type }}\n            <br><br><b>Source:</b> {{ layer.source.name | default:\"Not specified\" }}\n          </div>\n          <div\n            ng-if=\"layer.wfs\"\n            id=\"modal-layer-more-attributes\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <div>\n              Placeholder\n            </div>\n          </div>\n          <div\n            ng-if=\"layer.source\"\n            id=\"modal-layer-more-source\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span><b>Name:</b> {{ layer.source.name | default:\"Not specified\" }}</span><br>\n            <span><b>Attribution:</b> {{ layer.source.attribution | default:\"Not specified\" }}</span><br>\n            <span><b>URL:</b> {{ layer.source.url | default:\"Not specified\" }}</span><br>\n          </div>\n          <div\n            ng-if=\"layer.wms\"\n            id=\"modal-layer-more-wms\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span><b>URL:</b> {{ layer.wms.url | default:\"Not specified\" }}</span><br>\n            <span><b>Layers:</b> {{ layer.wms.layers|join:\', \'|default:\"Not specified\" }}</span><br>\n            <span><b>Styles:</b> {{ layer.wms.styles|join:\', \'|default:\"Not specified\" }}</span><br>\n            <span><b>Format:</b> {{ layer.wms.format | default:\"Not specified\" }}</span><br>\n            <span><b>Version:</b> {{ layer.wms.version | default:\"Not specified\" }}</span><br>\n            <span><b>Transparent:</b> {{ layer.wms.transparent | default:\"No\" }}</span><br>\n            <hr>\n            <span><a target=\"_blank\" href=\"{{ layer.wms.url }}?SERVICE=WMS&Request=GetCapabilities\">Capabilities</a><br>\n            <span><a target=\"_blank\" href=\"{{ layer.wms.url }}?SERVICE=WMS&Request=GetLegendGraphic&format=image/png&layer={{ layer.wms.layers|first }}\">Legend Graphic</a><br>\n          </div>\n          <div\n            ng-if=\"layer.wfs\"\n            id=\"modal-layer-more-wfs\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span><b>URL:</b> {{ layer.wfs.url | default:\"Not specified\" }}</span><br>\n            <span><b>Version:</b> {{ layer.wfs.version | default:\"Not specified\" }}</span><br>\n            <hr>\n            <span><a target=\"_blank\" href=\"{{ layer | url_describefeaturetype }}\">Describe Feature Type</a><br>\n          </div>\n          <div\n            ng-if=\"layer.wfs\"\n            id=\"modal-layer-more-download\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span><b>Download Shapefile</b>: <a target=\"_blank\" href=\"{{ layer | url_shapefile }}\">All</a>, <a target=\"_blank\" href=\"{{ layer | url_shapefile:state }}\">Current Extent</a><br>\n            <span><b>Download GeoJSON</b>: <a target=\"_blank\" href=\"{{ layer | url_geojson }}\">All</a>, <a target=\"_blank\" href=\"{{ layer | url_geojson:state }}\">Current Extent</a><br>\n            <span><b>Download Google Earth KML</b>: <a target=\"_blank\" href=\"{{ layer | url_kml }}\">All</a>, <a target=\"_blank\" href=\"{{ layer | url_kml:state }}\">Current Extent</a><br>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geodash.templates["geodash_modal_layer_config.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button geodash-btn-close></button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">Layer / {{ layer.title }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li class=\"active\" role=\"presentation\">\n            <a href=\"#modal-layer-config-input\"\n              aria-controls=\"modal-layer-config-input\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Configure</a>\n          </li>\n          <li class=\"\" role=\"presentation\">\n            <a href=\"#modal-layer-config-output\"\n              aria-controls=\"modal-layer-config-output\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Output</a>\n          </li>\n        </ul>\n        <!-- Tab panes -->\n        <div class=\"tab-content\">\n          <div\n            id=\"modal-layer-config-input\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <div class=\"form-group row\" style=\"margin:0; padding-top: 10px; padding-bottom: 10px;\">\n              <div class=\"col-md-3\"><h5>Title</h5></div>\n              <div class=\"col-md-9\">\n                <label for=\"layer-config-title\" class=\"sr-only control-label\">Title</label>\n                <input\n                  id=\"layer-config-title\"\n                  type=\"text\"\n                  class=\"form-control\"\n                  placeholder=\"Title ...\"\n                  data-geodash-field-type=\"text\"\n                  ng-model=\"layer.title\"\n                  ng-change=\"validateField()\"\n                  required\n                  value=\"{{ layer.title }}\">\n              </div>\n            </div>\n            <div class=\"form-group row\" style=\"margin:0; padding-top: 10px; padding-bottom: 10px;\">\n              <div class=\"col-md-3\"><h5>Description</h5></div>\n              <div class=\"col-md-9\">\n                <label for=\"layer-config-title\" class=\"sr-only control-label\">Description</label>\n                <input\n                  id=\"layer-config-description\"\n                  type=\"text\"\n                  class=\"form-control\"\n                  placeholder=\"Title ...\"\n                  data-geodash-field-type=\"text\"\n                  ng-model=\"layer.description\"\n                  ng-change=\"validateField()\"\n                  required\n                  value=\"{{ layer.Description }}\">\n              </div>\n            </div>\n          </div>\n          <div\n            id=\"modal-layer-config-output\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            {{ layer | json }}\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geodash.templates["symbol_circle.tpl.html"] = "<div>\n  <svg width=\"100%\" height=\"100%\" version=\"1.0\" xmlns=\"http://www.w3.org/2000/svg\">\n    <circle\n      cx=\"50%\"\n      cy=\"50%\"\n      ng-r=\"{{ style.legend.symbol.radius }}\"\n      ng-fill=\"{{ style.styles.default.static.color }}\"\n      stroke-width=\"1\"\n      stroke=\"#000000\"></circle>\n  </svg>\n</div>\n";
geodash.templates["symbol_ellipse.tpl.html"] = "<div>\n  <svg width=\"100%\" height=\"100%\" version=\"1.0\" xmlns=\"http://www.w3.org/2000/svg\">\n    <ellipse\n      cx=\"50%\"\n      cy=\"50%\"\n      ng-rx=\"{{ style.legend.symbol.width }}\"\n      ng-ry=\"{{ style.legend.symbol.height }}\"\n      ng-fill=\"{{ style.styles.default.static.color }}\"\n      stroke-width=\"1\"\n      stroke=\"#000000\"></circle>\n  </svg>\n</div>\n";
geodash.templates["symbol_graduated.tpl.html"] = "<div>\n  <div\n    style=\"display: inline-block; vertical-align:top;\"\n    ng-bind-html=\"style.ramp.label.left | md2html\"></div>\n  <svg\n    ng-attr-width=\"{{ containerWidth }}\"\n    height=\"90px\"\n    version=\"1.0\"\n    xmlns=\"http://www.w3.org/2000/svg\">\n    <g>\n      <rect\n        ng-repeat=\"color in style.colors.ramp track by $index\"\n        ng-attr-x=\"{{ style.colors.ramp | length | position_x : $index : containerWidth : 26 }}px\"\n        ng-attr-y=\"{{ \'0\' }}\"\n        ng-attr-width=\"{{ style.colors.ramp | length | width_x : containerWidth : 26 }}px\"\n        height=\"50px\"\n        ng-attr-fill=\"{{ color }}\"\n        stroke-width=\"1\"\n        stroke=\"#000000\"/>\n    </g>\n    <g>\n      <text\n        ng-repeat=\"breakpoint in style | breakpoints track by $index\"\n        ng-attr-x=\"{{ style | breakpoints | length | add: -1 | position_x : $index : containerWidth : 26 }}px\"\n        ng-attr-y=\"{{ $index | choose : 68 : 82 }}px\"\n        text-anchor=\"middle\"\n        ng-attr-fill=\"{{ \'black\' }}\"\n        font-size=\"14px\"\n        text-decoration=\"underline\"\n        font-family=\"\'Open Sans\', sans-serif\">{{ style | breakpoint: $index | formatBreakpoint }}</text>\n    </g>\n  </svg>\n  <div\n    style=\"display: inline-block; vertical-align:top;\"\n    ng-bind-html=\"style.ramp.label.right | md2html\"></div>\n</div>\n";
geodash.templates["symbol_graphic.tpl.html"] = "<i class=\"fa fa-image\" style=\"color:black; font-size: 20px;\"></i>\n";
geodash.templates["legend_baselayers.tpl.html"] = "<div class=\"geodash-map-legend-baselayers geodash-radio-group\">\n  <div\n    ng-repeat=\"layer in baselayers track by $index\"\n    ng-init=\"layerIndex = $index\"\n    ng-if=\"layer.legend!==undefined\"\n    class=\"geodash-map-legend-item noselect\"\n    data-layer=\"{{ layer.id }}\">\n    <div class=\"geodash-map-legend-item-left\">\n      <div class=\"geodash-map-legend-item-icon geodash-map-legend-item-more\">\n        <a\n          class=\"geodash-intent\"\n          data-intent-ctrl=\"geodash-map-legend\"\n          data-intent-name=\"toggleModal\"\n          data-intent-data=\"{{ html5data(\'toggleModal\', \'geodash-modal-layer-more\', \'baselayer\', layer) }}\">\n          <i class=\"fa fa-info-circle\"></i>\n        </a>\n      </div><!--\n      --><div class=\"geodash-map-legend-item-icon geodash-map-legend-item-visibility\">\n           <a\n             ng-class=\" layer.id == state.view.baselayer ? \'geodash-map-legend-item-visibility-button geodash-intent geodash-radio geodash-on\' : \'geodash-map-legend-item-visibility-button geodash-intent geodash-radio\'\"\n             data-intent-name=\"switchBaseLayer\"\n             data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n             data-intent-class-on=\"geodash-on\"\n             data-intent-class-off=\"\"\n             data-intent-ctrl=\"geodash-map-legend\">\n             <i class=\"fa fa-eye geodash-on\"></i><i class=\"fa fa-eye-slash geodash-off\"></i>\n           </a>\n         </div><!--\n      --><div class=\"geodash-map-legend-item-symbol\" style=\"width: 10px;\"></div>\n    </div><!--\n    --><div class=\"geodash-map-legend-item-right\">\n      <div\n        class=\"geodash-map-legend-item-label\"\n        style=\"{{ layer.id == state.view.baselayer ? \'width: 100%;\' : \'width: 100%;opacity: 0.4;\' }}\">\n        <span ng-bind-html=\"layer.legend.label | default_if_undefined_or_blank : layer.title | md2html\"></span>\n      </div>\n    </div>\n  </div>\n</div>\n";
geodash.templates["legend_featurelayers.tpl.html"] = "<div class=\"geodash-map-legend-featurelayers\">\n  <div\n    ng-repeat=\"layer in featurelayers track by $index\"\n    ng-init=\"layerIndex = $index\"\n    ng-if=\"layer.legend!==undefined\"\n    class=\"geodash-map-legend-item noselect\"\n    data-layer=\"{{ layer.id }}\">\n    <div class=\"geodash-map-legend-item-left\">\n      <div class=\"geodash-map-legend-item-icon geodash-map-legend-item-config\" style=\"display:none;\">\n        <a\n          class=\"geodash-intent\"\n          data-intent-name=\"toggleModal\"\n          data-intent-data=\"{{ html5data(\'toggleModal\', \'geodash-modal-layer-config\', \'featurelayer\', layer) }}\"\n          data-intent-ctrl=\"geodash-map-legend\">\n          <i class=\"fa fa-cog\"></i>\n        </a>\n      </div><!--\n      --><div class=\"geodash-map-legend-item-icon geodash-map-legend-item-more\">\n        <a\n          class=\"geodash-intent\"\n          data-intent-name=\"toggleModal\"\n          data-intent-data=\"{{ html5data(\'toggleModal\', \'geodash-modal-layer-more\', \'featurelayer\', layer) }}\"\n          data-intent-ctrl=\"geodash-map-legend\">\n          <i class=\"fa fa-info-circle\"></i>\n        </a>\n      </div><!--\n      --><div class=\"geodash-map-legend-item-icon geodash-map-legend-item-visibility\">\n         <a\n           ng-class=\"layer.id | inArray : state.view.featurelayers | ternary : \'geodash-map-legend-item-visibility-button geodash-intent geodash-toggle\' : \'geodash-map-legend-item-visibility-button geodash-intent geodash-toggle geodash-off\'\"\n           data-intent-names=\"[&quot;showLayer&quot;,&quot;hideLayer&quot;]\"\n           data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n           data-intent-ctrl=\"geodash-map-legend\">\n           <i class=\"fa fa-eye geodash-on\"></i><i class=\"fa fa-eye-slash geodash-off\"></i>\n         </a>\n     </div><!--\n     --><div\n          ng-class=\"layer.type == \'geojson\' ? \'geodash-map-legend-item-icon geodash-map-legend-item-zoomto\': \'geodash-map-legend-item-icon geodash-map-legend-item-zoomto fade disabled\'\">\n        <a\n          class=\"geodash-map-legend-item-zoomto-button geodash-intent\"\n          data-intent-name=\"zoomToLayer\"\n          data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n          data-intent-ctrl=\"geodash-map-legend\">\n          <i class=\"fa fa-compress\"></i>\n        </a>\n      </div>\n    </div><!--\n    --><div class=\"geodash-map-legend-item-right\">\n      <div\n        ng-if=\"layer.cartography[0].legend.symbol\"\n        class=\"geodash-map-legend-item-symbol\">\n        <a\n          class=\"geodash-intent\"\n          data-intent-name=\"toggleModal\"\n          data-intent-data=\"{{ html5data(\'toggleModal\', \'geodash-modal-layer-carto\', \'featurelayer\', layer) }}\"\n          data-intent-ctrl=\"geodash-map-legend\">\n          <div ng-if=\"layer.cartography[0].legend.symbol.type == \'circle\'\">\n            <svg width=\"100%\" height=\"100%\" version=\"1.0\" xmlns=\"http://www.w3.org/2000/svg\">\n              <circle\n                cx=\"50%\"\n                cy=\"50%\"\n                ng-r=\"{{ layer.cartography[0].legend.symbol.radius }}\"\n                ng-fill=\"{{ layer.cartography[0].styles.default.static.color }}\"\n                stroke-width=\"1\"\n                stroke=\"#000000\"></circle>\n            </svg>\n          </div>\n          <div ng-if=\"layer.cartography[0].legend.symbol.type == \'ellipse\'\">\n            <svg width=\"100%\" height=\"100%\" version=\"1.0\" xmlns=\"http://www.w3.org/2000/svg\">\n              <ellipse\n                cx=\"50%\"\n                cy=\"50%\"\n                ng-rx=\"{{ layer.cartography[0].legend.symbol.width }}\"\n                ng-ry=\"{{ layer.cartography[0].legend.symbol.height }}\"\n                ng-fill=\"{{ layer.cartography[0].styles.default.static.color }}\"\n                stroke-width=\"1\"\n                stroke=\"#000000\"></circle>\n            </svg>\n          </div>\n          <div\n            ng-if=\"layer.cartography[0].legend.symbol.type == \'graduated\'\">\n            <svg\n              ng-attr-width=\"{{ layer.cartography[0].legend.symbol.width }}\"\n              height=\"100%\"\n              version=\"1.0\"\n              xmlns=\"http://www.w3.org/2000/svg\">\n              <rect\n                ng-repeat=\"color in layer.cartography[0].colors.ramp track by $index\"\n                ng-attr-x=\"{{ $index|percent:layer.cartography[0].colors.ramp.length }}%\"\n                y=\"0\"\n                ng-attr-width=\"{{ 1|percent:layer.cartography[0].colors.ramp.length }}%\"\n                ng-attr-height=\"{{ layer.cartography[0].legend.symbol.height }}\"\n                ng-attr-fill=\"{{ color }}\"\n                stroke-width=\"1\"\n                stroke=\"#000000\"/>\n            </svg>\n          </div>\n          <div\n            ng-if=\"layer.cartography[0].legend.symbol.type == \'graphic\'\">\n            <i class=\"fa fa-image\" style=\"color:black; font-size: 20px;\"></i>\n          </div>\n        </a>\n      </div><!--\n      --><div\n           class=\"geodash-map-legend-item-label\"\n           style=\"{{ layer.id | inArray : state.view.featurelayers | ternary : \'\' : \'opacity: 0.4;\' }}\">\n        <span ng-bind-html=\"layer.legend.label | default_if_undefined_or_blank : layer.title | md2html\"></span>\n      </div>\n    </div>\n  </div>\n</div>\n";
geodash.templates["geodash_modal_welcome.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button geodash-btn-close></button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">{{ welcome.title }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li role=\"presentation\" class=\"active\">\n            <a\n              href=\"#modal-welcome-general\"\n              aria-controls=\"modal-welcome-general\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">General</a>\n          </li>\n          <li role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-welcome-about\"\n              aria-controls=\"modal-welcome-about\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">About</a>\n          </li>\n        </ul>\n        <div class=\"tab-content\">\n          <div\n            id=\"modal-welcome-general\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"welcome.general | md2html | default:\'No body given.\'\"></span>\n          </div>\n          <div\n            id=\"modal-welcome-about\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"welcome.about | md2html | default:\'No body given.\'\"></span>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geodash.templates["geodash_modal_about.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button geodash-btn-close></button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">{{ about.title }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li\n            role=\"presentation\"\n            ng-class=\"$first ? \'active\' : \'\'\"\n            ng-repeat=\"pane in about.panes track by $index\">\n            <a\n              href=\"#{{ pane.id }}\"\n              aria-controls=\"{{ pane.id }}\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\"\n              ng-bind-html=\"pane.tab.label | default:\'Default\' | tabLabel\"></a>\n          </li>\n        </ul>\n        <!-- Tab panes -->\n        <div class=\"tab-content\">\n          <div\n            ng-class=\"$first ? \'tab-pane fade in active\' : \'tab-pane fade\'\"\n            ng-repeat=\"pane in about.panes track by $index\"\n            id=\"{{ pane.id }}\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"pane.content | md2html | default:\'No content given.\'\"></span>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geodash.templates["geodash_modal_download.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button geodash-btn-close></button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">{{ download.title }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li\n            role=\"presentation\"\n            ng-class=\"$first ? \'active\' : \'\'\"\n            ng-repeat=\"pane in download.panes track by $index\">\n            <a\n              href=\"#{{ pane.id }}\"\n              aria-controls=\"{{ pane.id }}\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\"\n              ng-bind-html=\"pane.tab.label | default:\'Default\' | tabLabel\"></a>\n          </li>\n        </ul>\n        <!-- Tab panes -->\n        <div class=\"tab-content\">\n          <div\n            ng-class=\"$first ? \'tab-pane fade in active\' : \'tab-pane fade\'\"\n            ng-repeat=\"pane in download.panes track by $index\"\n            id=\"{{ pane.id }}\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"pane.content | md2html | default:\'No content given.\'\"></span>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geodash.templates["map_overlays.tpl.html"] = "<div ng-class=\"[\'geodash-map-overlays\', ((editable | parseTrue) ? \'editable\': \'\')]\">\n  <div ng-repeat=\"overlay in map_config.overlays track by $index\">\n    <div ng-if=\"overlay.link | ternary_defined : false : true\">\n      <div\n        ng-if=\"overlay.type == \'text\'\"\n        data-overlay-index=\"{{ $index }}\"\n        data-overlay-type=\"text\"\n        class=\"geodash-map-overlay\"\n        height=\"{{ overlay.height | default_if_undefined : initial }}\"\n        width=\"{{ overlay.width | default_if_undefined : initial }}\"\n        style=\"{{ style(overlay.type, overlay) }}\"\n        ng-bind-html=\"overlay.text.content | md2html\"\n        on-link-done=\"overlayLoaded\">\n      </div>\n      <div\n        ng-if=\"overlay.type == \'image\'\"\n        data-overlay-index=\"{{ $index }}\"\n        data-overlay-type=\"image\"\n        class=\"geodash-map-overlay\"\n        style=\"display: inline-block; {{ style(overlay.type, overlay) }}\"\n        on-link-done=\"overlayLoaded\">\n        <img\n          ng-src=\"{{ overlay.image.url }}\"\n          width=\"{{ overlay.width }}\"\n          height=\"{{ overlay.height }}\">\n      </div>\n    </div>\n    <a\n      ng-if=\"overlay.link | ternary_defined : true : false\"\n      ng-href=\"{{ overlay.link.url }}\"\n      target=\"{{ overlay.link.target }}\">\n      <div\n        ng-if=\"overlay.type == \'text\'\"\n        data-overlay-index=\"{{ $index }}\"\n        data-overlay-type=\"text\"\n        class=\"geodash-map-overlay\"\n        height=\"{{ overlay.height | default_if_undefined : initial }}\"\n        width=\"{{ overlay.width | default_if_undefined : initial }}\"\n        style=\"{{ style(overlay.type, overlay) }}\"\n        ng-bind-html=\"overlay.text.content | md2html\"\n        on-link-done=\"overlayLoaded\">\n      </div>\n      <div\n        ng-if=\"overlay.type == \'image\'\"\n        data-overlay-index=\"{{ $index }}\"\n        data-overlay-type=\"image\"\n        class=\"geodash-map-overlay\"\n        style=\"display: inline-block; {{ style(overlay.type, overlay) }}\"\n        on-link-done=\"overlayLoaded\">\n        <img\n          ng-src=\"{{ overlay.image.url }}\"\n          width=\"{{ overlay.width }}\"\n          height=\"{{ overlay.height }}\">\n      </div>\n    </a>\n  </div>\n</div>\n";
geodash.templates["geodash_sidebar_toggle_left.tpl.html"] = "<div\n  id=\"geodash-map-sidebar-toggle-left\"\n  class=\"geodash-intent geodash-map-sidebar-toggle geodash-map-sidebar-toggle-left btn btn-primary sidebar-open sidebar-left-open\"\n  data-toggle=\"tooltip\"\n  data-placement=\"bottom\"\n  title=\"Click to toggle sidebar.\"\n  data-intent-name=\"requestToggleComponent\"\n  data-intent-data=\"{&quot;selector&quot;:&quot;{{ selector }}&quot;,&quot;component&quot;:&quot;sidebar&quot;,&quot;position&quot;:&quot;left&quot;}\"\n  data-intent-ctrl=\"geodash-map-sidebar-toggle-left\">\n  <div\n    style=\"padding: 4px;\">\n    <span class=\"icon-arrow-gt\">&gt;&gt;</span>\n    <span class=\"icon-arrow-lt\">&lt;&lt;</span>\n  </div>\n</div>\n";
geodash.templates["geodash_sidebar_toggle_right.tpl.html"] = "<div\n  id=\"geodash-map-sidebar-toggle-right\"\n  class=\"geodash-intent geodash-map-sidebar-toggle geodash-map-sidebar-toggle-right btn btn-primary sidebar-open sidebar-right-open\"\n  data-toggle=\"tooltip\"\n  data-placement=\"bottom\"\n  title=\"Click to toggle sidebar.\"\n  data-intent-name=\"requestToggleComponent\"\n  data-intent-data=\"{&quot;selector&quot;:&quot;{{ selector }}&quot;,&quot;component&quot;:&quot;sidebar&quot;,&quot;position&quot;:&quot;right&quot;}\"\n  data-intent-ctrl=\"geodash-map-sidebar-toggle-right\">\n  <div\n    style=\"padding: 4px;\">\n    <span class=\"icon-arrow-gt\">&gt;&gt;</span>\n    <span class=\"icon-arrow-lt\">&lt;&lt;</span>\n  </div>\n</div>\n";
geodash.templates["sparc_calendar.tpl.html"] = "<nav\n  id=\"sparc-map-calendar\"\n  class=\"sparc-map-calendar\">\n  <ul class=\"nav nav-justified geodash-radio-group\">\n    <li\n      ng-repeat=\"month in months track by $index\">\n      <a\n        ng-class=\"state.month == month.num ? \'btn btn-primary selected geodash-intent geodash-radio geodash-on\' : \'btn btn-default geodash-intent geodash-radio\'\"\n        title=\"{{ month.long }}\"\n        ng-href=\"linkForMonth(month)\"\n        data-intent-name=\"stateChanged\"\n        data-intent-data=\"{&quot;month&quot;: {{ month.num }} }\"\n        data-intent-ctrl=\"sparc-map-calendar\"\n        data-intent-class-on=\"btn-primary selected\"\n        data-intent-class-off=\"btn-default\" ng-bind-html=\"month.short3 | title\"></a>\n    </li>\n  </ul>\n</nav>\n";
geodash.templates["sparc_sidebar.tpl.html"] = "<div\n  id=\"sparc-sidebar-left\"\n  class=\"geodash-sidebar geodash-sidebar-left geodash-controller sidebar-open sidebar-left-open\">\n  <div style=\"width:100%;\">\n      <div class=\"geodash-sidebar-header\">\n        <div class=\"geodash-sidebar-header-left\">\n          <a href=\"/\"><img ng-src=\"{{ ui.header.logo.src }}\" alt=\"{{ ui.header.logo.alt }}\"></a>\n        </div>\n        <div class=\"geodash-sidebar-header-right\">\n          <div><a class=\"geodash-sidebar-header-title\" href=\"/\" ng-bind-html=\"ui.header.title\"></a></div>\n          <div><a class=\"geodash-sidebar-header-subtitle\" href=\"/\" ng-bind-html=\"ui.header.subtitle\"></a></div>\n        </div>\n        <div class=\"geodash-sidebar-header-right-2\">\n          <div ng-bind-html=\"state.country_title\"></div>\n        </div>\n      </div>\n    <div geodash-tabs></div>\n    <div class=\"tab-content\">\n      <div\n        id=\"sparc-sidebar-left-welcome\"\n        role=\"tabpanel\"\n        class=\"geodash-sidebar-pane tab-pane fade in active\">\n        <div\n          ng-bind-html=\"map_config.welcome.intro | md2html\">\n        </div>\n      </div>\n      <div\n        id=\"sparc-sidebar-left-charts\"\n        role=\"tabpanel\"\n        class=\"geodash-sidebar-pane tab-pane fade\">\n        <div\n          ng-repeat=\"chart in map_config.sidebar.ui.charts track by $index\"\n          on-repeat-done=\"chart_done\"\n          data-repeat-index=\"{{ $index }}\"\n          id=\"sparc-sidebar-left-charts-chart-{{ chart.id }}\">\n          <div>\n            <h6\n              style=\"text-align:center;\"\n              ng-bind-html=\"chart.title | md2html\"></h6>\n          </div>\n          <div\n            id=\"{{ chart.element }}\"\n            class=\"geodash-sidebar-chart\"\n            style=\"width:360px;margin:0 auto;\"\n          ></div>\n          <div class=\"footnote\" ng-bind-html=\"chart.description | md2html\"></div>\n        </div>\n      </div>\n      <div\n        id=\"sparc-sidebar-left-layers\"\n        role=\"tabpanel\"\n        class=\"geodash-sidebar-pane tab-pane fade\"\n        style=\"padding: 24px 24px 50px 24px;\">\n        <div>\n          <div class=\"input-group\">\n            <span class=\"input-group-addon\" id=\"country-addon\">Country</span>\n            <input\n              id=\"country-input\"\n              name=\"country-input\"\n              type=\"text\"\n              class=\"typeahead form-control\"\n              style=\"height: auto;\"\n              placeholder=\"Country (e.g., Haiti or Philippines)\"\n              aria-describedby=\"country-addon\"\n              data-placeholder=\"Country (e.g., Haiti, Nepal, or Philippines)\"\n              data-typeahead-datasets=\"Countries\"\n              data-initial-value=\"{{ {\'id\': state.iso3, \'text\': state.country_title } | json }}\"\n              data-target-scope-id=\"sparc-sidebar-left\"\n              data-target-scope-path=\"country\"\n              data-search-output=\"id\"\n              data-template-empty=\"<div class=&quot;alert alert-danger empty-message&quot;>Unable to find country</div>\">\n              <div\n                class=\"input-group-addon btn btn-primary btn-show-options\"\n                data-toggle=\"tooltip\"\n                data-placement=\"bottom\"\n                title=\"Show Options\"\n                ng-click=\"showOptions(\'#country-input\')\">\n                <i class=\"fa fa-chevron-down\"></i>\n              </div>\n              <div\n                class=\"input-group-addon btn btn-danger geodash-clear\"\n                data-toggle=\"tooltip\"\n                data-placement=\"bottom\"\n                title=\"Clear Selection\"\n                data-target-input-id=\"country-input\">\n                <i class=\"fa fa-times\"></i>\n              </div>\n          </div>\n          <div class=\"input-group\">\n            <span class=\"input-group-addon\" id=\"hazard-addon\">Hazard</span>\n            <input\n              id=\"hazard-input\"\n              name=\"hazard-input\"\n              type=\"text\"\n              class=\"typeahead form-control\"\n              style=\"height: auto;\"\n              placeholder=\"Hazard (e.g., Flood, Cyclone, Drought, or Landslide)\"\n              aria-describedby=\"hazard-addon\"\n              data-placeholder=\"Hazard (e.g., Flood, Cyclone, Drought, or Landslide)\"\n              data-typeahead-datasets=\"Hazards\"\n              data-initial-value=\"{{ {\'id\': state.hazard, \'text\': state.hazard_title } | json }}\"\n              data-target-scope-id=\"sparc-sidebar-left\"\n              data-target-scope-path=\"hazard\"\n              data-search-output=\"id\"\n              data-template-empty=\"<div class=&quot;alert alert-danger empty-message&quot;>Unable to find hazard</div>\">\n              <div\n                class=\"input-group-addon btn btn-primary btn-show-options\"\n                data-toggle=\"tooltip\"\n                data-placement=\"bottom\"\n                title=\"Show Options\"\n                ng-click=\"showOptions(\'#hazard-input\')\">\n                <i class=\"fa fa-chevron-down\"></i>\n              </div>\n              <div\n                class=\"input-group-addon btn btn-danger geodash-clear\"\n                data-toggle=\"tooltip\"\n                data-placement=\"bottom\"\n                title=\"Clear Selection\"\n                data-target-input-id=\"hazard-input\">\n                <i class=\"fa fa-times\"></i>\n              </div>\n          </div>\n          <ul class=\"nav nav-justified welcome-go\">\n            <li>\n              <a\n                ng-disabled=\"country == undefined || hazard == undefined || country == \'\' || hazard == \'\' || (country == state.iso3 && hazard == state.hazard)\"\n                ng-class=\"country == undefined || hazard == undefined || country == \'\' || hazard == \'\' || (country == state.iso3 && hazard == state.hazard) ? \'btn btn-default\' : \'btn btn-primary\' \"\n                ng-href=\"{{ country == undefined || hazard == undefined || country == \'\' || hazard == \'\' || (country == state.iso3 && hazard == state.hazard) ? \'#\' : \'/country/\'+country+\'/hazard/\'+hazard +\'/month/1\' }}\">Change</a>\n            </li>\n          </ul>\n        </div>\n        <hr>\n        <div style=\"max-height: calc(100% - 310px);overflow-y:scroll;\">\n          <div ng-class=\"geodash-sidebar-layers-group\">\n            <div class=\"geodash-sidebar-layers-selected\">\n              <h5>Selected Layers</h5>\n              <div\n                ng-repeat=\"layer in visiblefeaturelayers track by $index\"\n                ng-init=\"layerIndex = $index\"\n                ng-if=\"layer.legend!==undefined\"\n                class=\"geodash-sidebar-item noselect\"\n                data-layer=\"{{ layer.id }}\">\n                <div class=\"geodash-sidebar-item-left\">\n                  <div class=\"geodash-sidebar-item-icon geodash-sidebar-item-visibility\">\n                     <a\n                       class=\"geodash-sidebar-item-visibility-button geodash-intent\"\n                       data-intent-name=\"hideLayer\"\n                       data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n                       data-intent-ctrl=\"sparc-sidebar-left\"\n                       data-toggle=\"tooltip\"\n                       data-placement=\"bottom\"\n                       title=\"Click to hide this layer.\">\n                       <i class=\"fa fa-times\"></i>\n                     </a>\n                  </div><!--\n                  --><div class=\"geodash-sidebar-item-icon geodash-sidebar-item-more\">\n                    <a\n                      class=\"geodash-intent\"\n                      data-intent-name=\"showModal\"\n                      data-intent-data=\"{{ html5data(\'showModal\', \'geodash-modal-layer-more\', \'featurelayer\', layer) }}\"\n                      data-intent-ctrl=\"sparc-sidebar-left\"\n                      data-toggle=\"tooltip\"\n                      data-placement=\"bottom\"\n                      title=\"Click to learn more about this layer.\">\n                      <i class=\"fa fa-info-circle\"></i>\n                    </a>\n                  </div><!--\n                  --><div\n                       ng-class=\"layer.type == \'geojson\' ? \'geodash-sidebar-item-icon geodash-sidebar-item-zoomto\': \'geodash-sidebar-item-icon geodash-sidebar-item-zoomto fade disabled\'\">\n                     <a\n                       class=\"geodash-sidebar-item-zoomto-button geodash-intent\"\n                       data-intent-name=\"zoomToLayer\"\n                       data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n                       data-intent-ctrl=\"sparc-sidebar-left\"\n                       data-toggle=\"tooltip\"\n                       data-placement=\"bottom\"\n                       title=\"Click to zoom to this layer.\">\n                       <i class=\"fa fa-compress\"></i>\n                     </a>\n                  </div>\n                </div><!--\n                --><div class=\"geodash-sidebar-item-right\">\n                  <div\n                    class=\"geodash-sidebar-item-label\"\n                    style=\"width: 100%;\">\n                    <span ng-bind-html=\"layer.legend.label | md2html\"></span>\n                  </div>\n                </div>\n              </div>\n            </div>\n          </div>\n          <div\n            ng-class=\"geodash-sidebar-layers-group\"\n            ng-repeat=\"x in groups track by $index\"\n            ng-init=\"groupIndex = $index\">\n            <div ng-class=\"x.class\">\n              <h5 ng-bind-html=\"x.label\"></h5>\n              <div\n                ng-repeat=\"layer in x.layers track by $index\"\n                ng-init=\"layerIndex = $index\"\n                ng-if=\"layer.legend | ternary_defined : ( layer.id | inArray : state.view.featurelayers | not) : false\"\n                class=\"geodash-sidebar-item noselect\"\n                data-layer=\"{{ layer.id }}\">\n                <div class=\"geodash-sidebar-item-left\">\n                  <div class=\"geodash-sidebar-item-icon geodash-sidebar-item-more\">\n                    <a\n                      class=\"geodash-intent\"\n                      data-intent-name=\"toggleModal\"\n                      data-intent-data=\"{{ html5data(\'toggleModal\', \'geodash-modal-layer-more\', \'featurelayer\', layer) }}\"\n                      data-intent-ctrl=\"sparc-sidebar-left\"\n                      data-toggle=\"tooltip\"\n                      data-placement=\"bottom\"\n                      title=\"Click to learn more about this layer.\">\n                      <i class=\"fa fa-info-circle\"></i>\n                    </a>\n                  </div>\n                </div><!--\n                --><div class=\"geodash-sidebar-item-right\">\n                  <div\n                    class=\"geodash-sidebar-item-label geodash-intent\"\n                    style=\"width: 100%; opacity: 0.6;\"\n                    data-intent-name=\"showLayer\"\n                    data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n                    data-intent-ctrl=\"sparc-sidebar-left\">\n                    <span ng-bind-html=\"layer.legend.label | md2html\"></span>\n                  </div>\n                </div>\n              </div>\n            </div>\n          </div>\n          <div class=\"geodash-sidebar-layers-group geodash-sidebar-baselayers geodash-radio-group\">\n            <h5>Base Layers</h5>\n            <div\n              ng-repeat=\"layer in baselayers track by $index\"\n              ng-init=\"layerIndex = $index\"\n              ng-if=\"layer.legend!==undefined\"\n              class=\"geodash-sidebar-item noselect\"\n              data-layer=\"{{ layer.id }}\">\n              <div class=\"geodash-sidebar-item-left\">\n                <div class=\"geodash-sidebar-item-icon geodash-sidebar-item-more\">\n                  <a\n                    class=\"geodash-intent\"\n                    data-intent-name=\"toggleModal\"\n                    data-intent-data=\"{{ html5data(\'toggleModal\', \'geodash-modal-layer-more\', \'baselayer\', layer) }}\"\n                    data-intent-ctrl=\"sparc-sidebar-left\"\n                    data-toggle=\"tooltip\"\n                    data-placement=\"bottom\"\n                    title=\"Click to learn more about this layer.\">\n                    <i class=\"fa fa-info-circle\"></i>\n                  </a>\n                </div><!--\n                --><div class=\"geodash-sidebar-item-icon geodash-sidebar-item-visibility\">\n                     <a\n                       ng-class=\" layer.id == state.view.baselayer ? \'geodash-sidebar-item-visibility-button geodash-intent geodash-radio geodash-on\' : \'geodash-sidebar-item-visibility-button geodash-intent geodash-radio\'\"\n                       data-intent-name=\"switchBaseLayer\"\n                       data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n                       data-intent-class-on=\"geodash-on\"\n                       data-intent-class-off=\"\"\n                       data-intent-ctrl=\"sparc-sidebar-left\">\n                       <i class=\"fa fa-eye geodash-on\"></i><i class=\"fa fa-eye-slash geodash-off\"></i>\n                     </a>\n                </div><!--\n                --><div class=\"geodash-sidebar-item-symbol\" style=\"width: 10px;\"></div>\n              </div><!--\n              --><div class=\"geodash-sidebar-item-right\">\n                <div\n                  class=\"geodash-sidebar-item-label\"\n                  style=\"{{ layer.id == state.view.baselayer ? \'width: 100%;\' : \'width: 100%;opacity: 0.4;\' }}\">\n                  <span ng-bind-html=\"layer.legend.label | md2html\"></span>\n                </div>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n      <div\n        id=\"sparc-sidebar-left-filters\"\n        role=\"tabpanel\"\n        class=\"geodash-sidebar-pane tab-pane fade\">\n        <div class=\"input-group\">\n          <span class=\"input-group-addon\" id=\"layer-addon\">Layer</span>\n          <input\n            id=\"layer-input\"\n            name=\"layer-input\"\n            type=\"text\"\n            class=\"typeahead form-control\"\n            style=\"height: auto;\"\n            placeholder=\"Layer to Filter\"\n            aria-describedby=\"layer-addon\"\n            data-placeholder=\"Layer to Filter\"\n            data-typeahead-datasets=\"FeatureLayersWithFilters\"\n            data-initial-value=\"{{ {\'id\': \'popatrisk\', \'text\': \'Population at Risk\', \'obj\': $scope.map_config.featurelayers[0] } | json }}\"\n            data-target-tab-id=\"sparc-sidebar-left-filters-pane-###value###\"\n            data-search-output=\"id\"\n            data-template-empty=\"<div class=&quot;alert alert-danger empty-message&quot;>Unable to find layer</div>\">\n            <div\n              class=\"input-group-addon btn btn-primary btn-show-options\"\n              data-toggle=\"tooltip\"\n              data-placement=\"bottom\"\n              title=\"Show Options\"\n              ng-click=\"showOptions(\'#layer-input\')\">\n              <i class=\"fa fa-chevron-down\"></i>\n            </div>\n            <div\n              class=\"input-group-addon btn btn-danger geodash-clear\"\n              data-toggle=\"tooltip\"\n              data-placement=\"bottom\"\n              title=\"Clear Selection\"\n              data-target-input-id=\"layer-input\">\n              <i class=\"fa fa-times\"></i>\n            </div>\n        </div>\n        <hr>\n        <div class=\"tab-content\">\n          <div\n            ng-repeat=\"layer in featureLayersWithFilters track by $index\"\n            ng-init=\"layerIndex = $index\"\n            id=\"sparc-sidebar-left-filters-pane-{{ layer.id }}\"\n            ng-class=\"layer.id == \'popatrisk\' ? \'tab-pane fade in active\' : \'tab-pane fade\'\"\n            role=\"tabpanel\"\n            data-layer=\"{{ layer.id }}\">\n            <div\n              class=\"row\"\n              style=\"margin-bottom: 4px;\"\n              ng-repeat=\"filter in layer.filters track by $index\">\n              <div geodash-filter-radio ng-if=\"filter.type == \'radio\'\"></div>\n              <div geodash-filter-checkbox ng-if=\"filter.type == \'checkbox\'\"></div>\n              <div geodash-filter-slider ng-if=\"filter.type == \'slider\'\"></div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n";
geodash.templates["modal_filter_more.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-hidden=\"true\"><i class=\"fa fa-times\"></i></button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">Filter / {{ filter.label }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li\n            role=\"presentation\"\n            class=\"active\">\n            <a\n              href=\"#modal-filter-more-general\"\n              aria-controls=\"modal-filter-more-general\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">General</a>\n          </li>\n          <li\n            ng-if=\"filter.type == \'checkbox\' && filter.checkbox.options\"\n            role=\"presentation\"\n            class=\"\">\n            <a\n              href=\"#modal-filter-more-options\"\n              aria-controls=\"modal-filter-more-options\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Options</a>\n          </li>\n          <li\n            ng-if=\"filter.type == \'slider\' && filter.slider.options\"\n            role=\"presentation\"\n            class=\"\">\n            <a\n              href=\"#modal-filter-more-options\"\n              aria-controls=\"modal-filter-more-options\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Options</a>\n          </li>\n        </ul>\n        <div class=\"tab-content\">\n          <div\n            id=\"modal-filter-more-general\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"filter.description | md2html | default:\'No description given.\'\"></span>\n            <br><br><b>Type:</b> {{ filter.type }}\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'continuous\'\">\n              <b>Minimum Value:</b> <span ng-bind-html=\"filter.slider.min | formatInteger:\'delimited\':\' \'\"></span>\n            </div>\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'continuous\'\">\n              <b>Maximum Value:</b> <span ng-bind-html=\"filter.slider.max | formatInteger:\'delimited\':\' \'\"></span>\n            </div>\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'ordinal\'\">\n              <b>Minimum Value:</b> <span ng-bind-html=\"filter.slider.options | first\"></span>\n            </div>\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'ordinal\'\">\n              <b>Maximum Value:</b> <span ng-bind-html=\"filter.slider.options | last\"></span>\n            </div>\n            <hr>\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'ordinal\'\">\n              <b>Current Value:</b> <span ng-bind-html=\"value\"></span>\n            </div>\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'continuous\'\">\n              <b>Current Value:</b> <span ng-bind-html=\"value | join:\' - \'\"></span>\n            </div>\n            <div\n              ng-if=\"filter.type ==\'checkbox\'\">\n              <b>Current Value:</b> <span ng-bind-html=\"value | formatArray\"></span>\n            </div>\n          </div>\n          <div\n            ng-if=\"filter.type == \'checkbox\' && filter.checkbox.options\"\n            id=\"modal-filter-more-options\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span\n              ng-repeat-start=\"option in filter.checkbox.options track by $index\">\n              <i ng-class=\"option.checked ? \'fa fa-check-square-o\' : \'fa fa-square-o\'\"></i>\n              <b ng-bind-html=\"option.label\"></b>:\n              <span ng-bind-html=\"option.description | default_if_undefined:\'No description given\'\"></span>\n            </span>\n            <br>\n            <br ng-repeat-end>\n          </div>\n          <div\n            ng-if=\"filter.type == \'slider\' && filter.slider.options\"\n            id=\"modal-filter-more-options\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span\n              ng-repeat-start=\"option in filter.slider.options track by $index\">\n              <i ng-class=\"option.checked ? \'fa fa-check-square-o\' : \'fa fa-square-o\'\"></i>\n              <b ng-bind-html=\"option\"></b>\n            </span>\n            <br ng-repeat-end>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geodash.templates["filter_checkbox.tpl.html"] = "<div\n  class=\"col-md-12 geodash-filter geodash-filter-checkbox\"\n  style=\"min-height: {{ filter.height }};\">\n  <div class=\"geodash-filter-label\">\n    <a\n      class=\"geodash-intent\"\n      data-intent-name=\"toggleModal\"\n      data-intent-data=\"{&quot;id&quot;:&quot;geodash-modal-filter-more&quot;,&quot;static&quot;:{&quot;tab&quot;:&quot;modal-filter-more-general&quot;},&quot;dynamic&quot;:{&quot;value&quot;:[&quot;state&quot;,&quot;filters&quot;,&quot;popatrisk&quot;,&quot;{{ filter.checkbox.output }}&quot;],&quot;filter&quot;:[&quot;map_config&quot;,&quot;featurelayers&quot;,&quot;popatrisk&quot;,&quot;filters&quot;,&quot;{{ $index }}&quot;]}}\"\n      data-intent-ctrl=\"geodash-map-filter\">\n      <i class=\"fa fa-info-circle\"></i>\n    </a>\n    <span ng-bind-html=\"filter.label | md2html\"></span> :\n  </div>\n  <div\n    class=\"btn-group\"\n    style=\"float:left;\"\n    data-toggle=\"buttons\"\n    data-layer=\"{{ filter.layer }}\"\n    data-output=\"{{ filter.checkbox.output }}\">\n    <label\n      ng-repeat=\"opt in filter.checkbox.options track by $index\"\n      ng-class=\"opt.checked ? \'btn btn-sm btn-primary active\' : \'btn btn-sm btn-default\'\">\n      <input\n        type=\"checkbox\"\n        id=\"{{ opt.id }}\"\n        data-value=\"{{ opt.value }}\"\n        autocomplete=\"off\"\n        ng-checked=\"opt.checked || opt.selected\"/>\n      {{ opt.label }}\n    </label>\n  </div>\n</div>\n";
geodash.templates["filter_radio.tpl.html"] = "<div\n  class=\"col-md-12 geodash-filter geodash-filter-radio\"\n  style=\"min-height: {{ filter.height }};\">\n  <div class=\"geodash-filter-label\">\n    <a\n      class=\"geodash-intent\"\n      data-intent-name=\"toggleModal\"\n      data-intent-data=\"{&quot;id&quot;:&quot;geodash-modal-filter-more&quot;,&quot;static&quot;:{&quot;tab&quot;:&quot;modal-filter-more-general&quot;},&quot;dynamic&quot;:{&quot;value&quot;:[&quot;state&quot;,&quot;filters&quot;,&quot;popatrisk&quot;,&quot;{{ filter.radio.output }}&quot;],&quot;filter&quot;:[&quot;map_config&quot;,&quot;featurelayers&quot;,&quot;popatrisk&quot;,&quot;filters&quot;,&quot;{{ $index }}&quot;]}}\"\n      data-intent-ctrl=\"geodash-map-filter\">\n      <i class=\"fa fa-info-circle\"></i>\n    </a>\n    <span ng-bind-html=\"filter.label | md2html\"></span> :\n  </div>\n  <div\n    class=\"btn-group\"\n    style=\"float:left;\"\n    data-toggle=\"buttons\"\n    data-layer=\"{{ filter.layer }}\"\n    data-output=\"{{ filter.radio.output }}\">\n    <label\n      ng-repeat=\"opt in filter.radio.options track by $index\"\n      ng-class=\"opt.checked ? \'btn btn-default active\' : \'btn btn-default\'\">\n      <input\n        type=\"radio\"\n        id=\"{{ opt.id }}\"\n        name=\"{{ opt.name }}\"\n        value=\"{{ opt.value }}\"\n        data-output=\"{{ filter.radio.output }}\"\n        ng-checked=\"opt.checked || opt.selected\"/>\n      {{ opt.label }}\n    </label>\n  </div>\n</div>\n";
geodash.templates["filter_slider.tpl.html"] = "<div\n  class=\"col-md-12 geodash-filter geodash-filter-slider\"\n  style=\"min-height: {{ filter.height }};\">\n  <div class=\"geodash-filter-label\">\n    <a\n      class=\"geodash-intent\"\n      data-intent-name=\"toggleModal\"\n      data-intent-data=\"{&quot;id&quot;:&quot;geodash-modal-filter-more&quot;,&quot;static&quot;:{&quot;tab&quot;:&quot;modal-filter-more-general&quot;},&quot;dynamic&quot;:{&quot;value&quot;:[&quot;state&quot;,&quot;filters&quot;,&quot;popatrisk&quot;,&quot;{{ filter.slider.output }}&quot;],&quot;filter&quot;:[&quot;map_config&quot;,&quot;featurelayers&quot;,&quot;popatrisk&quot;,&quot;filters&quot;,&quot;{{ $index }}&quot;]}}\"\n      data-intent-ctrl=\"geodash-map-filter\">\n      <i class=\"fa fa-info-circle\"></i>\n    </a>\n    <span ng-bind-html=\"filter.label | md2html\"></span> :\n  </div>\n  <div style=\"display:table; height:{{ filter.height }};padding-left:10px;padding-right:10px;\">\n    <div style=\"display:table-cell;vertical-align:middle;\">\n      <div class=\"geodash-filter-slider-label\">Placeholder</div>\n      <div\n        class=\"geodash-filter-slider-slider\"\n        style=\"width:{{ filter.slider.width }};\"\n        data-layer=\"{{ filter.layer }}\"\n        data-type=\"{{ filter.slider.type }}\"\n        data-value=\"{{ filter.slider.value ? filter.slider.value : \'\' }}\"\n        data-values=\"{{ filter.slider.values ? filter.slider.values : \'\' }}\"\n        data-range=\"{{ filter.slider.range == \'true\' ? \'true\': filter.slider.range }}\"\n        data-output=\"{{ filter.slider.output }}\"\n        data-min-value=\"{{ filter.slider.min|default_if_undefined:\'\' }}\"\n        data-max-value=\"{{ filter.slider.max|default_if_undefined:\'\' }}\"\n        data-step=\"{{ filter.slider.step ? filter.slider.step : \'\' }}\"\n        data-options=\"{{ filter.slider.options ? filter.slider.options : \'\' }}\"\n        data-label-template=\"{{ filter.slider.label }}\"\n        ></div>\n    </div>\n  </div>\n</div>\n";
geodash.templates["sparc_modal_welcome.tpl.html"] = "<div\n  id=\"geodash-modal-sparc-welcome\"\n  class=\"geodash-controller geodash-controller-modal geodash-modal modal fade geodash-sparc-welcome\"\n  tabindex=\"-1\"\n  role=\"dialog\"\n  aria-labelledby=\"myModalLabel\">\n  <div class=\"modal-dialog\" data-backdrop=\"static\" role=\"document\">\n    <div class=\"modal-content\">\n      <div class=\"modal-header\">\n        <h4 class=\"modal-title\" id=\"myModalLabel\">{{ welcome.title }}</h4>\n      </div>\n      <div class=\"modal-body\">\n        <div>\n          <div geodash-tabs></div>\n          <div class=\"tab-content\">\n            <div\n              id=\"modal-sparc-welcome-intro\"\n              class=\"tab-pane fade in active\"\n              role=\"tabpanel\"\n              style=\"padding: 10px;\">\n              <span\n                class=\"welcome-body\"\n                ng-bind-html=\"welcome.intro | md2html | default:\'No body given.\'\"></span>\n              <hr>\n              <h3 class=\"welcome-body\">Get Started: Select a county &amp; hazard!</h3>\n              <div class=\"input-group select2-bootstrap-prepend select2-bootstrap-append\">\n                <span class=\"input-group-addon\" id=\"country-addon\">Country</span>\n                <input\n                  id=\"country-input\"\n                  name=\"country-input\"\n                  type=\"text\"\n                  class=\"typeahead form-control\"\n                  style=\"height: auto;\"\n                  placeholder=\"Country (e.g., Haiti or Philippines)\"\n                  aria-describedby=\"country-addon\"\n                  data-placeholder=\"Country (e.g., Haiti, Nepal, or Philippines)\"\n                  data-typeahead-datasets=\"Countries\"\n                  data-target-scope-id=\"geodash-modal-sparc-welcome\"\n                  data-target-scope-path=\"country\"\n                  data-search-output=\"id\"\n                  data-template-empty=\"<div class=&quot;alert alert-danger empty-message&quot;>Unable to find country</div>\">\n                  <div\n                    class=\"input-group-addon btn btn-primary btn-show-options\"\n                    data-toggle=\"tooltip\"\n                    data-placement=\"bottom\"\n                    title=\"Show Options\"\n                    ng-click=\"showOptions(\'#country-input\')\">\n                    <i class=\"fa fa-chevron-down\"></i>\n                  </div>\n                  <div\n                    class=\"input-group-addon btn btn-danger geodash-clear\"\n                    data-toggle=\"tooltip\"\n                    data-placement=\"bottom\"\n                    title=\"Clear Selection\"\n                    data-target-input-id=\"country-input\">\n                    <i class=\"fa fa-times\"></i>\n                  </div>\n              </div>\n              <div class=\"input-group select2-bootstrap-prepend select2-bootstrap-append\">\n                <span class=\"input-group-addon\" id=\"hazard-addon\">Hazard</span>\n                <input\n                  id=\"hazard-input\"\n                  name=\"hazard-input\"\n                  type=\"text\"\n                  class=\"typeahead form-control\"\n                  style=\"height: auto;\"\n                  placeholder=\"Hazard (e.g., Flood, Cyclone, Drought, or Landslide)\"\n                  aria-describedby=\"hazard-addon\"\n                  data-placeholder=\"Hazard (e.g., Flood, Cyclone, Drought, or Landslide)\"\n                  data-typeahead-datasets=\"Hazards\"\n                  data-target-scope-id=\"geodash-modal-sparc-welcome\"\n                  data-target-scope-path=\"hazard\"\n                  data-search-output=\"id\"\n                  data-template-empty=\"<div class=&quot;empty-message&quot;>Unable to find hazard</div>\">\n                  <div\n                    class=\"input-group-addon btn btn-primary btn-show-options\"\n                    data-toggle=\"tooltip\"\n                    data-placement=\"bottom\"\n                    title=\"Show Options\"\n                    ng-click=\"showOptions(\'#hazard-input\')\">\n                    <i class=\"fa fa-chevron-down\"></i>\n                  </div>\n                  <div\n                    class=\"input-group-addon btn btn-danger geodash-clear\"\n                    data-toggle=\"tooltip\"\n                    data-placement=\"bottom\"\n                    title=\"Clear Selection\"\n                    data-target-input-id=\"hazard-input\">\n                    <i class=\"fa fa-times\"></i>\n                  </div>\n              </div>\n              <hr>\n              <ul class=\"nav nav-justified welcome-go\">\n                <li>\n                  <a\n                    ng-disabled=\"country == undefined || hazard == undefined || country == \'\' || hazard == \'\'\"\n                    ng-class=\"country == undefined || hazard == undefined || country == \'\' || hazard == \'\' ? \'btn btn-default\' : \'btn btn-primary\' \"\n                    ng-href=\"{{ country == undefined || hazard == undefined || country == \'\' || hazard == \'\' ? \'#\' : \'/country/\'+country+\'/hazard/\'+hazard +\'/month/1\' }}\">Go!</a>\n                </li>\n              </ul>\n            </div>\n            <div\n              id=\"modal-sparc-welcome-about\"\n              class=\"tab-pane fade\"\n              role=\"tabpanel\"\n              style=\"padding: 10px;\">\n              <span ng-bind-html=\"welcome.about | md2html | default:\'No body given.\'\"></span>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n";

var MONTHS_NUM = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
//Array(12).fill().map((x,i)=>i)

var MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"];

var MONTHS_SHORT3 =
[
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec"];

var MONTHS_ALL = $.map(MONTHS_NUM, function(num, i){
  return {
    'num': num,
    'short3': MONTHS_SHORT3[i],
    'long': MONTHS_LONG[i]
  };
});

var DAYSOFTHEWEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'];

geodash.filters["default"] = function()
{
  return function(value, fallback)
  {
    return value || fallback;
  };
};

geodash.filters["md2html"] = function()
{
  return function(text)
  {
    if(text != undefined)
    {
      var converter = new showdown.Converter();
      html = converter.makeHtml(text);

      // Open Links in New Windows
      html = html.replace(new RegExp("(<a .*?)>(.*?)</a>", "gi"), '$1 target="_blank">$2</a>');

      // Replace New Line characters with Line Breaks
      html = html.replace(new RegExp('\n', 'gi'),'<br>');

      // Replace extra new lines before heading tags, which add their own margin by default
      html = html.replace(new RegExp("<br><br><(h\\d.*?)>", "gi"),'<br><$1>');

      // Replace extra new lines before paragraph tags, which add their own margin by default
      html = html.replace(new RegExp("<br><br><p>", "gi"),'<p>');

      // If one enclosing paragraph element, then flatten it.
      var matches = html.match(new RegExp("^<p(.*?)>(.*?)</p>", "gi"));
      if(Array.isArray(matches) && matches.length == 1)  // If only 1 match
      {
        if(matches[0] == html) // Fully enclosing
        {
          html = html.substring("<p>".length, html.length - "</p>".length);
        }
      }

      return html;
    }
    else
    {
      return "";
    }
  };
};

geodash.filters["percent"] = function()
{
  return function(value, denominator)
  {
    return 100.0 * value / denominator;
  };
};

geodash.filters["tabLabel"] = function()
{
  return function(value)
  {
    return value.split(" ").length == 2 ? value.replace(' ', '<br>') : value;
  };
};

geodash.filters["as_float"] = function()
{
  return function(value)
  {
    return 1.0 * value;
  };
};

geodash.filters["add"] = function()
{
  return function(value, arg)
  {
    if(Array.isArray(arg))
    {
      var arr = arg;
      return value + arr[value % arr.length];
    }
    else if(arguments.length > 2)
    {
      var arr = Array.prototype.slice.call(arguments, [1]);
      return value + arr[value % arr.length];
    }
    else
    {
      return value + arg;
    }
  };
};

geodash.filters["title"] = function()
{
  return function(value)
  {
    return $.type(value) === "string" ? value.toTitleCase() : value;
  };
};

geodash.filters["as_array"] = function()
{
  return function(value)
  {
    if($.isArray(value))
    {
      return value;
    }
    else
    {
      return $.map(value, function(item, key){
        return {'key': key, 'item': item};
      });
    }
  };
};

geodash.filters["sortItemsByArray"] = function()
{
  return function(value, arg)
  {
    if($.isArray(value))
    {
      value = $.grep(value,function(x, i){
        return $.inArray(x["key"], arg) != -1;
      });
      value.sort(function(a, b){
        return $.inArray(a["key"], arg) - $.inArray(a["key"], arg);
      });
      return value;
    }
    else
    {
      return value;
    }
  };
};

geodash.filters["breakpoint"] = function()
{
    return function(style, index)
    {
      var breakpoints = geodash.breakpoints[style.styles.default.dynamic.options.breakpoints];
      if(breakpoints != undefined && breakpoints.length > 0)
      {
        return breakpoints[index];
      }
      else
      {
        return -1;
      }
    };
};

geodash.filters["breakpoints"] = function()
{
    return function(style)
    {
      var breakpoints = geodash.breakpoints[style.styles.default.dynamic.options.breakpoints];
      if(breakpoints != undefined && breakpoints.length > 0)
      {
        return breakpoints;
      }
      else
      {
        return [];
      }
    };
};

geodash.filters["position_x"] = function()
{
    return function(domain, index, containerWidth, padding)
    {
      var parse_container_width = function(w)
      {
        return $.isNumeric(w) ? w : parseInt(w.substring(0, w.indexOf('px')), 10);
      };
      var actualWidth = parse_container_width(containerWidth) - (padding * 2);
      return padding + (actualWidth * index / domain);
    };
};

geodash.filters["width_x"] = function()
{
    return function(domain, containerWidth, padding)
    {
      var parse_container_width = function(w)
      {
        return $.isNumeric(w) ? w : parseInt(w.substring(0, w.indexOf('px')), 10);
      };
      var actualWidth = parse_container_width(containerWidth)  - (padding * 2);
      return actualWidth / domain;
    };
};

geodash.filters["len"] = geodash.filters["length"] = function()
{
  return function(value)
  {
    if(Array.isArray(value))
    {
      return value.length;
    }
    else if(angular.isString(value))
    {
      return value.length;
    }
    else
    {
      return 0;
    }
  };
};

geodash.filters["layer_is_visible"] = function()
{
  return function(layerID, state)
  {
    state = state || $("#geodash-main").scope().state;
    var visibleFeatureLayers = state.view.featurelayers;
    return (layerID == state.view.baselayer) || $.inArray(layerID, visibleFeatureLayers) != -1;
  };
};

geodash.filters["append"] = function()
{
  return function(value, arg)
  {
    if(Array.isArray(value))
    {
      if(Array.isArray(arg))
      {
        return value.concat(arg);
      }
      else
      {
        return value.push(arg);
      }
    }
    else if(angular.isString(value))
    {
      var arr = Array.prototype.slice.call(arguments, [1]);
      return value + arr.join("");
    }
    else
    {
      return value + arg;
    }
  };
};

geodash.filters["default_if_undefined"] = function()
{
  return function(value, fallback)
  {
    if(value != undefined && value != null)
    {
      return value;
    }
    else
    {
      return fallback;
    }
  };
};

geodash.filters["default_if_undefined_or_blank"] = function()
{
  return function(value, fallback)
  {
    if(value != undefined && value != null && value != "")
    {
      return value;
    }
    else
    {
      return fallback;
    }
  };
};

geodash.filters["extract"] = function()
{
  return function(node)
  {
    var keyChain = Array.prototype.slice.call(arguments, [1]);
    if(keyChain.length > 0)
    {
      return extract(expand(keyChain), node);
    }
    else
    {
      return null;
    }
  };
};

geodash.filters["extractTest"] = function()
{
  return function(node)
  {
    var keyChain = Array.prototype.slice.call(arguments, [1]);
    if(keyChain.length > 0)
    {
      return extract(expand(keyChain), node);
    }
    else
    {
      return null;
    }
  };
};

geodash.filters["inArray"] = function()
{
  return function(value, arr)
  {
      if(Array.isArray(arr))
      {
        return arr.indexOf(value) != -1;
      }
      else
      {
        return false;
      }
  };
};

geodash.filters["not"] = function()
{
  return function(value)
  {
    return ! value;
  };
};

geodash.filters["prepend"] = function()
{
  return function(value, arg)
  {
    if(Array.isArray(value))
    {
      if(Array.isArray(arg))
      {
        return arg.concat(value);
      }
      else
      {
        return [arg].concat(value);
      }
    }
    else if(angular.isString(value))
    {
      var arr = Array.prototype.slice.call(arguments, [1]);
      return arr.join("") + value;
    }
    else
    {
      return arg + value;
    }
  };
};

geodash.filters["parseTrue"] = function()
{
  return function(value)
  {
      return ['on', 'true', 't', '1', 1, true].indexOf(value) != -1;
  };
};

geodash.filters["ternary"] = function()
{
  return function(value, t, f)
  {
    return value ? t : f;
  };
};

geodash.filters["ternary_defined"] = function()
{
  return function(value, t, f)
  {
    if(value != undefined && value != null && value != "")
    {
      return t;
    }
    else
    {
      return f;
    }
  };
};

geodash.filters["yaml"] = function()
{
  return function(value, depth)
  {
    if(value != undefined)
    {
      return YAML.stringify(value, (depth || 4));
    }
    else
    {
      return "";
    }
  };
};

geodash.filters["arrayToObject"] = function()
{
  return function(x)
  {
    var y = {};
    if(angular.isArray(x))
    {
      for(var i = 0; i < x.length; i++)
      {
        y[x[i].name] = x[i].value;
      }
    }
    return y;
  };
};

geodash.filters["join"] = function()
{
    return function(array, arg)
    {
        if(Array.isArray(array))
        {
            return array.join(arg);
        }
        else
        {
            return array;
        }
    };
};

geodash.filters["first"] = function()
{
    return function(array)
    {
        if (!Array.isArray(array))
        {
            return array;
        }
        return array[0];
    };
};

geodash.filters["last"] = function()
{
    return function(arr)
    {
        if (!Array.isArray(arr))
        {
            return arr;
        }

        if(arr.length == 0)
        {
            return undefined;
        }

        return arr[arr.length - 1];
    };
};

geodash.filters["choose"] = function()
{
  return function(value, arg)
  {
    if(Array.isArray(arg))
    {
      var arr = arg;
      return arr[value % arr.length];
    }
    else
    {
      var arr = Array.prototype.slice.call(arguments, [1]);
      return arr[value % arr.length];
    }
  };
};

geodash.filters["formatBreakpoint"] = function()
{
    return function(value)
    {
      if(Number.isInteger(value))
      {
        return geodash.filters["formatInteger"]()(value, 'delimited', ' ');
      }
      else if($.isNumeric(value))
      {
        return geodash.filters["formatFloat"]()(value, 2);
      }
      else
      {
        return "" + value;
      }
    };
};

geodash.filters["formatFloat"] = function()
{
  return function(value, decimals)
  {
    if(value != undefined && value !== "")
    {
      if(decimals != undefined)
      {
        return value.toFixed(decimals);
      }
      else
      {
        return value.toString();
      }
    }
    else
    {
      return "";
    }
  };
};

geodash.filters["formatInteger"] = function()
{
  return function(value, type, delimiter)
  {
    if(value != undefined && value !== "")
    {
      if(type == "delimited")
      {
        delimiter = delimiter || ',';
        var str = Math.round(value).toString(); // Round in case value is a float
        var pattern = new RegExp('(\\d+)(\\d{3})','gi');
        while(pattern.test(str)){str=str.replace(pattern,'$1'+ delimiter +'$2');}
        return str;
      }
      else
      {
        return Math.round(value).toString();
      }
    }
    else
    {
        return "";
    }
  };
};

geodash.filters["formatArray"] = function()
{
  return function(arr)
  {
      if(Array.isArray(arr))
      {
        if(arr.length == 0)
        {
          return "";
        }
        else if(arr.length == 1)
        {
          return arr[0];
        }
        else if(arr.length == 2)
        {
          return arr.join(" and ");
        }
        else // greater than 2
        {
          return arr.slice(0,-1).join(", ")+", and "+arr[arr.length - 1];
        }
      }
      else
      {
          return arr;
      }
  };
};

geodash.filters["formatMonth"] = function()
{
  return function(value, type)
  {
    if(value != undefined && value !== "")
    {
      if(type == "long")
      {
        return months_long[value-1];
      }
      else if(type == "short3" || type == "short_3")
      {
        return months_short_3[value-1];
      }
      else if(type == "int2")
      {
        return value < 10 ? ('0'+ value.toString()) : value.toString();
      }
      else
      {
        return value.toString();
      }
    }
    else
    {
      return ""
    }
  };
};

geodash.filters["eq"] = function()
{
  return function(value, arg)
  {
    if(angular.isNumber(value) && angular.isNumber(arg))
    {
      return value == arg;
    }
    else
    {
      return false;
    }
  };
};

geodash.filters["lte"] = function()
{
  return function(value, arg)
  {
    if(angular.isNumber(value) && angular.isNumber(arg))
    {
      return value <= arg;
    }
    else
    {
      return false;
    }
  };
};

geodash.filters["gte"] = function()
{
  return function(value, arg)
  {
    if(angular.isNumber(value) && angular.isNumber(arg))
    {
      return value >= arg;
    }
    else
    {
      return false;
    }
  };
};

geodash.filters["gt"] = function()
{
  return function(value, arg)
  {
    if(angular.isNumber(value) && angular.isNumber(arg))
    {
      return value > arg;
    }
    else
    {
      return false;
    }
  };
};

geodash.filters["replace"] = function()
{
  return function(value, oldSubstring, newSubstring)
  {
      if(angular.isString(value))
      {
        if(angular.isString(oldSubstring) && angular.isString(newSubstring))
        {
          if(oldSubstring == ".")
          {
            return value.replace(new RegExp('[.]', 'g'), newSubstring);
          }
          else
          {
            return value.replace(oldSubstring, newSubstring);
          }
        }
        else
        {
          return value;
        }
      }
      else
      {
        return "";
      }
  };
};

geodash.filters["split"] = function()
{
    return function(value, delimiter)
    {
        if(angular.isString(value))
        {
            return value.split(delimiter || ",");
        }
        else
        {
            return value;
        }
    };
};

geodash.filters["url_shapefile"] = function()
{
    return function(layer, state)
    {
        var url = "";
        if("wfs" in layer)
        {
          var typename = "";
          if("layers" in layer.wms)
          {
            typename = layer.wms.layers[0];
          }
          else if("layers" in layer.wfs)
          {
            typename = layer.wfs.layers[0];
          }
          var params = {
            "format_options": "charset:UTF-8",
            "typename": typename,
            "outputFormat": "SHAPE-ZIP",
            "version": "1.0.0",
            "service": "WFS",
            "request": "GetFeature"
          };
          if(state != undefined)
          {
            params["cql_filter"] = "BBOX("+layer.wfs.geometry+", "+state.view.extent+")";
          }
          var querystring = $.map(params, function(v, k){return encodeURIComponent(k) + '=' + encodeURIComponent(v);}).join("&");
          url = layer.wfs.url + "?" + querystring;
        }
        return url;
    };
};

geodash.filters["url_geojson"] = function()
{
    return function(layer, state)
    {
        var url = "";
        if("wfs" in layer)
        {
          var typename = "";
          if("layers" in layer.wms)
          {
            typename = layer.wms.layers[0];
          }
          else if("layers" in layer.wfs)
          {
            typename = layer.wfs.layers[0];
          }
          var params = {
            "format_options": "charset:UTF-8",
            "typename": typename,
            "outputFormat": "json",
            "version": "1.0.0",
            "service": "WFS",
            "request": "GetFeature"
          };
          if(state != undefined)
          {
            params["cql_filter"] = "BBOX("+layer.wfs.geometry+", "+state.view.extent+")";
          }
          var querystring = $.map(params, function(v, k){return encodeURIComponent(k) + '=' + encodeURIComponent(v);}).join("&");
          url = layer.wfs.url + "?" + querystring;
        }
        return url;
    };
};

geodash.filters["url_kml"] = function()
{
    return function(layer, state)
    {
        var url = "";
        if("kml" in layer)
        {
          var typename = "";
          if("layers" in layer.wms)
          {
            typename = layer.wms.layers[0];
          }
          else if("layers" in layer.wfs)
          {
            typename = layer.wfs.layers[0];
          }
          var params = {
            "mode": "download",
            "layers": typename
          };
          if(state != undefined)
          {
            params["cql_filter"] = "BBOX("+layer.wfs.geometry+", "+state.view.extent+")";
          }
          var querystring = $.map(params, function(v, k){return encodeURIComponent(k) + '=' + encodeURIComponent(v);}).join("&");
          url = layer.kml.url + "?" + querystring;
        }
        return url;
    };
};

geodash.filters["url_describefeaturetype"] = function()
{
    return function(layer)
    {
        var url = "";
        if("wfs" in layer)
        {
          var version = layer.wfs.version || "1.0.0";
          var params = {
            "service": "WFS",
            "request": "DescribeFeatureType",
            "version": version,
            "outputFormat": "application/json"
          };

          var typename = "";
          if("layers" in layer.wms)
          {
            typename = layer.wms.layers.unique().join(",");
          }
          else if("layers" in layer.wfs)
          {
            typename = layer.wfs.layers.unique().join(",");
          }
          if(version == "1.1.0" || version == "1.0.0")
          {
            params["typeName"] = typename;
          }
          else
          {
            params["typeNames"] = typename;
          }

          var querystring = $.map(params, function(v, k){return encodeURIComponent(k) + '=' + encodeURIComponent(v);}).join("&");
          url = layer.wfs.url + "?" + querystring;
        }
        return url;
    };
};

geodash.handlers["clickedOnMap"] = function($scope, $interpolate, $http, $q, event, args) {
  console.log('event', event);
  console.log('args', args);
  //
  var $scope = geodash.api.getScope("geodash-main");
  var map = geodash.var.map;
  var z = $scope.state.view.z;
  var visibleFeatureLayers = $scope.state.view.featurelayers;
  console.log("visibleFeatureLayers", visibleFeatureLayers);
  var featurelayers_geojson = [];
  var featurelayers_by_featuretype = {};
  var fields_by_featuretype = {};
  var urls = [];
  for(var i = 0; i < visibleFeatureLayers.length; i++)
  {
    var fl = geodash.api.getFeatureLayer(visibleFeatureLayers[i], {"scope": $scope});
    if(fl.type == "geojson")
    {
      featurelayers_geojson.push(fl.id);
    }
    else if(angular.isDefined(extract("wfs", fl)))
    {
      var params = {
        service: "wfs",
        version: extract("wfs.version", fl, '1.0.0'),
        request: "GetFeature",
        srsName: "EPSG:4326",
      };

      //var targetLocation = new L.LatLng(args.lat, args.lon);
      var targetLocation = geodash.normalize.point(args);
      var bbox = geodash.tilemath.point_to_bbox(args.location.lon, args.location.lat, z, 4).join(",");
      var typeNames = extract('wfs.layers', fl, undefined) || extract('wms.layers', fl, undefined) || [] ;
      if(angular.isString(typeNames))
      {
        typeNames = typeNames.split(",");
      }
      for(var j = 0; j < typeNames.length; j++)
      {
        typeName = typeNames[j];
        var url = fl.wfs.url + "?" + $.param($.extend(params, {typeNames: typeName, bbox: bbox}));
        urls.push(url);
        fields_by_featuretype[typeName.toLowerCase()] = geodash.layers.aggregate_fields(fl);
        featurelayers_by_featuretype[typeName.toLowerCase()] = fl;
        if(!typeName.toLowerCase().startsWith("geonode:"))
        {
          featurelayers_by_featuretype["geonode:"+typeName.toLowerCase()] = fl;
        }
      }
    }
  }

  var featureAndLocation = undefined;
  if(featurelayers_geojson.length > 0)
  {
    featureAndLocation = map.forEachFeatureAtPixel(
      [args.pixel.x, args.pixel.y],
      function(feature, layer){
        return {
          'layer': layer.get('id'),
          'feature': geodash.normalize.feature(feature),
          'location': geodash.normalize.point(ol.proj.toLonLat(map.getCoordinateFromPixel([args.pixel.x, args.pixel.y]), map.getView().getProjection()))
        };
      },
      null,
      function(layer) {
        return $.inArray(layer.get('id'), featurelayers_geojson) != -1;
      }
    );
  }

  if(angular.isDefined(featureAndLocation))
  {
    $scope.$broadcast("openPopup", {
      'featureLayer': geodash.api.getFeatureLayer(featureAndLocation.layer),
      'feature': featureAndLocation.feature,
      'location': featureAndLocation.location
    });
  }
  else
  {
    if(urls.length > 0)
    {
      $q.all(geodash.http.build_promises($http, urls)).then(function(responses){
        var features = geodash.http.build_features(responses, fields_by_featuretype);
        console.log("Features: ", features);
        if(features.length > 0 )
        {
          var featureAndLocation = geodash.vecmath.getClosestFeatureAndLocation(features, targetLocation);
          var fl = featurelayers_by_featuretype[featureAndLocation.feature.featuretype] || featurelayers_by_featuretype["geonode:"+featureAndLocation.feature.featuretype];
          $scope.$broadcast("openPopup", {
            'featureLayer': fl,
            'feature': featureAndLocation.feature,
            'location': geodash.normalize.point(featureAndLocation.location)
          });
        }
        else
        {
          $("#popup").popover('destroy');
        }
      });
    }
    else
    {
      $("#popup").popover('destroy');
    }
  }
};

geodash.handlers["filterChanged"] = function($scope, $interpolate, $http, $q, event, args) {
  console.log('event', event);
  console.log('args', args);
  $scope.$apply(function () {
    $scope.state.filters[args["layer"]] = $.extend(
      $scope.state.filters[args["layer"]],
      args["filter"]);
    var url = buildPageURL($interpolate, $scope.map_config, $scope.state);
    if(url != undefined)
    {
      history.replaceState($scope.state, "", url);
    }
    $scope.refreshMap($scope.state);
  });
};

geodash.handlers["hideLayer"] = function($scope, $interpolate, $http, $q, event, args) {
    console.log('event', event);
    console.log('args', args);
    var $scope = geodash.api.getScope("geodash-main");
    var layer = args.layer;
    var i = $.inArray(layer, $scope.state.view.featurelayers);
    if(i != -1)
    {
      $scope.state.view.featurelayers.splice(i, 1);
      $scope.refreshMap($scope.state);
    }
};

geodash.handlers["hideLayers"] = function($scope, $interpolate, $http, $q, event, args) {
    console.log('event', event);
    console.log('args', args);
    var $scope = geodash.api.getScope("geodash-main");
    var layers = args.layers;
    for(var i = 0; i < layers.length; i++)
    {
      var layer = args.layers[i];
      var j = $.inArray(layer, $scope.state.view.featurelayers);
      if(j != -1)
      {
        $scope.state.view.featurelayers.splice(j, 1);
        $scope.refreshMap($scope.state);
      }
    }
};

geodash.handlers["layerLoaded"] = function($scope, $interpolate, $http, $q, event, args) {
    var $scope = geodash.api.getScope("geodash-main");
    var type = args.type;
    var layer = args.layer;
    var visible = args.visible != undefined ? args.visible : true;
    // $scope.state.view.featurelayers is hardcoded on load now
    /*if(type == "featurelayer")
    {
      if(visible)
      {
        $scope.state.view.featurelayers.push(layer);
      }
    }
    else if(type == "baselayer")
    {
      $scope.state.view.baselayer = layer;
    }*/
};

geodash.handlers["requestToggleComponent"] = function($scope, $interpolate, $http, $q, event, args) {
  geodash.api.getScope("geodash-main").$broadcast("toggleComponent", args);
};

geodash.handlers["selectStyle"] = function($scope, $interpolate, $http, $q, event, args) {
    console.log('event', event);
    console.log('args', args);
    $scope.$apply(function () {
        $scope.state.styles[args["layer"]] = args["style"];
        var url = buildPageURL($interpolate, $scope.map_config, $scope.state);
        if(url != undefined)
        {
          history.replaceState($scope.state, "", url);
        }
        $scope.refreshMap($scope.state);
    });
};

geodash.handlers["showLayer"] = function($scope, $interpolate, $http, $q, event, args) {
    console.log('event', event);
    console.log('args', args);
    var $scope = geodash.api.getScope("geodash-main");
    var layer = args.layer;
    if($.inArray(layer, $scope.state.view.featurelayers) == -1)
    {
      $scope.state.view.featurelayers.push(layer);
      $scope.refreshMap($scope.state);
    }
};

geodash.handlers["showLayers"] = function($scope, $interpolate, $http, $q, event, args) {
    console.log('event', event);
    console.log('args', args);
    var $scope = geodash.api.getScope("geodash-main");
    var layers = args.layers;
    for(var i = 0; i < layers.length; i++)
    {
      var layer = layers[i];
      if($.inArray(layer, $scope.state.view.featurelayers) == -1)
      {
        $scope.state.view.featurelayers.push(layer);
        $scope.refreshMap($scope.state);
      }
    }
};

geodash.handlers["stateChanged"] = function($scope, $interpolate, $http, $q, event, args) {
  console.log('event', event);
  console.log('args', args);
  $scope.$apply(function () {
    $scope.state = $.extend($scope.state, args);
    var url = buildPageURL($interpolate, $scope.map_config, $scope.state);
    if(url != undefined)
    {
      history.replaceState($scope.state, "", url);
    }
    $scope.refreshMap($scope.state);
  });
};

geodash.handlers["switchBaseLayer"] = function($scope, $interpolate, $http, $q, event, args) {
    console.log('event', event);
    console.log('args', args);
    var $scope = geodash.api.getScope("geodash-main");
    $scope.state.view.baselayer = args.layer;
    $scope.refreshMap($scope.state);
};

geodash.handlers["toggleComponent"] = function($scope, $interpolate, $http, $q, event, args) {
  console.log('event', event);
  console.log('args', args);
  //
  var component = args.component;
  var position = args.position;
  var classes = component+"-open "+component+"-"+position+"-open";
  $(args.selector).toggleClass(classes);
  setTimeout(function(){
    $scope.live["map"].updateSize();
  },2000);
};

geodash.handlers["viewChanged"] = function($scope, $interpolate, $http, $q, event, args) {
  console.log('event', event);
  console.log('args', args);
  $scope.state.view = $.extend($scope.state.view, args);
  var url = buildPageURL($interpolate, $scope.map_config, $scope.state);
  if(url != undefined)
  {
    history.replaceState($scope.state, "", url);
  }
};

geodash.handlers["zoomToLayer"] = function($scope, $interpolate, $http, $q, event, args) {
    var $scope = geodash.api.getScope("geodash-main");
    var layer = args.layer;
    var i = $.inArray(layer, $scope.state.view.featurelayers);
    if(i != -1)
    {
      $scope.$broadcast("changeView", {'layer': layer});
    }
};

geodash.directives["ngX"] = function(){
  return {
    scope: true,
    link: function ($scope, $element, attrs){
      $scope.$watch(attrs.ngX, function(value) {
        $element.attr('x', value);
      });
    }
  };
};
geodash.directives["ngY"] = function(){
  return {
    scope: true,
    link: function ($scope, $element, attrs){
      $scope.$watch(attrs.ngY, function(value) {
        $element.attr('y', value);
      });
    }
  };
};
geodash.directives["ngWidth"] = function(){
  return {
    scope: true,
    link: function ($scope, $element, attrs){
      $scope.$watch(attrs.ngWidth, function(value) {
        $element.attr('width', value);
      });
    }
  };
};
geodash.directives["ngR"] = function(){
  return {
    scope: true,
    link: function ($scope, $element, attrs){
      $scope.$watch(attrs.ngR, function(value) {
        $element.attr('r', value);
      });
    }
  };
};
geodash.directives["ngFill"] = function(){
  return {
    scope: true,
    link: function ($scope, $element, attrs){
      $scope.$watch(attrs.ngFill, function(value) {
        $element.attr('fill', value);
      });
    }
  };
};

geodash.directives["onLinkDone"] = function(){
  return {
    restriction: 'A',
    link: function($scope, element, attributes ) {
      $scope.$emit(attributes["onLinkDone"] || "link_done", {
        'element': element,
        'attributes': attributes
      });
    }
  };
};

geodash.directives["onRepeatDone"] = function(){
  return {
    restriction: 'A',
    link: function($scope, element, attributes ) {
      $scope.$emit(attributes["onRepeatDone"] || "repeat_done", {
        'element': element,
        'attributes': attributes
      });
    }
  };
};

geodash.directives["geodashBtnClose"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      'dismiss': '@target'
    },
    templateUrl: 'geodash_btn_close.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashBtnInfo"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      'placement': '@placement',
      'info': '@info'
    },
    templateUrl: 'geodash_btn_info.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashBtn"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      'mode': '@mode',
      'target': '@target',
      'info': '@info',
      'placement': '@tooltipPlacement'
    },
    templateUrl: 'geodash_btn.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashLabel"]= function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      'target': '@target',
      'content': '@content'
    },
    templateUrl: 'geodash_label.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashTab"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      'target': '@target',
      'label': '@label',
      'active': '@active',
      'height': '@height'
    },  // Inherit exact scope from parent controller
    templateUrl: 'geodash_tab.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashTabs"]= function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,
    templateUrl: 'geodash_tabs.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashModalLayerCarto"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'geodash_modal_layer_carto.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashModalLayerMore"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'geodash_modal_layer_more.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geodash.directives["geodashModalLayerConfig"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'geodash_modal_layer_config.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geodash.directives["geodashSymbolCircle"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      style: "=style"
    },
    templateUrl: 'symbol_circle.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geodash.directives["geodashSymbolEllipse"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      style: "=style"
    },
    templateUrl: 'symbol_ellipse.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geodash.directives["geodashSymbolGraduated"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      style: "=style",  // Text binding / one-way binding
      containerWidth: "@" // Text binding / one-way binding
    },
    templateUrl: 'symbol_graduated.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geodash.directives["geodashSymbolGraphic"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      style: "=style"
    },
    templateUrl: 'symbol_graduated.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geodash.directives["geodashLegendBaselayers"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'legend_baselayers.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geodash.directives["geodashLegendFeaturelayers"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'legend_featurelayers.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geodash.directives["geodashModalWelcome"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'geodash_modal_welcome.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashModalAbout"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'geodash_modal_about.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashModalDownload"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'geodash_modal_download.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashMapOverlays"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      'editable': '@editable'
    },
    templateUrl: 'map_overlays.tpl.html',
    link: function ($scope, element, attrs){

      $scope.map_config = $scope.$parent.map_config;
      $scope.map_config_flat = $scope.$parent.map_config_flat;

      $scope.style = function(type, overlay)
      {
        var styleMap = {};

        $.extend(styleMap,{
          "top": extract("position.top", overlay, 'auto'),
          "bottom": extract("position.bottom", overlay, 'auto'),
          "left": extract("position.left", overlay, 'auto'),
          "right": extract("position.right", overlay, 'auto'),
          "padding": extract("padding", overlay, '0'),
          "background": extract("background", overlay, 'transparent'),
          "opacity": extract("opacity", overlay, '1.0'),
          "width": extract("width", overlay, 'initial'),
          "height": extract("height", overlay, 'initial')
        });

        if(type == "text")
        {
          $.extend(styleMap, {
            "font-family": extract("text.font.family", overlay, 'Arial'),
            "font-size": extract("text.font.size", overlay, '12px'),
            "font-style": extract("text.font.style", overlay, 'normal'),
            "text-shadow": extract("text.shadow", overlay, 'none')
          });
        }
        else if(type == "image")
        {

        }
        return $.map(styleMap, function(value, style){
          return style+": "+value
        }).join(";") +";";
      };

      if(geodash.api.parseTrue($scope.editable))
      {
        $(element).on('mouseenter', '.geodash-map-overlay', function(event, args){
          $(this).draggable('enable');
          $('.geodash-map-grid').addClass('on');
        });

        $(element).on('mouseleave', '.geodash-map-overlay', function(event, args){
          $(this).draggable('disable');
          $('.geodash-map-grid').removeClass('on');
        });

        $scope.$on("overlayLoaded", function(event, args) {

          console.log("overlayLoaded", event, args);
          var overlayType = args.attributes.overlayType;
          var overlayElement = $(args.element);

          var container = overlayElement.parents(".geodash-map:first");

          if(overlayType == "text")
          {
            /*overlayElement.resizable({
              "containment": container,
              "helper": "ui-resizable-helper"
            });*/
          }
          else if(overlayType == "image")
          {
            //See: http://stackoverflow.com/questions/10703450/draggable-and-resizable-in-jqueryui-for-an-image-is-not-working
            /*$("img", overlayElement).resizable({
              "containment": container,
              "helper": "ui-resizable-helper"
            });*/
          }

          overlayElement.draggable({
            "containment": container,
            start: function(event, args) {
              // http://www.w3schools.com/cssref/pr_class_cursor.asp
              $(this).css('cursor', '-webkit-grabbing');
            },
            drag: function(event, args) {

            },
            stop: function(event, args) {
              // http://www.w3schools.com/cssref/pr_class_cursor.asp
              $(this).css('cursor', 'pointer');
              console.log(event, args);
              var newPosition = args.position;
              var overlayIndex = $(this).data('overlay-index');
              var scope = geodash.api.getScope("geodash-sidebar-right");
              if(scope != undefined)
              {
                var mapWidth = container.width();
                var mapHeight = container.height();

                scope.map_config_flat["overlays__"+overlayIndex+"__position__top"] = newPosition.top < (mapHeight / 2.0) ? newPosition.top+'px' : 'auto';
                scope.map_config_flat["overlays__"+overlayIndex+"__position__bottom"] = newPosition.top >= (mapHeight / 2.0) ? (mapHeight - newPosition.top)+'px' : 'auto';
                scope.map_config_flat["overlays__"+overlayIndex+"__position__left"] = newPosition.left < (mapWidth / 2.0) ? newPosition.left+'px' : 'auto';
                scope.map_config_flat["overlays__"+overlayIndex+"__position__right"] = newPosition.left >= (mapWidth / 2.0) ? (mapWidth - newPosition.left)+'px' : 'auto';

                setTimeout(function(){
                  scope.validateFields([
                    "overlays__"+overlayIndex+"__position__top",
                    "overlays__"+overlayIndex+"__position__bottom",
                    "overlays__"+overlayIndex+"__position__left",
                    "overlays__"+overlayIndex+"__position__right"
                  ])
                }, 0);
              }
            }
          });
        });

      }
    }
  };
};

geodash.directives["geodashSidebarToggleLeft"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      "selector": "@selector"
    },
    templateUrl: 'geodash_sidebar_toggle_left.tpl.html',
    link: function ($scope, $element, attrs){
      setTimeout(function(){

        $('[data-toggle="tooltip"]', $element).tooltip();

      },10);
    }
  };
};

geodash.directives["geodashSidebarToggleRight"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      "selector": "@selector"
    },
    templateUrl: 'geodash_sidebar_toggle_right.tpl.html',
    link: function ($scope, $element, attrs){
      setTimeout(function(){

        $('[data-toggle="tooltip"]', $element).tooltip();

      },10);
    }
  };
};

geodash.directives["sparcCalendar"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'sparc_calendar.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geodash.directives["sparcSidebar"] = function(){
  return {
    controller: geodash.controllers.SPARCControllerSidebar,
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    //scope: {},
    templateUrl: 'sparc_sidebar.tpl.html',
    link: function ($scope, element, attrs, controllers)
    {
      setTimeout(function(){

        var $interpolate = angular.element(document.body).injector().get('$interpolate');

        $('[data-toggle="tooltip"]', element).tooltip();

        geodash.init.typeahead(
          element,
          undefined,
          undefined,
          undefined,
          geodash.config.search.datasets,
          geodash.config.search.codecs
        );

        var jqe = $(element);
        if(Array.isArray($scope.ui.charts))
        {
          for(var i = 0; i < $scope.ui.charts.length; i++)
          {
            var chart = $scope.ui.charts[i];
            var chartOptions = {};
            sparc2.charts.buildHazardChart(chart, geodash.initial_data.layers.popatrisk, chartOptions);
          }
        }

        $(element).on('shown.bs.tab', 'a[data-toggle="tab"]', geodash.ui.update_tab);

        $(element).on('change', 'input:checkbox', function(event) {
          console.log(event);
          var that = this;
          var output = $(that).data('output');
          var filter = {};

          var btngroup = $(that).parents('.btn-group:first');
          var output = btngroup.data('output');
          if(filter[output] == undefined)
          {
            filter[output] = [];
          }
          btngroup.find('input').each(function(){
            if($(this).is(':checked'))
            {
              filter[output].push($(this).data('value'))
              $(this).parent('label').removeClass('btn-default').addClass('btn-primary');
            }
            else
            {
              $(this).parent('label').addClass('btn-default').removeClass('btn-primary');
            }
          });
          geodash.api.intend("filterChanged", {"layer": "popatrisk", "filter": filter}, $scope);
        });

        // Initialize Radio Filters
        $(element).on('change', 'input:radio[name="cat"]', function(event) {
          console.log(event);
          var output = $(this).data('output');
          var filter = {};
          filter[output] = this.value;
          geodash.api.intend("filterChanged", {"layer": "popatrisk", "filter": filter}, $scope);
        });

        // Initialize Slider Filters
        $(".geodash-filter-slider", $(element)).each(function(){

          var slider = $(this).find(".geodash-filter-slider-slider");
          var label = $(this).find(".geodash-filter-slider-label");

          var type = slider.data('type');
          var output = slider.data('output');

          if(type=="ordinal")
          {
            var range = slider.data('range');
            //var value = slider.data('value');
            var value = $scope.state["filters"]["popatrisk"][output];
            var options = slider.data('options');

            slider.data('label', label);
            geodash.ui.init_slider_label($interpolate, slider, type, range, value);
            geodash.ui.init_slider_slider($interpolate, $scope, slider, type, range, options.indexOf(value), 0, options.length - 1, 1);
          }
          else
          {
            var range = slider.data('range');
            //var value = slider.data('value');
            var minValue = geodash.normalize.float(slider.data('min-value'), 0);
            var step = slider.data('step');
            //var label_template = slider.data('label');

            if(($.type(range) == "boolean" && range ) || (range.toLowerCase() == "true"))
            {
              var maxValue = ($scope.maxValueFromSummary != undefined && slider.data('max-value') == "summary") ?
                  $scope.maxValueFromSummary :
                  geodash.normalize.float(slider.data('max-value'), undefined);
              //
              var values = $scope.state["filters"]["popatrisk"][output];
              values = geodash.assert.array_length(values, 2, [minValue, maxValue]);
              var values_n = [Math.floor(values[0]), Math.floor(values[1])];
              var min_n = Math.floor(minValue);
              var max_n = Math.floor(maxValue);
              var step_n = Math.floor(step);

              slider.data('label', label);
              geodash.ui.init_slider_label($interpolate, slider, type, range, values);
              geodash.ui.init_slider_slider($interpolate, $scope, slider, type, range, values_n, min_n, max_n, step_n);
              console.log(value_n, min_n, max_n, step_n, range);
            }
            else
            {
              var maxValue = geodash.normalize.float(slider.data('max-value'), undefined);
              var value = $scope.state["filters"]["popatrisk"][output];
              var value_n = Math.floor(value * 100);
              var min_n = Math.floor(minValue * 100);
              var max_n = Math.floor(maxValue * 100);
              var step_n = Math.floor(step * 100);

              slider.data('label', label);
              geodash.ui.init_slider_label($interpolate, slider, type, range, value);
              geodash.ui.init_slider_slider($interpolate, $scope, slider, type, range, values_n, min_n, max_n, step_n);
              console.log(value_n, min_n, max_n, step_n, range);
            }
          }

        });


      }, 10);
    }
  };
};

geodash.directives["sparcSidebarFeatureLayer"] = function(){
  return {
    controller: geodash.controllers.controller_sparc_sidebar,
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'sparc_sidebar_feature_layer.tpl.html',
    link: function ($scope, $element, attrs, controllers)
    {
      setTimeout(function(){

        var jqe = $($element);
        if($scope.charts != undefined)
        {
          for(var i = 0; i < $scope.charts.length; i++)
          {
            var options = {};
            /*if($scope.charts[i].hazard == "drought")
            {
              options["bullet_width"] = function(d, i)
              {
                if(d.id == "p6")
                {
                  return 6;
                }
                else if(d.id == "p8")
                {
                  return 8;
                }
                else
                {
                  return 16;
                }
              };
            }*/
            buildHazardChart($scope.charts[i], geodash.initial_data.layers.popatrisk, options);
          }
        }

      }, 10);
    }
  };
};

geodash.directives["geodashModalFilterMore"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'modal_filter_more.tpl.html',
    link: function ($scope, element, attrs, controllers){}
  };
};

geodash.directives["geodashFilterCheckbox"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'filter_checkbox.tpl.html',
    link: function ($scope, element, attrs, controllers){}
  };
};

geodash.directives["geodashFilterRadio"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'filter_radio.tpl.html',
    link: function ($scope, element, attrs, controllers){}
  };
};

geodash.directives["geodashFilterSlider"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'filter_slider.tpl.html',
    link: function ($scope, element, attrs, controllers){}
  };
};

geodash.directives["sparcModalWelcome"] = function(){
  return {
    controller: geodash.controllers.SPARCControllerModalWelcome,
    restrict: 'EA',
    replace: true,
    scope: {},
    templateUrl: 'sparc_modal_welcome.tpl.html',
    link: function ($scope, element, attrs){

      setTimeout(function(){

        //var datasets = [sparc2.typeahead.datasets, geodash.typeahead.datasets];
        //var codecs = [sparc2.bloodhound.codec, geodash.bloodhound.codec];

        geodash.init.typeahead(
          element,
          undefined,
          undefined,
          undefined,
          geodash.config.search.datasets,
          geodash.config.search.codecs
        );

        sparc2.api.welcome();

      }, 10);

    }
  };
};

geodash.controllers.GeoDashControllerBase = function(
  $scope, $element, $controller, $interpolate, $timeout,
  state, map_config, live)
{
  $scope.setValue = geodash.api.setValue;
  $scope.clearValue = geodash.api.clearValue;

  $scope.stack = {
    'head': undefined, //backtrace[0]
    'prev': undefined, //backtrace[1]
    'backtrace': [] // Full list to include states from other modals
  };

  $scope.clear_field = function(field_flat, field_index)
  {
    if(angular.isDefined(field_flat))
    {
      var fullpath_array = $scope.path_array.concat(field_flat.split("__"));
      $scope.clearValue(fullpath_array, $scope.workspace);
      $.each($scope.workspace_flat, function(key, value){
        if(key.startsWith(fullpath_array.join("__")))
        {
          delete $scope.workspace_flat[key];
          delete $scope.stack.head.workspace_flat[key];
        }
      });
    }
  };

  $scope.update_stack = function(backtrace)
  {
    if(angular.isDefined(backtrace))
    {
      $scope.stack.backtrace = geodash.api.deepCopy(backtrace);
    }
    if($scope.stack.backtrace.length >= 2)
    {
      $scope.stack.head = $scope.stack.backtrace[0];
      $scope.stack.prev = $scope.stack.backtrace[1];
    }
    else if($scope.stack.backtrace.length == 1)
    {
      $scope.stack.head = $scope.stack.backtrace[0];
      $scope.stack.prev = undefined;
    }
    else
    {
      $scope.stack.head = undefined;
      $scope.stack.prev = undefined;
    }
  };

  $scope.update_main = function(removed)
  {
    if(angular.isDefined($scope.stack.head))
    {
      if(angular.isDefined(removed))
      {
        if($scope.stack.head.modal == removed.modal)
        {
          $.each($scope.stack.head, function(key, value){ $scope[key] = value;});
        }
      }
      else
      {
        $.each($scope.stack.head, function(key, value){ $scope[key] = value;});
      }
    }
  };

  $scope.expand = function(x)
  {
    if(angular.isDefined(x))
    {
      if(angular.isDefined(x.schemapath))
      {
        x.schemapath_flat = x.schemapath.replace(new RegExp("\\.", "gi"), "__");
        x.schemapath_array = x.schemapath.split(".");
      }

      if(angular.isDefined(x.basepath))
      {
        x.basepath_array = x.basepath.split(".");
        if(angular.isDefined(x.schemapath))
        {
          x.object_fields = extract(x.schemapath_array.concat(["schema", "fields"]), x.schema, []);
        }
        else
        {
          x.object_fields = extract(x.basepath_array.concat(["schema", "fields"]), x.schema, []);
        }
        if(angular.isDefined(x.objectIndex))
        {
          x.path = x.basepath + "." + x.objectIndex;
          x.path_flat = x.path.replace(new RegExp("\\.", "gi"), "__");
          x.path_array = x.basepath_array.concat([x.objectIndex]);
        }
        else
        {
          x.path = x.basepath;
          x.path_flat = x.path.replace(new RegExp("\\.", "gi"), "__");
          x.path_array = x.path.length > 0 ? x.path.split(".") : [];
        }
      }
      else if(angular.isDefined(x.path))
      {
        x.path_flat = x.path.replace(new RegExp("\\.", "gi"), "__");
        x.path_array = x.path.length > 0 ? x.path.split(".") : [];
      }
      else if(angular.isDefined(x.objectIndex))
      {
        x.basepath_array = []
        x.path = x.objectIndex;
        x.path_flat = x.path.replace(new RegExp("\\.", "gi"), "__");
        x.path_array = [x.objectIndex];
      }

      if(angular.isDefined(x.workspace))
      {
        x.workspace_flat = geodash.api.flatten(x.workspace);
      }

      if(angular.isDefined(x.schema))
      {
        x.schema_flat = geodash.api.flatten(x.schema);
      }
    }
    return x;
  };

  $scope.api = function(name)
  {
    if(angular.isDefined($scope.workspace))
    {
      var slug = geodash.api.getScope('geodash-main')['state']['slug'];
      if(angular.isString(slug) && slug.length > 0)
      {
        var template = geodash.api.getEndpoint(name);
        if(template != undefined)
        {
          return $interpolate(template)({ 'slug': slug });
        }
      }
      else
      {
        return "#";
      }
    }
    else
    {
      return "#";
    }
  };

  $scope.push = function(x, backtrace)
  {
    $scope.clear(); // Clean Old Values
    x = $scope.expand(x)
    $scope.update_stack([x].concat(backtrace || $scope.stack.backtrace));
    $.each($scope.stack.head, function(key, value){ $scope[key] = value; });
    $scope.update_breadcrumbs();
  };

  $scope.update_breadcrumbs = function()
  {
    var breadcrumbs = [];
    if(angular.isDefined(extract('stack.backtrace', $scope)))
    {
      for(var i = $scope.stack.backtrace.length - 1; i >= 0; i--)
      {
        var x = $scope.stack.backtrace[i];
        if(angular.isDefined(x.objectIndex))
        {
          var obj = extract(x.path_array, x.workspace);
          var content = extract('title', obj) || extract('id', obj) || x.objectIndex;
          var link = "#";
          var bc = {'content': content, 'link': link};
          breadcrumbs.push(bc);
        }
        else
        {
          var keyChain = x.schemapath_array || x.basepath_array;
          if(angular.isDefined(keyChain))
          {
            var f = extract(keyChain, x.schema);
            if(angular.isDefined(f))
            {
              var t = extract("type", f);
              var content = undefined;
              var link = "#";
              if(t == "object")
              {
                content = extract("schema.verbose_singular", f) || extract("label", f);
              }
              else if(t == "objectarray" || t == "stringarray" || t == "textarray" || t == "templatearray")
              {
                content = extract("schema.verbose_plural", f) || extract("label", f);
              }
              else
              {
                content = extract("label", f);
              }
              var bc = {'content': content, 'link': link};
              breadcrumbs.push(bc);
            }
          }
        }
      }
      $scope.breadcrumbs = breadcrumbs;
    }
    return breadcrumbs;
  };

  $scope.update_ui = function(removed, backtrace)
  {
    if(angular.isDefined($scope.stack.head))
    {
      if(angular.isDefined($scope.stack.head.modal))
      {
        if($scope.stack.head.modal == removed.modal)
        {
          $scope.update_breadcrumbs();
          $timeout(function(){ geodash.ui.update($scope.stack.head.modal); },0);
        }
        else
        {
          var oldModal = removed.modal;
          var newModal = $scope.stack.head.modal;
          $("#"+oldModal).modal('hide');
          $("#"+newModal).modal({'backdrop': 'static', 'keyboard':false});
          //var newScope = geodash.api.getScope(newModal);
          // newScope.clear(); Should have already happened in clear_all
          $timeout(function(){
            var newScope = geodash.api.getScope(newModal);
            newScope.update_stack(backtrace);
            $.each(newScope.stack.head, function(key, value){ newScope[key] = value;});
            newScope.update_breadcrumbs();
            $("#"+newModal).modal('show');
            $timeout(function(){ geodash.ui.update(newModal); },0);
          },0);
        }
      }
      else
      {
        var oldModal = removed.modal;
        $("#"+oldModal).modal('hide');
      }
    }
    else
    {
      $("#"+removed.modal).modal('hide');
    }
  };


  $scope.clear = function()
  {
    $scope.clear_all(1);
  };

  $scope.clear_all = function(count)
  {
    var backtrace = $scope.stack.backtrace;
    if(backtrace.length > 0)
    {
      var clear_array = [
        "workspace", "workspace_flat",
        "schema", "schema_flat",
        "basepath", "basepath_flat", "basepath_array",
        "schemapath", "schemapath_flat", "schemapath_array",
        "objectIndex",
        "path", "path_flat", "path_array",
        "breadcrumbs"];
      var scopes = {};
      var s = undefined;
      for(var i = 0; i < count && i < backtrace.length; i++)
      {
        var x = backtrace[i];
        if(angular.isUndefined(s))
        {
          var m = extract('modal', x);
          s = angular.isDefined(m) ? geodash.api.getScope(m) : $scope;
        }
        $.each(x, function(key, value){ s[key] = undefined; });
        $.each(clear_array, function(index, value){ s[value] = undefined; });
      }
    }
  };


  $scope.includeTypeaheadForField = function(field)
  {
    var include = false;
    if(angular.isDefined(field))
    {
      if(extract("options", field, []).length > 0)
      {
        include = true;
      }
      else if(angular.isDefined(extract("search.local", field)))
      {
        if(angular.isString(extract("search.local", field)))
        {
          if(extract("search.local", field).length > 0)
          {
            include = true;
          }
        }
        else if(angular.isString(extract("search.local.name", field)))
        {
          include = true;
        }
      }
      else if(angular.isDefined(extract("search.remote", field, undefined)))
      {
        include = true;
      }
    }
    return include;
  };

  $scope.localDataForSearch = function(x)
  {
    var localData = "";

    if(! angular.isDefined(x))
    {
      x = extract($scope.schemapath, $scope.schema, undefined);
    }

    if(angular.isDefined(x))
    {
      localData = extract("options", x, "");

      if(localData.length == 0)
      {
        localData = extract("search.local", x, "");
      }

    }
    return localData;
  };
  $scope.remoteDataForSearch = function(x)
  {
    var data = "";

    if(! angular.isDefined(x))
    {
      x = extract($scope.schemapath, $scope.schema, undefined);
    }

    if(angular.isDefined(x))
    {
      data = extract("search.remote", x, {});
    }

    return data;
  };
  $scope.initialValueForSearch = function(x)
  {
    var data = "";

    if(! angular.isDefined(x))
    {
      x = extract($scope.schemapath, $scope.schema, undefined);
    }

    if(angular.isDefined(x))
    {
      data = extract("search.initial", x, {});
    }

    return data;
  };
  $scope.outputForSearch = function()
  {
    var data = "";
    var schema = extract($scope.schemapath, $scope.schema, undefined);
    if(angular.isDefined(schema))
    {
      data = extract("search.output", schema, "");
    }
    return data;
  };
  $scope.datasetsForSearch = function()
  {
    var data = "";
    var schema = extract($scope.schemapath, $scope.schema, undefined);
    if(angular.isDefined(schema))
    {
      data = extract("search.datasets", schema, "");
    }
    return data;
  };
};

geodash.controllers.GeoDashControllerModal = function(
  $scope, $element, $controller, $interpolate, $timeout,
  state, map_config, live)
{
  angular.extend(this, $controller('GeoDashControllerBase', {$element: $element, $scope: $scope}));

  $scope.showOptions = geodash.ui.showOptions;

  $scope.stack = {
    'head': undefined, //backtrace[0]
    'prev': undefined, //backtrace[1]
    'backtrace': [] // Full list to include states from other modals
  };

  $scope.showModal = function(x)
  {
    if(angular.isString(x))
    {
      return x != "";
    }
    else if(angular.isNumber(x))
    {
      return x >= 0;
    }
    else
    {
      return true;
    }
  };

  $scope.edit_field = function(field_id, field_index)
  {
    var schemapath = $scope.stack.head.path;
    if(angular.isDefined($scope.stack.head.schemapath_array) && angular.isDefined(field_index))
    {
      schemapath = $scope.stack.head.schemapath + ".schema.fields."+field_index;
    }
    var x = {
      'modal': 'geodash-modal-edit-field',
      'prev': $scope.stack.head.modal,
      'workspace': $scope.stack.head.workspace,
      'schema': $scope.stack.head.schema,
      'basepath': $scope.stack.head.path,
      'schemapath': schemapath,
      'objectIndex': field_id
    };
    console.log('New X:');
    console.log(x);

    if($scope.stack.head.modal == x.modal)
    {
      // https://groups.google.com/forum/#!search/string$20input$20ng-repeat%7Csort:relevance/angular/VD77QR1J6uQ/sh-9HNkZu4IJ
      $scope.clear();
      $timeout(function(){$scope.push(x);},0);
    }
    else
    {
      $("#"+$scope.stack.head.modal).modal('hide');
      geodash.api.getScope(x.modal).push(x, $scope.stack.backtrace);
      $("#"+x.modal).modal({'backdrop': 'static','keyboard':false});
      $("#"+x.modal).modal('show');
      $timeout(function(){ geodash.ui.update(x.modal); },0);
    }

  };

  $scope.pop = function()
  {
    var removed = $scope.stack.backtrace.shift();
    $scope.update_stack();
    $scope.update_main(removed);
    $scope.update_ui(removed, $scope.stack.backtrace);
  };


  $scope.rollback_all = function(index)
  {
    var count = $scope.stack.backtrace.length;
    $scope.clear_all(count);
    $timeout(function(){
      var removed = $scope.stack.backtrace[0];
      $scope.update_stack($scope.stack.backtrace.slice(count));
      $scope.update_main(removed);
      $scope.update_ui(removed, $scope.stack.backtrace);
    },0);
  }
  $scope.rollback = function(index)
  {
    var count = undefined;
    if(angular.isNumber(index))
    {
      count = $scope.stack.backtrace.length - index - 1;
    }
    else
    {
      count = 1;
    }
    $scope.clear_all(count);
    $timeout(function(){
      var removed = $scope.stack.backtrace[0];
      $scope.update_stack($scope.stack.backtrace.slice(count));
      $scope.update_main(removed);
      $scope.update_ui(removed, $scope.stack.backtrace);
    },0);
  };

  $scope.go_back = function()
  {
    $scope.clear();
    $timeout(function(){$scope.pop();},0);
  };

  $scope.add_object = function(field_id)
  {
    //var value = extract($scope.stack.head.path, $scope.stack.head.workspace);
    //var length = angular.isDefined(value) ? value.length : 0;
    $scope.edit_object(extractArrayLength($scope.stack.head.path, $scope.stack.head.workspace, 0));
  };

  $scope.search_object = function()
  {
    var field_id = extractArrayLength($scope.stack.head.path, $scope.stack.head.workspace, 0)
    var field_index = undefined;
    /////////////
    var schemapath = $scope.stack.head.schemapath || $scope.stack.head.path;
    if(angular.isDefined($scope.stack.head.schemapath) && angular.isDefined(field_index))
    {
      schemapath = $scope.stack.head.schemapath + ".schema.fields."+field_index;
    }
    var x = {
      'modal': 'geodash-modal-search-object',
      'prev': $scope.stack.head.modal,
      'workspace': $scope.stack.head.workspace,
      'schema': $scope.stack.head.schema,
      'basepath': $scope.stack.head.path,
      'schemapath': schemapath,
      'objectIndex': field_id
    };
    console.log('New X:');
    console.log(x);

    if($scope.stack.head.modal == x.modal)
    {
      // https://groups.google.com/forum/#!search/string$20input$20ng-repeat%7Csort:relevance/angular/VD77QR1J6uQ/sh-9HNkZu4IJ
      $scope.clear();
      $timeout(function(){
        $scope.push(x);
        $timeout(function(){ geodash.ui.update(x.modal); },0);
      },0);
    }
    else
    {
      $("#"+$scope.stack.head.modal).modal('hide');
      var targetScope = geodash.api.getScope(x.modal);
      var backtrace = $scope.stack.backtrace;
      targetScope.clear();
      $timeout(function(){
        targetScope.push(x, backtrace);
        var m = $("#"+x.modal);
        m.modal({'backdrop': 'static','keyboard':false});
        m.modal('show');
        $timeout(function(){ geodash.ui.update(x.modal); },0);
      },0);
    }
  };

  $scope.edit_object = function(field_id, field_index)
  {
    var schemapath = $scope.stack.head.schemapath || $scope.stack.head.path;
    if(angular.isDefined($scope.stack.head.schemapath) && angular.isDefined(field_index))
    {
      schemapath = $scope.stack.head.schemapath + ".schema.fields."+field_index;
    }
    var x = {
      'modal': 'geodash-modal-edit-object',
      'prev': $scope.stack.head.modal,
      'workspace': $scope.stack.head.workspace,
      'schema': $scope.stack.head.schema,
      'basepath': $scope.stack.head.path,
      'schemapath': schemapath,
      'objectIndex': field_id
    };
    console.log('New X:');
    console.log(x);

    if($scope.stack.head.modal == x.modal)
    {
      // https://groups.google.com/forum/#!search/string$20input$20ng-repeat%7Csort:relevance/angular/VD77QR1J6uQ/sh-9HNkZu4IJ
      $scope.clear();
      $timeout(function(){
        $scope.push(x);
        $timeout(function(){ geodash.ui.update(x.modal); },0);
      },0);
    }
    else
    {
      $("#"+$scope.stack.head.modal).modal('hide');
      var targetScope = geodash.api.getScope(x.modal);
      var backtrace = $scope.stack.backtrace;
      targetScope.clear();
      $timeout(function(){
        targetScope.push(x, backtrace);
        var m = $("#"+x.modal);
        m.modal({'backdrop': 'static','keyboard':false});
        m.modal('show');
        $timeout(function(){ geodash.ui.update(x.modal); },0);
      },0);
    }
  };

  $scope.save_object = function()
  {
    var workspace = $scope.workspace;
    var workspace_flat = $scope.workspace_flat;
    $scope.clear_all(2);
    $timeout(function(){
      // By using $timeout, we're sure the template was reset (after we called $scope.clear)
      //var ret = $scope.stack.list.shift();
      var saved = $scope.stack.backtrace.shift();
      if($scope.stack.backtrace.length > 0)
      {
        var backtrace = $scope.stack.backtrace;
        backtrace[0]['workspace'] = workspace;
        backtrace[0]['workspace_flat'] = workspace_flat;
        $scope.update_stack(backtrace);
        if($scope.stack.head.modal == saved.modal)
        {
          $.each($scope.stack.head, function(key, value){ $scope[key] = value;});
          $scope.workspace = $scope.stack.head.workspace = workspace;
          $scope.workspace_flat = $scope.stack.head.workspace_flat = workspace_flat;
          $scope.update_breadcrumbs();
        }
        else
        {
          var oldModal = saved.modal;
          var newModal = $scope.stack.head.modal;
          $("#"+oldModal).modal('hide');
          $("#"+newModal).modal({'backdrop': 'static', 'keyboard':false});
          $timeout(function(){
            var newScope = geodash.api.getScope(newModal);
            newScope.update_stack(backtrace);
            $.each(newScope.stack.head, function(key, value){ newScope[key] = value;});
            newScope.update_breadcrumbs();
            $("#"+newModal).modal('show');
            $timeout(function(){ geodash.ui.update(newModal); },0);
          },0);
        }
      }
      else
      {
        var targetScope = geodash.api.getScope("geodash-sidebar-right");
        targetScope.workspace = workspace;
        targetScope.workspace_flat = workspace_flat;
        $("#"+saved.modal).modal('hide');
      }
    },0);
  };

  $scope.modal_title = function()
  {
    var breadcrumbs = [];
    for(var i = $scope.stack.backtrace.length - 1; i >= 0; i--)
    {
      var x = $scope.stack.backtrace[i];
      if(angular.isDefined(x.objectIndex))
      {
        var obj = extract(x.path_array, x.workspace);
        breadcrumbs.push(extract('title', obj) || extract('id', obj) || x.objectIndex);
      }
      else
      {
        var f = extract(x.schemapath_array || x.basepath_array, x.schema);
        if(angular.isDefined(f))
        {
          var t = extract("type", f);
          if(t == "object")
          {
            breadcrumbs.push(extract("schema.verbose_singular", f) || extract("label", f));
          }
          else if(t == "objectarray" || t == "stringarray" || t == "textarray" || t == "templatearray")
          {
            breadcrumbs.push(extract("schema.verbose_plural", f) || extract("label", f));
          }
          else
          {
            breadcrumbs.push(extract("label", f));
          }
        }
      }
    }
    return "Edit / " + breadcrumbs.join(" / ");
  };

  $scope.back_label = function()
  {
    var label = "Cancel";
    if(angular.isDefined($scope.stack.head) && $scope.stack.backtrace.length > 1)
    {
      var x = $scope.stack.backtrace[1];
      var t = extract((x.schemapath_array || x.basepath_array), x.schema);
      if(t.type == "objectarray" && angular.isNumber($scope.stack.head.objectIndex))
      {
        label = "Back to "+(extract("schema.verbose_plural", t) || extract("label", t));
      }
      else
      {
        label = "Back to "+(extract("schema.verbose_singular", t) || extract("label", t));
      }
    }
    return label;
  };

  $scope.save_label = function()
  {
    var label = "";
    if(angular.isDefined($scope.stack.head))
    {
      var x = $scope.stack.head;
      var t = extract((x.schemapath_array || x.basepath_array), x.schema);
      if(t.type == "objectarray" && (! angular.isDefined($scope.stack.head.objectIndex)))
      {
        label = "Save "+(extract("schema.verbose_plural", t) || extract("label", t) || "Object");
      }
      else
      {
        label = "Save "+(extract("schema.verbose_singular", t) || "Object");
      }
    }
    else
    {
      label = "Save";
    }
    return label;
  };
};

geodash.controllers["controller_legend"] = function(
  $scope,
  $element,
  $controller,
  state,
  map_config,
  live)
{
  angular.extend(this, $controller('GeoDashControllerBase', {$element: $element, $scope: $scope}));
  //
  $scope.map_config = map_config;
  $scope.state = state;
  //////////////
  // Watch

  $scope.html5data = function()
  {
    var args = arguments;
    var zero_lc = args[0].toLowerCase();
    if(zero_lc == "togglemodal")
    {
      var id = args[1];
      var layerType = args[2];
      var layer = args[3];
      return {
        "id": args[1],
        "static": {
          "layerID": layer.id,
        },
        "dynamic" : {
          "layer": [layerType, layer.id]
        }
      };
    }
    else
    {
      return "";
    }
  };

  $scope.updateVariables = function(){
    var arrayFilter = $scope.map_config.legendlayers;

    if("baselayers" in $scope.map_config && $scope.map_config.baselayers != undefined)
    {
      var baselayers = $.grep($scope.map_config.baselayers,function(x, i){ return $.inArray(x["id"], arrayFilter) != -1; });
      baselayers.sort(function(a, b){ return $.inArray(a["id"], arrayFilter) - $.inArray(b["id"], arrayFilter); });
      $scope.baselayers = baselayers;
    }
    else
    {
      $scope.baselayers = [];
    }

    if("featurelayers" in $scope.map_config && $scope.map_config.featurelayers != undefined)
    {
      //var featurelayers = $.map($scope.map_config.featurelayers, function(item, key){ return {'key': key, 'item': item}; });
      var featurelayers = $.grep($scope.map_config.featurelayers,function(x, i){ return $.inArray(x["id"], arrayFilter) != -1; });
      featurelayers.sort(function(a, b){ return $.inArray(a["id"], arrayFilter) - $.inArray(b["id"], arrayFilter); });
      $scope.featurelayers = featurelayers;
    }
    else
    {
      $scope.featurelayers = [];
    }

  };
  $scope.updateVariables();
  $scope.$watch('map_config.featurelayers', $scope.updateVariables);
  $scope.$watch('map_config.legendlayers', $scope.updateVariables);
  $scope.$watch('state', $scope.updateVariables);
  //////////////
  var jqe = $($element);

  $scope.$on("refreshMap", function(event, args){
    console.log('args: ', args);

    $scope.state = args.state;
    /*
    $scope.$apply(function()
    {
      $scope.state = args.state;
    });*/

  });
};

geodash.controllers["SPARCControllerCalendar"] = function(
  $scope,
  $element,
  $controller,
  $interpolate,
  state,
  map_config,
  live)
{
  angular.extend(this, $controller('GeoDashControllerBase', {$element: $element, $scope: $scope}));

  $scope.state = state;
  $scope.months = MONTHS_ALL;

  $scope.$on("refreshMap", function(event, args){
    if("state" in args)
    {
      $scope.state = args["state"];
    }
  });

  $scope.linkForMonth = function(month)
  {
    return $interpolate(geodash.api.getPage("countryhazardmonthdetail"))({ state: $scope.state, month: month });
  };
};

var highlightFeature = function(e){
  var layer = e.target;
  /*if("hoverStyle" in layer.options && layer.options.hoverStyle != undefined)
  {
    var newStyle = layer.options.hoverStyle;
    layer.setStyle(newStyle);
    if (!L.Browser.ie && !L.Browser.opera){
      layer.bringToFront();
    }
  }*/
};

geodash.controllers["controller_map_map"] = function(
  $rootScope, $scope, $element, $controller,
  $http, $q,
  $compile, $interpolate, $templateCache, $timeout,
  state, map_config, live) {
  //////////////////////////////////////
  angular.extend(this, $controller("GeoDashControllerBase", {$element: $element, $scope: $scope}));

  $scope.processEvent = function(event, args)
  {
    var c = $.grep(geodash.meta.controllers, function(x, i){
      return x['name'] == 'controller_map_map';
    })[0];

    for(var i = 0; i < c.handlers.length; i++)
    {
      if(c.handlers[i]['event'] == event.name)
      {
        geodash.handlers[c.handlers[i]['handler']]($scope, $interpolate, $http, $q, event, args);
      }
    }
  };

  var c = $.grep(geodash.meta.controllers, function(x, i){
    return x['name'] == 'controller_map_map';
  })[0];
  for(var i = 0; i < c.handlers.length; i++)
  {
    $scope.$on(c.handlers[i]['event'], $scope.processEvent);
  }
  //////////////////////////////////////
  var listeners =
  {
    singleclick: function(e) {
      var m = geodash.var.map;
      var v = m.getView();
      var c = ol.proj.toLonLat(e.coordinate, v.getProjection());
      var delta = {
        "location": {
          "lat": c[1],
          "lon": c[0]
        },
        "pixel": {
          "x": e.pixel[0],
          "y": e.pixel[1]
        }
      };
      geodash.api.intend("clickedOnMap", delta, $scope);
      if(geodash.mapping_library == "ol3")
      {
        //$("#popup").popover('destroy');
      }
    },
    zoomend: function(e){
      var m = geodash.var.map;
      var v = m.getView();
      var c = v.getCenter();
      var delta = {
        "extent": v.calculateExtent(m.getSize()).join(","),
        "z": v.getZoom()
      };
      geodash.api.intend("viewChanged", delta, $scope);
      if(geodash.mapping_library == "ol3")
      {
        $("#popup").popover('destroy');
      }
    },
    dragend: function(e){
      var m = geodash.var.map;
      var v = m.getView();
      var c = v.getCenter();
      var delta = {
        "extent": v.calculateExtent(m.getSize()).join(","),
        "location": {
          "lat": c[1],
          "lon": c[0]
        }
      };
      geodash.api.intend("viewChanged", delta, $scope);
    },
    moveend: function(e){
      var m = geodash.var.map;
      var v = m.getView();
      var c = v.getCenter();
      var delta = {
        "extent": v.calculateExtent(m.getSize()).join(","),
        "location": {
          "lat": c[1],
          "lon": c[0]
        },
      };
      geodash.api.intend("viewChanged", delta, $scope);
    }
  };
  //////////////////////////////////////
  // The Map
  var hasViewOverride = hasHashValue(["latitude", "lat", "longitude", "lon", "lng", "zoom", "z"]);
  var view = state["view"];
  geodash.var.map = geodash.init.map_ol3({
    "attributionControl": extract(expand("controls.attribution"), map_config, true),
    "zoomControl": extract(expand("controls.zoom"), map_config, true),
    "minZoom": extract(expand("view.minZoom"), map_config, 0),
    "maxZoom": extract(expand("view.maxZoom"), map_config, 18),
    "lat": extract(expand("view.latitude"), map_config, 0),
    "lon": extract(expand("view.longitude"), map_config, 0),
    "z": extract(expand("view.zoom"), map_config, 3),
    "listeners": listeners
  });
  //////////////////////////////////////
  // Base Layers
  var baseLayers = geodash.layers.init_baselayers_ol3(geodash.var.map, map_config["baselayers"]);
  $.extend(geodash.var.baselayers, baseLayers);
  // Load Default/Initial Base Layer
  var baseLayerID = map_config["view"]["baselayer"] || map_config["baselayers"][0].id;
  geodash.var.map.addLayer(geodash.var.baselayers[baseLayerID]);
  geodash.api.intend("viewChanged", {'baselayer': baseLayerID}, $scope);
  geodash.api.intend("layerLoaded", {'type':'baselayer', 'layer': baseLayerID}, $scope);
  //////////////////////////////////////
  // Feature Layers
  if(angular.isArray(extract("featurelayers", map_config)))
  {
    for(var i = 0; i < map_config.featurelayers.length; i++)
    {
      var fl = map_config.featurelayers[i];
      geodash.layers.init_featurelayer(fl.id, fl, $scope, live, map_config, state);
    }
  }
  $timeout(function(){
    var loadedFeatureLayers = $.grep(state.view.featurelayers, function(layerID){
      var y = extract(layerID, geodash.var.featurelayers);
      return angular.isDefined(y) && (y instanceof ol.layer.Vector);
    });
    var fitLayers = $.map(loadedFeatureLayers, function(layerID){ return geodash.var.featurelayers[layerID]; });
    var newExtent = ol.extent.createEmpty();
    fitLayers.forEach(function(layer){ ol.extent.extend(newExtent, layer.getSource().getExtent()); });
    var v = geodash.var.map.getView();
    geodash.var.map.beforeRender(ol.animation.pan({ duration: 500, source: v.getCenter() }));
    v.fit(newExtent, geodash.var.map.getSize());
  }, 2000);
  //////////////////////////////////////
  $scope.$on("refreshMap", function(event, args) {
    // Forces Refresh
    console.log("Refreshing map...");
    // Update Visibility
    var visibleBaseLayer = args.state.view.baselayer;
    var currentLayers = geodash.mapping_library == "ol3" ? geodash.var.map.getLayers().getArray() : undefined;
    $.each(geodash.var.baselayers, function(id, layer) {
      var visible = id == visibleBaseLayer;
      if(geodash.mapping_library == "ol3")
      {
        if($.inArray(layer, currentLayers) != -1 && !visible)
        {
          geodash.var.map.removeLayer(layer)
        }
        else if($.inArray(layer, currentLayers) == -1 && visible)
        {
          geodash.var.map.addLayer(layer)
        }
      }
      else
      {
        if(geodash.var.map.hasLayer(layer) && !visible)
        {
          geodash.var.map.removeLayer(layer)
        }
        else if((! geodash.var.map.hasLayer(layer)) && visible)
        {
          geodash.var.map.addLayer(layer)
        }
      }
    });
    var visibleFeatureLayers = args.state.view.featurelayers;
    $.each(geodash.var.featurelayers, function(id, layer) {
      var visible = $.inArray(id, visibleFeatureLayers) != -1;
      if(geodash.mapping_library == "ol3")
      {
        if($.inArray(layer, currentLayers) != -1 && !visible)
        {
          geodash.var.map.removeLayer(layer)
        }
        else if($.inArray(layer, currentLayers) == -1 && visible)
        {
          geodash.var.map.addLayer(layer)
        }
      }
      else
      {
        if(geodash.var.map.hasLayer(layer) && !visible)
        {
          geodash.var.map.removeLayer(layer)
        }
        else if((! geodash.var.map.hasLayer(layer)) && visible)
        {
          geodash.var.map.addLayer(layer)
        }
      }
    });
    // Update Render Order
    var renderLayers = $.grep(layersAsArray(geodash.var.featurelayers), function(layer){ return $.inArray(layer["id"], visibleFeatureLayers) != -1;});
    var renderLayersSorted = sortLayers($.map(renderLayers, function(layer, i){return layer["layer"];}),true);
    var baseLayersAsArray = $.map(geodash.var.baselayers, function(layer, id){return {'id':id,'layer':layer};});
    var baseLayers = $.map(
      $.grep(layersAsArray(geodash.var.baselayers), function(layer){return layer["id"] == visibleBaseLayer;}),
      function(layer, i){return layer["layer"];});
    updateRenderOrder(baseLayers.concat(renderLayersSorted));
    // Force Refresh
    if(geodash.mapping_library == "ol3")
    {
      setTimeout(function(){

        var m = geodash.var.map;
        m.renderer_.dispose();
        m.renderer_ = new ol.renderer.canvas.Map(m.viewport_, m);
        //m.updateSize();
        m.renderSync();

      }, 0);
    }
    else if(geodash.mapping_library == "leaflet")
    {
      setTimeout(function(){ geodash.var.map._onResize(); }, 0);
    }
  });

  $scope.$on("changeView", function(event, args) {
    console.log("Refreshing map...");
    if(args["layer"] != undefined)
    {
      geodash.var.map.fitBounds(geodash.var.featurelayers[args["layer"]].getBounds());
    }
  });

  $scope.$on("openPopup", function(event, args) {
    console.log("Opening popup...");
    if(
      args["featureLayer"] != undefined &&
      args["feature"] != undefined &&
      args["location"] != undefined)
    {
      geodash.popup.openPopup(
        $interpolate,
        args["featureLayer"],
        args["feature"],
        args["location"],
        geodash.var.map,
        angular.element("#geodash-main").scope().state);
    }
  });
};

geodash.controllers["SPARCControllerSidebar"] = function($scope, $element, $controller, $timeout, state, map_config, live)
{
  angular.extend(this, $controller('GeoDashControllerBase', {$element: $element, $scope: $scope}));
  //
  $scope.html5data = sparc2.api.html5data;
  $scope.ui = map_config.sidebar.ui;
  $scope.showOptions = geodash.ui.showOptions;

  $scope.maxValueFromSummary = geodash.initial_data.layers.popatrisk["data"]["summary"]["all"]["max"]["at_admin2_month"];

  $scope.updateVariables = function(){

    if("baselayers" in $scope.map_config && $scope.map_config.baselayers != undefined)
    {
      var baselayers = $.grep($scope.map_config.baselayers,function(x, i){ return $.inArray(x["id"], $scope.ui.layers) != -1; });
      baselayers.sort(function(a, b){ return $.inArray(a["id"], $scope.ui.layers) - $.inArray(b["id"], $scope.ui.layers); });
      $scope.baselayers = baselayers;
    }
    else
    {
      $scope.baselayers = [];
    }

    if("featurelayers" in $scope.map_config && $scope.map_config.featurelayers != undefined)
    {
      var featurelayers = $.grep($scope.map_config.featurelayers,function(x, i){ return $.inArray(x["id"], $scope.ui.layers) != -1; });
      featurelayers.sort(function(a, b){ return $.inArray(a["id"], $scope.ui.layers) - $.inArray(b["id"], $scope.ui.layers); });
      $scope.featurelayers = featurelayers;

      var visiblefeaturelayers = $.grep($scope.map_config.featurelayers,function(x, i){
        return $.inArray(x["id"], $scope.ui.layers) != -1 &&
          $.inArray(x["id"], $scope.state.view.featurelayers) != -1;
      });
      visiblefeaturelayers.sort(function(a, b){ return $.inArray(a["id"], $scope.state.view.featurelayers) - $.inArray(b["id"], $scope.state.view.featurelayers); });
      $scope.visiblefeaturelayers = visiblefeaturelayers;

      var featureLayersWithFilters = $.grep($scope.map_config.featurelayers, function(x, i){
        var filters = extract("filters", x);
        return Array.isArray(filters) && filters.length > 0;
      });
      featureLayersWithFilters.sort(function(a, b){
        var textA = a.title.toUpperCase();
        var textB = b.title.toUpperCase();
        return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
      });
      $scope.featureLayersWithFilters = featureLayersWithFilters;

      $scope.groups = [];
      for(var i = 0; i < $scope.ui.groups.length; i++)
      {
        var g = $scope.ui.groups[i];
        var layers = $.grep($scope.map_config.featurelayers,function(x, i){ return $.inArray(x["id"], g.layers) != -1; });
        layers.sort(function(a, b){ return $.inArray(a["id"], g.layers) - $.inArray(b["id"], g.layers); });
        $scope.groups.push({
          'id': g.id,
          'label': g.label,
          'class': g.class,
          'layers': layers
        });
      }
    }
    else
    {
      $scope.featurelayers = [];
    }

  };
  $scope.updateVariables();
  //$scope.$watch('map_config.featurelayers', $scope.updateVariables);
  //$scope.$watch('map_config.legendlayers', $scope.updateVariables);
  $scope.$watch('state', $scope.updateVariables);

  $scope.$on("refreshMap", function(event, args) {
    if("state" in args)
    {
      $scope.state = args["state"];
      $scope.updateVariables();
      $timeout(function(){
        $scope.$digest();
      },0);
    }
  });

};

var buildPageURL = function($interpolate, map_config, state)
{
  var template = geodash.api.getPage(state["page"]);
  if(template != undefined)
  {
    var url = $interpolate(template)(state);
    var hash_args = [];
    var view = state["view"];
    if(view != undefined && view["z"] != undefined && view["lat"] != undefined && view["lon"] != undefined)
    {
      hash_args.push("z="+view["z"]);
      hash_args.push("lat="+view["lat"].toFixed(4));
      hash_args.push("lon="+view["lon"].toFixed(4));
    }
    var filters = state["filters"];
    if(filters)
    {
        $.each(state["filters"], function(layer_id, layer_filters)
        {
          $.each(layer_filters, function(filter_id, filter_value)
          {
              hash_args.push(layer_id+":"+filter_id+"="+filter_value);
          });
        });
    }
    if(hash_args.length > 0)
    {
      url += "#"+hash_args.join("&");
    }
    return url;
  }
  else
  {
    return undefined;
  }
};

geodash.controllers["controller_main"] = function(
  $interpolate, $scope, $element, $controller,
  $http, $q,
  state, map_config, stateschema, live)
{
    $scope.map_config = map_config;
    $scope.state = geodash.init.state(state, stateschema);
    $scope.live = live;

    $scope.refreshMap = function(state){
      // Refresh all child controllers
      $scope.$broadcast("refreshMap", {'state': state});
    };

    $scope.processEvent = function(event, args)
    {
      var c = $.grep(geodash.meta.controllers, function(x, i){
        return x['name'] == 'controller_main';
      })[0];

      for(var i = 0; i < c.handlers.length; i++)
      {
        if(c.handlers[i]['event'] == event.name)
        {
          geodash.handlers[c.handlers[i]['handler']]($scope, $interpolate, $http, $q,  event, args);
        }
      }
    };

    $.each(geodash.listeners, function(i, x){ $scope.$on(i, x); });

    var c = $.grep(geodash.meta.controllers, function(x, i){
      return x['name'] == 'controller_main';
    })[0];
    for(var i = 0; i < c.handlers.length; i++)
    {
      $scope.$on(c.handlers[i]['event'], $scope.processEvent);
    }
};


var init_sparc_controller_main = function(that, app)
{
  app.controller("GeoDashControllerBase", geodash.controllers.GeoDashControllerBase);
  app.controller("GeoDashControllerModal", geodash.controllers.GeoDashControllerModal);

  geodash.init.controller(that, app, geodash.controllers.controller_main);

  var selector_controller_base = [
    ".geodash-controller.geodash-about",
    ".geodash-controller.geodash-download",
    ".geodash-controller.geodash-dashboard-config",
    ".geodash-controller.geodash-dashboard-security",
    "[geodash-controller='geodash-modal']",
    "[geodash-controller='geodash-base']"
  ].join(", ");

  geodash.init.controllers(that, app, [{
    "selector": selector_controller_base,
    "controller": geodash.controllers.GeoDashControllerBase
  }]);

  /*geodash.init.controllers(that, app, [{
    "selector": "[geodash-controller='sparc-sidebar-left']",
    "controller": geodash.controllers.controller_sidebar_sparc
  }]);*/

  $("[geodash-controller='geodash-map']", that).each(function(){
    // Init This
    geodash.init.controller($(this), app, geodash.controllers.GeoDashControllerBase);

    // Init Children
    geodash.init.controllers($(this), app, [
      { "selector": "[geodash-controller='geodash-map-map']", "controller": geodash.controllers.controller_map_map },
      { "selector": "[geodash-controller='sparc-map-calendar']", "controller": geodash.controllers.SPARCControllerCalendar },
      { "selector": "[geodash-controller='sparc-map-breadcrumb']", "controller": geodash.controllers.controller_breadcrumb },
      { "selector": "[geodash-controller='geodash-map-filter']", "controller": geodash.controllers.controller_filter },
      { "selector": "[geodash-controller='geodash-map-legend']", "controller": geodash.controllers.controller_legend },
      { "selector": "[geodash-controller='sparc-welcome']", "controller": geodash.controllers.controller_sparc_welcome }
      //{ "selector": "[geodash-controller='geodash-sidebar-toggle-left']", "controller": geodash.controllers.controller_sidebar_toggle_left }
    ]);

  });
};

geodash.controllers["SPARCControllerModalWelcome"] = function(
  $scope, $element, $controller, $interpolate, state, map_config, live)
{
  angular.extend(this, $controller('GeoDashControllerModal', {$element: $element, $scope: $scope}));
  var m = $.grep(geodash.meta.modals, function(x, i){ return x['name'] == 'sparc_welcome';})[0];
  $scope.config = m.config;
  $scope.ui = m.ui;
  $scope.showOptions = geodash.ui.showOptions;
  $scope.updateValue = geodash.api.updateValue;

  $scope.country = geodash.initial_state.iso3;
  $scope.hazard = geodash.initial_state.hazard;

  $scope.clearSelection = function(id)
  {
    $("#"+id).val(null);
    $("#"+id).typeahead("close");
  };
};
