var geosite = {
  'directives': {},
  'filters': {},
  'vecmath': {},
  'tilemath': {},
  'api': {}
};

geosite.api.welcome = function(options)
{
  options = options || {};
  var scope = options['$scope'] || options['scope'] || angular.element("#geosite-main").scope();
  var intentData = {
    "id": "geosite-modal-welcome",
    "dynamic": {},
    "static": {
      "welcome": scope.map_config["welcome"]
    }
  };
  geosite.intend("toggleModal", intentData, scope);
};

geosite.assert_float = function(x, fallback)
{
  if(x === undefined || x === "")
  {
    return fallback;
  }
  else if(angular.isNumber(x))
  {
    return x;
  }
  else
  {
    return parseFloat(x);
  }
};

geosite.assert_array_length = function(x, length, fallback)
{
  if(x === undefined || x === "")
  {
    return fallback;
  }
  else if(angular.isString(x))
  {
    x = x.split(",");
    if(x.length == length)
    {
      return x;
    }
    else
    {
      return fallback;
    }
  }
  else if(angular.isArray(x))
  {
    if(x.length == length)
    {
      return x;
    }
    else
    {
      return fallback;
    }
  }
};

geosite.intend = function(name, data, scope)
{
    scope.$emit(name, data);
};

geosite.init_intents = function(element, scope)
{
  element.on('click', '.geosite-intent', function(event) {
    event.preventDefault();  // For anchor tags
    var that = $(this);
    if(that.hasClass('geosite-toggle'))
    {
      if(that.hasClass('geosite-off'))
      {
        that.removeClass('geosite-off');
        geosite.intend(that.data('intent-names')[0], that.data('intent-data'), scope);
      }
      else
      {
        that.addClass('geosite-off');
        geosite.intend(that.data('intent-names')[1], that.data('intent-data'), scope);
      }
    }
    else if(that.hasClass('geosite-radio'))
    {
      var siblings = that.parents('.geosite-radio-group:first').find(".geosite-radio").not(that);
      if(!(that.hasClass('geosite-on')))
      {
        that.addClass('geosite-on');
        if(that.data("intent-class-on"))
        {
          that.addClass(that.data("intent-class-on"));
          siblings.removeClass(that.data("intent-class-on"));
        }
        siblings.removeClass('geosite-on');
        if(that.data("intent-class-off"))
        {
          that.removeClass(that.data("intent-class-off"));
          siblings.addClass(that.data("intent-class-off"));
        }
        geosite.intend(that.data('intent-name'), that.data('intent-data'), scope);
      }
    }
    else
    {
      geosite.intend(that.data('intent-name'), that.data('intent-data'), scope);
    }
  });
};

geosite.controllers = {};

geosite.controllers.controller_base = function($scope, $element) {

  this.intend = geosite.intend;

  geosite.init_intents($($element), $scope);

};

geosite.init_controller_base = function(app)
{
  app.controller("GeositeControllerBase", geosite.controllers.controller_base);
};

geosite.init_controller = function(that, app, controller)
{
  var controllerName = that.data('controllerName');
  var controllerType = that.data('controllerType');

  app.controller(controllerName, controller || geosite.controllers.controller_base);
};

geosite.init_controllers = function(that, app, controllers)
{
  for(var i = 0; i < controllers.length; i++)
  {
    var c = controllers[i];
    $(c.selector, that).each(function(){
        try
        {
          geosite.init_controller($(this), app, c.controller);
        }
        catch(err)
        {
          console.log("Could not load Geosite Controller \""+c.selector+"\"", err);
        }
    });
  }
};

geosite.vecmath = {};

geosite.vecmath.distance = function(a, b)
{
  var p = L.Projection.SphericalMercator;
  if(b.toString != undefined && b.toString().startsWith('LatLng'))
  {
    return (p.project(a)).distanceTo(p.project(b));
  }
  else
  {
    var minDistance = undefined;
    $.each(b._layers, function(id, layer)
    {
      var verticies = layer._latlngs;
      var i = 0;
      if(minDistance == undefined)
      {
        minDistance = L.LineUtil.pointToSegmentDistance(
          p.project(a),
          p.project(verticies[i]),
          p.project(verticies[i+1]));
        i++;
      }
      for(; i < verticies.length -1; i++)
      {
        var d = L.LineUtil.pointToSegmentDistance(
          p.project(a),
          p.project(verticies[i]),
          p.project(verticies[i+1]));
        if(d < minDistance)
        {
          minDistance = d;
        }
      }
    });
    return minDistance;
  }
};

geosite.vecmath.closestLocation = function(a, b)
{
  if(b.toString != undefined && b.toString().startsWith('LatLng'))
  {
    return b;
  }
  else
  {
    var p = L.Projection.SphericalMercator;
    var minDistance = undefined;
    var closestPoint = undefined;
    $.each(b._layers, function(id, layer)
    {
      var verticies = layer._latlngs;
      var i = 0;
      if(minDistance == undefined)
      {
        minDistance = L.LineUtil.pointToSegmentDistance(
          p.project(a),
          p.project(verticies[i]),
          p.project(verticies[i+1]));
        closestPoint = L.LineUtil.closestPointOnSegment(
          p.project(a),
          p.project(verticies[i]),
          p.project(verticies[i+1]));
        i++;
      }
      for(; i < verticies.length -1; i++)
      {
        var d = L.LineUtil.pointToSegmentDistance(
          p.project(a),
          p.project(verticies[i]),
          p.project(verticies[i+1]));
        if(d < minDistance)
        {
          minDistance = d;
          closestPoint = L.LineUtil.closestPointOnSegment(
            p.project(a),
            p.project(verticies[i]),
            p.project(verticies[i+1]));
        }
      }
    });
    return p.unproject(closestPoint);
  }
};

geosite.vecmath.getClosestFeatureAndLocation = function(nearbyFeatures, target)
{
  var closestFeature = undefined;
  var closestDistance = 0;
  var closestLocation = undefined;
  if(nearbyFeatures != undefined)
  {
    if(nearbyFeatures.length > 0)
    {
      closestFeature = nearbyFeatures[0];
      closestDistance = geosite.vecmath.distance(target, nearbyFeatures[0].geometry);
      closestLocation = geosite.vecmath.closestLocation(target, nearbyFeatures[0].geometry);
      for(var i = 1; i < nearbyFeatures.length ;i++)
      {
        var f = nearbyFeatures[i];
        if(geosite.vecmath.distance(target, f.geometry) < closestDistance)
        {
          closestFeature = f;
          closestDistance = geosite.vecmath.distance(target, f.geometry);
          closestLocation = geosite.vecmath.closestLocation(target, f.geometry);
        }
      }
    }
  }
  return {'feature': closestFeature, 'location': closestLocation};
};

/**
 * init_state will overwrite the default state from the server with params in the url.
 * @param {Object} state - Initial state from server
 */
geosite.init_state = function(state, stateschema)
{
  var newState = $.extend({}, state);

  // Update View
  var lat = getHashValueAsFloat(["latitude", "lat", "y"]) || state["lat"] || 0.0;
  var lon = getHashValueAsFloat(["longitude", "lon", "long", "lng", "x"]) || state["lon"] || 0.0;
  var z = getHashValueAsInteger(["zoom", "z"]) || state["z"] || 3;
  var delta = {'lat': lat, 'lon': lon, 'z': z};
  newState["view"] = newState["view"] != undefined ? $.extend(newState["view"], delta) : delta;

  // Update Filters
  if(newState["filters"] != undefined)
  {
    $.each(newState["filters"], function(layer_id, layer_filters){
      $.each(layer_filters, function(filter_id, filer_value){
        var type = stateschema["filters"][layer_id][filter_id].toLowerCase();
        var value = getHashValue(layer_id+":"+filter_id, type);
        if(value != undefined && value != "")
        {
          newState["filters"][layer_id][filter_id] = value;
        }
      });
    });
  }

  // Update Filters
  if(newState["styles"] != undefined)
  {
    /*
    $.each(newState["styles"], function(layer_id, layer_style){
      var type = stateschema["filters"][layer_id][filter_id].toLowerCase();
      var value = getHashValue("style:"+layer_id, type);
      if(value != undefined && value != "")
      {
        newState["filters"][layer_id][filter_id] = value;
      }
    });*/
  }

  return newState;
};

/**
 * Initializes a filter slider's label
 * @constructor
 * @param {Object} that - DOM element for slider
 * @param {string} type - Either ordinal or continuous
 * @param {Object} range - Either true, "min", or "max".
 * @param {Object} value - If range is true, then integer array, else integer.
 */
geosite.ui_init_slider_label = function($interpolate, that, type, range, value)
{
  if(type=="ordinal")
  {
    var ctx = {"value": value};
    that.data('label').html($interpolate(that.data('label-template'))(ctx));
  }
  else if(type=="continuous")
  {
    if(($.type(range) == "boolean" && range ) || (range.toLowerCase() == "true"))
    {
      var ctx = {"values": [value[0], value[1]]};
      that.data('label').html($interpolate(that.data('label-template'))(ctx));
    }
    else if(range=="min" || range=="max")
    {
      var ctx = {"value": value};
      that.data('label').html($interpolate(that.data('label-template'))(ctx));
    }
  }
};

/**
 * Initializes a filter slider's label
 * @constructor
 * @param {Object} $interplate - Angular $interpolate function
 * @param {Object} $scope - Angular $scope
 * @param {Object} that - DOM element for slider
 * @param {string} type - Either ordinal or continuous
 * @param {Object} range - Either true, "min", or "max".
 * @param {Object} value - If range is true, then integer array, else integer.
 */
geosite.ui_init_slider_slider = function($interpolate, $scope, that, type, range, value, minValue, maxValue, step)
{
  if(type=="ordinal")
  {
    that.slider({
      range: (($.type(range) == "boolean" && range ) || (range.toLowerCase() == "true")) ? true : range,
      value: value,
      min: 0,
      max: maxValue,
      step: 1,
      slide: function(event, ui) {
          geosite.ui_update_slider_label.apply(this, [$interpolate, event, ui]);
          var output = that.data('output');
          var newValue = that.data('options')[ui.value];
          var filter = {};
          filter[output] = newValue;
          geosite.intend("filterChanged", {"layer":"popatrisk", "filter":filter}, $scope);
      }
    });
  }
  else if(type=="continuous")
  {
    if(($.type(range) == "boolean" && range ) || (range.toLowerCase() == "true"))
    {
      that.slider({
        range: true,
        values: value,
        min: minValue,
        max: maxValue,
        step: step,
        slide: function(event, ui) {
            geosite.ui_update_slider_label.apply(this, [$interpolate, event, ui]);
            var output = that.data('output');
            var newValue = ui.values;
            var filter = {};
            filter[output] = newValue;
            geosite.intend("filterChanged", {"layer":"popatrisk", "filter":filter}, $scope);
        }
      });
    }
    else if(range=="min" || range=="max")
    {
      that.slider({
        range: range,
        value: value,
        min: minValue,
        max: maxValue,
        step: step,
        slide: function(event, ui) {
            geosite.ui_update_slider_label.apply(this, [$interpolate, event, ui]);
            var output = that.data('output');
            var newValue = ui.value / 100.0;
            var filter = {};
            filter[output] = newValue;
            geosite.intend("filterChanged", {"layer":"popatrisk", "filter":filter}, $scope);
        }
      });
    }
  }
};


/**
 * Updates a filter slider's label
 * @constructor
 * @param {Object} event - A jQuery UI event object
 * @param {Object} author - A jQuery UI ui object
 */
geosite.ui_update_slider_label = function($interpolate, event, ui)
{
  var that = $(this);
  var type = that.data('type');
  var range = that.data('range');

  if(type=="ordinal")
  {
    var ctx = {"value": that.data('options')[ui.value]};
    that.data('label').html($interpolate(that.data('label-template'))(ctx));
  }
  else if(type=="continuous")
  {
    if(($.type(range) == "boolean" && range ) || (range.toLowerCase() == "true"))
    {
      var ctx = {"values": [ui.values[0], ui.values[1]]};
      that.data('label').html($interpolate(that.data('label-template'))(ctx));
    }
    else if(range=="min" || range=="max")
    {
      var ctx = {"value": (ui.value / 100.0)};
      that.data('label').html($interpolate(that.data('label-template'))(ctx));
    }
  }
};

var getHashValue = function(keys, type)
{
    var value = undefined;
    if(typeof keys === 'string')
    {
      keys = [keys.toLowerCase()];
    }
    else
    {
      keys = $.map(keys,function(value, i){return value.toLowerCase();});
    }
    var hash_lc = location.hash.toLowerCase();
    for(var i = 0; i < keys.length; i++)
    {
      var key = keys[i];
      var keyAndHash = hash_lc.match(new RegExp(key + '=([^&]*)'));
      if(keyAndHash)
      {
          value = keyAndHash[1];
          if(value != undefined && value != null && value != "")
          {
            break;
          }
      }
    }

    if(type != undefined)
    {
        if(type == "integer")
        {
          value = (value != undefined && value != null && value != "") ? parseInt(value, 10) : undefined;
        }
        else if(type == "stringarray")
        {
          if(value != undefined)
          {
            var newValue = value.split(",");
            value = newValue;
          }
        }
        else if(type == "integerarray")
        {
          if(value != undefined)
          {
            var sValue = value.split(",");
            var newValue = [];
            for(var i = 0; i < sValue.length; i++)
            {
              var v = sValue[i];
              newValue.push((v != undefined && v != null && v != "") ? parseInt(v, 10) : undefined);
            }
            value = newValue;
          }
        }
        else if(type == "float")
        {
          value = (value != undefined && value != null && value != "") ? parseFloat(value) : undefined;
        }
        else if(type == "floatarray")
        {
          if(value !=undefined)
          {
            var sValue = value.split(",");
            var newValue = [];
            for(var i = 0; i < sValue.length; i++)
            {
              var v = sValue[i];
              newValue.push((v != undefined && v != null && v != "") ? parseFloat(v) : undefined);
            }
            value = newValue;
          }
        }
    }
    return value;
};
var hasHashValue = function(keys)
{
    var value = getHashValue(keys);
    return value != undefined && value != null && value != "";
};
var getHashValueAsStringArray = function(keys)
{
  return getHashValue(keys, "stringarray");
};
var getHashValueAsInteger = function(keys)
{
  return getHashValue(keys, "integer");
};
var getHashValueAsIntegerArray = function(keys)
{
  return getHashValue(keys, "integerarray");
};
var getHashValueAsFloat = function(keys)
{
  return getHashValue(keys, "float");
};
var sortLayers = function(layers, reverse)
{
  var renderLayers = $.isArray(layers) ? layers : $.map(layers, function(layer){return layer;});
  renderLayers = renderLayers.sort(function(a, b){
      return a.options.renderOrder - b.options.renderOrder;
  });
  if(reverse === true)
    renderLayers.reverse();
  return renderLayers;
};
var updateRenderOrder = function(layers)
{
    for(var i = 0; i < layers.length; i++)
    {
        layers[i].bringToFront();
    }
};
var layersAsArray = function(layers)
{
  return $.map(layers, function(layer, id){return {'id':id, 'layer':layer};});
};
var extract = function(keyChain, node)
{
	var obj = undefined;
	if(keyChain.length==0)
	{
		obj = node;
	}
	else
	{
		if(node!=undefined)
		{
			var newKeyChain = keyChain.slice(1);
			var newNode = Array.isArray(node) ? node[keyChain[0]]: node[""+keyChain[0]];
			obj = extract(newKeyChain, newNode);
		}
	}
	return obj;
};

