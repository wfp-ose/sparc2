geosite.controllers["controller_main"] = function($scope, $element, $controller, $http, $q, state, map_config, stateschema, popatrisk_config, live)
{

    $scope.state = geosite.init_state(state, stateschema);
    $scope.live = live;

    // Toggle Modals
    $scope.$on("toggleModal", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        //
        var main_scope = angular.element("#geosite-main").scope();
        var id = args["id"];
        var modal_scope = angular.element("#"+id).scope();
        var modal_scope_new = {
          "state": main_scope.state
        };
        if("static" in args)
        {
          modal_scope_new = $.extend(modal_scope_new, args["static"]);
        }
        $.each(args["dynamic"],function(key, value){
          modal_scope_new[key] = angular.isArray(value) ? extract(value, map_config): value;
        });
        modal_scope.$apply(function () {
            modal_scope = $.extend(modal_scope, modal_scope_new);
            setTimeout(function(){$("#"+id).modal('toggle');},0);
        });
    });

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

    // Filter Changed
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

    // Style Changed
    $scope.$on("selectStyle", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        //
        var $scope = angular.element("#geosite-main").scope();
        $scope.$apply(function () {
            $scope.state.styles[args["layer"]] = args["style"];
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
        var type = args.type;
        var layer = args.layer;
        var visible = args.visible != undefined ? args.visible : true;
        if(type == "featurelayer")
        {
          if(visible)
          {
            $scope.state.view.featurelayers.push(layer);
          }
        }
        else if(type == "baselayer")
        {
          $scope.state.view.baselayer = layer;
        }
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
    $scope.$on("showLayers", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        var $scope = angular.element("#geosite-main").scope();
        var layers = args.layers;
        for(var i = 0; i < layers.length; i++)
        {
          var layer = layers[i];
          if($.inArray(layer, $scope.state.view.featurelayers) == -1)
          {
            $scope.state.view.featurelayers.push(layer);
            // Refresh Map
            $scope.$broadcast("refreshMap", {'state': $scope.state});
          }
        }
    });
    $scope.$on("hideLayers", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        var $scope = angular.element("#geosite-main").scope();
        var layers = args.layers;
        for(var i = 0; i < layers.length; i++)
        {
          var layer = args.layers[i];
          var j = $.inArray(layer, $scope.state.view.featurelayers);
          if(j != -1)
          {
            $scope.state.view.featurelayers.splice(j, 1);
            // Refresh Map
            $scope.$broadcast("refreshMap", {'state': $scope.state});
          }
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

    $scope.$on("clickedOnMap", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        //
        var $scope = angular.element("#geosite-main").scope();
        var z = $scope.state.view.z;
        var visibleFeatureLayers = $scope.state.view.featurelayers;
        console.log("visibleFeatureLayers", visibleFeatureLayers);
        var featurelayers_by_featuretype = {};
        var fields_by_featuretype = {};
        var urls = [];
        for(var i = 0; i < visibleFeatureLayers.length; i++)
        {
            var fl = map_config.featurelayers[visibleFeatureLayers[i]];
            if(fl.wfs != undefined)
            {
              var params = {
                service: "wfs",
                version: fl.wfs.version,
                request: "GetFeature",
                srsName: "EPSG:4326",
              };

              var targetLocation = new L.LatLng(args.lat, args.lon);
              var bbox = geosite.tilemath.point_to_bbox(args.lon, args.lat, z, 4).join(",");
              var typeNames = fl.wfs.layers || fl.wms.layers || [] ;
              for(var j = 0; j < typeNames.length; j++)
              {
                typeName = typeNames[j];
                var url = fl.wfs.url + "?" + $.param($.extend(params, {typeNames: typeName, bbox: bbox}));
                urls.push(url);
                fields_by_featuretype[typeName.toLowerCase()] = geosite.layers.aggregate_fields(fl);
                featurelayers_by_featuretype[typeName.toLowerCase()] = fl;
              }
            }
          }

          $q.all(geosite.http.build_promises($http, urls)).then(function(responses){
              var features = geosite.http.build_features(responses, fields_by_featuretype);
              console.log("Features: ", features);
              if(features.length > 0 )
              {
                var featureAndLocation = geosite.vecmath.getClosestFeatureAndLocation(features, targetLocation);
                var fl = featurelayers_by_featuretype[featureAndLocation.feature.featuretype];
                $scope.$broadcast("openPopup", {
                  'featureLayer': fl,
                  'feature': featureAndLocation.feature,
                  'location': {
                    'lon': featureAndLocation.location.lng,
                    'lat': featureAndLocation.location.lat
                  }
                });
              }
          });
    });
};


var init_sparc_controller_main = function(that, app)
{
  geosite.init_controller(that, app, geosite.controllers.controller_main);

  $('.geosite-controller.geosite-sidebar.geosite-sidebar-left', that).each(function(){
    geosite.init_controller($(this), app, geosite.controllers.controller_sidebar_sparc);
  });

  $('.geosite-controller.geosite-sidebar.geosite-sidebar-right', that).each(function(){
    geosite.init_controller($(this), app, geosite.controllers.controller_sidebar_editor);
  });

  $('.geosite-controller.geosite-map', that).each(function(){
    // Init This
    geosite.init_controller($(this), app, geosite.controllers.controller_map);

    // Init Children
    geosite.init_controllers($(this), app, [
      { "selector": ".geosite-controller.geosite-map-map", "controller": geosite.controllers.controller_map_map },
      { "selector": ".geosite-controller.sparc-map-calendar", "controller": geosite.controllers.controller_calendar },
      { "selector": ".geosite-controller.sparc-map-breadcrumb", "controller": geosite.controllers.controller_breadcrumb },
      { "selector": ".geosite-controller.geosite-map-filter", "controller": geosite.controllers.controller_filter },
      { "selector": ".geosite-controller.geosite-map-legend", "controller": geosite.controllers.controller_legend },
    ]);

    // Init Modals
    geosite.init_controllers($(this), app, [
      { "selector": ".geosite-controller.geosite-controller-modal", "controller": geosite.controllers.controller_modal }
    ]);
  });
};
