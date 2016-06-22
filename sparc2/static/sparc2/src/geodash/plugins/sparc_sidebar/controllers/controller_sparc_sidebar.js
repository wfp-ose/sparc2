geodash.controllers["controller_sparc_sidebar"] = function($scope, $element, $controller, state, map_config, live)
{
  angular.extend(this, $controller('GeoDashControllerBase', {$element: $element, $scope: $scope}));
  //
  $scope.charts = map_config.charts;

  $scope.updateVariables = function(){
    var layerGroups = {
      "sidebar": $scope.map_config.legendlayers,
      "sparc": ["popatrisk", "context"],
      "wfp": ["wld_poi_facilities_wfp", "wld_trs_supplyroutes_wfp"],
      "other": [
        "landscan",
        "flood_events", "landslide_events",
        "flood_probability", "cyclone_probability",
        "imerg_1day", "imerg_3day", "imerg_7day"]
    };

    if("baselayers" in $scope.map_config && $scope.map_config.baselayers != undefined)
    {
      var baselayers = $.grep($scope.map_config.baselayers,function(x, i){ return $.inArray(x["id"], layerGroups["sidebar"]) != -1; });
      baselayers.sort(function(a, b){ return $.inArray(a["id"], layerGroups["sidebar"]) - $.inArray(b["id"], layerGroups["sidebar"]); });
      $scope.baselayers = baselayers;
    }
    else
    {
      $scope.baselayers = [];
    }

    if("featurelayers" in $scope.map_config && $scope.map_config.featurelayers != undefined)
    {
      var featurelayers = $.grep($scope.map_config.featurelayers,function(x, i){ return $.inArray(x["id"], layerGroups["sidebar"]) != -1; });
      featurelayers.sort(function(a, b){ return $.inArray(a["id"], layerGroups["sidebar"]) - $.inArray(b["id"], layerGroups["sidebar"]); });
      $scope.featurelayers = featurelayers;

      var visiblefeaturelayers = $.grep($scope.map_config.featurelayers,function(x, i){
        return $.inArray(x["id"], layerGroups["sidebar"]) != -1 &&
          $.inArray(x["id"], $scope.state.view.featurelayers) != -1;
      });
      visiblefeaturelayers.sort(function(a, b){ return $.inArray(a["id"], $scope.state.view.featurelayers) - $.inArray(b["id"], $scope.state.view.featurelayers); });
      $scope.visiblefeaturelayers = visiblefeaturelayers;

      var sparclayers = $.grep($scope.map_config.featurelayers,function(x, i){ return $.inArray(x["id"], layerGroups["sparc"]) != -1; });
      sparclayers.sort(function(a, b){ return $.inArray(a["id"], layerGroups["sparc"]) - $.inArray(b["id"], layerGroups["sparc"]); });
      $scope.sparclayers = sparclayers;

      var wfplayers = $.grep($scope.map_config.featurelayers,function(x, i){ return $.inArray(x["id"], layerGroups["wfp"]) != -1; });
      wfplayers.sort(function(a, b){ return $.inArray(a["id"], layerGroups["wfp"]) - $.inArray(b["id"], layerGroups["wfp"]); });
      $scope.wfplayers = wfplayers;

      var otherlayers = $.grep($scope.map_config.featurelayers,function(x, i){ return $.inArray(x["id"], layerGroups["other"]) != -1; });
      otherlayers.sort(function(a, b){ return $.inArray(a["id"], layerGroups["other"]) - $.inArray(b["id"], layerGroups["other"]); });
      $scope.otherlayers = otherlayers;
    }
    else
    {
      $scope.featurelayers = [];
    }

  };
  $scope.updateVariables();
  $scope.$watch('map_config.featurelayers', $scope.updateVariables);
  $scope.$watch('map_config.legendlayers', $scope.updateVariables);
  $scope.$watch('state', $scope.updateVariables);

  $scope.$on("refreshMap", function(event, args) {
    if("state" in args)
    {
      $scope.state = args["state"];
      $scope.updateVariables();
      $scope.$digest();
    }
  });

};
