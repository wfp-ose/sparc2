var buildGroupsAndColumnsForCountry = function(chartConfig, popatrisk_config)
{
  var groups = [[]];
  var columns = [];

  if (chartConfig.hazard == "cyclone")
  {
    $.each(popatrisk_config["data"]["summary"]["prob_class"], function(prob_class, value){
      var data = value["by_month"];
      //
      columns.push([prob_class].concat(data));
      groups[0].push(prob_class);
    });
  }
  else if(chartConfig.hazard == "drought")
  {
    for(var i = 0; i < chartConfig.groups.length; i++)
    {
      var group_prefix = chartConfig.group_prefix;
      var group_key = chartConfig.group_key;
      var group_modifier = chartConfig.group_modifier;
      var g = chartConfig.groups[i];
      var data = popatrisk_config["data"]["summary"][group_key][""+(g * group_modifier)]["by_month"];
      //
      columns.push([group_prefix+g].concat(data));
      groups[0].push(group_prefix+g);
    }
    columns.reverse();
  }
  else if(chartConfig.hazard == "flood")
  {
    for(var i = 0; i < chartConfig.groups.length; i++)
    {
      var group_prefix = chartConfig.group_prefix;
      var group_key = chartConfig.group_key;
      var g = chartConfig.groups[i];
      var group_modifier = chartConfig.group_modifier;
      var data = popatrisk_config["data"]["summary"][group_key][""+(g * group_modifier)]["by_month"];
      //
      columns.push([group_prefix+g].concat(data));
      groups[0].push(group_prefix+g);
    }
    columns.reverse();
  }

  return {'groups': groups, 'columns': columns};
};
var buildGroupsAndColumnsForAdmin2 = function(chartConfig, popatrisk_config, admin2_code)
{
  var groups = [[]];
  var columns = [];

  if(chartConfig.hazard == "flood")
  {
    for(var i = 0; i < chartConfig.returnPeriods.length; i++)
    {
      var rp = chartConfig.returnPeriods[i];
      var data = popatrisk_config["data"]["summary"]["admin2"][admin2_code]["rp"][""+rp]["by_month"];
      //
      columns.push(['rp'+rp].concat(data));
      groups[0].push('rp'+rp);
    }
    columns.reverse();
  }
  else if (chartConfig.hazard == "cyclone")
  {
    $.each(popatrisk_config["data"]["summary"]["admin2"][admin2_code]["prob_class"], function(prob_class, value){
      var data = value["by_month"];
      //
      columns.push([prob_class].concat(data));
      groups[0].push(prob_class);
    });
  }
  return {'groups': groups, 'columns': columns};
};
var buildHazardChart = function(chartConfig, popatrisk_config, options)
{
  var gc = undefined;
  if(chartConfig.type == "bar")
  {
    var groups = [[]];
    var columns = [];
    if(options != undefined && options.groups != undefined && options.columns != undefined)
    {
      gc = {
        "groups": options.groups,
        "columns": options.columns
      };
    }
    else
    {
      gc = buildGroupsAndColumnsForCountry(chartConfig, popatrisk_config);
    }
    var barConfig = undefined;
    if(chartConfig.subtype=="bullet")
    {
      barConfig =
      {
        bullet: true,
        width: function(d, i)
        {
          return d.id == "rp25" ? 8 : 16;
        },
        offset: function(d, i)
        {
          return 0;  // Stacks bar chartActuals on top of each other
        }
      };
      if(options != undefined && options.bullet_width != undefined)
      {
        barConfig["width"] = options.bullet_width;
      }
    }
    else
    {
      barConfig = {
        width: {
          ratio: 0.6
        }
      };
    }
    var axisConfig = {"x":{}, "y": {}};
    if(chartConfig.axis != undefined && chartConfig.axis.x != undefined)
    {
      if(chartConfig.axis.x.type == "months")
      {
        axisConfig["x"]["tick"] = {
          format: function (x){return months_short_3[x].toTitleCase();}
        };
      }
    }
    axisConfig["y"]["label"] = chartConfig.axis.y.label;
    axisConfig["y"]["tick"] = {format: d3.format("s,")};
    var chartActual = c3.generate({
      bindto: '#'+chartConfig.id,
      data: {
        columns: gc.columns,
        groups: gc.groups,
        type: 'bar',
        colors: chartConfig.colors
      },
      axis : axisConfig,
      bar: barConfig
    });
  }
};