geosite.codec = {};

geosite.codec.parseFeatures = function(response, fields_by_featuretype)
{
  var features = [];
  //$(response).find("FeatureCollection")  No need to search for featurecollection.  It IS the featurecollection
  $(response).find('gml\\:featuremember').each(function(){
      //var f = $(this).find(typeName.indexOf(":") != -1 ? typeName.substring(typeName.indexOf(":") + 1) : typeName);
      var f = $(this).children();
      var typeName = f.prop("tagName").toLowerCase();
      var attributes = geosite.codec.parseAttributes(f, fields_by_featuretype[typeName]);
      var shape = f.find("geonode\\:shape");
      var geom = undefined;
      if(shape.find("gml\\:point").length > 0)
      {
        var coords = shape.find("gml\\:point").find("gml\\:coordinates").text().split(",");
        geom = new L.LatLng(parseFloat(coords[1]), parseFloat(coords[0]));
      }
      else if(shape.find("gml\\:multilinestring").length > 0)
      {
        var coords = shape.find("gml\\:multilinestring")
          .find("gml\\:linestringmember")
          .find("gml\\:linestring")
          .find("gml\\:coordinates")
          .text().split(" ");
        coords = $.map(coords, function(x, i){
          var a = x.split(",");
          return [[parseFloat(a[0]), parseFloat(a[1])]];
        });
        var geojson = [{"type": "LineString","coordinates": coords}];
        geom = new L.GeoJSON(geojson, {});
      }
      var newFeature = {
        'featuretype': typeName,
        'attributes': attributes,
        'geometry': geom
      };
      features.push(newFeature);
  });
  return features;
};
geosite.codec.parseAttributes  = function(element, fields)
{
  var attributes = {};
  for(var k = 0; k < fields.length; k++)
  {
    var field = fields[k];
    var attributeName = field['output'] || field['attribute'];
    attributes[attributeName] = undefined;
    var inputName = field['attribute'] || field['input'];
    var inputNames = inputName != undefined ? [inputName] : field['inputs'];
    if(inputNames!= undefined)
    {
      for(var l = 0; l < inputNames.length; l++)
      {
        var inputName = inputNames[l];
        if(element.find("geonode\\:"+inputName).length > 0)
        {
          attributes[attributeName] = element.find("geonode\\:"+inputName).text();
          break;
        }
      }
    }
  }
  return attributes;
};

geosite.popup = {};

geosite.popup.buildChart = function(chart, layer, feature, state)
{
  return "<div id=\""+chart.id+"\" class=\"geosite-popup-chart\"></div>"
}

geosite.popup.buildField = function(field, layer, feature, state)
{
  var output = field["output"] || field["attribute"];
  var html = undefined;
  var bInclude = false;
  if(field.when != undefined)
  {
    if(field.when.toLowerCase() == "defined")
    {
      if(feature.attributes[output] != undefined)
      {
        bInclude = true;
      }
    }
    else
    {
      bInclude = true;
    }
  }
  else
  {
    bInclude = true;
  }

  if(bInclude)
  {
    if(field.type == "link")
    {
      var value = field.value != undefined ? field.value : "{{ feature.attributes." + output + " }}";
      html = "<span><b>"+ field.label +":</b> <a target=\"_blank\" href=\""+field.url+"\">";
      html += value;
      html += "</a></span>";
    }
    else
    {
      var value = undefined;
      if(field.value != undefined)
      {
        value = field.value;
      }
      else
      {
        if(field.type == "date")
        {
          var format = field.format || "medium";
          value = "feature.attributes." + output + " | date:'"+format+"'"
        }
        else
        {
          value = "feature.attributes." + output
        }
        if(field.fallback)
        {
          value = "("+value+") || '"+field.fallback+"'"
        }
        value = "{{ "+value +" }}";
      }
      html = "<span><b>"+ field.label +":</b> "+value+"</span>";
    }
  }
  return html;
};

geosite.popup.buildPopupTemplate = function(popup, layer, feature, state)
{
  var panes = popup.panes;
  var popupTemplate = "";
  //////////////////
  if(angular.isDefined(popup.title))
  {
    popupTemplate += "<h5 style=\"word-wrap:break-word;text-align:center;\">"+popup.title+"</h5>";
  }
  //////////////////
  var paneContents = [];
  for(var i = 0; i < panes.length; i++)
  {
    var pane = panes[i];
    var popupFields = [];
    var popupCharts = [];
    if("fields" in pane)
    {
      for(var j = 0; j < pane.fields.length; j++)
      {
        var popupField = geosite.popup.buildField(pane.fields[j], layer, feature, state);
        if(popupField != undefined)
        {
          popupFields.push(popupField);
        }
      }  
    }
    if("charts" in pane)
    {
      for(var j = 0; j < pane.charts.length; j++)
      {
        var popupChart = geosite.popup.buildChart(pane.charts[j], layer, feature, state);
        if(popupChart != undefined)
        {
          popupCharts.push(popupChart);
        }
      }
    }
    var paneContent = popupFields.join("<br>");
    if(popupCharts.length > 0)
    {
      paneContent += "<hr>" + popupCharts.join("<br>");
    }
    paneContents.push(paneContent);
  }
  //////////////////
  if(panes.length > 1)
  {
    var tabs = [];
    var pane = panes[0];
    tabs.push("<li class=\"active\"><a data-toggle=\"tab\" href=\"#"+pane.id+"\">"+pane.tab.label+"</a></li>");
    for(var i = 1; i < panes.length; i++)
    {
      pane = panes[i];
      tabs.push("<li><a data-toggle=\"tab\" href=\"#"+pane.id+"\">"+pane.tab.label+"</a></li>");
    }
    var tab_html = "<ul class=\"nav nav-tabs nav-justified\">"+tabs.join("")+"</ul>";
    ///////////////
    var paneContentsWithWrapper = [];
    paneContentsWithWrapper.push("<div id=\""+panes[0].id+"\" class=\"tab-pane fade in active\">"+paneContents[0]+"</div>");
    for(var i = 1; i < panes.length; i++)
    {
      paneContentsWithWrapper.push("<div id=\""+panes[i].id+"\" class=\"tab-pane fade\">"+paneContents[i]+"</div>");
    }
    ///////////////
    var content_html = "<div class=\"tab-content\">"+paneContentsWithWrapper.join("")+"</div>";
    popupTemplate += tab_html + content_html;
  }
  else
  {
    popupTemplate += paneContents[0];
  }
  return popupTemplate;
};

geosite.popup.buildPopupContent = function($interpolate, featureLayer, feature, state)
{
  var popupTemplate = geosite.popup.buildPopupTemplate(featureLayer.popup, featureLayer, feature, state);
  var ctx = {
    'layer': featureLayer,
    'feature': feature,
    'state': state
  };
  return $interpolate(popupTemplate)(ctx);
};

geosite.popup.openPopup = function($interpolate, featureLayer, feature, location, map, state)
{
  var popupContent = geosite.popup.buildPopupContent($interpolate, featureLayer, feature, state);
  var popup = new L.Popup({maxWidth: (featureLayer.popup.maxWidth || 400)}, undefined);
  popup.setLatLng(new L.LatLng(location.lat, location.lon));
  popup.setContent(popupContent);
  map.openPopup(popup);
};

geosite.tilemath = {
  "D2R": Math.PI / 180,
  "R2D": 180 / Math.PI
};

geosite.tilemath.point_to_bbox = function(x, y, z, digits)
{
  var radius = geosite.tilemath.point_to_radius(z);
  var e = x + radius; if(digits != undefined && digits >= 0){e = e.toFixed(digits);}
  var w = x - radius; if(digits != undefined && digits >= 0){w = w.toFixed(digits);}
  var s = y - radius; if(digits != undefined && digits >= 0){s = s.toFixed(digits);}
  var n = y + radius; if(digits != undefined && digits >= 0){n = n.toFixed(digits);}
  return [w, s, e, n];
};

geosite.tilemath.point_to_radius = function(z)
{
  return (geosite.config.click_radius || 4.0) / z;
};

geosite.tilemath.tms_to_bbox = function(x, y, z)
{
  var e = geosite.tilemath.tile_to_lon(x+1, z);
  var w = geosite.tilemath.tile_to_lon(x, z);
  var s = geosite.tilemath.tile_to_lat(y+1, z);
  var n = geosite.tilemath.tile_to_lat(y, z);
  return [w, s, e, n];
};


geosite.tilemath.tile_to_lon = function(x, z)
{
  return x / Math.pow(2, z) * 360-180;
};


geosite.tilemath.tile_to_lat = function(y, z)
{
  n = Math.pi - 2 * Math.PI * y / Math.pow(2,z);
  return ( R2D * Math.atan(0.5 * ( Math.exp(n) - Math.exp(-n))));
};

geosite.http = {};

geosite.http.build_promises = function($http, urls)
{
  var promises = [];
  for(var i = 0; i < urls.length; i++)
  {
    var url = urls[i];
    var config = {};
    var promise = $http.get(url, config);
    promises.push(promise);
  }
  return promises;
};
geosite.http.build_features = function(responses, fields_by_featuretype)
{
  var features = [];
  for(var i = 0; i < responses.length; i++)
  {
    var response = responses[i];
    if(response.status == 200)
    {
      var data = response.data;
      features = features.concat(geosite.codec.parseFeatures(data, fields_by_featuretype));
    }
  }
  return features;
};

geosite.layers = {};

geosite.layers.aggregate_fields = function(featureLayer)
{
  var fields = [];
  for(var i = 0; i < featureLayer.popup.panes.length; i++)
  {
    fields = fields.concat(featureLayer.popup.panes[i].fields);
  }
  return fields;
};
geosite.layers.init_baselayers = function(map, baselayers)
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
geosite.layers.init_featurelayer_post = function($scope, live, id, fl, visible)
{
  if(fl != undefined)
  {
    if(visible != undefined ? visible : true)
    {
      fl.addTo(live["map"]);
    }
    geosite.intend("layerLoaded", {'type':'featurelayer', 'layer': id, 'visible': visible}, $scope);
  }
  else
  {
    console.log("Could not add featurelayer "+id+" because it is undefined.");
  }
};
geosite.layers.init_featurelayer_wms = function($scope, live, map_config, id, layerConfig)
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
    attribution: layerConfig.source.attribution
  });
  live["featurelayers"][id] = fl;
  geosite.layers.init_featurelayer_post($scope, live, id, fl, layerConfig.visible);
};
geosite.layers.init_featurelayer_geojson = function($scope, live, map_config, id, layerConfig)
{
  $.ajax({
    url: layerConfig.source.url,
    dataType: "json",
    success: function(response){
      var fl = undefined;
      if(layerConfig.transform == "heatmap")
      {
        var heatLayerData = [];
        var maxIntensity = 0;
        for(var i = 0; i < response[0]["features"].length; i++)
        {
          var intensity = ("attribute" in layerConfig["heatmap"] && layerConfig["heatmap"]["attribute"] != "") ? response[0]["features"][i]["properties"][layerConfig["heatmap"]["attribute"]] : 1.0;
          heatLayerData.push([
            response[0]["features"][i]["geometry"]["coordinates"][1],
            response[0]["features"][i]["geometry"]["coordinates"][0],
            intensity
          ]);
          if(intensity > maxIntensity)
          {
            maxIntensity = intensity;
          }
        }
        for(var i = 0; i < heatLayerData.length; i++)
        {
          heatLayerData[i][2] = heatLayerData[i][2] / maxIntensity;
        }

        var canvas = L.heatCanvas();
        fl = L.heatLayer(heatLayerData, {
          "renderer": canvas,
          "attribution": layerConfig["source"]["attribution"],
          "radius": (layerConfig["heatmap"]["radius"] || 25),
          "blur": (layerConfig["heatmap"]["blur"] || 15),
          "max": (layerConfig["heatmap"]["max"] || 1.0),
          "minOpacity": (layerConfig["heatmap"]["minOpacity"] || 0.5)
        });
      }
      else
      {
        fl = L.geoJson(response, {
          attribution: layerConfig.source.attribution
        });
      }
      live["featurelayers"][id] = fl;
      geosite.layers.init_featurelayer_post($scope, live, id, fl, layerConfig.visible);
    }
  });
};
geosite.layers.init_featurelayer = function(id, layerConfig, $scope, live, map_config)
{
  if(layerConfig.enabled == undefined || layerConfig.enabled == true)
  {
    if(layerConfig.type.toLowerCase() == "geojson")
    {
      geosite.layers.init_featurelayer_geojson($scope, live, map_config, id, layerConfig);
    }
    else if(layerConfig.type.toLowerCase() == "wms")
    {
      geosite.layers.init_featurelayer_wms($scope, live, map_config, id, layerConfig);
    }
  }
};
geosite.layers.init_featurelayers = function(featureLayers, $scope, live, map_config)
{
  $.each(featureLayers, function(id, layerConfig){
    geosite.layers.init_featurelayer(id, layerConfig, $scope, live, map_config);
  });
};

var sparc = {};

sparc.welcome = function(options)
{
  options = options || {};
  var scope = options['$scope'] || options['scope'] || angular.element("#geosite-main").scope();
  var intentData = {
    "id": "sparc-modal-welcome",
    "modal": {
      "backdrop": "static",
      "keyboard": false
    },
    "dynamic": {},
    "static": {
      "welcome": scope.map_config["welcome"]
    }
  };
  geosite.intend("toggleModal", intentData, scope);
};

sparc.normalize_feature = function(feature)
{
  var feature = {
    'attributes': feature.attributes || feature.properties,
    'geometry': feature.geometry
  };
  return feature;
};

