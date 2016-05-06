geosite.directives["geositeSymbolCircle"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      style: "=style"
    },
    templateUrl: 'symbol_circle.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};
