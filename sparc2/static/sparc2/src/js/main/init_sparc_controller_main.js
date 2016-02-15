geosite.controller_main = function($scope, $element, state, stateschema, popatrisk_config, live)
{

    $scope.state = geosite.init_state(state, stateschema);
    $scope.live = live;

    // Calendar, Country, Hazard, or Filter Changed
    $scope.$on("stateChanged", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        //
        var $scope = angular.element("#sparc-main").scope();
        $scope.$apply(function () {
            $scope.state = $.extend($scope.state, args);
            var url = buildPageURL("countryhazardmonth_detail", state);
            history.replaceState(state, "", url);
            // Refresh Map
            $scope.$broadcast("refreshMap", {'state': $scope.state});
        });
    });

    // Map Panned or Zoomed
    $scope.$on("filterChanged", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        //
        var $scope = angular.element("#sparc-main").scope();
        $scope.$apply(function () {
            $scope.state.filters[args["layer"]] = $.extend(
              $scope.state.filters[args["layer"]],
              args["filter"]);
            var url = buildPageURL("countryhazardmonth_detail", state);
            history.replaceState(state, "", url);
            // Refresh Map
            $scope.$broadcast("refreshMap", {'state': $scope.state});
        });
    });

    // Map Panned or Zoomed
    $scope.$on("viewChanged", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        //
        var $scope = angular.element("#sparc-main").scope();
        $scope.state.view = $.extend($scope.state.view, args);
        var url = buildPageURL("countryhazardmonth_detail", state);
        history.replaceState(state, "", url);
        // $scope.$on already wraps $scope.$apply
        /*$scope.$apply(function () {
            $scope.state.view = $.extend($scope.state.view, args);
            var url = buildPageURL("countryhazardmonth_detail", state);
            history.replaceState(state, "", url);
        });*/
    });

    $scope.$on("layerLoaded", function(event, args) {
        var $scope = angular.element("#sparc-main").scope();
        var layer = args.layer;
        $scope.state.view.featurelayers.push(layer);
    });

    $scope.$on("showLayer", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        var $scope = angular.element("#sparc-main").scope();
        var layer = args.layer;
        if($.inArray(layer, $scope.state.view.featurelayers) == -1)
        {
          $scope.state.view.featurelayers.push(layer);
          // Refresh Map
          $scope.$broadcast("refreshMap", {'state': $scope.state});
        }
    });
    $scope.$on("hideLayer", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        var $scope = angular.element("#sparc-main").scope();
        var layer = args.layer;
        var i = $.inArray(layer, $scope.state.view.featurelayers);
        if(i != -1)
        {
          $scope.state.view.featurelayers.splice(i, 1);
          // Refresh Map
          $scope.$broadcast("refreshMap", {'state': $scope.state});
        }
    });
    $scope.$on("switchBaseLayer", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        var $scope = angular.element("#sparc-main").scope();
        $scope.state.view.baselayer = args.layer;
        // Refresh Map
        $scope.$broadcast("refreshMap", {'state': $scope.state});
    });

    $scope.$on("zoomToLayer", function(event, args) {
        var $scope = angular.element("#sparc-main").scope();
        var layer = args.layer;
        var i = $.inArray(layer, $scope.state.view.featurelayers);
        if(i != -1)
        {
          $scope.$broadcast("changeView", {'layer': layer});
        }
    });
};


var init_sparc_controller_main = function(that, app)
{
  geosite.init_controller(that, app, geosite.controller_main);

  $('.geosite-controller.sparc-sidebar', that).each(function(){
    geosite.init_controller($(this), app, geosite.controller_sidebar);
  });

  $('.geosite-controller.sparc-map', that).each(function(){
    // Init This
    geosite.init_controller($(this), app, geosite.controller_map);
    // Init Children
    geosite.init_controllers($(this), app, [
      { "selector": ".geosite-controller.sparc-map-map", "controller": geosite.controller_map_map },
      { "selector": ".geosite-controller.sparc-map-calendar", "controller": undefined },
      { "selector": ".geosite-controller.sparc-map-breadcrumb", "controller": geosite.controller_breadcrumb },
      { "selector": ".geosite-controller.sparc-map-filter", "controller": geosite.controller_filter },
      { "selector": ".geosite-controller.sparc-map-legend", "controller": undefined },
    ]);
  });
};
