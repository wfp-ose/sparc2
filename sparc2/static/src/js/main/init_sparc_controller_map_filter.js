var init_sparc_controller_map_filter = function(that, app)
{
  var controllerName = that.data('controllerName');
  var controllerType = that.data('controllerType');

  app.controller(controllerName, function($scope, $element, state, popatrisk_config, map_config, live) {

    // Initialize Radio Filters
    $($element).on('change', 'input:radio[name="cat"]', function(event) {
      console.log(event);
      var output = $(this).data('output');
      var filter = {};
      filter[output] = this.value;
      intend("filterChanged", {"layer":"popatrisk", "filter":filter}, $scope);
    });

    // Initialize Slider Filters
    $(".sparc-filter-slider", $($element)).each(function(){

      var slider = $(this).find(".sparc-filter-slider-slider");
      var label = $(this).find(".sparc-filter-slider-label");

      var type = slider.data('type');
      var output = slider.data('output');

      if(type=="ordinal")
      {
        var range = slider.data('range');
        //var value = slider.data('value');
        var value = state["filters"]["popatrisk"][output];
        var options = slider.data('options');

        slider.data('label', label);
        label.html(slider.data('label-template').replace('{value}', value));

        slider.slider({
          range: range,
          value: options.indexOf(value),
          min: 0,
          max: options.length - 1,
          step: 1,
          slide: function(event, ui){
              sparc_onslide_ordinal.apply(this, [event, ui]);
              var newValue = slider.data('options')[ui.value];
              var filter = {};
              filter[output] = newValue;
              intend("filterChanged", {"layer":"popatrisk", "filter":filter}, $scope);
          }
        });
      }
      else
      {
        var range = slider.data('range');
        //var value = slider.data('value');
        var value = state["filters"]["popatrisk"][output];
        var min = slider.data('min');
        var max = slider.data('max');
        var step = slider.data('step');
        //var label_template = slider.data('label');

        var value_n = Math.floor(value * 100)
        var min_n = Math.floor(min * 100);
        var max_n = Math.floor(max * 100);
        var step_n = Math.floor(step * 100);

        slider.data('label', label);

        label.html(slider.data('label-template').replace('{value}', value));

        console.log(value_n, min_n, max_n, step_n, range)

        slider.slider({
          range: range,
          value: value_n,
          min: min_n,
          max: max_n,
          step: step_n,
          slide: function(event, ui){
              sparc_onslide_continuous.apply(this, [event, ui]);
              var newValue = ui.value / 100.0;
              var filter = {};
              filter[output] = newValue;
              intend("filterChanged", {"layer":"popatrisk", "filter":filter}, $scope);
          }
        });
      }
    });

    //Initialize ____ Filters

  });
};
