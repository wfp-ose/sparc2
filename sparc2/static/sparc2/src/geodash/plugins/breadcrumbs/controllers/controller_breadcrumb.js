geodash.controllers["controller_breadcrumb"] = function($scope, $element, $controller, state)
{
  angular.extend(this, $controller('GeoDashControllerBase', {$element: $element, $scope: $scope}));
  //

  $scope.state = state;
  $scope.breadcrumbs = SPARC_BREADCRUMBS;

  setTimeout(function(){

    $('select', $element).each(function(){
      var s = $(this);
      var breadcrumbs = s.data('breadcrumbs');
      var placeholder = s.data('placeholder');
      var initialData = s.data('initialData');
      var w = s.data('width');
      var h = s.data('height');
      var css = 'sparc-select-dropdown';

      s.select2({
        data: geodash.initial_data["data"][initialData], // global variable set in header
        placeholder: placeholder,
        allowClear: false,
        width: w,
        height: h,
        dropdownCssClass: css
      });

      s.on("select2:select", function(e){
        var newValue = e.params.data.id;
        $scope.$apply(function()
        {
          var output = s.data('output');
          $scope["state"][output] = newValue;
        });
        //Build URL
        var url = "";
        for(var i = 0; i < breadcrumbs.length; i++)
        {
          var bc = breadcrumbs[i];
          if(state[bc["value"]] != undefined)
          {
            url += "/"+bc["name"]+"/"+$scope["state"][bc["value"]];
          }
        }
        //Update URL
        console.log("Going to url ", url);
        window.location.href = url;
        //Update Map
      });
    });

  }, 10);

};