var init_start = function(appName)
{
  init_summary(appName);
};

var init_summary = function(appName)
{
  var url_summary = map_config["featurelayers"]["popatrisk"]["urls"]["summary"]
    .replace("{iso3}", sparc["state"]["iso3"])
    .replace("{hazard}", sparc["state"]["hazard"]);

  $.ajax({
    dataType: "json",
    url: url_summary,
    success: function(response){
      sparc["layers"]["popatrisk"]["data"]["summary"] = response;
      init_geojson(appName);
    }
  });
};

var init_geojson = function(appName)
{
  var url_geojson = map_config["featurelayers"]["popatrisk"]["urls"]["geojson"]
    .replace("{iso3}", sparc["state"]["iso3"])
    .replace("{hazard}", sparc["state"]["hazard"]);

  $.ajax({
    dataType: "json",
    url: url_geojson,
    success: function(response){
      sparc["layers"]["popatrisk"]["data"]["geojson"] = response;
      init_main_app(appName);
    }
  });
};

var init_main_app = function(appName)
{
  sparcApp = app = angular.module(appName, ['ngRoute']);

  app.factory('state', function(){return $.extend({}, sparc["state"]);});
  app.factory('stateschema', function(){return $.extend({}, sparc["stateschema"]);});
  app.factory('popatrisk_config', function(){return $.extend({}, sparc["layers"]["popatrisk"]);});
  app.factory('map_config', function(){return $.extend({}, map_config);});
  app.factory('live', function(){
    return {
      "map": undefined,
      "baselayers": {},
      "featurelayers": {
        "popatrisk":undefined
      }
    };
  });

  /*
  init_sparc_controller_main will kick off a recursive search for controllers
  to add to the angular app/module.  However, the initialization code in
  app.controller(...function(){XXXXX}) won't actually execute until
  angular.bootstrap is called.  Therefore, each controller should Initialize
  in a breadth-first sequential order.

  If you miss a component with ng-controller, bootstrap will attempt
  to load it on its own within angular.bootstrap.  That'll error out
  and is not good.  So you NEED!!! to get to it first!!!!!!
  */

  geosite.init_controller_base(app);

  init_sparc_controller_main($('.geosite-controller.geosite-main'), app);

  angular.bootstrap(document, [appName]);
};

var init_sparc_controller = function(that, app)
{
  var controllerName = that.data('controllerName');
  var controllerType = that.data('controllerType');

  app.controller(controllerName, function($scope, $element) {

    init_intents($($element), $scope);

  });
};

geosite.controller_main = function($scope, $element, $controller, state, stateschema, popatrisk_config, live)
{

    $scope.state = geosite.init_state(state, stateschema);
    $scope.live = live;

    // Calendar, Country, Hazard, or Filter Changed
    $scope.$on("stateChanged", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        //
        var $scope = angular.element("#geosite-main").scope();
        $scope.$apply(function () {
            $scope.state = $.extend($scope.state, args);
            var url = buildPageURL("countryhazardmonth_detail", $scope.state);
            history.replaceState(state, "", url);
            // Refresh Map
            $scope.$broadcast("refreshMap", {'state': $scope.state});
        });
    });

    // Map Panned or Zoomed
    $scope.$on("filterChanged", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        //
        var $scope = angular.element("#geosite-main").scope();
        $scope.$apply(function () {
            $scope.state.filters[args["layer"]] = $.extend(
              $scope.state.filters[args["layer"]],
              args["filter"]);
            var url = buildPageURL("countryhazardmonth_detail", $scope.state);
            history.replaceState(state, "", url);
            // Refresh Map
            $scope.$broadcast("refreshMap", {'state': $scope.state});
        });
    });

    // Map Panned or Zoomed
    $scope.$on("viewChanged", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        //
        var $scope = angular.element("#geosite-main").scope();
        $scope.state.view = $.extend($scope.state.view, args);
        var url = buildPageURL("countryhazardmonth_detail", $scope.state);
        history.replaceState(state, "", url);
        // $scope.$on already wraps $scope.$apply
        /*$scope.$apply(function () {
            $scope.state.view = $.extend($scope.state.view, args);
            var url = buildPageURL("countryhazardmonth_detail", state);
            history.replaceState(state, "", url);
        });*/
    });

    $scope.$on("layerLoaded", function(event, args) {
        var $scope = angular.element("#geosite-main").scope();
        var layer = args.layer;
        $scope.state.view.featurelayers.push(layer);
    });

    $scope.$on("showLayer", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        var $scope = angular.element("#geosite-main").scope();
        var layer = args.layer;
        if($.inArray(layer, $scope.state.view.featurelayers) == -1)
        {
          $scope.state.view.featurelayers.push(layer);
          // Refresh Map
          $scope.$broadcast("refreshMap", {'state': $scope.state});
        }
    });
    $scope.$on("hideLayer", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        var $scope = angular.element("#geosite-main").scope();
        var layer = args.layer;
        var i = $.inArray(layer, $scope.state.view.featurelayers);
        if(i != -1)
        {
          $scope.state.view.featurelayers.splice(i, 1);
          // Refresh Map
          $scope.$broadcast("refreshMap", {'state': $scope.state});
        }
    });
    $scope.$on("switchBaseLayer", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        var $scope = angular.element("#geosite-main").scope();
        $scope.state.view.baselayer = args.layer;
        // Refresh Map
        $scope.$broadcast("refreshMap", {'state': $scope.state});
    });

    $scope.$on("zoomToLayer", function(event, args) {
        var $scope = angular.element("#geosite-main").scope();
        var layer = args.layer;
        var i = $.inArray(layer, $scope.state.view.featurelayers);
        if(i != -1)
        {
          $scope.$broadcast("changeView", {'layer': layer});
        }
    });
};


