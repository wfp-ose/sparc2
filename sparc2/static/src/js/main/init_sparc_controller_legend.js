var init_sparc_controller_map_legend = function(that, app)
{
  var controllerName = that.data('controllerName');
  var controllerType = that.data('controllerType');

  app.controller(controllerName, function($scope, $element, state, popatrisk_config, map_config, live) {

    init_intents($($element), $scope);

  });
};
