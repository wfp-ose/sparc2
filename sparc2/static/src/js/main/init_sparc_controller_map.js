var init_sparc_controller_map = function(that, app)
{
  var controllerName = that.data('controllerName');
  var controllerType = that.data('controllerType');

  app.controller(controllerName, function($scope, $element, state, popatrisk_config, map_config) {

  });

  // Initialize Children
  $('.geosite-controller.sparc-map-map', that).each(function(){
      try
      {
        init_sparc_controller_map_map($(this), app);
      }
      catch(err)
      {
        console.log("Could not load SPARC Controller \"map-map\"", err);
      }
  });

  $('.geosite-controller.sparc-map-calendar', that).each(function(){
    try
    {
      init_sparc_controller($(this), app);
    }
    catch(err)
    {
      console.log("Could not load SPARC Controller \"map-calendar\"", err);
    }
  });

  $('.geosite-controller.sparc-map-breadcrumb', that).each(function(){
    try
    {
      init_sparc_controller_map_breadcrumb($(this), app);
    }
    catch(err)
    {
      console.log("Could not load SPARC Controller \"map-breadcrumb\"", err);
    }
  });

  $('.geosite-controller.sparc-map-filter', that).each(function(){
    try
    {
      init_sparc_controller_map_filter($(this), app);
    }
    catch(err)
    {
      console.log("Could not load SPARC Controller \"map-filter\"", err);
    }
  });

  $('.geosite-controller.sparc-map-legend', that).each(function(){
    try
    {
      init_sparc_controller($(this), app);
    }
    catch(err)
    {
      console.log("Could not load SPARC Controller \"map-legend\"", err);
    }
  });
}