var init_sparc_controller_main = function(that, app)
{
  geosite.init_controller(that, app, geosite.controller_main);

  $('.geosite-controller.geosite-sidebar', that).each(function(){
    geosite.init_controller($(this), app, geosite.controller_sidebar);
  });

  $('.geosite-controller.geosite-map', that).each(function(){
    // Init This
    geosite.init_controller($(this), app, geosite.controller_map);
    // Init Children
    geosite.init_controllers($(this), app, [
      { "selector": ".geosite-controller.geosite-map-map", "controller": geosite.controller_map_map },
      { "selector": ".geosite-controller.sparc-map-calendar", "controller": undefined },
      { "selector": ".geosite-controller.sparc-map-breadcrumb", "controller": geosite.controller_breadcrumb },
      { "selector": ".geosite-controller.geosite-map-filter", "controller": geosite.controller_filter },
      { "selector": ".geosite-controller.geosite-map-legend", "controller": undefined },
    ]);
  });
};

geosite.controller_map = function($scope, $element, $controller, state, popatrisk_config, map_config) {

};

geosite.controller_breadcrumb = function($scope, $element, $controller, state)
{
  angular.extend(this, $controller('GeositeControllerBase', {$element: $element, $scope: $scope}));
  //
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
      console.log("Going to url ", url);
      window.location.href = url;
      //Update Map
    });
  });
};

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

var init_map = function(opts)
{
  var map = L.map('map',
  {
    zoomControl: opt_b(opts, "zoom", false),
    minZoom: opt_i(opts, "minZoom", 3),
    maxZoom: opt_i(opts, "maxZoom", 18)
  });
  map.setView(
    [opt_i(opts,["latitude", "lat"],0), opt_i(opts,["longitude", "lon", "lng", "long"], 0)],
    opt_i(opts, ["zoom", "z"], 0));

  $.each(opt_j(opts, "listeners"), function(e, f){
    map.on(e, f);
  });

  return map;
};

var init_baselayers = function(map, baselayers)
{
  var layers = {};
  for(var i = 0; i < baselayers.length; i++)
  {
      var tl = baselayers[i];
      try{
        layers[tl.id] = L.tileLayer(tl.source.url, {
            id: tl.id,
            attribution: tl.source.attribution
        });
      }catch(err){console.log("Could not add baselayer "+i);}
  }
  return layers;
};

