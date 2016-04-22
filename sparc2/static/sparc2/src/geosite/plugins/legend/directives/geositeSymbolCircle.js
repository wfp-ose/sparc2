geosite.directives["geositeSymbolCircle"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'symbol_circle.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};
