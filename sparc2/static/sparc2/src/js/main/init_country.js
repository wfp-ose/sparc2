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
