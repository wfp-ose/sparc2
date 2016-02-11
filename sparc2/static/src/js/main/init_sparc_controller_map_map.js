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
  })

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
      }catch(err){console.log("Could not add baselayer "+i)};
  }
  return layers;
};

var init_sparc_controller_map_map = function(that, app)
{
  var controllerName = that.data('controllerName');
  var controllerType = that.data('controllerType');

  app.controller(controllerName, function($scope, $element, $interpolate, state, popatrisk_config, map_config, live) {
    //////////////////////////////////////
    var listeners =
    {
      zoomend: function(e){
        var delta = {
          "extent": live["map"].getBounds().toBBoxString(),
          "z": live["map"].getZoom()
        };
        intend("viewChanged", delta, $scope);
      },
      dragend: function(e){
        var c = live["map"].getCenter();
        var delta = {
          "extent": live["map"].getBounds().toBBoxString(),
          "lat": c.lat,
          "lon": c.lng
        };
        intend("viewChanged", delta, $scope);
      },
      moveend: function(e){
        var c = live["map"].getCenter();
        var delta = {
          "extent": live["map"].getBounds().toBBoxString(),
          "lat": c.lat,
          "lon": c.lng
        };
        intend("viewChanged", delta, $scope);
      }
    };
    //////////////////////////////////////
    // The Map
    var view = state["view"];
    live["map"] = init_map({
      "zoom": map_config["controls"]["zoom"],
      "minZoom": map_config["view"]["minZoom"],
      "maxZoom": map_config["view"]["maxZoom"],
      "lat": view["lat"],
      "lon": view["lon"],
      "z": view["z"],
      "listeners": listeners
    })
    //////////////////////////////////////
    // Base Layers
    var baseLayers = init_baselayers(live["map"], map_config["baselayers"]);
    $.extend(live["baselayers"], baseLayers);
    var baseLayerID = map_config["baselayers"][0].id;
    live["baselayers"][baseLayerID].addTo(live["map"]);
    intend("viewChanged", {'baselayer': baseLayerID}, $scope);
    intend("layerLoaded", {'layer': baseLayerID}, $scope);
    //////////////////////////////////////
    // Feature layers
    var popupContent = function(source)
    {
      console.log(source);
      var f = source.feature;
      //
      var state = angular.element(document.body).injector().get('state')
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
      else
      {

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
      intend("layerLoaded", {'layer': id}, $scope);
    });
    // Zoom to Data
    if(!(hasHashValue(["latitude", "lat", "longitude", "lon", "lng", "zoom", "z"])))
    {
        live["map"].fitBounds(live["featurelayers"]["popatrisk"].getBounds());
    }
    //////////////////////////////////////
    // Sidebar Toggle
    $("#sparc-sidebar-toggle").click(function (){
      $(this).toggleClass("sidebar-open");
      $("#sparc-sidebar, #sparc-map").toggleClass("sidebar-open");
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
  });
};