geosite.controller_map_map = function($scope, $element, $interpolate, state, popatrisk_config, map_config, live) {
  //////////////////////////////////////
  var listeners =
  {
    zoomend: function(e){
      var delta = {
        "extent": live["map"].getBounds().toBBoxString(),
        "z": live["map"].getZoom()
      };
      geosite.intend("viewChanged", delta, $scope);
    },
    dragend: function(e){
      var c = live["map"].getCenter();
      var delta = {
        "extent": live["map"].getBounds().toBBoxString(),
        "lat": c.lat,
        "lon": c.lng
      };
      geosite.intend("viewChanged", delta, $scope);
    },
    moveend: function(e){
      var c = live["map"].getCenter();
      var delta = {
        "extent": live["map"].getBounds().toBBoxString(),
        "lat": c.lat,
        "lon": c.lng
      };
      geosite.intend("viewChanged", delta, $scope);
    }
  };
  //////////////////////////////////////
  // The Map
  var hasViewOverride = hasHashValue(["latitude", "lat", "longitude", "lon", "lng", "zoom", "z"]);
  var view = state["view"];
  live["map"] = init_map({
    "zoom": map_config["controls"]["zoom"],
    "minZoom": map_config["view"]["minZoom"],
    "maxZoom": map_config["view"]["maxZoom"],
    "lat": view["lat"],
    "lon": view["lon"],
    "z": view["z"],
    "listeners": listeners
  });
  //////////////////////////////////////
  // Base Layers
  var baseLayers = init_baselayers(live["map"], map_config["baselayers"]);
  $.extend(live["baselayers"], baseLayers);
  var baseLayerID = map_config["baselayers"][0].id;
  live["baselayers"][baseLayerID].addTo(live["map"]);
  geosite.intend("viewChanged", {'baselayer': baseLayerID}, $scope);
  geosite.intend("layerLoaded", {'layer': baseLayerID}, $scope);
  //////////////////////////////////////
  // Feature layers
  var popupContent = function(source)
  {
    console.log(source);
    var f = source.feature;
    //
    var $scope = angular.element("#geosite-main").scope();
    var state = $scope.state;
    var filters = state["filters"]["popatrisk"];
    //
    //var popupTemplate = map_config["featurelayers"]["popatrisk"]["popup"]["template"];
    var popupTemplate = popup_templates["popatrisk"];
    var ctx = $.extend({}, f.properties);
    var month_short_3 = months_short_3[state["month"]-1];
    var month_long = months_long[state["month"]-1];
    ctx["month"] = month_long;
    if(state.hazard == "flood")
    {
      var rp = filters["rp"];
      ctx["popatrisk"] = f.properties["RP"+rp.toString(10)][month_short_3];
    }
    else if(state.hazard == "cyclone")
    {
      var prob_class_max = filters["prob_class_max"];
      var value = 0;
      for(var i = 0; i < f.properties.addinfo.length; i++)
      {
          var a = f.properties.addinfo[i];
          if(a["category"] == filters["category"])
          {
            if(a["prob_class_max"] != 0 && a["prob_class_max"] <= prob_class_max)
            {
              console.log("matched prob_class", prob_class_max);
              value += a[month_short_3];
            }
          }
      }
      ctx["popatrisk"] = value;
    }
    var chartConfig = map_config["featurelayers"]["popatrisk"]["popup"]["chart"];
    ctx["chartID"] = chartConfig.id;
    //Run this right after
    setTimeout(function(){
      var gc = buildGroupsAndColumnsForAdmin2(chartConfig, popatrisk_config, f.properties.admin2_code);
      var chartOptions = {
        groups: gc.groups,
        columns: gc.columns,
        bullet_width: function(d, i)
        {
          return d.id == "rp25" ? 6 : 12;
        }
      };
      buildHazardChart(chartConfig, popatrisk_config, chartOptions);
    }, 1000);
    return $interpolate(popupTemplate)(ctx);
  };
  // Load Population at Risk
  live["featurelayers"]["popatrisk"] = L.geoJson(popatrisk_config["data"]["geojson"],{
    renderOrder: $.inArray("popatrisk", map_config.renderlayers),
    style: popatrisk_config["style"]["default"],
    /* Custom */
    hoverStyle: popatrisk_config["style"]["hover"],
    /* End Custom */
    onEachFeature: function(f, layer){
      var popupOptions = {maxWidth: 300};
      //var popupContent = "Loading ..."
      layer.bindPopup(popupContent, popupOptions);
      layer.on({
        mouseover: highlightFeature,
        mouseout: function(e){
          live["featurelayers"]["popatrisk"].resetStyle(e.target);
        },
        click: function(e) {
          // This is handled by setting popupContent to be a function.
          //var popup = e.target.getPopup();
          //popup.update();
        }
      });
    }
  });
  // Load other layers
  $.each(map_config.featurelayers, function(id, layerConfig){
    if(id != "popatrisk")
    {
      if(layerConfig.enabled == undefined || layerConfig.enabled == true)
      {
        if(layerConfig.type.toLowerCase() == "wms")
        {
          //https://github.com/Leaflet/Leaflet/blob/master/src/layer/tile/TileLayer.WMS.js
          var w = layerConfig.wms;
          var fl = L.tileLayer.wms(w.url, {
            renderOrder: $.inArray(id, map_config.renderlayers),
            buffer: w.buffer || 0,
            version: w.version || "1.1.1",
            layers: w.layers.join(","),
            styles: w.styles ? w.styles.join(",") : '',
            format: w.format,
            transparent: w.transparent || false,
            attribution: layerConfig.source
          });
          live["featurelayers"][id] = fl;
        }
      }
    }
  });
  $.each(live["featurelayers"], function(id, fl){
    fl.addTo(live["map"]);
    geosite.intend("layerLoaded", {'layer': id}, $scope);
  });
  // Zoom to Data
  if(!hasViewOverride)
  {
      live["map"].fitBounds(live["featurelayers"]["popatrisk"].getBounds());
  }
  //////////////////////////////////////
  // Sidebar Toggle
  $("#geosite-map-sidebar-toggle").click(function (){
    $(this).toggleClass("sidebar-open");
    $("#geosite-sidebar, #geosite-map").toggleClass("sidebar-open");
    setTimeout(function(){
      live["map"].invalidateSize({
        animate: true,
        pan: false
      });
    },2000);
  });
  //////////////////////////////////////
  $scope.$on("refreshMap", function(event, args) {
    // Forces Refresh
    console.log("Refreshing map...");
    // Update Visibility
    var visibleBaseLayer = args.state.view.baselayer;
    $.each(live["baselayers"], function(id, layer) {
      var visible = id == visibleBaseLayer;
      if(live["map"].hasLayer(layer) && !visible)
      {
        live["map"].removeLayer(layer)
      }
      else if((! live["map"].hasLayer(layer)) && visible)
      {
        live["map"].addLayer(layer)
      }
    });
    var visibleFeatureLayers = args.state.view.featurelayers;
    $.each(live["featurelayers"], function(id, layer) {
      var visible = $.inArray(id, visibleFeatureLayers) != -1;
      if(live["map"].hasLayer(layer) && !visible)
      {
        live["map"].removeLayer(layer)
      }
      else if((! live["map"].hasLayer(layer)) && visible)
      {
        live["map"].addLayer(layer)
      }
    });
    // Update Render Order
    var renderLayers = $.grep(layersAsArray(live["featurelayers"]), function(layer){ return $.inArray(layer["id"], visibleFeatureLayers) != -1;});
    var renderLayersSorted = sortLayers($.map(renderLayers, function(layer, i){return layer["layer"];}),true);
    var baseLayersAsArray = $.map(live["baselayers"], function(layer, id){return {'id':id,'layer':layer};});
    var baseLayers = $.map(
      $.grep(layersAsArray(live["baselayers"]), function(layer){return layer["id"] == visibleBaseLayer;}),
      function(layer, i){return layer["layer"];});
    updateRenderOrder(baseLayers.concat(renderLayersSorted));
    // Update Styles
    live["featurelayers"]["popatrisk"].setStyle(popatrisk_config["style"]["default"]);
    // Force Refresh
    setTimeout(function(){live["map"]._onResize()}, 0);
  });

  $scope.$on("changeView", function(event, args) {
    console.log("Refreshing map...");
    if(args["layer"] != undefined)
    {
      live["map"].fitBounds(live["featurelayers"][args["layer"]].getBounds());
    }
  });
};

