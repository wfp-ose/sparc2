geosite.directives["sparcSidebarCharts"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'sparc_sidebar_charts.tpl.html',
    link: function ($scope, $element, attrs){

    }
  };
};
