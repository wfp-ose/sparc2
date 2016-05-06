geosite.directives["ngX"] = function(){
  return {
    scope: true,
    link: function ($scope, $element, attrs){
      $scope.$watch(attrs.ngX, function(value) {
        $element.attr('x', value);
      });
    }
  };
};
geosite.directives["ngY"] = function(){
  return {
    scope: true,
    link: function ($scope, $element, attrs){
      $scope.$watch(attrs.ngY, function(value) {
        $element.attr('y', value);
      });
    }
  };
};
geosite.directives["ngWidth"] = function(){
  return {
    scope: true,
    link: function ($scope, $element, attrs){
      $scope.$watch(attrs.ngWidth, function(value) {
        $element.attr('width', value);
      });
    }
  };
};
geosite.directives["ngR"] = function(){
  return {
    scope: true,
    link: function ($scope, $element, attrs){
      $scope.$watch(attrs.ngR, function(value) {
        $element.attr('r', value);
      });
    }
  };
};
geosite.directives["ngFill"] = function(){
  return {
    scope: true,
    link: function ($scope, $element, attrs){
      $scope.$watch(attrs.ngFill, function(value) {
        $element.attr('fill', value);
      });
    }
  };
};