geosite.controller_sidebar = function($scope, $element, $controller, state, popatrisk_config, map_config, live)
{
  angular.extend(this, $controller('GeositeControllerBase', {$element: $element, $scope: $scope}));
  //
  var jqe = $($element);
  if(map_config.charts != undefined)
  {
    for(var i = 0; i < map_config.charts.length; i++)
    {
      var options = {};
      if(map_config.charts[i].hazard == "drought")
      {
        options["bullet_width"] = function(d, i)
        {
          if(d.id == "p6")
          {
            return 6;
          }
          else if(d.id == "p8")
          {
            return 8;
          }
          else
          {
            return 16;
          }
        };
      }
      buildHazardChart(map_config.charts[i], popatrisk_config, options);
    }
  }
};

geosite.style_cyclone = function(f, state, map_config, popatrisk_config)
{
  var style = {};
  var filters = state["filters"]["popatrisk"];
  var prob_class_max = filters["prob_class_max"];
  var range = filters["popatrisk_range"];
  //
  var month_short3 = months_short_3[state["month"]-1];
  var value = 0;
  for(var i = 0; i < f.properties.addinfo.length; i++)
  {
      var a = f.properties.addinfo[i];
      if(a["category"] == filters["category"])
      {
        if(a["prob_class_max"] != 0 && a["prob_class_max"] <= prob_class_max)
        {
          console.log("matched prob_class", prob_class_max);
          value += a[month_short3];
        }
      }
  }
  if(value >= range[0] && value <= range[1])
  {
    var colors = map_config["featurelayers"]["popatrisk"]["symbology"]["colors"];
    var breakpoints = popatrisk_config["data"]["summary"]["all"]["breakpoints"]["natural"];
    var color = undefined;
    for(var i = 0; i < breakpoints.length; i++)
    {
      if(value < breakpoints[i])
      {
        color = colors[i];
        break;
      }
    }
    style["fillColor"] = (color == undefined) ? colors[colors.length-1] : color;
  }
  else
  {
    style["opacity"] = 0;
    style["fillOpacity"] = 0;
  }
  return style;
};

