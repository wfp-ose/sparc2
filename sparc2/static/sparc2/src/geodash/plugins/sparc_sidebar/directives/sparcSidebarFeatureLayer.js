geodash.directives["sparcSidebarFeatureLayer"] = function(){
  return {
    controller: geodash.controllers.controller_sparc_sidebar,
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'sparc_sidebar_feature_layer.tpl.html',
    link: function ($scope, $element, attrs)
    {
      setTimeout(function(){

        var jqe = $($element);
        if($scope.charts != undefined)
        {
          for(var i = 0; i < $scope.charts.length; i++)
          {
            var options = {};
            /*if($scope.charts[i].hazard == "drought")
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
            }*/
            buildHazardChart($scope.charts[i], geodash.initial_data.layers.popatrisk, options);
          }
        }

      }, 10);
    }
  };
};
