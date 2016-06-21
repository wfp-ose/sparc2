geodash.init_countryhazardmonth = function(appName)
{
  var popatrisk = $.grep(geodash.map_config.featurelayers, function(x, i){ return x.id == "popatrisk"; })[0];

  var url_popatrisk_summary = popatrisk["sparc"]["summary"]
    .replace("{iso3}", geodash.initial_state["iso3"])
    .replace("{hazard}", geodash.initial_state["hazard"]);

  var url_popatrisk_geojson = popatrisk["geojson"]["url"]
    .replace("{iso3}", geodash.initial_state["iso3"])
    .replace("{hazard}", geodash.initial_state["hazard"]);

  var context = $.grep(geodash.map_config.featurelayers, function(x, i){ return x.id == "context"; })[0];

  var url_context_summary = context["sparc"]["summary"]
    .replace("{iso3}", geodash.initial_state["iso3"]);

  var url_context_geojson = context["geojson"]["url"]
    .replace("{iso3}", geodash.initial_state["iso3"]);

  var vam = $.grep(geodash.map_config.featurelayers, function(x, i){ return x.id == "vam"; })[0];

  var url_vam_geojson = vam["geojson"]["url"]
    .replace("{iso3}", geodash.initial_state["iso3"]);

  $.when(
    $.ajax({dataType: "json", url: url_popatrisk_summary}),
    $.ajax({dataType: "json", url: url_popatrisk_geojson}),
    $.ajax({dataType: "json", url: url_context_summary}),
    $.ajax({dataType: "json", url: url_context_geojson}),
    $.ajax({dataType: "json", url: url_vam_geojson})
  ).done(function(
    response_popatrisk_summary,
    response_popatrisk_geojson,
    response_context_summary,
    response_context_geojson,
    response_vam_geojson
    ){
    geodash.initial_data["layers"]["popatrisk"]["data"]["summary"] = response_popatrisk_summary[0];
    geodash.initial_data["layers"]["popatrisk"]["data"]["geojson"] = response_popatrisk_geojson[0];
    geodash.initial_data["layers"]["context"]["data"]["summary"] = response_context_summary[0];
    geodash.initial_data["layers"]["context"]["data"]["geojson"] = response_context_geojson[0];
    geodash.initial_data["layers"]["vam"]["data"]["geojson"] = response_vam_geojson[0];

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

  geodash.init.templates(app);
  geodash.init.filters(app);
  geodash.init.directives(app);

  app.factory('state', function(){return $.extend({}, geodash.initial_state);});
  app.factory('stateschema', function(){return $.extend({}, geodash.state_schema);});
  app.factory('map_config', function(){return $.extend({}, geodash.map_config);});
  app.factory('live', function(){
    return {
      "map": undefined,
      "baselayers": {},
      "featurelayers": {
        "popatrisk":undefined
      }
    };
  });
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

  geodash.init_controller_base(app);

  var mainController = $('#geodash-main');
  init_sparc_controller_main(mainController, app);

  angular.bootstrap(document, [appName]);
};
