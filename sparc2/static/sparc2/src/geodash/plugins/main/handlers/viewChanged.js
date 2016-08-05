geodash.handlers["viewChanged"] = function($scope, $interpolate, $http, $q, event, args) {
  console.log('event', event);
  console.log('args', args);
  //
  var $scope = geodash.api.getScope("geodash-main");
  $scope.state.view = $.extend($scope.state.view, args);
  var url = buildPageURL($interpolate, $scope.map_config, $scope.state);
  if(url != undefined)
  {
    history.replaceState(state, "", url);
  }
  // $scope.$on already wraps $scope.$apply
  /*$scope.$apply(function () {
      $scope.state.view = $.extend($scope.state.view, args);
      var url = buildPageURL("countryhazardmonth_detail", state);
      history.replaceState(state, "", url);
  });*/
};
