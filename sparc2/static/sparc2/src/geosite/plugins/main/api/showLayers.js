geosite.api.showLayers = function(layers)
{
  var $scope = geosite.api.getScope();
  for(var i = 0; i < layers.length; i++)
  {
    var layer = layers[i];
    if($.inArray(layer, $scope.state.view.featurelayers) == -1)
    {
      $scope.state.view.featurelayers.push(layer);
      $scope.refreshMap($scope.state);
    }
  }
}
