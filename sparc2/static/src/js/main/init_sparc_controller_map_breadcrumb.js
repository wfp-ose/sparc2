var init_sparc_controller_map_breadcrumb = function(that, app)
{
  var controllerName = that.data('controllerName');
  var controllerType = that.data('controllerType');

  app.controller(controllerName, function($scope, $element, state) {

    $('select', $element).each(function(){
      var s = $(this);
      var breadcrumbs = s.data('breadcrumbs');
      var placeholder = s.data('placeholder');
      var initialData = s.data('initialData');
      var w = s.data('width');
      var h = s.data('height');
      var css = 'sparc-select-dropdown';

      s.select2({
        data: sparc["data"][initialData], // global variable set in header
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
        console.log("Going to url ", url)
        window.location.href = url
        //Update Map
      });
    });
  });
};
