geosite.init_countryhazardmonth = function(appName)
{
  var url_popatrisk_summary = geosite.map_config["featurelayers"]["popatrisk"]["urls"]["summary"]
    .replace("{iso3}", geosite.initial_state["iso3"])
    .replace("{hazard}", geosite.initial_state["hazard"]);

  var url_popatrisk_geojson = geosite.map_config["featurelayers"]["popatrisk"]["urls"]["geojson"]
    .replace("{iso3}", geosite.initial_state["iso3"])
    .replace("{hazard}", geosite.initial_state["hazard"]);

  var url_context_summary = geosite.map_config["featurelayers"]["context"]["urls"]["summary"]
    .replace("{iso3}", geosite.initial_state["iso3"]);

  var url_context_geojson = geosite.map_config["featurelayers"]["context"]["urls"]["geojson"]
    .replace("{iso3}", geosite.initial_state["iso3"]);

  var url_vam_geojson = geosite.map_config["featurelayers"]["vam"]["urls"]["geojson"]
    .replace("{iso3}", geosite.initial_state["iso3"]);

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
    geosite.initial_data["layers"]["popatrisk"]["data"]["summary"] = response_popatrisk_summary[0];
    geosite.initial_data["layers"]["popatrisk"]["data"]["geojson"] = response_popatrisk_geojson[0];
    geosite.initial_data["layers"]["context"]["data"]["summary"] = response_context_summary[0];
    geosite.initial_data["layers"]["context"]["data"]["geojson"] = response_context_geojson[0];
    geosite.initial_data["layers"]["vam"]["data"]["geojson"] = response_vam_geojson[0];

    geosite.breakpoints = {};
    $.each(geosite.initial_data["layers"]["popatrisk"]["data"]["summary"]["all"]["breakpoints"], function(k, v){
      geosite.breakpoints["popatrisk_"+k] = v;
    });
    $.each(geosite.initial_data["layers"]["context"]["data"]["summary"]["all"]["breakpoints"], function(k, v){
      geosite.breakpoints["context_"+k] = v;
    });

    geosite.init_countryhazardmonth_main_app(appName);
  });
};

geosite.init_countryhazardmonth_main_app = function(appName)
{
  geosite.app = app = angular.module(appName, ['ngRoute','ngSanitize']);

  if(geosite.templates != undefined)
  {
    $.each(geosite.templates, function(name, template){
      app.run(function($templateCache){$templateCache.put(name,template);});
    });
  }

  if(geosite.filters != undefined)
  {
    $.each(geosite.filters, function(name, func){ app.filter(name, func); });
  }

  if(geosite.directives != undefined)
  {
    $.each(geosite.directives, function(name, dir){ app.directive(name, dir); });
  }

  app.factory('state', function(){return $.extend({}, geosite.initial_state);});
  app.factory('stateschema', function(){return $.extend({}, geosite.state_schema);});
  app.factory('map_config', function(){return $.extend({}, geosite.map_config);});
  app.factory('live', function(){
    return {
      "map": undefined,
      "baselayers": {},
      "featurelayers": {
        "popatrisk":undefined
      }
    };
  });

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

  geosite.init_controller_base(app);

  init_sparc_controller_main($('.geosite-controller.geosite-main'), app);

  angular.bootstrap(document, [appName]);
};
