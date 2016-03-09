var init_start = function(appName)
{
  var url_summary = geosite.map_config["featurelayers"]["popatrisk"]["urls"]["summary"]
    .replace("{iso3}", geosite.initial_state["iso3"])
    .replace("{hazard}", geosite.initial_state["hazard"]);

  var url_geojson = geosite.map_config["featurelayers"]["popatrisk"]["urls"]["geojson"]
    .replace("{iso3}", geosite.initial_state["iso3"])
    .replace("{hazard}", geosite.initial_state["hazard"]);

  $.when(
    $.ajax({dataType: "json", url: url_summary}),
    $.ajax({dataType: "json", url: url_geojson})
  ).done(function( response_summary, response_geojson ){
    geosite.initial_data["layers"]["popatrisk"]["data"]["summary"] = response_summary[0];
    geosite.initial_data["layers"]["popatrisk"]["data"]["geojson"] = response_geojson[0];
    init_main_app(appName);
  });
};

var init_main_app = function(appName)
{
  geosite.app = app = angular.module(appName, ['ngRoute']);

  app.factory('state', function(){return $.extend({}, geosite.initial_state);});
  app.factory('stateschema', function(){return $.extend({}, geosite.state_schema);});
  app.factory('popatrisk_config', function(){return $.extend({}, geosite.initial_data["layers"]["popatrisk"]);});
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
