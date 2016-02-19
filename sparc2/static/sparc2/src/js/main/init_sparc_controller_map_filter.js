  geosite.controller_filter = function($scope, $element, $controller, state, popatrisk_config, map_config, live)
{
  var maxValueFromSummary = popatrisk_config["data"]["summary"]["all"]["max"]["at_admin2_month"];
  angular.extend(this, $controller('GeositeControllerBase', {$element: $element, $scope: $scope}));
  // Initialize Radio Filters
  $($element).on('change', 'input:radio[name="cat"]', function(event) {
    console.log(event);
    var output = $(this).data('output');
    var filter = {};
    filter[output] = this.value;
    geosite.intend("filterChanged", {"layer": "popatrisk", "filter": filter}, $scope);
  });

  // Initialize Slider Filters
  $(".geosite-filter-slider", $($element)).each(function(){

    var slider = $(this).find(".geosite-filter-slider-slider");
    var label = $(this).find(".geosite-filter-slider-label");

    var type = slider.data('type');
    var output = slider.data('output');

    if(type=="ordinal")
    {
      var range = slider.data('range');
      //var value = slider.data('value');
      var value = state["filters"]["popatrisk"][output];
      var options = slider.data('options');

      slider.data('label', label);
      geosite.ui_init_slider_label(slider, type, range, value);
      geosite.ui_init_slider_slider($scope, slider, type, range, options.indexOf(value), 0, options.length - 1, 1);
    }
    else
    {
      var range = slider.data('range');
      //var value = slider.data('value');
      var minValue = geosite.assert_float(slider.data('min-value'), undefined);
      var step = slider.data('step');
      //var label_template = slider.data('label');

      if(range.toLowerCase() == "true")
      {
        var maxValue = maxValueFromSummary != undefined ? maxValueFromSummary : geosite.assert_float(slider.data('max-value'), undefined);
        var values = state["filters"]["popatrisk"][output];
        values = geosite.assert_array_length(values, 2, [minValue, maxValue]);
        var values_n = [Math.floor(values[0]), Math.floor(values[1])];
        var min_n = Math.floor(minValue);
        var max_n = Math.floor(maxValue);
        var step_n = Math.floor(step);

        slider.data('label', label);
        geosite.ui_init_slider_label(slider, type, range, values);
        geosite.ui_init_slider_slider($scope, slider, type, range, values_n, min_n, max_n, step_n);
        console.log(value_n, min_n, max_n, step_n, range);
      }
      else
      {
        var maxValue = geosite.assert_float(slider.data('max-value'), undefined);
        var value = state["filters"]["popatrisk"][output];
        var value_n = Math.floor(value * 100);
        var min_n = Math.floor(minValue * 100);
        var max_n = Math.floor(maxValue * 100);
        var step_n = Math.floor(step * 100);

        slider.data('label', label);
        geosite.ui_init_slider_label(slider, type, range, value);
        geosite.ui_init_slider_slider($scope, slider, type, range, values_n, min_n, max_n, step_n);
        console.log(value_n, min_n, max_n, step_n, range);
      }
    }
  });
};