sparc.calculate_population_at_risk = function(hazard, feature, state, filters)
{
  var value = 0;
  var month_short3 = months_short_3[state["month"]-1];

  if(hazard == "cyclone")
  {
    var prob_class_max = state["filters"]["popatrisk"]["prob_class_max"];
    var category = state["filters"]["popatrisk"]["category"];
    for(var i = 0; i < feature.attributes.addinfo.length; i++)
    {
      var a = feature.attributes.addinfo[i];
      if(a["category"] == category)
      {
        if(a["prob_class_max"] != 0 && a["prob_class_max"] <= prob_class_max)
        {
          console.log("matched prob_class", prob_class_max);
          value += a[month_short3];
        }
      }
    }
  }
  else if(hazard == "drought")
  {
    var prob_class_max = state["filters"]["popatrisk"]["prob_class_max"];
    for(var i = 0; i < feature.attributes.addinfo.length; i++)
    {
      var a = feature.attributes.addinfo[i];
      if(a["month"] == month_short3)
      {
        if(a["prob"] != 0 && a["prob"] < prob_class_max)
        {
          value += a["popatrisk"];
        }
      }
    }
  }
  else if(hazard == "flood")
  {
    var rp = state["filters"]["popatrisk"]["rp"];
    value = feature.attributes["RP"+rp.toString(10)][month_short3];
  }

  if(filters != undefined)
  {
    $.each(filters, function(i, x){
      value = geosite[x](value, state["filters"]["popatrisk"], feature);
    });
  }

  return value;
};

var buildGroupsAndColumnsForCountry = function(chartConfig, popatrisk_config)
{
  var groups = [[]];
  var columns = [];
  var order = undefined;

  if (chartConfig.hazard == "cyclone")
  {
    $.each(popatrisk_config["data"]["summary"]["prob_class"], function(prob_class, value){
      var data = value["by_month"];
      //
      columns.push([prob_class].concat(data));
      groups[0].push(prob_class);
    });

    groups[0].sort(function(a, b){
      return parseFloat(b.split("-")[0]) - parseFloat(a.split("-")[0]);
    });

    columns.sort(function(a, b){
      return parseFloat(a[0].split("-")[0]) - parseFloat(b[0].split("-")[0]);
    });

    order = function(data1, data2) {
      return parseFloat(data2.id.split("-")[0]) - parseFloat(data1.id.split("-")[0]);
    };
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

  return {'groups': groups, 'columns': columns, 'order': order};
};
var buildGroupsAndColumnsForAdmin2 = function(chartConfig, popatrisk_config, admin2_code)
{
  var groups = [[]];
  var columns = [];
  var order = undefined;

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


    groups[0].sort(function(a, b){
      return parseFloat(b.split("-")[0]) - parseFloat(a.split("-")[0]);
    });

    columns.sort(function(a, b){
      return parseFloat(a[0].split("-")[0]) - parseFloat(b[0].split("-")[0]);
    });

    order = function(data1, data2) {
      return parseFloat(data2.id.split("-")[0]) - parseFloat(data1.id.split("-")[0]);
    };
  }
  return {'groups': groups, 'columns': columns, 'order': order};
};
var buildHazardChart = function(chartConfig, popatrisk_config, options)
{
  var gc = undefined;
  if(chartConfig.type == "bar")
  {
    //var groups = [[]];
    //var columns = [];
    if(options != undefined && options.groups != undefined && options.columns != undefined)
    {
      gc = {
        "groups": options.groups,
        "columns": options.columns,
        "order": undefined
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
      bindto: "#"+ (chartConfig.element || chartConfig.id),
      data: {
        columns: gc.columns,
        groups: gc.groups,
        type: 'bar',
        colors: chartConfig.colors,
        order: (gc.order || 'desc')
      },
      axis : axisConfig,
      bar: barConfig
    });
  }
};

geosite.config = {
  'click_radius': 2.0
};

geosite.init_country = function(appName)
{

  var url_context_summary = geosite.map_config["featurelayers"]["context"]["urls"]["summary"]
    .replace("{iso3}", geosite.initial_state["iso3"]);

  var url_context_geojson = geosite.map_config["featurelayers"]["context"]["urls"]["geojson"]
    .replace("{iso3}", geosite.initial_state["iso3"]);

  var url_vam_geojson = geosite.map_config["featurelayers"]["vam"]["urls"]["geojson"]
    .replace("{iso3}", geosite.initial_state["iso3"]);

  $.when(
    $.ajax({dataType: "json", url: url_context_summary}),
    $.ajax({dataType: "json", url: url_context_geojson}),
    $.ajax({dataType: "json", url: url_vam_geojson})
  ).done(function(
    response_context_summary,
    response_context_geojson,
    response_vam_geojson
    ){
    geosite.initial_data["layers"]["context"]["data"]["summary"] = response_context_summary[0];
    geosite.initial_data["layers"]["context"]["data"]["geojson"] = response_context_geojson[0];
    geosite.initial_data["layers"]["vam"]["data"]["geojson"] = response_vam_geojson[0];

    geosite.breakpoints = {};

    $.each(geosite.initial_data["layers"]["context"]["data"]["summary"]["all"]["breakpoints"], function(k, v){
      geosite.breakpoints["context_"+k] = v;
    });

    geosite.init_country_main_app(appName);
  });
};

