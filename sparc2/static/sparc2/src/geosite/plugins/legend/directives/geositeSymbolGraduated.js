geosite.directives["geositeSymbolGraduated"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'symbol_graduated.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};