geosite.style_drought = function(f, state, map_config, popatrisk_config)
{
  var style = {};
  var filters = state["filters"]["popatrisk"];
  var prob_class_max = filters["prob_class_max"] / 100.0;
  var range = filters["popatrisk_range"];
  //
  var month_short3 = months_short_3[state["month"]-1];
  var value = 0;
  for(var i = 0; i < f.properties.addinfo.length; i++)
  {
      var a = f.properties.addinfo[i];
      if(a["month"] == month_short3)
      {
        if(a["prob"] < prob_class_max)
        {
          value += a["popatrisk"];
        }
      }
  }
  if(value >= range[0] && value <= range[1])
  {
    var colors = map_config["featurelayers"]["popatrisk"]["symbology"]["colors"];
    var breakpoints = popatrisk_config["data"]["summary"]["all"]["breakpoints"]["natural"];
    var color = undefined;
    for(var i = 0; i < breakpoints.length; i++)
    {
      if(value < breakpoints[i])
      {
        color = colors[i];
        break;
      }
    }
    style["fillColor"] = (color == undefined) ? colors[colors.length-1] : color;
  }
  else
  {
    style["opacity"] = 0;
    style["fillOpacity"] = 0;
  }
  return style;
};
geosite.style_flood = function(f, state, map_config, popatrisk_config)
{
  var style = {};
  var filters = state["filters"]["popatrisk"];
  var rp = filters["rp"];
  var range = filters["popatrisk_range"];
  //
  var month_short3 = months_short_3[state["month"]-1];
  var value = f.properties["RP"+rp.toString(10)][month_short3];

  if(value >= range[0] && value <= range[1])
  {
      var colors = map_config["featurelayers"]["popatrisk"]["symbology"]["colors"];
      var breakpoints = popatrisk_config["data"]["summary"]["all"]["breakpoints"]["natural_adjusted"];
      var color = undefined;
      for(var i = 0; i < breakpoints.length; i++)
      {
        if(value < breakpoints[i])
        {
          color = colors[i];
          break;
        }
      }
      style["fillColor"] = (color == undefined) ? colors[colors.length-1] : color;
  }
  else
  {
    style["opacity"] = 0;
    style["fillOpacity"] = 0;
  }
  return style;
};

var buildPageURL = function(page, state)
{
  var url = sparc["pages"][page]["url"]
    .replace("{iso3}", state["iso3"])
    .replace("{hazard}", state["hazard"])
    .replace("{month}", state["month"]);

  var hash_args = [];
  var view = state["view"];
  if(view != undefined && view["z"] != undefined && view["lat"] != undefined && view["lon"] != undefined)
  {
    hash_args.push("z="+view["z"]);
    hash_args.push("lat="+view["lat"].toFixed(4));
    hash_args.push("lon="+view["lon"].toFixed(4));
  }
  var filters = state["filters"];
  if(filters)
  {
      $.each(state["filters"], function(layer_id, layer_filters)
      {
        $.each(layer_filters, function(filter_id, filter_value)
        {
            hash_args.push(layer_id+":"+filter_id+"="+filter_value);
        });
      });
  }
  if(hash_args.length > 0)
  {
    url += "#"+hash_args.join("&");
  }
  return url;
};