geosite.init_country_main_app = function(appName)
{
  geosite.app = app = angular.module(appName, ['ngRoute','ngSanitize']);

  if(geosite.templates != undefined)
  {
    $.each(geosite.templates, function(name, template){
      app.run(function($templateCache){$templateCache.put(name,template);});
    });
  }

  if(geosite.filters != undefined)
  {
    $.each(geosite.filters, function(name, func){ app.filter(name, func); });
  }

  if(geosite.directives != undefined)
  {
    $.each(geosite.directives, function(name, dir){ app.directive(name, dir); });
  }

  app.factory('state', function(){return $.extend({}, geosite.initial_state);});
  app.factory('stateschema', function(){return $.extend({}, geosite.state_schema);});
  app.factory('map_config', function(){return $.extend({}, geosite.map_config);});
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

geosite.init_countryhazardmonth = function(appName)
{
  var url_popatrisk_summary = geosite.map_config["featurelayers"]["popatrisk"]["urls"]["summary"]
    .replace("{iso3}", geosite.initial_state["iso3"])
    .replace("{hazard}", geosite.initial_state["hazard"]);

  var url_popatrisk_geojson = geosite.map_config["featurelayers"]["popatrisk"]["urls"]["geojson"]
    .replace("{iso3}", geosite.initial_state["iso3"])
    .replace("{hazard}", geosite.initial_state["hazard"]);

  var url_context_summary = geosite.map_config["featurelayers"]["context"]["urls"]["summary"]
    .replace("{iso3}", geosite.initial_state["iso3"]);

  var url_context_geojson = geosite.map_config["featurelayers"]["context"]["urls"]["geojson"]
    .replace("{iso3}", geosite.initial_state["iso3"]);

  var url_vam_geojson = geosite.map_config["featurelayers"]["vam"]["urls"]["geojson"]
    .replace("{iso3}", geosite.initial_state["iso3"]);

  $.when(
    $.ajax({dataType: "json", url: url_popatrisk_summary}),
    $.ajax({dataType: "json", url: url_popatrisk_geojson}),
    $.ajax({dataType: "json", url: url_context_summary}),
    $.ajax({dataType: "json", url: url_context_geojson}),
    $.ajax({dataType: "json", url: url_vam_geojson})
  ).done(function(
    response_popatrisk_summary,
    response_popatrisk_geojson,
    response_context_summary,
    response_context_geojson,
    response_vam_geojson
    ){
    geosite.initial_data["layers"]["popatrisk"]["data"]["summary"] = response_popatrisk_summary[0];
    geosite.initial_data["layers"]["popatrisk"]["data"]["geojson"] = response_popatrisk_geojson[0];
    geosite.initial_data["layers"]["context"]["data"]["summary"] = response_context_summary[0];
    geosite.initial_data["layers"]["context"]["data"]["geojson"] = response_context_geojson[0];
    geosite.initial_data["layers"]["vam"]["data"]["geojson"] = response_vam_geojson[0];

    geosite.breakpoints = {};
    $.each(geosite.initial_data["layers"]["popatrisk"]["data"]["summary"]["all"]["breakpoints"], function(k, v){
      geosite.breakpoints["popatrisk_"+k] = v;
    });
    $.each(geosite.initial_data["layers"]["context"]["data"]["summary"]["all"]["breakpoints"], function(k, v){
      geosite.breakpoints["context_"+k] = v;
    });

    geosite.init_countryhazardmonth_main_app(appName);
  });
};

geosite.init_countryhazardmonth_main_app = function(appName)
{
  geosite.app = app = angular.module(appName, ['ngRoute','ngSanitize']);

  if(geosite.templates != undefined)
  {
    $.each(geosite.templates, function(name, template){
      app.run(function($templateCache){$templateCache.put(name,template);});
    });
  }

  if(geosite.filters != undefined)
  {
    $.each(geosite.filters, function(name, func){ app.filter(name, func); });
  }

  if(geosite.directives != undefined)
  {
    $.each(geosite.directives, function(name, dir){ app.directive(name, dir); });
  }

  app.factory('state', function(){return $.extend({}, geosite.initial_state);});
  app.factory('stateschema', function(){return $.extend({}, geosite.state_schema);});
  app.factory('map_config', function(){return $.extend({}, geosite.map_config);});
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

geosite.init_explore = function(appName)
{
  geosite.app = app = angular.module(appName, ['ngRoute','ngSanitize']);

  if(geosite.templates != undefined)
  {
    $.each(geosite.templates, function(name, template){
      app.run(function($templateCache){$templateCache.put(name, template);});
    });
  }

  if(geosite.filters != undefined)
  {
    $.each(geosite.filters, function(name, func){ app.filter(name, func); });
  }

  if(geosite.directives != undefined)
  {
    $.each(geosite.directives, function(name, dir){ app.directive(name, dir); });
  }

  app.factory('state', function(){return $.extend({}, geosite.initial_state);});
  app.factory('stateschema', function(){return $.extend({}, geosite.state_schema);});
  app.factory('map_config', function(){return $.extend({}, geosite.map_config);});
  app.factory('live', function(){
    return {
      "map": undefined,
      "baselayers": {},
      "featurelayers":{}
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

geosite.vam_filter_fcs = function(value, filters, f)
{
  // Adjust by VAM FCS Filter
  if(filters["fcs"] != undefined)
  {
    var fcs_modifier = 100.0;
    if(filters["fcs"].length == 0)
    {
      fcs_modifier = 0.0;
    }
    else
    {
      if(filters["fcs"].join(",") != "poor,borderline,acceptable")
      {
        console.log("FCS Filter:", filters["fcs"]);
        var admin1_code = f.properties.admin1_code;
        var matches = $.grep(geosite.initial_data.layers.vam.data.geojson.features, function(x, i){
            return x.properties.admin1_code == admin1_code;
        });
        if(matches.length > 0)
        {
          var match = matches[0];
          if(match.properties.vam.fcs != undefined)
          {
            fcs_modifier = 0;
            $.each(match.properties.vam.fcs, function(k,v){
                if($.inArray(k,filters["fcs"])!= -1)
                {
                  fcs_modifier += v;
                }
            });
          }
        }
      }
    }
    value = value * (fcs_modifier / 100.0);
  }
  return value;
};
geosite.vam_filter_csi = function(value, filters, f)
{
  // Adjust by VAM FCS Filter
  if(filters["csi"] != undefined)
  {
    var csi_modifier = 100.0;
    if(filters["csi"].length == 0)
    {
      csi_modifier = 0.0;
    }
    else
    {
      if(filters["csi"].join(",") != "no,low,medium,high")
      {
        var admin1_code = f.properties.admin1_code;
        var matches = $.grep(geosite.initial_data.layers.vam.data.geojson.features, function(x, i){
            return x.properties.admin1_code == admin1_code;
        });
        if(matches.length > 0)
        {
          var match = matches[0];
          if(match.properties.vam.csi != undefined)
          {
            csi_modifier = 0;
            $.each(match.properties.vam.csi, function(k,v){
                if($.inArray(k,filters["csi"])!= -1)
                {
                  csi_modifier += v;
                }
            });
          }
        }
      }
    }
    value = value * (csi_modifier / 100.0);
  }
  return value;
};

geosite.style_cyclone = function(f, state, map_config, options)
{
  var style = {};
  var filters = state["filters"]["popatrisk"];
  var popatrisk_range = filters["popatrisk_range"];
  var ldi_range = filters["ldi_range"];
  var ldi = f.properties.ldi;
  var erosion_propensity_range = filters["erosion_propensity_range"];
  var erosion_propensity = f.properties.erosion_propensity;
  var landcover_delta_negative_range = filters["landcover_delta_negative_range"];
  var landcover_delta_negative = f.properties.delta_negative;

  var value = sparc.calculate_population_at_risk(
    'cyclone',
    sparc.normalize_feature(f),
    state,
    options.filters);

  if(
    value >= popatrisk_range[0] && value <= popatrisk_range[1] &&
    (ldi == undefined || (ldi >= ldi_range[0] && ldi <= ldi_range[1])) &&
    (erosion_propensity == undefined || (erosion_propensity >= erosion_propensity_range[0] && erosion_propensity <= erosion_propensity_range[1])) &&
    (landcover_delta_negative == undefined || (landcover_delta_negative >= landcover_delta_negative_range[0] && landcover_delta_negative <= landcover_delta_negative_range[1]))
  )
  {
    var colors = map_config["featurelayers"]["popatrisk"]["cartography"][0]["colors"]["ramp"];
    var breakpoints = geosite.breakpoints[options["breakpoints"]];
    var color = undefined;
    for(var i = 0; i < breakpoints.length -1; i++)
    {
      if(
        (value == breakpoints[i] && value == breakpoints[i+1]) ||
        (value >= breakpoints[i] && value < breakpoints[i+1])
      )
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

geosite.style_drought = function(f, state, map_config, options)
{
  var style = {};
  var filters = state["filters"]["popatrisk"];
  var popatrisk_range = filters["popatrisk_range"];
  var ldi_range = filters["ldi_range"];
  var ldi = f.properties.ldi;
  var erosion_propensity_range = filters["erosion_propensity_range"];
  var erosion_propensity = f.properties.erosion_propensity;
  var landcover_delta_negative_range = filters["landcover_delta_negative_range"];
  var landcover_delta_negative = f.properties.delta_negative;

  var value = sparc.calculate_population_at_risk(
    'drought',
    sparc.normalize_feature(f),
    state,
    options.filters);

  if(
    value >= popatrisk_range[0] && value <= popatrisk_range[1] &&
    (ldi == undefined || (ldi >= ldi_range[0] && ldi <= ldi_range[1])) &&
    (erosion_propensity == undefined || (erosion_propensity >= erosion_propensity_range[0] && erosion_propensity <= erosion_propensity_range[1])) &&
    (landcover_delta_negative == undefined || (landcover_delta_negative >= landcover_delta_negative_range[0] && landcover_delta_negative <= landcover_delta_negative_range[1]))
  )
  {
    var colors = map_config["featurelayers"]["popatrisk"]["cartography"][0]["colors"]["ramp"];
    var breakpoints = geosite.breakpoints[options["breakpoints"]];
    var color = undefined;
    for(var i = 0; i < breakpoints.length -1; i++)
    {
      if(
        (value == breakpoints[i] && value == breakpoints[i+1]) ||
        (value >= breakpoints[i] && value < breakpoints[i+1])
      )
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
geosite.style_flood = function(f, state, map_config, options)
{
  var style = {};
  var filters = state["filters"]["popatrisk"];
  var popatrisk_range = filters["popatrisk_range"];
  var ldi_range = filters["ldi_range"];
  var ldi = f.properties.ldi;
  var erosion_propensity_range = filters["erosion_propensity_range"];
  var erosion_propensity = f.properties.erosion_propensity;
  var landcover_delta_negative_range = filters["landcover_delta_negative_range"];
  var landcover_delta_negative = f.properties.delta_negative;

  var value = sparc.calculate_population_at_risk(
    'flood',
    sparc.normalize_feature(f),
    state,
    options.filters);

  if(
    value >= popatrisk_range[0] && value <= popatrisk_range[1] &&
    (ldi == undefined || (ldi >= ldi_range[0] && ldi <= ldi_range[1])) &&
    (erosion_propensity == undefined || (erosion_propensity >= erosion_propensity_range[0] && erosion_propensity <= erosion_propensity_range[1])) &&
    (landcover_delta_negative == undefined || (landcover_delta_negative >= landcover_delta_negative_range[0] && landcover_delta_negative <= landcover_delta_negative_range[1]))
  )
  {
      var colors = map_config["featurelayers"]["popatrisk"]["cartography"][0]["colors"]["ramp"];
      var breakpoints = geosite.breakpoints[options["breakpoints"]];
      var color = undefined;
      for(var i = 0; i < breakpoints.length -1; i++)
      {
        if(
          (value == breakpoints[i] && value == breakpoints[i+1]) ||
          (value >= breakpoints[i] && value < breakpoints[i+1])
        )
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
geosite.style_context = function(f, state, map_config, options)
{
  var style = {};

  var fl = map_config["featurelayers"]["context"];
  var filters = state["filters"]["context"];
  var currentStyleID = state["styles"]["context"];
  var currentStyleList = $.grep(fl["cartography"], function(style, i){return style.id == currentStyleID;});
  var currentStyle = (currentStyleList.length == 1) ? currentStyleList[0] : fl["cartography"][0];
  //
  var colorize = true;
  if("mask" in currentStyle)
  {
    if(f.properties[currentStyle["mask"]] == 1)
    {
      colorize = true;
    }
    else
    {
      style["fillColor"] = currentStyle["colors"]["outside"]
      colorize = false;
    }
  }

  if(colorize)
  {
    var value = f.properties[currentStyle["attribute"]];
    var colors = currentStyle["colors"]["ramp"];
    var breakPointsName = currentStyle["breakpoints"] || "natural_adjusted";
    var breakpoints = geosite.initial_data.layers.context["data"]["summary"]["all"]["breakpoints"][breakPointsName];
    var color = undefined;
    for(var i = 0; i < breakpoints.length -1; i++)
    {
      if(
        (value == breakpoints[i] && value == breakpoints[i+1]) ||
        (value >= breakpoints[i] && value < breakpoints[i+1])
      )
      {
        color = colors[i];
        break;
      }
    }
    style["fillColor"] = (color == undefined) ? colors[colors.length-1] : color;
  }

  return style;
};

geosite.utility = {};

geosite.utility.getClosestFeature = function(nearbyFeatures, target)
{
  var closestFeature = undefined;
  var closestDistance = 0;
  if(nearbyFeatures != undefined)
  {
    if(nearbyFeatures.length > 0)
    {
      closestFeature = nearbyFeatures[0];
      closestDistance = target.distanceTo(nearbyFeatures[0].geometry);
      for(var i = 0; i < nearbyFeatures.length ;i++)
      {
        var f = nearbyFeatures[i];
        if(target.distanceTo(f.geometry) < closestDistance)
        {
          closestFeature = f;
          closestDistance = target.distanceTo(f.geometry);
        }
      }
    }
  }
  return closestFeature;
};

geosite.templates = {};
geosite.templates["modal_layer_carto.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-hidden=\"true\">×</button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">Layer / {{ layer.title }} / Cartography</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <p class=\"navbar-text\" style=\"margin-bottom:0px;\"><b>Select</b><br><b>a Style:</b></p>\n          <li\n            role=\"presentation\"\n            ng-class=\"$first ? \'active\' : \'\'\"\n            ng-repeat=\"style in layer.cartography track by $index\">\n            <a\n              class=\"geosite-intent\"\n              href=\"#modal-layer-carto-style-{{ style.id }}\"\n              aria-controls=\"modal-layer-carto-style-{{ style.id }}\"\n              data-intent-name=\"selectStyle\"\n              data-intent-data=\"{&quot;layer&quot;:&quot;{{ layerID }}&quot;,&quot;style&quot;:&quot;{{ style.id }}&quot;}\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\"\n              ng-bind-html=\"style.title | default:\'Default\' | tabLabel\"></a>\n          </li>\n        </ul>\n        <!-- Tab panes -->\n        <div class=\"tab-content\">\n          <div\n            ng-class=\"$first ? \'tab-pane fade in active\' : \'tab-pane fade\'\"\n            ng-repeat=\"style in layer.cartography track by $index\"\n            id=\"modal-layer-carto-style-{{ style.id }}\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span><b>Attribute: </b><span>{{ style.attribute | default:\"Not styled by attribute\" }}</span></span><br>\n            <span><b>Mask: </b><span ng-bind-html=\"style.mask | md2html | default:\'No Mask\'\"></span></span><br>\n            <span><b>Description: </b><span ng-bind-html=\"style.description | md2html | default:\'Not specified\'\"></span></span>\n            <br>\n            <br>\n            <div\n              ng-if=\"style.type == \'graduated\'\"\n              geosite-symbol-graduated\n              style=\"style\"\n              container-width=\"{{ \'392px\' }}\">\n            </div>\n            <div\n              ng-if=\"style.legend.symbol.type == \'circle\'\"\n              geosite-symbol-circle\n              style=\"style\">\n            </div>\n            <div\n              ng-if=\"style.legend.symbol.type == \'graphic\'\"\n              geosite-symbol-graphic\n              style=\"style\">\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geosite.templates["modal_layer_more.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-hidden=\"true\">×</button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">Layer / {{ layer.title }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li role=\"presentation\" class=\"active\">\n            <a\n              href=\"#modal-layer-more-general\"\n              aria-controls=\"modal-layer-more-general\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">General</a>\n          </li>\n          <li ng-if=\"layer.wms\" role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-layer-more-source\"\n              aria-controls=\"modal-layer-more-source\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Source</a>\n          </li>\n          <li ng-if=\"layer.wms\" role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-layer-more-wms\"\n              aria-controls=\"modal-layer-more-wms\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">WMS</a>\n          </li>\n          <li ng-if=\"layer.wfs\" role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-layer-more-wfs\"\n              aria-controls=\"modal-layer-more-wfs\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">WFS</a>\n          </li>\n          <li ng-if=\"layer.wfs\" role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-layer-more-download\"\n              aria-controls=\"modal-layer-more-download\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Download</a>\n          </li>\n        </ul>\n        <div class=\"tab-content\">\n          <div\n            id=\"modal-layer-more-general\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"layer.description | md2html | default:\'No description given.\'\"></span>\n            <br><br><b>Type:</b> {{ layer.type }}\n            <br><br><b>Source:</b> {{ layer.source.name | default:\"Not specified\" }}\n          </div>\n          <div\n            ng-if=\"layer.source\"\n            id=\"modal-layer-more-source\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span><b>Name:</b> {{ layer.source.name | default:\"Not specified\" }}</span><br>\n            <span><b>Attribution:</b> {{ layer.source.attribution | default:\"Not specified\" }}</span><br>\n            <span><b>URL:</b> {{ layer.source.url | default:\"Not specified\" }}</span><br>\n          </div>\n          <div\n            ng-if=\"layer.wms\"\n            id=\"modal-layer-more-wms\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span><b>URL:</b> {{ layer.wms.url | default:\"Not specified\" }}</span><br>\n            <span><b>Layers:</b> {{ layer.wms.layers|join:\', \'|default:\"Not specified\" }}</span><br>\n            <span><b>Styles:</b> {{ layer.wms.styles|join:\', \'|default:\"Not specified\" }}</span><br>\n            <span><b>Format:</b> {{ layer.wms.format | default:\"Not specified\" }}</span><br>\n            <span><b>Version:</b> {{ layer.wms.version | default:\"Not specified\" }}</span><br>\n            <span><b>Transparent:</b> {{ layer.wms.transparent | default:\"No\" }}</span><br>\n            <hr>\n            <span><a target=\"_blank\" href=\"{{ layer.wms.url }}?SERVICE=WMS&Request=GetCapabilities\">Capabilities</a><br>\n            <span><a target=\"_blank\" href=\"{{ layer.wms.url }}?SERVICE=WMS&Request=GetLegendGraphic&format=image/png&layer={{ layer.wms.layers|first }}\">Legend Graphic</a><br>\n          </div>\n          <div\n            ng-if=\"layer.wfs\"\n            id=\"modal-layer-more-wfs\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span><b>URL:</b> {{ layer.wfs.url | default:\"Not specified\" }}</span><br>\n            <span><b>Version:</b> {{ layer.wfs.version | default:\"Not specified\" }}</span><br>\n            <hr>\n            <span><a target=\"_blank\" href=\"{{ layer.wfs.url }}?service=wfs&request=DescribeFeatureType&version={{ layer.wfs.version }}\">Describe Feature Type</a><br>\n          </div>\n          <div\n            ng-if=\"layer.wfs\"\n            id=\"modal-layer-more-download\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span><b>Download Shapefile</b>: <a target=\"_blank\" href=\"{{ layer | url_shapefile }}\">All</a>, <a target=\"_blank\" href=\"{{ layer | url_shapefile:state }}\">Current Extent</a><br>\n            <span><b>Download GeoJSON</b>: <a target=\"_blank\" href=\"{{ layer | url_geojson }}\">All</a>, <a target=\"_blank\" href=\"{{ layer | url_geojson:state }}\">Current Extent</a><br>\n            <span><b>Download Google Earth KML</b>: <a target=\"_blank\" href=\"{{ layer | url_kml }}\">All</a>, <a target=\"_blank\" href=\"{{ layer | url_kml:state }}\">Current Extent</a><br>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geosite.templates["modal_layer_config.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-hidden=\"true\">×</button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">Layer / {{ layer.title }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li class=\"active\" role=\"presentation\">\n            <a href=\"#modal-layer-config-input\"\n              aria-controls=\"modal-layer-config-input\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Configure</a>\n          </li>\n          <li class=\"\" role=\"presentation\">\n            <a href=\"#modal-layer-config-output\"\n              aria-controls=\"modal-layer-config-output\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Output</a>\n          </li>\n        </ul>\n        <!-- Tab panes -->\n        <div class=\"tab-content\">\n          <div\n            id=\"modal-layer-config-input\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <div class=\"form-group row\" style=\"margin:0; padding-top: 10px; padding-bottom: 10px;\">\n              <div class=\"col-md-3\"><h5>Title</h5></div>\n              <div class=\"col-md-9\">\n                <label for=\"layer-config-title\" class=\"sr-only control-label\">Title</label>\n                <input\n                  id=\"layer-config-title\"\n                  type=\"text\"\n                  class=\"form-control\"\n                  placeholder=\"Title ...\"\n                  data-geosite-field-type=\"text\"\n                  ng-model=\"layer.title\"\n                  ng-change=\"validateField()\"\n                  required\n                  value=\"{{ layer.title }}\">\n              </div>\n            </div>\n            <div class=\"form-group row\" style=\"margin:0; padding-top: 10px; padding-bottom: 10px;\">\n              <div class=\"col-md-3\"><h5>Description</h5></div>\n              <div class=\"col-md-9\">\n                <label for=\"layer-config-title\" class=\"sr-only control-label\">Description</label>\n                <input\n                  id=\"layer-config-description\"\n                  type=\"text\"\n                  class=\"form-control\"\n                  placeholder=\"Title ...\"\n                  data-geosite-field-type=\"text\"\n                  ng-model=\"layer.description\"\n                  ng-change=\"validateField()\"\n                  required\n                  value=\"{{ layer.Description }}\">\n              </div>\n            </div>\n          </div>\n          <div\n            id=\"modal-layer-config-output\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            {{ layer | json }}\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geosite.templates["symbol_circle.tpl.html"] = "<div>\n  <svg width=\"100%\" height=\"100%\" version=\"1.0\" xmlns=\"http://www.w3.org/2000/svg\">\n    <circle\n      cx=\"50%\"\n      cy=\"50%\"\n      ng-r=\"{{ style.legend.symbol.radius }}\"\n      ng-fill=\"{{ style.styles.default.static.color }}\"\n      stroke-width=\"1\"\n      stroke=\"#000000\"></circle>\n  </svg>\n</div>\n";
geosite.templates["symbol_ellipse.tpl.html"] = "<div>\n  <svg width=\"100%\" height=\"100%\" version=\"1.0\" xmlns=\"http://www.w3.org/2000/svg\">\n    <ellipse\n      cx=\"50%\"\n      cy=\"50%\"\n      ng-rx=\"{{ style.legend.symbol.width }}\"\n      ng-ry=\"{{ style.legend.symbol.height }}\"\n      ng-fill=\"{{ style.styles.default.static.color }}\"\n      stroke-width=\"1\"\n      stroke=\"#000000\"></circle>\n  </svg>\n</div>\n";
geosite.templates["symbol_graduated.tpl.html"] = "<div>\n  <div\n    style=\"display: inline-block; vertical-align:top;\"\n    ng-bind-html=\"style.label_left | md2html\"></div>\n  <svg\n    ng-attr-width=\"{{ containerWidth }}\"\n    height=\"90px\"\n    version=\"1.0\"\n    xmlns=\"http://www.w3.org/2000/svg\">\n    <g>\n      <rect\n        ng-repeat=\"color in style.colors.ramp track by $index\"\n        ng-attr-x=\"{{ style.colors.ramp | length | position_x : $index : containerWidth : 26 }}px\"\n        ng-attr-y=\"{{ \'0\' }}\"\n        ng-attr-width=\"{{ style.colors.ramp | length | width_x : containerWidth : 26 }}px\"\n        height=\"50px\"\n        ng-attr-fill=\"{{ color }}\"\n        stroke-width=\"1\"\n        stroke=\"#000000\"/>\n    </g>\n    <g>\n      <text\n        ng-repeat=\"breakpoint in style | breakpoints track by $index\"\n        ng-attr-x=\"{{ style | breakpoints | length | add: -1 | position_x : $index : containerWidth : 26 }}px\"\n        ng-attr-y=\"{{ $index | choose : 68 : 82 }}px\"\n        text-anchor=\"middle\"\n        ng-attr-fill=\"{{ \'black\' }}\"\n        font-size=\"14px\"\n        text-decoration=\"underline\"\n        font-family=\"\'Open Sans\', sans-serif\">{{ style | breakpoint: $index | formatBreakpoint }}</text>\n    </g>\n  </svg>\n  <div\n    style=\"display: inline-block; vertical-align:top;\"\n    ng-bind-html=\"style.label_right | md2html\"></div>\n</div>\n";
geosite.templates["symbol_graphic.tpl.html"] = "<i class=\"fa fa-image\" style=\"color:black; font-size: 20px;\"></i>\n";
geosite.templates["legend_baselayers.tpl.html"] = "<div class=\"geosite-map-legend-baselayers geosite-radio-group\">\n  <div\n    ng-repeat=\"layer in map_config.baselayers track by $index\"\n    ng-if=\"layer.legend!==undefined\"\n    class=\"geosite-map-legend-item noselect\"\n    data-layer=\"{{ layer.id }}\">\n    <div class=\"geosite-map-legend-item-left\">\n      <div class=\"geosite-map-legend-item-icon geosite-map-legend-item-more\">\n        <a\n          class=\"geosite-intent\"\n          data-intent-name=\"toggleModal\"\n          data-intent-data=\"{&quot;id&quot;:&quot;geosite-modal-layer-more&quot;,&quot;dynamic&quot;:{&quot;layer&quot;:[&quot;map_config&quot;,&quot;baselayers&quot;,&quot;{{ $index }}&quot;]}}\">\n          <i class=\"fa fa-info-circle\"></i>\n        </a>\n      </div><!--\n      --><div class=\"geosite-map-legend-item-icon geosite-map-legend-item-visibility\">\n           <a\n             ng-class=\" $first ? \'geosite-map-legend-item-visibility-button geosite-intent geosite-radio geosite-on\' : \'geosite-map-legend-item-visibility-button geosite-intent geosite-radio\'\"\n             data-intent-name=\"switchBaseLayer\"\n             data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n             data-intent-class-on=\"geosite-on\"\n             data-intent-class-off=\"\">\n             <i class=\"fa fa-eye geosite-on\"></i><i class=\"fa fa-eye-slash geosite-off\"></i>\n           </a>\n         </div><!--\n      --><div class=\"geosite-map-legend-item-symbol\" style=\"width: 10px;\"></div>\n    </div><!--\n    --><div class=\"geosite-map-legend-item-right\">\n      <div class=\"geosite-map-legend-item-label\" style=\"width: 100%;\">\n        <span ng-bind-html=\"layer.legend.label | md2html\"></span>\n      </div>\n    </div>\n  </div>\n</div>\n";
geosite.templates["legend_featurelayers.tpl.html"] = "<div class=\"geosite-map-legend-featurelayers\">\n  <div\n    ng-repeat=\"layer in featurelayers track by $index\"\n    ng-init=\"layerIndex = $index\"\n    ng-if=\"layer.item.legend!==undefined\"\n    class=\"geosite-map-legend-item noselect\"\n    data-layer=\"{{ layer.key }}\">\n    <div class=\"geosite-map-legend-item-left\">\n      <div class=\"geosite-map-legend-item-icon geosite-map-legend-item-config\" style=\"display:none;\">\n        <a\n          class=\"geosite-intent\"\n          data-intent-name=\"toggleModal\"\n          data-intent-data=\"{&quot;id&quot;:&quot;geosite-modal-layer-config&quot;,&quot;static&quot;:{&quot;layerID&quot;:&quot;{{ layer.key }}&quot;},&quot;dynamic&quot;:{&quot;layer&quot;:[&quot;map_config&quot;,&quot;featurelayers&quot;,&quot;{{ layer.key }}&quot;]}}\">\n          <i class=\"fa fa-cog\"></i>\n        </a>\n      </div><!--\n      --><div class=\"geosite-map-legend-item-icon geosite-map-legend-item-more\">\n        <a\n          class=\"geosite-intent\"\n          data-intent-name=\"toggleModal\"\n          data-intent-data=\"{&quot;id&quot;:&quot;geosite-modal-layer-more&quot;,&quot;static&quot;:{&quot;layerID&quot;:&quot;{{ layer.key }}&quot;},&quot;dynamic&quot;:{&quot;layer&quot;:[&quot;map_config&quot;,&quot;featurelayers&quot;,&quot;{{ layer.key }}&quot;]}}\">\n          <i class=\"fa fa-info-circle\"></i>\n        </a>\n      </div><!--\n      --><div class=\"geosite-map-legend-item-icon geosite-map-legend-item-visibility\">\n         <a\n           ng-class=\"(layer.item.visible != undefined ? layer.item.visible : true ) ? \'geosite-map-legend-item-visibility-button geosite-intent geosite-toggle\' : \'geosite-map-legend-item-visibility-button geosite-intent geosite-toggle geosite-off\'\"\n           data-intent-names=\"[&quot;showLayer&quot;,&quot;hideLayer&quot;]\"\n           data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.key }}&quot;}\">\n           <i class=\"fa fa-eye geosite-on\"></i><i class=\"fa fa-eye-slash geosite-off\"></i>\n         </a>\n     </div><!--\n     --><div\n          ng-class=\"layer.item.type == \'geojson\' ? \'geosite-map-legend-item-icon geosite-map-legend-item-zoomto\': \'geosite-map-legend-item-icon geosite-map-legend-item-zoomto fade disabled\'\">\n        <a\n          class=\"geosite-map-legend-item-zoomto-button geosite-intent\"\n          data-intent-name=\"zoomToLayer\"\n          data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.key }}&quot;}\">\n          <i class=\"fa fa-compress\"></i>\n        </a>\n      </div>\n    </div><!--\n    --><div class=\"geosite-map-legend-item-right\">\n      <div\n        ng-if=\"layer.item.cartography[0].legend.symbol\"\n        class=\"geosite-map-legend-item-symbol\">\n        <a\n          class=\"geosite-intent\"\n          data-intent-name=\"toggleModal\"\n          data-intent-data=\"{&quot;id&quot;:&quot;geosite-modal-layer-carto&quot;,&quot;static&quot;:{&quot;layerID&quot;:&quot;{{ layer.key }}&quot;},&quot;dynamic&quot;:{&quot;layer&quot;:[&quot;map_config&quot;,&quot;featurelayers&quot;,&quot;{{ layer.key }}&quot;]}}\">\n          <div ng-if=\"layer.item.cartography[0].legend.symbol.type == \'circle\'\">\n            <svg width=\"100%\" height=\"100%\" version=\"1.0\" xmlns=\"http://www.w3.org/2000/svg\">\n              <circle\n                cx=\"50%\"\n                cy=\"50%\"\n                ng-r=\"{{ layer.item.cartography[0].legend.symbol.radius }}\"\n                ng-fill=\"{{ layer.item.cartography[0].styles.default.static.color }}\"\n                stroke-width=\"1\"\n                stroke=\"#000000\"></circle>\n            </svg>\n          </div>\n          <div ng-if=\"layer.item.cartography[0].legend.symbol.type == \'ellipse\'\">\n            <svg width=\"100%\" height=\"100%\" version=\"1.0\" xmlns=\"http://www.w3.org/2000/svg\">\n              <ellipse\n                cx=\"50%\"\n                cy=\"50%\"\n                ng-rx=\"{{ layer.item.cartography[0].legend.symbol.width }}\"\n                ng-ry=\"{{ layer.item.cartography[0].legend.symbol.height }}\"\n                ng-fill=\"{{ layer.item.cartography[0].styles.default.static.color }}\"\n                stroke-width=\"1\"\n                stroke=\"#000000\"></circle>\n            </svg>\n          </div>\n          <div\n            ng-if=\"layer.item.cartography[0].legend.symbol.type == \'graduated\'\">\n            <svg\n              ng-attr-width=\"{{ layer.item.cartography[0].legend.symbol.width }}\"\n              height=\"100%\"\n              version=\"1.0\"\n              xmlns=\"http://www.w3.org/2000/svg\">\n              <rect\n                ng-repeat=\"color in layer.item.cartography[0].colors.ramp track by $index\"\n                ng-attr-x=\"{{ $index|percent:layer.item.cartography[0].colors.ramp.length }}%\"\n                y=\"0\"\n                ng-attr-width=\"{{ 1|percent:layer.item.cartography[0].colors.ramp.length }}%\"\n                ng-attr-height=\"{{ layer.item.cartography[0].legend.symbol.height }}\"\n                ng-attr-fill=\"{{ color }}\"\n                stroke-width=\"1\"\n                stroke=\"#000000\"/>\n            </svg>\n          </div>\n          <div\n            ng-if=\"layer.item.cartography[0].legend.symbol.type == \'graphic\'\">\n            <i class=\"fa fa-image\" style=\"color:black; font-size: 20px;\"></i>\n          </div>\n        </a>\n      </div><!--\n      --><div class=\"geosite-map-legend-item-label\">\n        <span ng-bind-html=\"layer.item.legend.label | md2html\"></span>\n      </div>\n    </div>\n  </div>\n</div>\n";
geosite.templates["modal_welcome.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-hidden=\"true\">×</button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">{{ welcome.title }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li role=\"presentation\" class=\"active\">\n            <a\n              href=\"#modal-welcome-general\"\n              aria-controls=\"modal-welcome-general\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">General</a>\n          </li>\n          <li role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-welcome-about\"\n              aria-controls=\"modal-welcome-about\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">About</a>\n          </li>\n        </ul>\n        <div class=\"tab-content\">\n          <div\n            id=\"modal-welcome-general\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"welcome.general | md2html | default:\'No body given.\'\"></span>\n          </div>\n          <div\n            id=\"modal-welcome-about\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"welcome.about | md2html | default:\'No body given.\'\"></span>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geosite.templates["breadcrumbs.tpl.html"] = "<div>\n  <div>\n    <a class=\"btn btn-primary btn-large\" title=\"Explore\" href=\"/explore\">Explore &gt;&gt;</a>\n  </div>\n  <div\n    ng-repeat=\"bc in breadcrumbs track by $index\">\n    <select\n      id=\"{{ bc.id }}\"\n      data-output=\"{{ bc.output }}\"\n      data-width=\"{{ bc.width }}\"\n      data-height=\"{{ bc.height }}\"\n      data-initial-data=\"{{ bc.data }}\"\n      data-breadcrumbs=\"{{ bc.breadcrumbs }}\">\n      <option\n        ng-if=\"bc.type == \'country\'\"\n        value=\"{{ state.iso3 }}\"\n        selected=\"selected\">{{ state.country_title }}</option>\n      <option\n        ng-if=\"bc.type == \'hazard\'\"\n        value=\"{{ state.hazard }}\"\n        selected=\"selected\">{{ state.hazard_title }}</option>\n      <option\n        ng-if=\"bc.type != \'country\' && bc.type != \'hazard\'\"\n        value=\"placeholder\"\n        selected=\"selected\">{{ bc.placeholder }}</option>\n    </select>\n  </div>\n</div>\n";
geosite.templates["calendar.tpl.html"] = "<ul class=\"nav nav-justified geosite-radio-group\">\n  <li\n    ng-repeat=\"month in months track by $index\">\n    <a\n      ng-class=\"state.month == month.num ? \'btn btn-primary selected geosite-intent geosite-radio geosite-on\' : \'btn btn-default geosite-intent geosite-radio\'\"\n      title=\"{{ month.long }}\"\n      href=\"/country/{{ state.iso3 }}/hazard/{{ state.hazard }}/month/{{ month.num }}\"\n      data-intent-name=\"stateChanged\"\n      data-intent-data=\"{&quot;month&quot;: {{ month.num }} }\"\n      data-intent-class-on=\"btn-primary selected\"\n      data-intent-class-off=\"btn-default\" ng-bind-html=\"month.short3 | title\"></a>\n  </li>\n</ul>\n";
geosite.templates["modal_filter_more.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-hidden=\"true\">×</button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">Filter / {{ filter.label }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li\n            role=\"presentation\"\n            class=\"active\">\n            <a\n              href=\"#modal-filter-more-general\"\n              aria-controls=\"modal-filter-more-general\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">General</a>\n          </li>\n          <li\n            ng-if=\"filter.type == \'checkbox\' && filter.checkbox.options\"\n            role=\"presentation\"\n            class=\"\">\n            <a\n              href=\"#modal-filter-more-options\"\n              aria-controls=\"modal-filter-more-options\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Options</a>\n          </li>\n          <li\n            ng-if=\"filter.type == \'slider\' && filter.slider.options\"\n            role=\"presentation\"\n            class=\"\">\n            <a\n              href=\"#modal-filter-more-options\"\n              aria-controls=\"modal-filter-more-options\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Options</a>\n          </li>\n        </ul>\n        <div class=\"tab-content\">\n          <div\n            id=\"modal-filter-more-general\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"filter.description | md2html | default:\'No description given.\'\"></span>\n            <br><br><b>Type:</b> {{ filter.type }}\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'continuous\'\">\n              <b>Minimum Value:</b> <span ng-bind-html=\"filter.slider.min | formatInteger:\'delimited\':\' \'\"></span>\n            </div>\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'continuous\'\">\n              <b>Maximum Value:</b> <span ng-bind-html=\"filter.slider.max | formatInteger:\'delimited\':\' \'\"></span>\n            </div>\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'ordinal\'\">\n              <b>Minimum Value:</b> <span ng-bind-html=\"filter.slider.options | first\"></span>\n            </div>\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'ordinal\'\">\n              <b>Maximum Value:</b> <span ng-bind-html=\"filter.slider.options | last\"></span>\n            </div>\n            <hr>\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'ordinal\'\">\n              <b>Current Value:</b> <span ng-bind-html=\"value\"></span>\n            </div>\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'continuous\'\">\n              <b>Current Value:</b> <span ng-bind-html=\"value | join:\' - \'\"></span>\n            </div>\n            <div\n              ng-if=\"filter.type ==\'checkbox\'\">\n              <b>Current Value:</b> <span ng-bind-html=\"value | formatArray\"></span>\n            </div>\n          </div>\n          <div\n            ng-if=\"filter.type == \'checkbox\' && filter.checkbox.options\"\n            id=\"modal-filter-more-options\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span\n              ng-repeat-start=\"option in filter.checkbox.options track by $index\">\n              <i ng-class=\"option.checked ? \'fa fa-check-square-o\' : \'fa fa-square-o\'\"></i>\n              <b ng-bind-html=\"option.label\"></b>:\n              <span ng-bind-html=\"option.description | default_if_undefined:\'No description given\'\"></span>\n            </span>\n            <br>\n            <br ng-repeat-end>\n          </div>\n          <div\n            ng-if=\"filter.type == \'slider\' && filter.slider.options\"\n            id=\"modal-filter-more-options\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span\n              ng-repeat-start=\"option in filter.slider.options track by $index\">\n              <i ng-class=\"option.checked ? \'fa fa-check-square-o\' : \'fa fa-square-o\'\"></i>\n              <b ng-bind-html=\"option\"></b>\n            </span>\n            <br ng-repeat-end>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geosite.templates["filter_checkbox.tpl.html"] = "<div class=\"geosite-filter geosite-filter-checkbox\" style=\"height: {{ filter.height }};\">\n  <div class=\"geosite-filter-label\">\n    <a\n      class=\"geosite-intent\"\n      data-intent-name=\"toggleModal\"\n      data-intent-data=\"{&quot;id&quot;:&quot;geosite-modal-filter-more&quot;,&quot;static&quot;:{&quot;tab&quot;:&quot;modal-filter-more-general&quot;},&quot;dynamic&quot;:{&quot;value&quot;:[&quot;state&quot;,&quot;filters&quot;,&quot;popatrisk&quot;,&quot;{{ filter.checkbox.output }}&quot;],&quot;filter&quot;:[&quot;map_config&quot;,&quot;featurelayers&quot;,&quot;popatrisk&quot;,&quot;filters&quot;,&quot;{{ $index }}&quot;]}}\">\n      <i class=\"fa fa-info-circle\"></i>\n    </a>\n    <span ng-bind-html=\"filter.label | md2html\"></span> :\n  </div>\n  <div\n    class=\"btn-group\"\n    style=\"float:left;\"\n    data-toggle=\"buttons\"\n    data-output=\"{{ filter.checkbox.output }}\">\n    <label\n      ng-repeat=\"opt in filter.checkbox.options track by $index\"\n      ng-class=\"opt.checked ? \'btn btn-sm btn-default active\' : \'btn btn-sm btn-default\'\">\n      <input\n        type=\"checkbox\"\n        id=\"{{ opt.id }}\"\n        data-value=\"{{ opt.value }}\"\n        autocomplete=\"off\"\n        ng-checked=\"opt.checked || opt.selected\"/>\n      {{ opt.label }}\n    </label>\n  </div>\n</div>\n";
geosite.templates["filter_radio.tpl.html"] = "<div class=\"geosite-filter geosite-filter-radio\" style=\"height: {{ filter.height }};\">\n  <div class=\"geosite-filter-label\">\n    <a\n      class=\"geosite-intent\"\n      data-intent-name=\"toggleModal\"\n      data-intent-data=\"{&quot;id&quot;:&quot;geosite-modal-filter-more&quot;,&quot;static&quot;:{&quot;tab&quot;:&quot;modal-filter-more-general&quot;},&quot;dynamic&quot;:{&quot;value&quot;:[&quot;state&quot;,&quot;filters&quot;,&quot;popatrisk&quot;,&quot;{{ filter.radio.output }}&quot;],&quot;filter&quot;:[&quot;map_config&quot;,&quot;featurelayers&quot;,&quot;popatrisk&quot;,&quot;filters&quot;,&quot;{{ $index }}&quot;]}}\">\n      <i class=\"fa fa-info-circle\"></i>\n    </a>\n    <span ng-bind-html=\"filter.label | md2html\"></span> :\n  </div>\n  <div\n    class=\"btn-group\"\n    style=\"float:left;\"\n    data-toggle=\"buttons\"\n    data-output=\"{{ filter.radio.output }}\">\n    <label\n      ng-repeat=\"opt in filter.radio.options track by $index\"\n      ng-class=\"opt.checked ? \'btn btn-default active\' : \'btn btn-default\'\">\n      <input\n        type=\"radio\"\n        id=\"{{ opt.id }}\"\n        name=\"{{ opt.name }}\"\n        value=\"{{ opt.value }}\"\n        data-output=\"{{ filter.radio.output }}\"\n        ng-checked=\"opt.checked || opt.selected\"/>\n      {{ opt.label }}\n    </label>\n  </div>\n</div>\n";
geosite.templates["filter_slider.tpl.html"] = "<div class=\"geosite-filter geosite-filter-slider\" style=\"height: {{ filter.height }};\">\n  <div class=\"geosite-filter-label\">\n    <a\n      class=\"geosite-intent\"\n      data-intent-name=\"toggleModal\"\n      data-intent-data=\"{&quot;id&quot;:&quot;geosite-modal-filter-more&quot;,&quot;static&quot;:{&quot;tab&quot;:&quot;modal-filter-more-general&quot;},&quot;dynamic&quot;:{&quot;value&quot;:[&quot;state&quot;,&quot;filters&quot;,&quot;popatrisk&quot;,&quot;{{ filter.slider.output }}&quot;],&quot;filter&quot;:[&quot;map_config&quot;,&quot;featurelayers&quot;,&quot;popatrisk&quot;,&quot;filters&quot;,&quot;{{ $index }}&quot;]}}\">\n      <i class=\"fa fa-info-circle\"></i>\n    </a>\n    <span ng-bind-html=\"filter.label | md2html\"></span> :\n  </div>\n  <div style=\"display:table; height:{{ filter.height }};padding-left:10px;padding-right:10px;\">\n    <div style=\"display:table-cell;vertical-align:middle;\">\n      <div class=\"geosite-filter-slider-label\">Placeholder</div>\n      <div\n        class=\"geosite-filter-slider-slider\"\n        style=\"width:{{ filter.slider.width }};\"\n        data-type=\"{{ filter.slider.type }}\"\n        data-value=\"{{ filter.slider.value ? filter.slider.value : \'\' }}\"\n        data-values=\"{{ filter.slider.values ? filter.slider.values : \'\' }}\"\n        data-range=\"{{ filter.slider.range == \'true\' ? \'true\': filter.slider.range }}\"\n        data-output=\"{{ filter.slider.output }}\"\n        data-min-value=\"{{ filter.slider.min|default_if_undefined:\'\' }}\"\n        data-max-value=\"{{ filter.slider.max|default_if_undefined:\'\' }}\"\n        data-step=\"{{ filter.slider.step ? filter.slider.step : \'\' }}\"\n        data-options=\"{{ filter.slider.options ? filter.slider.options : \'\' }}\"\n        data-label-template=\"{{ filter.slider.label }}\"\n        ></div>\n    </div>\n  </div>\n</div>\n";
geosite.templates["filter_container.tpl.html"] = "<div id=\"geosite-map-filter-container\" class=\"collapse\" style=\"\">\n  <div\n    ng-repeat=\"filter in filters track by $index\">\n    <div geosite-filter-radio ng-if=\"filter.type == \'radio\'\"></div>\n    <div geosite-filter-checkbox ng-if=\"filter.type == \'checkbox\'\"></div>\n    <div geosite-filter-slider ng-if=\"filter.type == \'slider\'\"></div>\n  </div>\n</div>\n";
geosite.templates["sparc_sidebar_charts.tpl.html"] = "<div class=\"geosite-sidebar-charts\" style=\"width:100%;\">\n  <!-- Nav tabs -->\n  <ul class=\"nav nav-tabs\" role=\"tablist\">\n    <p class=\"navbar-text\" style=\"margin-bottom:0px;\"><b>Select</b><br><b>a Chart:</b></p>\n    <li\n      role=\"presentation\"\n      ng-class=\"$first ? \'active\' : \'\'\"\n      ng-repeat=\"chart in charts track by $index\">\n      <a\n        class=\"\"\n        href=\"#sparc-chart-{{ chart.id }}-pane\"\n        aria-controls=\"sparc-chart-{{ chart.id }}-pane\"\n        role=\"tab\"\n        data-toggle=\"tab\"\n        style=\"padding-left:8px; padding-right: 8px;\"\n        ng-bind-html=\"chart.title | default:\'Default\' | tabLabel\"></a>\n    </li>\n  </ul>\n  <!-- Tab panes -->\n  <div class=\"tab-content\">\n    <div\n      ng-class=\"$first ? \'tab-pane fade in active\' : \'tab-pane fade\'\"\n      ng-repeat=\"chart in charts track by $index\"\n      on-repeat-done=\"chart_done\"\n      data-repeat-index=\"{{ $index }}\"\n      id=\"sparc-chart-{{ chart.id }}-pane\"\n      role=\"tabpanel\"\n      style=\"padding: 10px;\">\n      <div>\n        <h4 style=\"text-align:center;\">{{ chart.title }}</h4>\n      </div>\n      <div\n        id=\"{{ chart.element }}\"\n        class=\"geosite-sidebar-chart\"\n        style=\"width:360px;margin:0 auto;\"\n      ></div>\n    </div>\n  </div>\n</div>\n";
geosite.templates["modal_welcome_sparc.tpl.html"] = "<div class=\"modal-dialog\" data-backdrop=\"static\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <h4 class=\"modal-title\" id=\"myModalLabel\">{{ welcome.title }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li role=\"presentation\" class=\"active\">\n            <a\n              href=\"#modal-welcome-intro\"\n              aria-controls=\"modal-welcome-intro\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Introduction</a>\n          </li>\n          <li role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-welcome-about\"\n              aria-controls=\"modal-welcome-about\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">About</a>\n          </li>\n        </ul>\n        <div class=\"tab-content\">\n          <div\n            id=\"modal-welcome-intro\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span\n              class=\"welcome-body\"\n              ng-bind-html=\"welcome.intro | md2html | default:\'No body given.\'\"></span>\n            <hr>\n            <h3 class=\"welcome-body\">Get Started!</h3>\n            <div class=\"input-group select2-bootstrap-prepend select2-bootstrap-append\">\n              <input\n                id=\"country-input-backend\"\n                name=\"country-input-backend\"\n                type=\"text\"\n                class=\"form-control\"\n                style=\"display:none;\"\n                ng-model=\"country\">\n              <span class=\"input-group-addon\" id=\"country-addon\">Country</span>\n              <input\n                id=\"country-input\"\n                name=\"country-input\"\n                type=\"text\"\n                class=\"typeahead form-control\"\n                style=\"width:400px; height: auto;\"\n                placeholder=\"Country (e.g., Haiti or Philippines)\"\n                aria-describedby=\"country-addon\"\n                data-placeholder=\"Country (e.g., Haiti or Philippines)\"\n                data-initial-data=\"countries_select2\"\n                data-backend=\"country-input-backend\"\n                data-template-empty=\"<div class=&quot;alert alert-danger empty-message&quot;>Unable to find country</div>\">\n                <div class=\"input-group-addon btn btn-danger btn-clear\" data-clear=\"country-input\">\n                  <i class=\"fa fa-times\"></i>\n                </div>\n            </div>\n            <br>\n            <div class=\"input-group select2-bootstrap-prepend select2-bootstrap-append\">\n              <input\n                id=\"hazard-input-backend\"\n                name=\"hazard-input-backend\"\n                type=\"text\"\n                class=\"form-control\"\n                style=\"display:none;\"\n                ng-model=\"hazard\">\n              <span class=\"input-group-addon\" id=\"hazard-addon\">Hazard</span>\n              <input\n                id=\"hazard-input\"\n                name=\"hazard-input\"\n                type=\"text\"\n                class=\"typeahead form-control\"\n                style=\"width:400px; height: auto;\"\n                placeholder=\"Hazard (e.g., Flood, Cyclone, Drought, or Landslide)\"\n                aria-describedby=\"hazard-addon\"\n                data-placeholder=\"Hazard (e.g., Flood, Cyclone, Drought, or Landslide)\"\n                data-initial-data=\"hazards_select2\"\n                data-backend=\"hazard-input-backend\"\n                data-template-empty=\"<div class=&quot;empty-message&quot;>Unable to find hazard</div>\">\n                <div class=\"input-group-addon btn btn-danger btn-clear\" data-clear=\"hazard-input\">\n                  <i class=\"fa fa-times\"></i>\n                </div>\n            </div>\n            <hr>\n            <ul class=\"nav nav-justified welcome-go\">\n              <li>\n                <a\n                  ng-disabled=\"country == undefined || hazard == undefined || country == \'\' || hazard == \'\'\"\n                  ng-class=\"country == undefined || hazard == undefined || country == \'\' || hazard == \'\' ? \'btn btn-default\' : \'btn btn-primary\' \"\n                  ng-href=\"{{ country == undefined || hazard == undefined || country == \'\' || hazard == \'\' ? \'#\' : \'/country/\'+country+\'/hazard/\'+hazard +\'/month/1\' }}\">Go!</a>\n              </li>\n            </ul>\n          </div>\n          <div\n            id=\"modal-welcome-about\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"welcome.about | md2html | default:\'No body given.\'\"></span>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n";

var MONTHS_NUM = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
//Array(12).fill().map((x,i)=>i)

var MONTHS_LONG =[
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"];

var MONTHS_SHORT3 =
[
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec"];

var MONTHS_ALL = $.map(MONTHS_NUM, function(num, i){
  return {
    'num': num,
    'short3': MONTHS_SHORT3[i],
    'long': MONTHS_LONG[i]
  };
});

var DAYSOFTHEWEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'];

SPARC_BREADCRUMBS = [
    {
        "id": "sparc-select-country",
        "placeholder": "Country...",
        "type": "country",
        "width": "resolve",
        "height": "50px",
        "output": "iso3",
        "data": "countries_select2",
        "breadcrumbs": [
            {
                "name": "country",
                "value": "iso3"
            },
            {
                "name": "hazard",
                "value": "hazard"
            },
            {
                "name": "month",
                "value": "month_num"
            }
        ]
    },
    {
        "id": "sparc-select-hazard",
        "placeholder": "Hazard...",
        "type": "hazard",
        "width": "resolve",
        "height": "50px",
        "output": "hazard",
        "data": "hazards_select2",
        "breadcrumbs": [
            {
                "name": "country",
                "value": "iso3"
            },
            {
                "name": "hazard",
                "value": "hazard"
            },
            {
                "name": "month",
                "value": "month_num"
            }
        ]
    }
];

geosite.filters["default"] = function()
{
  return function(value, fallback)
  {
    return value || fallback;
  };
};

geosite.filters["join"] = function()
{
    return function(array, arg)
    {
        if (Array.isArray(array))
        {
            return array.join(arg);
        }
        else
        {
            return array;
        }
    };
};

geosite.filters["first"] = function()
{
    return function(array)
    {
        if (!Array.isArray(array))
        {
            return array;
        }
        return array[0];
    };
};

geosite.filters["last"] = function()
{
    return function(arr)
    {
        if (!Array.isArray(arr))
        {
            return arr;
        }

        if(arr.length == 0)
        {
            return undefined;
        }

        return arr[arr.length - 1];
    };
};

geosite.filters["formatInteger"] = function()
{
  return function(value, type, delimiter)
  {
    if(type == "delimited")
    {
      delimiter = delimiter || ',';
      var str = value.toString();
      var pattern = new RegExp('(\\d+)(\\d{3})','gi');
      while(pattern.test(str)){str=str.replace(pattern,'$1'+ delimiter +'$2');}
      return str;
    }
    else
    {
      return value.toString();
    }
  };
};

geosite.filters["formatArray"] = function()
{
  return function(arr)
  {
      if(Array.isArray(arr))
      {
        if(arr.length == 0)
        {
          return "";
        }
        else if(arr.length == 1)
        {
          return arr[0];
        }
        else if(arr.length == 2)
        {
          return arr.join(" and ");
        }
        else // greater than 2
        {
          return arr.slice(0,-1).join(", ")+", and "+arr[arr.length - 1];
        }
      }
      else
      {
          return arr;
      }
  };
};

geosite.filters["formatMonth"] = function()
{
  return function(value, type)
  {
    if(type == "long")
    {
      return months_long[value-1];
    }
    else if(type == "short3" || type == "short_3")
    {
      return months_short_3[value-1];
    }
    else
    {
      return value.toString();
    }
  };
};

geosite.filters["md2html"] = function()
{
  return function(text)
  {
    if(text != undefined)
    {
      var converter = new showdown.Converter();
      html = converter.makeHtml(text);
      // Remove Prefix/Suffix Paragraph Tags
      html = html.substring("<p>".length, html.length - "</p>".length);
      // Open Links in New Windows
      var pattern = new RegExp("(<a .*)>(.*?)</a>", "gi");
      html = html.replace(pattern, '$1 target="_blank">$2</a>');
      // Replace New Line characters with Line Breaks
      html = html.replace(new RegExp('\n', 'gi'),'<br>');
      return html;
    }
    else
    {
      return "";
    }
  };
};

geosite.filters["percent"] = function()
{
  return function(value, denominator)
  {
    return 100.0 * value / denominator;
  };
};

geosite.filters["tabLabel"] = function()
{
  return function(value)
  {
    return value.split(" ").length == 2 ? value.replace(' ', '<br>') : value;
  };
};

geosite.filters["as_float"] = function()
{
  return function(value)
  {
    return 1.0 * value;
  };
};

geosite.filters["choose"] = function()
{
  return function(value, arg)
  {
    if(Array.isArray(arg))
    {
      var arr = arg;
      return value + arr[value % arr.length];
    }
    else
    {
      var arr = Array.prototype.slice.call(arguments, [1]);
      return arr[value % arr.length];
    }
  };
};

geosite.filters["add"] = function()
{
  return function(value, arg)
  {
    if(Array.isArray(arg))
    {
      var arr = arg;
      return value + arr[value % arr.length];
    }
    else if(arguments.length > 2)
    {
      var arr = Array.prototype.slice.call(arguments, [1]);
      return value + arr[value % arr.length];
    }
    else
    {
      return value + arg;
    }
  };
};

geosite.filters["default_if_undefined"] = function()
{
  return function(value, fallback)
  {
    return value != undefined ? value : fallback;
  };
};

geosite.filters["title"] = function()
{
  return function(value)
  {
    return $.type(value) === "string" ? value.toTitleCase() : value;
  };
};

geosite.filters["as_array"] = function()
{
  return function(value)
  {
    if($.isArray(value))
    {
      return value;
    }
    else
    {
      return $.map(value, function(item, key){
        return {'key': key, 'item': item};
      });
    }
  };
};

geosite.filters["sortItemsByArray"] = function()
{
  return function(value, arg)
  {
    if($.isArray(value))
    {
      value = $.grep(value,function(x, i){
        return $.inArray(x["key"], arg) != -1;
      });
      value.sort(function(a, b){
        return $.inArray(a["key"], arg) - $.inArray(a["key"], arg);
      });
      return value;
    }
    else
    {
      return value;
    }
  };
};

geosite.filters["url_shapefile"] = function()
{
    return function(layer, state)
    {
        var url = "";
        if("wfs" in layer)
        {
          var typename = "";
          if("layers" in layer.wms)
          {
            typename = layer.wms.layers[0];
          }
          else if("layers" in layer.wfs)
          {
            typename = layer.wfs.layers[0];
          }
          var params = {
            "format_options": "charset:UTF-8",
            "typename": typename,
            "outputFormat": "SHAPE-ZIP",
            "version": "1.0.0",
            "service": "WFS",
            "request": "GetFeature"
          };
          if(state != undefined)
          {
            params["cql_filter"] = "BBOX("+layer.wfs.geometry+", "+state.view.extent+")";
          }
          var querystring = $.map(params, function(v, k){return encodeURIComponent(k) + '=' + encodeURIComponent(v);}).join("&");
          url = layer.wfs.url + "?" + querystring;
        }
        return url;
    };
};

geosite.filters["url_geojson"] = function()
{
    return function(layer, state)
    {
        var url = "";
        if("wfs" in layer)
        {
          var typename = "";
          if("layers" in layer.wms)
          {
            typename = layer.wms.layers[0];
          }
          else if("layers" in layer.wfs)
          {
            typename = layer.wfs.layers[0];
          }
          var params = {
            "format_options": "charset:UTF-8",
            "typename": typename,
            "outputFormat": "json",
            "version": "1.0.0",
            "service": "WFS",
            "request": "GetFeature"
          };
          if(state != undefined)
          {
            params["cql_filter"] = "BBOX("+layer.wfs.geometry+", "+state.view.extent+")";
          }
          var querystring = $.map(params, function(v, k){return encodeURIComponent(k) + '=' + encodeURIComponent(v);}).join("&");
          url = layer.wfs.url + "?" + querystring;
        }
        return url;
    };
};

geosite.filters["url_kml"] = function()
{
    return function(layer, state)
    {
        var url = "";
        if("kml" in layer)
        {
          var typename = "";
          if("layers" in layer.wms)
          {
            typename = layer.wms.layers[0];
          }
          else if("layers" in layer.wfs)
          {
            typename = layer.wfs.layers[0];
          }
          var params = {
            "mode": "download",
            "layers": typename
          };
          if(state != undefined)
          {
            params["cql_filter"] = "BBOX("+layer.wfs.geometry+", "+state.view.extent+")";
          }
          var querystring = $.map(params, function(v, k){return encodeURIComponent(k) + '=' + encodeURIComponent(v);}).join("&");
          url = layer.kml.url + "?" + querystring;
        }
        return url;
    };
};

geosite.filters["breakpoint"] = function()
{
    return function(style, index)
    {
      var breakpoints = geosite.breakpoints[style.styles.default.dynamic.options.breakpoints];
      if(breakpoints != undefined && breakpoints.length > 0)
      {
        return breakpoints[index];
      }
      else
      {
        return -1;
      }
    };
};

geosite.filters["breakpoints"] = function()
{
    return function(style)
    {
      var breakpoints = geosite.breakpoints[style.styles.default.dynamic.options.breakpoints];
      if(breakpoints != undefined && breakpoints.length > 0)
      {
        return breakpoints;
      }
      else
      {
        return [];
      }
    };
};

geosite.filters["formatBreakpoint"] = function()
{
    return function(value)
    {
      if(Number.isInteger(value))
      {
        return geosite.filters["formatInteger"]()(value, 'delimited', ' ');
      }
      else if($.isNumeric(value))
      {
        return geosite.filters["formatFloat"]()(value, 2);
      }
      else
      {
        return "" + value;
      }
    };
};

geosite.filters["formatFloat"] = function()
{
  return function(value, decimals)
  {
    if(decimals != undefined)
    {
      return value.toFixed(decimals);
    }
    else
    {
      return value.toString();
    }
  };
};

geosite.filters["position_x"] = function()
{
    return function(domain, index, containerWidth, padding)
    {
      var parse_container_width = function(w)
      {
        return $.isNumeric(w) ? w : parseInt(w.substring(0, w.indexOf('px')), 10);
      };
      var actualWidth = parse_container_width(containerWidth) - (padding * 2);
      return padding + (actualWidth * index / domain);
    };
};

geosite.filters["width_x"] = function()
{
    return function(domain, containerWidth, padding)
    {
      var parse_container_width = function(w)
      {
        return $.isNumeric(w) ? w : parseInt(w.substring(0, w.indexOf('px')), 10);
      };
      var actualWidth = parse_container_width(containerWidth)  - (padding * 2);
      return actualWidth / domain;
    };
};

geosite.filters["len"] = geosite.filters["length"] = function()
{
  return function(value)
  {
    if($.isArray(value))
    {
      return value.length;
    }
    else
    {
      return 0;
    }
  };
};

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

geosite.directives["onRepeatDone"] = function(){
  return {
    restriction: 'A',
    link: function($scope, element, attributes ) {
      $scope.$emit(attributes["onRepeatDone"] || "repeat_done", {
        'element': element,
        'attributes': attributes
      });
    }
  };
};

geosite.directives["geositeModalLayerCarto"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'modal_layer_carto.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["geositeModalLayerMore"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'modal_layer_more.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["geositeModalLayerConfig"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'modal_layer_config.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["geositeSymbolCircle"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      style: "=style"
    },
    templateUrl: 'symbol_circle.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["geositeSymbolEllipse"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      style: "=style"
    },
    templateUrl: 'symbol_ellipse.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["geositeSymbolGraduated"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      style: "=style",  // Text binding / one-way binding
      containerWidth: "@" // Text binding / one-way binding
    },
    templateUrl: 'symbol_graduated.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["geositeSymbolGraphic"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      style: "=style"
    },
    templateUrl: 'symbol_graduated.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["geositeLegendBaselayers"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'legend_baselayers.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["geositeLegendFeaturelayers"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'legend_featurelayers.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["geositeModalWelcome"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'modal_welcome.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["geositeBreadcrumbs"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'breadcrumbs.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["geositeCalendar"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'calendar.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["geositeModalFilterMore"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'modal_filter_more.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["geositeFilterCheckbox"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'filter_checkbox.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["geositeFilterRadio"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'filter_radio.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["geositeFilterSlider"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'filter_slider.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["geositeFilterContainer"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'filter_container.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.directives["sparcSidebarCharts"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'sparc_sidebar_charts.tpl.html',
    link: function ($scope, $element, attrs){

    }
  };
};

geosite.directives["sparcModalWelcome"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'modal_welcome_sparc.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geosite.controllers["controller_modal"] = function(
  $scope,
  $element,
  $controller,
  state,
  map_config,
  live)
{
  angular.extend(this, $controller('GeositeControllerBase', {$element: $element, $scope: $scope}));
  //
  var jqe = $($element);

  $scope.test = "blah blah blah";
};

geosite.controllers["controller_legend"] = function(
  $scope,
  $element,
  $controller,
  state,
  map_config,
  live)
{
  angular.extend(this, $controller('GeositeControllerBase', {$element: $element, $scope: $scope}));
  //
  $scope.map_config = map_config;
  $scope.state = state;
  //////////////
  // Watch
  $scope.updateVariables = function(){
    //$scope.$apply(function() {});
    var arrayFilter = $scope.map_config.legendlayers;
    var featurelayers = $.map($scope.map_config.featurelayers, function(item, key){ return {'key': key, 'item': item}; });
    featurelayers = $.grep(featurelayers,function(x, i){ return $.inArray(x["key"], arrayFilter) != -1; });
    featurelayers.sort(function(a, b){ return $.inArray(a["key"], arrayFilter) - $.inArray(b["key"], arrayFilter); });
    $scope.featurelayers = featurelayers;
  };
  $scope.updateVariables();
  $scope.$watch('map_config.featurelayers', $scope.updateVariables);
  $scope.$watch('map_config.legendlayers', $scope.updateVariables);
  //////////////
  var jqe = $($element);

  $scope.$on("refreshMap", function(event, args){
    console.log('args: ', args);
    /*var element_featurelayers = jqe.find('.geosite-map-legend-featurelayers');
    $('.geosite-map-legend-item', element_featurelayers).each(function(){
      var layerID = $(this).data('layer');
      var element_symbol = $(this).find('.geosite-map-legend-item-symbol:first');
      var styleID = args.state.styles[layerID];
      var styles = $.grep(geosite.map_config.featurelayers["context"].cartography, function(x, i){
        return x["id"] == styleID;
      });
      var style =  styles.length > 0 ? styles[0] : undefined;
    });*/
  });
};

geosite.controllers["controller_map"] = function($scope, $element, $controller, state, map_config) {

};

geosite.controllers["controller_breadcrumb"] = function($scope, $element, $controller, state)
{
  angular.extend(this, $controller('GeositeControllerBase', {$element: $element, $scope: $scope}));
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
        data: geosite.initial_data["data"][initialData], // global variable set in header
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

geosite.controllers["controller_calendar"] = function(
  $scope,
  $element,
  $controller,
  state,
  map_config,
  live)
{
  angular.extend(this, $controller('GeositeControllerBase', {$element: $element, $scope: $scope}));
  //

  $scope.state = state;
  $scope.months = MONTHS_ALL;

  $scope.$on("refreshMap", function(event, args){
    if("state" in args)
    {
      $scope.state = args["state"];
    }
  });
};

geosite.controllers["controller_filter"] = function(
  $scope, $element, $controller, $interpolate, state, map_config, live)
{
  var maxValueFromSummary = geosite.initial_data.layers.popatrisk["data"]["summary"]["all"]["max"]["at_admin2_month"];
  angular.extend(this, $controller('GeositeControllerBase', {$element: $element, $scope: $scope}));

  $scope.filters = map_config.featurelayers.popatrisk.filters;

  setTimeout(function(){

    // Initialize Checkbox Filters
    $($element).on('change', 'input:checkbox', function(event) {
      console.log(event);
      var that = this;
      var output = $(that).data('output');
      var filter = {};

      var btngroup = $(that).parents('.btn-group:first');
      var output = btngroup.data('output');
      if(filter[output] == undefined)
      {
        filter[output] = [];
      }
      btngroup.find('input').each(function(){
        if($(this).is(':checked'))
        {
          filter[output].push($(this).data('value'))
        }
      });
      geosite.intend("filterChanged", {"layer": "popatrisk", "filter": filter}, $scope);
    });

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
        geosite.ui_init_slider_label($interpolate, slider, type, range, value);
        geosite.ui_init_slider_slider($interpolate, $scope, slider, type, range, options.indexOf(value), 0, options.length - 1, 1);
      }
      else
      {
        var range = slider.data('range');
        //var value = slider.data('value');
        var minValue = geosite.assert_float(slider.data('min-value'), 0);
        var step = slider.data('step');
        //var label_template = slider.data('label');

        if(($.type(range) == "boolean" && range ) || (range.toLowerCase() == "true"))
        {
          var maxValue = (maxValueFromSummary != undefined && slider.data('max-value') == "summary") ?
              maxValueFromSummary :
              geosite.assert_float(slider.data('max-value'), undefined);
          //
          var values = state["filters"]["popatrisk"][output];
          values = geosite.assert_array_length(values, 2, [minValue, maxValue]);
          var values_n = [Math.floor(values[0]), Math.floor(values[1])];
          var min_n = Math.floor(minValue);
          var max_n = Math.floor(maxValue);
          var step_n = Math.floor(step);

          slider.data('label', label);
          geosite.ui_init_slider_label($interpolate, slider, type, range, values);
          geosite.ui_init_slider_slider($interpolate, $scope, slider, type, range, values_n, min_n, max_n, step_n);
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
          geosite.ui_init_slider_label($interpolate, slider, type, range, value);
          geosite.ui_init_slider_slider($interpolate, $scope, slider, type, range, values_n, min_n, max_n, step_n);
          console.log(value_n, min_n, max_n, step_n, range);
        }
      }
    });

  }, 10);

};

var init_map = function(opts)
{
  var map = L.map('map',
  {
    zoomControl: opt_b(opts, "zoomControl", false),
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
geosite.controllers["controller_map_map"] = function(
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
      geosite.intend("clickedOnMap", delta, $scope);
    },
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
  var baseLayers = geosite.layers.init_baselayers(live["map"], map_config["baselayers"]);
  $.extend(live["baselayers"], baseLayers);
  var baseLayerID = map_config["baselayers"][0].id;
  live["baselayers"][baseLayerID].addTo(live["map"]);
  geosite.intend("viewChanged", {'baselayer': baseLayerID}, $scope);
  geosite.intend("layerLoaded", {'type':'baselayer', 'layer': baseLayerID}, $scope);
  //////////////////////////////////////
  $.each(map_config.featurelayers, function(id, layerConfig){
    if(id != "popatrisk" && id != "context")
    {
      geosite.layers.init_featurelayer(id, layerConfig, $scope, live, map_config);
    }
  });
  //////////////////////////////////////
  // Feature layers
  if("context" in map_config.featurelayers)
  {
    var context_popup_content = function(source)
    {
      console.log(source);
      var fl = map_config.featurelayers.context
      var f = source.feature;
      var popupTemplate = geosite.popup.buildPopupTemplate(fl.popup, fl, f);
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
    live["featurelayers"]["context"] = L.geoJson(geosite.initial_data["layers"]["context"]["data"]["geojson"],{
      renderOrder: $.inArray("context", map_config.renderlayers),
      style: geosite.initial_data["layers"]["context"]["style"]["default"],
      /* Custom */
      hoverStyle: geosite.initial_data["layers"]["context"]["style"]["hover"],
      /* End Custom */
      onEachFeature: function(f, layer){
        var popupOptions = {maxWidth: 300};
        //var popupContent = "Loading ..."
        layer.bindPopup(context_popup_content, popupOptions);
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
  if("popatrisk" in map_config.featurelayers)
  {
    var popatrisk_popup_content = function(source)
    {
      console.log(source);
      /*var f = source.feature;
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

      return $interpolate(popupTemplate)(ctx);*/
      /////////////////////////////
      var $scope = angular.element("#geosite-main").scope();
      var state = $scope.state;
      var featureLayer = map_config["featurelayers"]["popatrisk"];
      var popupConfig = featureLayer["popup"];
      //ctx["chartID"] = chartConfig.id;
      var feature = sparc.normalize_feature(source.feature);
      feature.attributes.popatrisk = sparc.calculate_population_at_risk(
        state.hazard,
        feature,
        state,
        ["vam_filter_fcs", "vam_filter_csi"]);
      var popupContent = geosite.popup.buildPopupContent($interpolate, featureLayer, feature, state);
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
                geosite.initial_data["layers"]["popatrisk"],
                feature.attributes.admin2_code);
              var chartOptions = {
                groups: gc.groups,
                columns: gc.columns,
                bullet_width: function(d, i) { return d.id == "rp25" ? 6 : 12; }
              };
              buildHazardChart(chartConfig, geosite.initial_data["layers"]["popatrisk"], chartOptions);
            }
          }
        }
      }, 1000);
      return popupContent;
      /////////////////////////////
    };

    live["featurelayers"]["popatrisk"] = L.geoJson(geosite.initial_data["layers"]["popatrisk"]["data"]["geojson"],{
      renderOrder: $.inArray("popatrisk", map_config.renderlayers),
      style: geosite.initial_data["layers"]["popatrisk"]["style"]["default"],
      /* Custom */
      hoverStyle: geosite.initial_data["layers"]["popatrisk"]["style"]["hover"],
      /* End Custom */
      onEachFeature: function(f, layer){
        var popupOptions = {maxWidth: 300};
        //var popupContent = "Loading ..."
        layer.bindPopup(popatrisk_popup_content, popupOptions);
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
    geosite.layers.init_featurelayer_post(
      $scope,
      live,
      "popatrisk",
      live["featurelayers"]["popatrisk"],
      map_config.featurelayers.popatrisk.visible);
      // Zoom to Data
      if(!hasViewOverride)
      {
          live["map"].fitBounds(live["featurelayers"]["popatrisk"].getBounds());
      }
  }
  //////////////////////////////////////
  // Sidebar Toggle
  $("#geosite-map-sidebar-toggle-left").click(function (){
    $(this).toggleClass("sidebar-open sidebar-left-open");
    $("#geosite-sidebar-left, #geosite-map").toggleClass("sidebar-open sidebar-left-open");
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
    if("popatrisk" in live["featurelayers"])
    {
      live["featurelayers"]["popatrisk"].setStyle(geosite.initial_data["layers"]["popatrisk"]["style"]["default"]);
    }
    if("context" in live["featurelayers"])
    {
      live["featurelayers"]["context"].setStyle(geosite.initial_data["layers"]["context"]["style"]["default"]);
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
      geosite.popup.openPopup(
        $interpolate,
        args["featureLayer"],
        args["feature"],
        args["location"],
        live["map"],
        angular.element("#geosite-main").scope().state);
    }
  });
};

geosite.controllers["controller_sidebar_sparc"] = function($scope, $element, $controller, state, map_config, live)
{
  angular.extend(this, $controller('GeositeControllerBase', {$element: $element, $scope: $scope}));
  //
  $scope.charts = map_config.charts;

  setTimeout(function(){

    var jqe = $($element);
    if($scope.charts != undefined)
    {
      for(var i = 0; i < $scope.charts.length; i++)
      {
        var options = {};
        if($scope.charts[i].hazard == "drought")
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
        buildHazardChart($scope.charts[i], geosite.initial_data.layers.popatrisk, options);
      }
    }

  }, 10);
};

var buildPageURL = function($interpolate, map_config, state)
{
  var url = $interpolate(map_config.pages[state["page"]])(state);

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

geosite.controllers["controller_main"] = function(
  $interpolate, $scope, $element, $controller, $http, $q,
  state, map_config, stateschema, live)
{
    $scope.map_config = map_config;
    $scope.state = geosite.init_state(state, stateschema);
    $scope.live = live;

    $scope.refreshMap = function(state){


      // Refresh all child controllers
      $scope.$broadcast("refreshMap", {'state': state});
    };

    // Toggle Modals
    $scope.$on("toggleModal", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        //
        var main_scope = angular.element("#geosite-main").scope();
        var id = args["id"];
        var modalOptions = args['modal'] || {};
        modalOptions['show'] = false;
        var modal_scope = angular.element("#"+id).scope();
        var modal_scope_new = {
          "state": main_scope.state
        };
        if("static" in args)
        {
          modal_scope_new = $.extend(modal_scope_new, args["static"]);
        }
        $.each(args["dynamic"],function(key, value){
          if(angular.isArray(value))
          {
            if(value[0] == "map_config")
            {
                modal_scope_new[key] = extract(value.slice(1), map_config);
            }
            else if(value[0] == "state")
            {
                modal_scope_new[key] = extract(value.slice(1), modal_scope_new.state);
            }
          }
          else
          {
              modal_scope_new[key] = value;
          }
        });
        modal_scope.$apply(function () {
            // Update Scope
            modal_scope = $.extend(modal_scope, modal_scope_new);
            setTimeout(function(){
              // Update Modal Tab Selection
              // See https://github.com/angular-ui/bootstrap/issues/1741
              var modalElement = $("#"+id);
              var targetTab = modal_scope.tab;
              if(targetTab != undefined)
              {
                modalElement.find('.nav-tabs li').each(function(){
                  var that = $(this);
                  var thisTab = that.find('a').attr('href').substring(1);
                  if(targetTab == thisTab)
                  {
                      that.addClass('active');
                  }
                  else
                  {
                      that.removeClass('active');
                  }
                });
                modalElement.find('.tab-pane').each(function(){
                  var that = $(this);
                  if(targetTab == that.attr('id'))
                  {
                      that.addClass('in active');
                  }
                  else
                  {
                      that.removeClass('in active');
                  }
                });
              }
              else
              {
                modalElement.find('.nav-tabs li').slice(0, 1).addClass('active');
                modalElement.find('.nav-tabs li').slice(1).removeClass('active');
                modalElement.find('.tab-pane').slice(0, 1).addClass('in active');
                modalElement.find('.tab-pane').slice(1).removeClass('in active');
              }
              // Toggle Modal
              $("#"+id).modal(modalOptions);
              $("#"+id).modal('toggle');
            },0);
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
            var url = buildPageURL($interpolate, map_config, $scope.state);
            history.replaceState(state, "", url);
            $scope.refreshMap($scope.state);
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
            var url = buildPageURL($interpolate, map_config, $scope.state);
            history.replaceState(state, "", url);
            $scope.refreshMap($scope.state);
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
            var url = buildPageURL($interpolate, map_config, $scope.state);
            history.replaceState(state, "", url);
            $scope.refreshMap($scope.state);
        });
    });

    // Map Panned or Zoomed
    $scope.$on("viewChanged", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        //
        var $scope = angular.element("#geosite-main").scope();
        $scope.state.view = $.extend($scope.state.view, args);
        var url = buildPageURL($interpolate, map_config, $scope.state);
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
          $scope.refreshMap($scope.state);
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
          $scope.refreshMap($scope.state);
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
            $scope.refreshMap($scope.state);
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
            $scope.refreshMap($scope.state);
          }
        }
    });
    $scope.$on("switchBaseLayer", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        var $scope = angular.element("#geosite-main").scope();
        $scope.state.view.baselayer = args.layer;
        $scope.refreshMap($scope.state);
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
      { "selector": ".geosite-controller.sparc-welcome", "controller": geosite.controllers.controller_sparc_welcome }
    ]);

    // Init Modals
    geosite.init_controllers($(this), app, [
      { "selector": ".geosite-controller.geosite-controller-modal", "controller": geosite.controllers.controller_modal }
    ]);
  });
};

geosite.controllers["controller_sparc_welcome"] = function(
  $scope, $element, $controller, $interpolate, state, map_config, live)
{
  angular.extend(this, $controller('GeositeControllerBase', {$element: $element, $scope: $scope}));
  //angular.extend(this, $controller('GeositeControllerModal', {$element: $element, $scope: $scope}));

  setTimeout(function(){

    $('#country-input, #hazard-input', $element).each(function(){
      var s = $(this);
      var placeholder = s.data('placeholder');
      var initialData = s.data('initialData');
      var w = s.data('width');
      var h = s.data('height');
      var css = 'sparc-welcome-select-dropdown';
      var template_empty = s.data('template-empty');
      var template_suggestion = s.data('template-suggestion');

      // Twitter Typeahead with
      //https://github.com/bassjobsen/typeahead.js-bootstrap-css
      var engine = new Bloodhound({
        identify: function(obj) {
          return obj['text'];
        },
        datumTokenizer: function(d) {
          return Bloodhound.tokenizers.whitespace(d.text);
        },
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: geosite.initial_data["data"][initialData]
      });

      s.typeahead(null, {
        name: s.attr('name'),
        minLength: 1,
        limit: 10,
        hint: false,
        highlight: true,
        displayKey: 'text',
        source: engine,
        templates: {
          empty: template_empty,
          suggestion: function (data) {
              return '<p><strong>' + data.text + '</strong> - ' + data.id + '</p>';
          },
          footer: function (data) {
            return '<div>Searched for <strong>' + data.query + '</strong></div>';
          }
        }
      }).on('blur', function(event) {
        var results = engine.get($(this).val());
        var backend = $('#'+$(this).data('backend'))
          .val(results.length == 1 ? results[0]['id'] : null)
          .trigger('input')
          .change();
      })
      .on('typeahead:change', function(event, value) {
        console.log("Event: ", event, value);
        var results = engine.get(value);
        var backend = $('#'+$(this).data('backend'))
          .val(results.length == 1 ? results[0]['id'] : null)
          .trigger('input')
          .change();
      })
      .on('typeahead:select typeahead:autocomplete typeahead:cursorchange', function(event, obj) {
        console.log("Event: ", event, obj);
        var backend = $('#'+$(this).data('backend'))
          .val("id" in obj ? obj["id"] : null)
          .trigger('input')
          .change();
      });
    });

    $(".btn-clear", $element).click(function(){
      // Update User Input
      var input = $("#"+$(this).data('clear'));
      input.val(null);
      // Update Backend sync'd with AngularJS
      var backend = $('#'+input.data('backend'));
      backend.val(null);
      backend.trigger('input');
      backend.change();
    });

    sparc.welcome({'scope': $scope});

  }, 10);

};
