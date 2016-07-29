var highlightFeature = function(e){
  var layer = e.target;
  /*if("hoverStyle" in layer.options && layer.options.hoverStyle != undefined)
  {
    var newStyle = layer.options.hoverStyle;
    layer.setStyle(newStyle);
    if (!L.Browser.ie && !L.Browser.opera){
      layer.bringToFront();
    }
  }*/
};

var init_map = function(opts)
{
  var map = L.map('map',
  {
    zoomControl: geodash.api.opt_b(opts, "zoomControl", false),
    minZoom: geodash.api.opt_i(opts, "minZoom", 3),
    maxZoom: geodash.api.opt_i(opts, "maxZoom", 18)
  });
  map.setView(
    [geodash.api.opt_i(opts,["latitude", "lat"],0), geodash.api.opt_i(opts,["longitude", "lon", "lng", "long"], 0)],
    geodash.api.opt_i(opts, ["zoom", "z"], 0));

  $.each(geodash.api.opt_j(opts, "listeners"), function(e, f){
    map.on(e, f);
  });

  return map;
};
geodash.controllers["controller_map_map"] = function(
  $rootScope, $scope, $element, $compile, $interpolate, $templateCache,
  state, map_config, live) {
  //////////////////////////////////////
  var listeners =
  {
    click: function(e) {
      var c = e.latlng;
      var delta = {
        "lat": c.lat,
        "lon": c.lng
      };
      geodash.api.intend("clickedOnMap", delta, $scope);
    },
    zoomend: function(e){
      var delta = {
        "extent": live["map"].getBounds().toBBoxString(),
        "z": live["map"].getZoom()
      };
      geodash.api.intend("viewChanged", delta, $scope);
    },
    dragend: function(e){
      var c = live["map"].getCenter();
      var delta = {
        "extent": live["map"].getBounds().toBBoxString(),
        "lat": c.lat,
        "lon": c.lng
      };
      geodash.api.intend("viewChanged", delta, $scope);
    },
    moveend: function(e){
      var c = live["map"].getCenter();
      var delta = {
        "extent": live["map"].getBounds().toBBoxString(),
        "lat": c.lat,
        "lon": c.lng
      };
      geodash.api.intend("viewChanged", delta, $scope);
    }
  };
  //////////////////////////////////////
  // The Map
  var hasViewOverride = hasHashValue(["latitude", "lat", "longitude", "lon", "lng", "zoom", "z"]);
  var view = state["view"];
  live["map"] = init_map({
    "zoomControl": map_config["controls"]["zoom"],
    "minZoom": map_config["view"]["minZoom"],
    "maxZoom": map_config["view"]["maxZoom"],
    "lat": view["lat"],
    "lon": view["lon"],
    "z": view["z"],
    "listeners": listeners
  });
  //////////////////////////////////////
  // Base Layers
  var baseLayers = geodash.layers.init_baselayers(live["map"], map_config["baselayers"]);
  $.extend(live["baselayers"], baseLayers);
  var baseLayerID = map_config["baselayers"][0].id;
  live["baselayers"][baseLayerID].addTo(live["map"]);
  geodash.api.intend("viewChanged", {'baselayer': baseLayerID}, $scope);
  geodash.api.intend("layerLoaded", {'type':'baselayer', 'layer': baseLayerID}, $scope);
  //////////////////////////////////////
  $.each(map_config.featurelayers, function(i, layerConfig)
  {
    if($.inArray(layerConfig.id, ["popatrisk", "context", "vam"]) == -1)
    {
      geodash.layers.init_featurelayer(layerConfig.id, layerConfig, $scope, live, map_config);
    }
  });
  //////////////////////////////////////
  // Feature layers
  if(geodash.api.hasFeatureLayer("context") && "features" in geodash.initial_data["layers"]["context"]["data"]["geojson"])
  {
    var context_popup_content = function(source)
    {
      console.log(source);
      var fl = geodash.api.getFeatureLayer("context");
      var f = source.feature;
      var popupTemplate = geodash.popup.buildPopupTemplate(fl.popup, fl, f);
      var ctx = {
        'layer': fl,
        'feature': {
          'attributes': f.properties,
          'geometry': {}
        }
      };
      return $interpolate(popupTemplate)(ctx);
    };
    // Load Context Layer
    live["featurelayers"]["context"] = L.geoJson(geodash.initial_data["layers"]["context"]["data"]["geojson"],{
      renderOrder: $.inArray("context", map_config.renderlayers),
      style: geodash.initial_data["layers"]["context"]["style"]["default"],
      /* Custom */
      hoverStyle: geodash.initial_data["layers"]["context"]["style"]["hover"],
      /* End Custom */
      onEachFeature: function(f, layer){
        var popupOptions = {maxWidth: 300};
        //var popupContent = "Loading ..."
        layer.bindPopup(context_popup_content, popupOptions);
        var fl = geodash.api.getFeatureLayer("context");
        if("label" in fl.cartography[0])
        {
          var featureLabel = $interpolate(fl.cartography[0].label.value)({
            'layer': fl,
            'feature': {
              'attributes': f.properties,
              'geometry': {}
            }
          });
          layer.bindLabel(featureLabel);
        }
        layer.on({
          mouseover: highlightFeature,
          mouseout: function(e) {
            live["featurelayers"]["context"].resetStyle(e.target);
          }
        });
      }
    });
  }

  // Load Population at Risk
  if(geodash.api.hasFeatureLayer("popatrisk")
    && "features" in geodash.initial_data["layers"]["popatrisk"]["data"]["geojson"])
  {
    var popatrisk_popup_content = function(source)
    {
      console.log(source);
      /////////////////////////////
      var $scope = angular.element("#geodash-main").scope();
      var state = $scope.state;
      var featureLayer = geodash.api.getFeatureLayer("popatrisk");
      var popupConfig = featureLayer["popup"];
      //ctx["chartID"] = chartConfig.id;
      var feature = geodash.api.normalize_feature(source.feature);
      feature.attributes.popatrisk = sparc.calculate_population_at_risk(
        state.hazard,
        feature,
        state,
        ["vam_filter_fcs", "vam_filter_csi"]);
      var popupContent = geodash.popup.buildPopupContent($interpolate, featureLayer, feature, state);
      //Push this at the end of the stack, so run's immediately after thread finishes execution
      setTimeout(function(){
        for(var i = 0; i < popupConfig.panes.length; i++)
        {
          var pane = popupConfig.panes[i];
          if("charts" in pane)
          {
            for(var j = 0; j < pane.charts.length; j++)
            {
              var chartConfig = pane.charts[j];
              var gc = buildGroupsAndColumnsForAdmin2(
                chartConfig,
                geodash.initial_data["layers"]["popatrisk"],
                feature.attributes.admin2_code);
              var chartOptions = {
                groups: gc.groups,
                columns: gc.columns,
                bullet_width: function(d, i) { return d.id == "rp25" ? 6 : 12; }
              };
              buildHazardChart(chartConfig, geodash.initial_data["layers"]["popatrisk"], chartOptions);
            }
          }
        }
      }, 1000);
      return popupContent;
      /////////////////////////////
    };

    live["featurelayers"]["popatrisk"] = L.geoJson(geodash.initial_data["layers"]["popatrisk"]["data"]["geojson"],{
      renderOrder: $.inArray("popatrisk", map_config.renderlayers),
      style: geodash.initial_data["layers"]["popatrisk"]["style"]["default"],
      /* Custom */
      hoverStyle: geodash.initial_data["layers"]["popatrisk"]["style"]["hover"],
      /* End Custom */
      onEachFeature: function(f, layer){
        var popupOptions = {maxWidth: 300};
        //var popupContent = "Loading ..."
        layer.bindPopup(popatrisk_popup_content, popupOptions);
        var fl = geodash.api.getFeatureLayer("popatrisk");
        var label = extract(["cartography", 0, "label"], fl);
        if(angular.isDefined(label))
        {
          var featureLabel = $interpolate(label.value)({
            'layer': fl,
            'feature': {
              'attributes': f.properties,
              'geometry': {}
            }
          });
          layer.bindLabel(featureLabel);
        }
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
    geodash.layers.init_featurelayer_post(
      $scope,
      live,
      "popatrisk",
      live["featurelayers"]["popatrisk"],
      ($.inArray("popatrisk", map_config.renderlayers) != -1));
      // Zoom to Data
      if(!hasViewOverride)
      {
          live["map"].fitBounds(live["featurelayers"]["popatrisk"].getBounds());
      }
  }
  //////////////////////////////////////
  // Sidebar Toggle
  $scope.$on("toggleComponent", function(event, args) {
    var component = args.component;
    var position = args.position;
    var classes = component+"-open "+component+"-"+position+"-open";
    $(args.selector).toggleClass(classes);
    setTimeout(function(){
      live["map"].invalidateSize({
        animate: true,
        pan: false
      });
    },2000);
  });
  /*$("#geodash-map-sidebar-toggle-left").click(function (){
    $(this).toggleClass("sidebar-open sidebar-left-open");
    $("#sparc-sidebar-left, #geodash-map").toggleClass("sidebar-open sidebar-left-open");
    setTimeout(function(){
      live["map"].invalidateSize({
        animate: true,
        pan: false
      });
    },2000);
  });*/
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
    if("popatrisk" in live["featurelayers"] && live["featurelayers"]["popatrisk"] != undefined)
    {
      live["featurelayers"]["popatrisk"].setStyle(geodash.initial_data["layers"]["popatrisk"]["style"]["default"]);
    }
    if("context" in live["featurelayers"] && live["featurelayers"]["context"] != undefined)
    {
      live["featurelayers"]["context"].setStyle(geodash.initial_data["layers"]["context"]["style"]["default"]);
    }
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

  $scope.$on("openPopup", function(event, args) {
    console.log("Refreshing map...");
    if(
      args["featureLayer"] != undefined &&
      args["feature"] != undefined &&
      args["location"] != undefined)
    {
      geodash.popup.openPopup(
        $interpolate,
        args["featureLayer"],
        args["feature"],
        args["location"],
        live["map"],
        angular.element("#geodash-main").scope().state);
    }
  });
};
