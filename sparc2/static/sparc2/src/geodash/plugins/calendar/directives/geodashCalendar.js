geodash.directives["geodashCalendar"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'calendar.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};
