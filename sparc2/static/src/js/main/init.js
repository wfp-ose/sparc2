var init_start = function(appName)
{
  init_summary(appName);
};
var init_summary = function(appName)
{
  var url_summary = map_config["featurelayers"]["popatrisk"]["urls"]["summary"]
    .replace("{iso3}", sparc["state"]["iso3"])
    .replace("{hazard}", sparc["state"]["hazard"]);

  $.ajax({
    dataType: "json",
    url: url_summary,
    success: function(response){
      sparc["layers"]["popatrisk"]["data"]["summary"] = response;
      init_geojson(appName);
    }
  });
}
var init_geojson = function(appName)
{
  var url_geojson = map_config["featurelayers"]["popatrisk"]["urls"]["geojson"]
    .replace("{iso3}", sparc["state"]["iso3"])
    .replace("{hazard}", sparc["state"]["hazard"]);

  $.ajax({
    dataType: "json",
    url: url_geojson,
    success: function(response){
      sparc["layers"]["popatrisk"]["data"]["geojson"] = response;
      init_main_app(appName);
    }
  });
}
var init_main_app = function(appName)
{
  sparcApp = app = angular.module(appName, ['ngRoute']);

  app.factory('state', function(){return $.extend({}, sparc["state"]);});
  app.factory('stateschema', function(){return $.extend({}, sparc["stateschema"]);});
  app.factory('popatrisk_config', function(){return $.extend({}, sparc["layers"]["popatrisk"]);});
  app.factory('map_config', function(){return $.extend({}, map_config);});
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
  init_sparc_controller_main($('.sparc-controller.sparc-main'), app);

  angular.bootstrap(document, [appName]);
};
