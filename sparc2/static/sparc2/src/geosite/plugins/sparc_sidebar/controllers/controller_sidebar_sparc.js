geosite.controllers["controller_sidebar_sparc"] = function($scope, $element, $controller, state, map_config, live)
{
  angular.extend(this, $controller('GeositeControllerBase', {$element: $element, $scope: $scope}));
  //
  $scope.charts = map_config.charts;

  setTimeout(function(){

    var jqe = $($element);
    if($scope.charts != undefined)
    {
      for(var i = 0; i < $scope.charts.length; i++)
      {
        var options = {};
        if($scope.charts[i].hazard == "drought")
        {
          options["bullet_width"] = function(d, i)
          {
            if(d.id == "p6")
            {
              return 6;
            }
            else if(d.id == "p8")
            {
              return 8;
            }
            else
            {
              return 16;
            }
          };
        }
        buildHazardChart($scope.charts[i], geosite.initial_data.layers.popatrisk, options);
      }
    }

  }, 10);
};
