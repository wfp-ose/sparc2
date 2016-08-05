geodash.handlers["stateChanged"] = function($scope, $interpolate, $http, $q, event, args) {
  console.log('event', event);
  console.log('args', args);
  //
  var $scope = geodash.api.getScope("geodash-main");
  /*$scope.$apply(function () {
    $scope.state = $.extend($scope.state, args);
    var url = buildPageURL($interpolate, $scope.map_config, $scope.state);
    if(url != undefined)
    {
      history.replaceState(state, "", url);
    }
    $scope.refreshMap($scope.state);
  });*/
  $scope.state = $.extend($scope.state, args);
  var url = buildPageURL($interpolate, $scope.map_config, $scope.state);
  if(url != undefined)
  {
    history.replaceState(state, "", url);
  }
  $scope.refreshMap($scope.state);
};
