geodash.handlers["selectStyle"] = function($scope, $interpolate, $http, $q, event, args) {
    console.log('event', event);
    console.log('args', args);
    $scope.$apply(function () {
        $scope.state.styles[args["layer"]] = args["style"];
        var url = buildPageURL($interpolate, $scope.map_config, $scope.state);
        if(url != undefined)
        {
          history.replaceState($scope.state, "", url);
        }
        $scope.refreshMap($scope.state);
    });
};
