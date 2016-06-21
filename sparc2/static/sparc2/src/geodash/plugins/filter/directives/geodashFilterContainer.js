geodash.directives["geodashFilterContainer"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'filter_container.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};
