geosite.directives["geositeLegendFeaturelayers"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'legend_featurelayers.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};
