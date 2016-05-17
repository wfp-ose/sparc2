geosite.controllers["controller_calendar"] = function(
  $scope,
  $element,
  $controller,
  state,
  map_config,
  live)
{
  angular.extend(this, $controller('GeositeControllerBase', {$element: $element, $scope: $scope}));
  //

  $scope.state = state;
  $scope.months = MONTHS_ALL;

  $scope.$on("refreshMap", function(event, args){
    if("state" in args)
    {
      $scope.state = args["state"];
    }
  });
};
