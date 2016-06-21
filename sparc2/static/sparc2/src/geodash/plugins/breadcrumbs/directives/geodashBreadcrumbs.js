geodash.directives["geodashBreadcrumbs"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'breadcrumbs.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};
