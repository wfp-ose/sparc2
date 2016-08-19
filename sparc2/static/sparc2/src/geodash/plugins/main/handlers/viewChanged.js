geodash.handlers["viewChanged"] = function($scope, $interpolate, $http, $q, event, args) {
  console.log('event', event);
  console.log('args', args);
  $scope.state.view = $.extend($scope.state.view, args);
  var url = buildPageURL($interpolate, $scope.map_config, $scope.state);
  if(url != undefined)
  {
    history.replaceState($scope.state, "", url);
  }
};
