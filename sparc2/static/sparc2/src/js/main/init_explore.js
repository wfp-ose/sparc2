geodash.init_explore = function(appName)
{
  geodash.app = app = angular.module(appName, ['ngRoute','ngSanitize']);

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
      "featurelayers":{}
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
