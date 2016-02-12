var init_sparc_controller = function(that, app)
{
  var controllerName = that.data('controllerName');
  var controllerType = that.data('controllerType');

  app.controller(controllerName, function($scope, $element) {

    init_intents($($element), $scope);

  });
};
