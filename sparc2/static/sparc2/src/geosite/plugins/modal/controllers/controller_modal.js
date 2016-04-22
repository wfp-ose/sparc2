geosite.controllers["controller_modal"] = function(
  $scope,
  $element,
  $controller,
  state,
  popatrisk_config,
  map_config,
  live)
{
  angular.extend(this, $controller('GeositeControllerBase', {$element: $element, $scope: $scope}));
  //
  var jqe = $($element);

  $scope.test = "blah blah blah";
};
