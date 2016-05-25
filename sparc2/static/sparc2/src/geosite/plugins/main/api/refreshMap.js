geosite.api.refreshMap = function(options)
{
  var $scope = geosite.api.getScope(options);
  $scope.refreshMap($scope.state);
}
