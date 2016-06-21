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
