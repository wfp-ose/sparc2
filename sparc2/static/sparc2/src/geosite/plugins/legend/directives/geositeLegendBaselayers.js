geosite.directives["geositeLegendBaselayers"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'legend_baselayers.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};
