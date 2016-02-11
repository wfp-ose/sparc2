var init_sparc_controller_map = function(that, app)
{
  var controllerName = that.data('controllerName');
  var controllerType = that.data('controllerType');

  app.controller(controllerName, function($scope, $element, state, popatrisk_config, map_config) {

  });

  // Initialize Children
  $('.sparc-controller.sparc-map-map', that).each(function(){
      try
      {
        init_sparc_controller_map_map($(this), app);
      }
      catch(err)
      {
        console.log("Could not load SPARC Controller \"map-map\"", err);
      }
  });

  $('.sparc-controller.sparc-map-calendar', that).each(function(){
    try
    {
      init_sparc_controller_map_calendar($(this), app);
    }
    catch(err)
    {
      console.log("Could not load SPARC Controller \"map-calendar\"", err);
    }
  });

  $('.sparc-controller.sparc-map-breadcrumb', that).each(function(){
    try
    {
      init_sparc_controller_map_breadcrumb($(this), app);
    }
    catch(err)
    {
      console.log("Could not load SPARC Controller \"map-breadcrumb\"", err);
    }
  });

  $('.sparc-controller.sparc-map-filter', that).each(function(){
    try
    {
      init_sparc_controller_map_filter($(this), app);
    }
    catch(err)
    {
      console.log("Could not load SPARC Controller \"map-filter\"", err);
    }
  });

  $('.sparc-controller.sparc-map-legend', that).each(function(){
    try
    {
      init_sparc_controller_map_legend($(this), app);
    }
    catch(err)
    {
      console.log("Could not load SPARC Controller \"map-legend\"", err);
    }
  });
}
