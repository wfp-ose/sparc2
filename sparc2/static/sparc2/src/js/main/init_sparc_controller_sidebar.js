geosite.controller_sidebar = function($scope, $element, state, popatrisk_config, map_config, live)
{
  angular.extend(this, $controller('GeositeControllerBase', {$element: $element, $scope: $scope}));
  //
  var jqe = $($element);
  if(map_config.charts != undefined)
  {
    for(var i = 0; i < map_config.charts.length; i++)
    {
      var options = {};
      if(map_config.charts[i].hazard == "drought")
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
      buildHazardChart(map_config.charts[i], popatrisk_config, options);
    }
  }
};
