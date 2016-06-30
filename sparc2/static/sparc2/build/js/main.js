var geodash = {
  'init': {},
  'directives': {},
  'controllers': {},
  'filters': {},
  'vecmath': {},
  'tilemath': {},
  'api': {},
  'listeners': {},
  'ui': {}
};

geodash.init.templates = function(app)
{
  if(geodash.templates != undefined)
  {
    geodash.meta.templates = [];
    $.each(geodash.templates, function(name, template){
      geodash.meta.templates.push(name);
      app.run(function($templateCache){$templateCache.put(name,template);});
    });
  }
};

geodash.init.filters = function(app)
{
  if(geodash.filters != undefined)
  {
    geodash.meta.filters = [];
    $.each(geodash.filters, function(name, func){
      geodash.meta.filters.push(name);
      app.filter(name, func);
    });
  }
};
geodash.init.directives = function(app)
{
  if(geodash.directives != undefined)
  {
    geodash.meta.directives = [];
    $.each(geodash.directives, function(name, dir){
      geodash.meta.directives.push(name);
      app.directive(name, dir);
    });
  }
};

geodash.init.listeners = function()
{
  $('body').on('click', '.btn-clear', function(event) {

    // this doesn't always point to what you think it does,
    // that's why need to use event.currentTarget
    var selector = $(event.currentTarget).attr('data-clear');

    try{ $(selector).typeahead('close'); }catch(err){};

    $(selector).each(function(){
      var input = $(this);
      input.val(null);
      // Update Typeahead backend if exists
      if(input.data('backend') != undefined)
      {
        var backend = $('#'+input.data('backend'));
        backend.val(null);
        backend.trigger('input');
        backend.change();
      }
    });
  });

  $('body').on('click', '.geodash-intent', function(event) {
    event.preventDefault();  // For anchor tags
    var that = $(this);
    //var scope = angular.element('[ng-controller='+that.data('intent-ctrl')+']').scope();
    var scope = geodash.api.getScope(that.attr('data-intent-ctrl'));
    if(that.hasClass('geodash-toggle'))
    {
      var intentData = JSON.parse(that.attr('data-intent-data')); // b/c jquery data not updated by angular
      if(that.hasClass('geodash-off'))
      {
        that.removeClass('geodash-off');
        geodash.api.intend(that.attr('data-intent-names')[0], intentData, scope);
      }
      else
      {
        that.addClass('geodash-off');
        geodash.api.intend(that.attr('data-intent-names')[1], intentData, scope);
      }
    }
    else if(that.hasClass('geodash-radio'))
    {
      var siblings = that.parents('.geodash-radio-group:first').find(".geodash-radio").not(that);
      if(!(that.hasClass('geodash-on')))
      {
        that.addClass('geodash-on');
        if(that.data("intent-class-on"))
        {
          that.addClass(that.data("intent-class-on"));
          siblings.removeClass(that.data("intent-class-on"));
        }
        siblings.removeClass('geodash-on');
        if(that.data("intent-class-off"))
        {
          that.removeClass(that.data("intent-class-off"));
          siblings.addClass(that.data("intent-class-off"));
        }
        var intentData = JSON.parse(that.attr('data-intent-data')); // b/c jquery data not updated by angular
        geodash.api.intend(that.attr('data-intent-name'), intentData, scope);
      }
    }
    else
    {
      var intentData = JSON.parse(that.attr('data-intent-data'));
      geodash.api.intend(that.attr('data-intent-name'), intentData, scope);
    }
  });
};

geodash.init.typeahead = function($element)
{
  $('.typeahead', $element).each(function(){
    var s = $(this);
    var placeholder = s.data('placeholder');
    var initialData = s.data('initialData');
    var w = s.data('width');
    var h = s.data('height');
    var css = 'geodashserver-welcome-select-dropdown';
    var template_empty = s.data('template-empty');
    var template_suggestion = s.data('template-suggestion');


    var bloodhoundData = [];
    if(angular.isString(initialData))
    {
      if(initialData == "layers")
      {
        bloodhoundData = [];
        var featurelayers = angular.element("#geodash-main").scope()["map_config"]["featurelayers"];
        if(featurelayers != undefined)
        {
          bloodhoundData = bloodhoundData.concat($.map(featurelayers, function(x, i){
            return {'id': x.id, 'text': x.id};
          }));
        }
        var baselayers = angular.element("#geodash-main").scope()["map_config"]["baselayers"];
        if(baselayers != undefined)
        {
          bloodhoundData = bloodhoundData.concat($.map(baselayers, function(x, i){
            return {'id': x.id, 'text': x.id};
          }));
        }
      }
      else if(initialData == "featurelayers")
      {
        bloodhoundData = [];
        var featurelayers = angular.element("#geodash-main").scope()["map_config"]["featurelayers"];
        bloodhoundData = $.map(featurelayers, function(fl, id){ return {'id': id, 'text': id}; });
      }
      else
      {
        bloodhoundData = geodash.initial_data["data"][initialData];
      }
    }
    else if(Array.isArray(initialData))
    {
      bloodhoundData = $.map(initialData, function(x, i){ return {'id': x, 'text': x}; });
    }

    if(angular.isDefined(bloodhoundData) && bloodhoundData.length > 0)
    {
      bloodhoundData.sort(function(a, b){
        var textA = a.text.toLowerCase();
        var textB = b.text.toLowerCase();
        if(textA < textB){ return -1; }
        else if(textA > textB){ return 1; }
        else { return 0; }
      });

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
        local: bloodhoundData
      });

      s.data('engine', engine);
      s.typeahead('destroy','NoCached');
      s.typeahead(null, {
        name: s.attr('name'),
        minLength: 0,
        limit: 10,
        hint: false,
        highlight: true,
        displayKey: 'text',
        source: function (query, cb)
        {
          // https://github.com/twitter/typeahead.js/pull/719#issuecomment-43083651
          // http://pastebin.com/adWHFupF
          //query == "" ? cb(data) : engine.ttAdapter()(query, cb);
          engine.ttAdapter()(query, cb);
        },
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
          .val(extract("id", obj, null))
          .trigger('input')
          .change();
      });
    }

  });

}
geodash.api.getOption = function(options, name)
{
  if(options != undefined && options != null)
  {
    return options[name];
  }
  else
  {
    return undefined;
  }
};
geodash.api.getScope = function(id)
{
  return angular.element("#"+id).isolateScope() || angular.element("#"+id).scope();
};
geodash.api.getDashboardConfig = function(options)
{
  var scope = geodash.api.getOption(options, '$scope') ||
    geodash.api.getOption(options, 'scope') ||
    geodash.api.getScope("geodash-main");
  return scope.map_config;
}
geodash.api.hasLayer = function(id, layers)
{
  var layer = undefined;
  var matches = $.grep(layers, function(x, i){ return x.id == id; });
  return matches.length == 1;
};
geodash.api.getLayer = function(id, layers)
{
  var layer = undefined;
  var matches = $.grep(layers, function(x, i){ return x.id == id; });
  if(matches.length == 1)
  {
    layer = matches[0];
  }
  return layer;
};
geodash.api.getBaseLayer = function(id, options)
{
  var config = geodash.api.getDashboardConfig(options);
  return geodash.api.getLayer(id, config.baselayers);
};
geodash.api.hasBaseLayer = function(id, options)
{
  var config = geodash.api.getDashboardConfig(options);
  return geodash.api.hasLayer(id, config.baselayers);
};
geodash.api.getFeatureLayer = function(id, options)
{
  var config = geodash.api.getDashboardConfig(options);
  return geodash.api.getLayer(id, config.featurelayers);
};
geodash.api.hasFeatureLayer = function(id, options)
{
  var config = geodash.api.getDashboardConfig(options);
  return geodash.api.hasLayer(id, config.featurelayers);
};
geodash.api.welcome = function(options)
{
  options = options || {};
  var scope = options['$scope'] || options['scope'] || angular.element("#geodash-main").scope();
  var intentData = {
    "id": "geodash-modal-welcome",
    "dynamic": {},
    "static": {
      "welcome": scope.map_config["welcome"]
    }
  };
  geodash.api.intend("toggleModal", intentData, scope);
};

/**
 * Used for intents (requesting and action), such as opening modals, zooming the map, etc.
 * @param {string} name of the intent (toggleModal, refreshMap, filterChanged)
 * @param {object} JSON package for intent
 * @param {object} Angular Scope object for emiting the event up the DOM.  This should correspond to an element's paranet controller.
*/
geodash.api.intend = function(name, data, scope)
{
  scope.$emit(name, data);
};


geodash.assert_float = function(x, fallback)
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

geodash.assert_array_length = function(x, length, fallback)
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

geodash.api.opt = function(options, names, fallback, fallback2)
{
  if(options != undefined)
  {
    if($.isArray(names))
    {
      var value = undefined;
      for(var i = 0; i < names.length; i++)
      {
        value = options[names[i]];
        if(value != undefined)
            break;
      }
      return value || fallback || fallback2;
    }
    else
        return options[names] || fallback ||  fallback2;
  }
  else
      return fallback || fallback2;
};
geodash.api.opt_i = function(options, names, fallback)
{
  return geodash.api.opt(options, names, fallback, 0);
};
geodash.api.opt_s = function(options, names, fallback)
{
  return geodash.api.opt(options, names, fallback, "");
};
geodash.api.opt_b = function(options, names, fallback)
{
  return geodash.api.opt(options, names, fallback, false);
};
geodash.api.opt_j = function(options, names, fallback)
{
  return geodash.api.opt(options, names, fallback, {});
};

geodash.api.normalize_feature = function(feature)
{
  var feature = {
    'attributes': feature.attributes || feature.properties,
    'geometry': feature.geometry
  };
  return feature;
};

geodash.api.flatten = function(obj, prefix)
{
  var newObject = {};
  $.each(obj, function(key, value){
    var newKey = prefix != undefined ? prefix+"__"+key : key;
    if(
      (value === undefined) ||
      (value === null) ||
      angular.isString(value) ||
      angular.isNumber(value) ||
      (typeof value == "boolean")
    )
    {
      newObject[newKey] = value;
    }
    else if(angular.isArray(value))
    {
      $.each(geodash.api.flatten(value, newKey), function(key2, value2){
        newObject[""+key2] = value2;
      });
    }
    else
    {
      $.each(geodash.api.flatten(value, newKey), function(key2, value2){
        newObject[key2] = value2;
      });
    }
  });
  return newObject;
};

geodash.api.unpack = function(obj)
{
  var newObject = {};
  $.each(obj, function(key, value){
    if(key.indexOf("__") == -1)
    {
      newObject[key] = value;
    }
    else
    {
      var keyChain = key.split("__");
      var target = obj;
      for(var j = 0; j < keyChain.length; j++)
      {
        var newKey = keyChain[j];
        if(!(newKey in target))
        {
          target[newKey] = {};
        }
        target = target[newKey];
      }
      target[keyChain[keyChain.length-1]] = value;
    }
  });
  return newObject;
};

geodash.api.buildScope = function(event, args)
{
  var mainScope = geodash.api.getScope("geodash-main");
  //
  var id = args["id_target"] || args["id_show"] || args["id"];
  var sourceScope = event.targetScope;
  var scope_new = {
    "state": mainScope.state,
    "meta": geodash.meta
  };
  if(angular.isDefined(args))
  {
    if("static" in args)
    {
      scope_new = $.extend(scope_new, args["static"]);
    }
    if("dynamic" in args)
    {
      $.each(args["dynamic"],function(key, value){
        if(angular.isString(value))
        {
          if(value == "map_config")
          {
            scope_new[key] = mainScope.map_config;
          }
          else if(value == "state")
          {
            scope_new[key] = mainScope.state;
          }
        }
        else if(angular.isArray(value))
        {
          var value_0_lc = value[0].toLowerCase();
          if(value_0_lc == "source")
          {
            scope_new[key] = extract(expand(value.slice(1)), event.targetScope);
          }
          else if(value_0_lc == "baselayer" || value_0_lc == "bl")
          {
              scope_new[key] = geodash.api.getBaseLayer(value[1]) || undefined;
          }
          else if(value_0_lc == "featurelayer" || value_0_lc == "fl")
          {
              scope_new[key] = geodash.api.getFeatureLayer(value[1]) || undefined;
          }
          else
          {
            if(value_0_lc == "map_config")
            {
              scope_new[key] = extract(expand(value.slice(1)), mainScope.map_config);
            }
            else if(value_0_lc == "state")
            {
              scope_new[key] = extract(expand(value.slice(1)), mainScope.state);
            }
          }
        }
        else
        {
          scope_new[key] = value;
        }
      });
    }
  }
  return $.extend(true, {}, scope_new);  // Returns a deep copy of variables
};

geodash.api.updateValue = function(field_flat, source, target)
{
  // Update map_config
  if(field_flat.indexOf("__") == -1)
  {
    target[field_flat] = source[field_flat];
  }
  else
  {
    var keyChain = field_flat.split("__");
    for(var j = 0; j < keyChain.length -1 ; j++)
    {
      var newKey = keyChain[j];
      if(!(newKey in target))
      {
        var iTest = -1;
        try{iTest = parseInt(keyChain[j+1], 10);}catch(err){iTest = -1;};
        target[newKey] = iTest >= 0 ? [] : {};
      }
      target = target[newKey];
    }
    var finalKey = keyChain[keyChain.length-1];
    if(angular.isArray(target))
    {
      if(finalKey >= target.length)
      {
        var zeros = finalKey - target.length;
        for(var k = 0; k < zeros; k++ )
        {
          target.push({});
        }
        target.push(source[field_flat]);
      }
    }
    else
    {
      target[finalKey] = source[field_flat];
    }
  }
};


geodash.listeners.saveAndHide = function(event, args)
{
  geodash.listeners.hideModal(event, args);
  //
  var target = args["id_target"] || args["id"];
  var modal_scope_target = geodash.api.getScope(target);
  var modal_scope_new = geodash.api.buildScope(event, args);
  modal_scope_target.$apply(function () {
    $.each(modal_scope_new, function(key, value){
      modal_scope_target[key] = value;
    });
    // OR
    //$.extend(modal_scope_target, modal_scope_new);
  });
};
/*
geodash.listeners.saveAndSwitch = function(event, args)
{
  geodash.listeners.hideModal(event, args);
  //
  var target = args["id_show"] || args["id"];
  var modal_scope_target = geodash.api.getScope(target);
  var modal_scope_new = geodash.api.buildScope(event, args);
  modal_scope_target.$apply(function () {
    $.each(modal_scope_new, function(key, value){ modal_scope_target[key] = value; });
  });
};*/
geodash.listeners.switchModal = function(event, args)
{
  geodash.listeners.hideModal(event, args);
  geodash.listeners.showModal(event, args);
};
geodash.listeners.hideModal = function(event, args)
{
  var id = args["id_hide"] || args["id"];
  try {
    $("#"+id).modal('hide');
    var modal_scope = geodash.api.getScope(id);
    var aClear = args["clear"];
    if("clear" in args && args["clear"] != undefined)
    {
      modal_scope.$apply(function () {
        $.each(aClear,function(i, x){
          modal_scope[x] = undefined;
        });
      });
    }
  }
  catch(err){};
};
geodash.listeners.toggleModal = function(event, args)
{
  geodash.listeners.showModal(event, args);
};
geodash.listeners.showModal = function(event, args)
{
    console.log('event', event);
    console.log('args', args);
    //
    var id = args["id_show"] || args["id"];
    var modal_scope = geodash.api.getScope(id);
    var modal_scope_new = geodash.api.buildScope(event, args);
    var modalOptions = args['modal'] || {};
    modalOptions['show'] = false;
    modal_scope.$apply(function () {
        // Update Scope
        //modal_scope = $.extend(modal_scope, modal_scope_new);
        $.each(modal_scope_new, function(key, value){ modal_scope[key] = value; });
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
          // Initalize Tooltips
          $('[data-toggle="tooltip"]', modalElement).tooltip();
          //Initialize Typeahead
          geodash.init.typeahead(modalElement);
          // Toggle Modal
          $("#"+id).modal(modalOptions);
          $("#"+id).modal('toggle');
        },0);
    });
};

geodash.ui.showOptions = function($event, selector)
{
  try{
    var input = $(selector);
    input.typeahead('open');
    input.data('ttTypeahead').menu.update.apply(input.data('ttTypeahead').menu, [""]);
    var engine = input.data('engine');
    engine.search.apply(engine, [""])
  }catch(err){};
};

var currentControllers = [];

geodash.init_controller_base = function(app)
{
  app.controller("GeoDashControllerBase", geodash.controllers.controller_base);
};

geodash.init_controller = function(that, app, controller)
{
  var controllerName = that.data('controllerName') || that.attr('name') || that.attr('id');
  if(controllerName == undefined || controllerName == null || controllerName == "")
  {
    console.log("Error: Could not load controller for element, because name could not be resolved");
    console.log(that, controller);
  }
  else
  {
    currentControllers.push({
      'controllerName': controllerName,
      'controller': (controller || geodash.controllers.controller_base)
    });
    app.controller(controllerName, controller || geodash.controllers.controller_base);
  }
};

geodash.init_controllers = function(that, app, controllers)
{
  for(var i = 0; i < controllers.length; i++)
  {
    var c = controllers[i];
    $(c.selector, that).each(function(){
        try
        {
          geodash.init_controller($(this), app, c.controller);
        }
        catch(err)
        {
          console.log("Could not load Geosite Controller \""+c.selector+"\"", err);
        }
    });
  }
};

geodash.vecmath = {};

geodash.vecmath.distance = function(a, b)
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

geodash.vecmath.closestLocation = function(a, b)
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

geodash.vecmath.getClosestFeatureAndLocation = function(nearbyFeatures, target)
{
  var closestFeature = undefined;
  var closestDistance = 0;
  var closestLocation = undefined;
  if(nearbyFeatures != undefined)
  {
    if(nearbyFeatures.length > 0)
    {
      closestFeature = nearbyFeatures[0];
      closestDistance = geodash.vecmath.distance(target, nearbyFeatures[0].geometry);
      closestLocation = geodash.vecmath.closestLocation(target, nearbyFeatures[0].geometry);
      for(var i = 1; i < nearbyFeatures.length ;i++)
      {
        var f = nearbyFeatures[i];
        if(geodash.vecmath.distance(target, f.geometry) < closestDistance)
        {
          closestFeature = f;
          closestDistance = geodash.vecmath.distance(target, f.geometry);
          closestLocation = geodash.vecmath.closestLocation(target, f.geometry);
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
geodash.init_state = function(state, stateschema)
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
geodash.ui_init_slider_label = function($interpolate, that, type, range, value)
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
geodash.ui_init_slider_slider = function($interpolate, $scope, that, type, range, value, minValue, maxValue, step)
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
          geodash.ui_update_slider_label.apply(this, [$interpolate, event, ui]);
          var output = that.data('output');
          var newValue = that.data('options')[ui.value];
          var filter = {};
          filter[output] = newValue;
          geodash.api.intend("filterChanged", {"layer":"popatrisk", "filter":filter}, $scope);
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
            geodash.ui_update_slider_label.apply(this, [$interpolate, event, ui]);
            var output = that.data('output');
            var newValue = ui.values;
            var filter = {};
            filter[output] = newValue;
            geodash.api.intend("filterChanged", {"layer":"popatrisk", "filter":filter}, $scope);
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
            geodash.ui_update_slider_label.apply(this, [$interpolate, event, ui]);
            var output = that.data('output');
            var newValue = ui.value / 100.0;
            var filter = {};
            filter[output] = newValue;
            geodash.api.intend("filterChanged", {"layer":"popatrisk", "filter":filter}, $scope);
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
geodash.ui_update_slider_label = function($interpolate, event, ui)
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
var expand = function(x)
{
  var newArray = [];
  if(Array.isArray(x))
  {
    for(var i = 0; i < x.length; i++)
    {
      var value = x[i];
      if(angular.isString(value))
      {
        if(value.indexOf(".") != -1)
        {
          newArray = newArray.concat(value.split("."));
        }
        else
        {
          newArray.push(value);
        }
      }
      else
      {
        newArray.push(value);
      }
    }
  }
  else if(angular.isString(x))
  {
    newArray = x.split(".");
  }
  return newArray;
};
var extract = function(keyChain, node, fallback)
{
  if(angular.isString(keyChain))
  {
    keyChain = keyChain.split(".");
  }
	var obj = undefined;
	if(keyChain.length==0)
	{
    if(node != undefined && node != null)
		{
      obj = node;
    }
    else
    {
      obj = fallback;
    }
	}
	else
	{
    var newKeyChain = keyChain.slice(1);
    if(newKeyChain.length == 0)
    {
      if(angular.isString(keyChain[0]) && keyChain[0].toLowerCase() == "length")
      {
        if(Array.isArray(node))
        {
          obj = node.length;
        }
        else if(angular.isDefined(node))
        {
          obj = node["length"];
        }
        else
        {
          obj = 0;
        }
      }
    }

    if(obj == undefined && angular.isDefined(node))
    {
      if(Array.isArray(node))
      {
        obj = extract(newKeyChain, node[keyChain[0]], fallback);
      }
      else
      {
        obj = extract(newKeyChain, node[""+keyChain[0]], fallback);
      }
    }
	}
	return obj;
};

geodash.codec = {};

geodash.codec.parseFeatures = function(response, fields_by_featuretype)
{
  var features = [];
  //$(response).find("FeatureCollection")  No need to search for featurecollection.  It IS the featurecollection
  $(response).find('gml\\:featuremember').each(function(){
      //var f = $(this).find(typeName.indexOf(":") != -1 ? typeName.substring(typeName.indexOf(":") + 1) : typeName);
      var f = $(this).children();
      var typeName = f.prop("tagName").toLowerCase();
      var attributes = geodash.codec.parseAttributes(f, fields_by_featuretype[typeName]);
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
geodash.codec.parseAttributes  = function(element, fields)
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

geodash.popup = {};

geodash.popup.buildChart = function(chart, layer, feature, state)
{
  var html = "";
  html += "<div style=\"text-align:center;\"><b>"+chart.label+"</b></div><br>";
  html += "<div id=\""+chart.id+"\" class=\"geodash-popup-chart\"></div>";
  return html;
}

geodash.popup.buildField = function(field, layer, feature, state)
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

geodash.popup.buildPopupTemplate = function(popup, layer, feature, state)
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
        var popupField = geodash.popup.buildField(pane.fields[j], layer, feature, state);
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
        var popupChart = geodash.popup.buildChart(pane.charts[j], layer, feature, state);
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
    var html_tab ="<li class=\"active\"><a data-toggle=\"tab\" href=\"#"+pane.id+"\">"+pane.tab.label+"</a></li>";
    tabs.push(html_tab);
    for(var i = 1; i < panes.length; i++)
    {
      pane = panes[i];
      html_tab = "<li><a data-toggle=\"tab\" href=\"#"+pane.id+"\">"+pane.tab.label+"</a></li>"
      tabs.push(html_tab);
    }
    var html_tabs = "<ul class=\"nav nav-tabs nav-justified\">"+tabs.join("")+"</ul>";
    ///////////////
    var paneContentsWithWrapper = [];
    var html_pane = "<div id=\""+panes[0].id+"\" class=\"tab-pane fade in active\">"+paneContents[0]+"</div>";
    paneContentsWithWrapper.push(html_pane);
    for(var i = 1; i < panes.length; i++)
    {
      html_pane = "<div id=\""+panes[i].id+"\" class=\"tab-pane fade\">"+paneContents[i]+"</div>";
      paneContentsWithWrapper.push(html_pane);
    }
    ///////////////
    popupTemplate += html_tabs + "<div class=\"tab-content\">"+paneContentsWithWrapper.join("")+"</div>";
  }
  else
  {
    popupTemplate += paneContents[0];
  }
  return popupTemplate;
};

geodash.popup.buildPopupContent = function($interpolate, featureLayer, feature, state)
{
  var popupTemplate = geodash.popup.buildPopupTemplate(featureLayer.popup, featureLayer, feature, state);
  var ctx = {
    'layer': featureLayer,
    'feature': feature,
    'state': state
  };
  return $interpolate(popupTemplate)(ctx);
};

geodash.popup.openPopup = function($interpolate, featureLayer, feature, location, map, state)
{
  var popupContent = geodash.popup.buildPopupContent($interpolate, featureLayer, feature, state);
  var popup = new L.Popup({maxWidth: (featureLayer.popup.maxWidth || 400)}, undefined);
  popup.setLatLng(new L.LatLng(location.lat, location.lon));
  popup.setContent(popupContent);
  map.openPopup(popup);
};

geodash.tilemath = {
  "D2R": Math.PI / 180,
  "R2D": 180 / Math.PI
};

geodash.tilemath.point_to_bbox = function(x, y, z, digits)
{
  var radius = geodash.tilemath.point_to_radius(z);
  var e = x + radius; if(digits != undefined && digits >= 0){e = e.toFixed(digits);}
  var w = x - radius; if(digits != undefined && digits >= 0){w = w.toFixed(digits);}
  var s = y - radius; if(digits != undefined && digits >= 0){s = s.toFixed(digits);}
  var n = y + radius; if(digits != undefined && digits >= 0){n = n.toFixed(digits);}
  return [w, s, e, n];
};

geodash.tilemath.point_to_radius = function(z)
{
  return (geodash.config.click_radius || 4.0) / z;
};

geodash.tilemath.tms_to_bbox = function(x, y, z)
{
  var e = geodash.tilemath.tile_to_lon(x+1, z);
  var w = geodash.tilemath.tile_to_lon(x, z);
  var s = geodash.tilemath.tile_to_lat(y+1, z);
  var n = geodash.tilemath.tile_to_lat(y, z);
  return [w, s, e, n];
};


geodash.tilemath.tile_to_lon = function(x, z)
{
  return x / Math.pow(2, z) * 360-180;
};


geodash.tilemath.tile_to_lat = function(y, z)
{
  n = Math.pi - 2 * Math.PI * y / Math.pow(2,z);
  return ( R2D * Math.atan(0.5 * ( Math.exp(n) - Math.exp(-n))));
};

geodash.http = {};

geodash.http.build_promises = function($http, urls)
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
geodash.http.build_features = function(responses, fields_by_featuretype)
{
  var features = [];
  for(var i = 0; i < responses.length; i++)
  {
    var response = responses[i];
    if(response.status == 200)
    {
      var data = response.data;
      features = features.concat(geodash.codec.parseFeatures(data, fields_by_featuretype));
    }
  }
  return features;
};

geodash.layers = {};

geodash.layers.aggregate_fields = function(featureLayer)
{
  var fields = [];
  for(var i = 0; i < featureLayer.popup.panes.length; i++)
  {
    fields = fields.concat(featureLayer.popup.panes[i].fields);
  }
  return fields;
};
geodash.layers.init_baselayers = function(map, baselayers)
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
geodash.layers.init_featurelayer_post = function($scope, live, id, fl, visible)
{
  if(fl != undefined)
  {
    if(visible != undefined ? visible : true)
    {
      fl.addTo(live["map"]);
    }
    geodash.api.intend("layerLoaded", {'type':'featurelayer', 'layer': id, 'visible': visible}, $scope);
  }
  else
  {
    console.log("Could not add featurelayer "+id+" because it is undefined.");
  }
};
geodash.layers.init_featurelayer_wms = function($scope, live, map_config, id, layerConfig)
{
  //https://github.com/Leaflet/Leaflet/blob/master/src/layer/tile/TileLayer.WMS.js
  var w = layerConfig.wms;
  var fl = L.tileLayer.wms(w.url, {
    renderOrder: $.inArray(id, map_config.renderlayers),
    buffer: w.buffer || 0,
    version: w.version || "1.1.1",
    layers: (Array.isArray(w.layers) ? w.layers.join(",") : w.layers),
    styles: w.styles ? w.styles.join(",") : '',
    format: w.format || 'image/png',
    transparent: angular.isDefined(w.transparent) ? w.transparent : true,
    attribution: layerConfig.source.attribution
  });
  live["featurelayers"][id] = fl;
  geodash.layers.init_featurelayer_post($scope, live, id, fl, layerConfig.visible);
};
geodash.layers.init_featurelayer_geojson = function($scope, live, map_config, id, layerConfig)
{
  var url = extract("geojson.url", layerConfig) || extract("source.url", layerConfig) || extract("url", layerConfig);
  $.ajax({
    url: url,
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
      geodash.layers.init_featurelayer_post($scope, live, id, fl, layerConfig.visible);
    }
  });
};
geodash.layers.init_featurelayer = function(id, layerConfig, $scope, live, map_config)
{
  if(layerConfig.enabled == undefined || layerConfig.enabled == true)
  {
    if(layerConfig.type.toLowerCase() == "geojson")
    {
      geodash.layers.init_featurelayer_geojson($scope, live, map_config, id, layerConfig);
    }
    else if(layerConfig.type.toLowerCase() == "wms")
    {
      geodash.layers.init_featurelayer_wms($scope, live, map_config, id, layerConfig);
    }
  }
};
geodash.layers.init_featurelayers = function(featureLayers, $scope, live, map_config)
{
  $.each(featureLayers, function(i, layerConfig){
    geodash.layers.init_featurelayer(layerConfig.id, layerConfig, $scope, live, map_config);
  });
};

var sparc = {};

sparc.welcome = function(options)
{
  options = options || {};
  var scope = options['$scope'] || options['scope'] || angular.element("#geodash-main").scope();
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
  geodash.api.intend("toggleModal", intentData, scope);
};

geodash.vam_filter_fcs = function(value, filters, f)
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
        var admin1_code = f.attributes.admin1_code;
        var matches = $.grep(geodash.initial_data.layers.vam.data.geojson.features, function(x, i){
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
geodash.vam_filter_csi = function(value, filters, f)
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
        var admin1_code = f.attributes.admin1_code;
        var matches = $.grep(geodash.initial_data.layers.vam.data.geojson.features, function(x, i){
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
        if(a["prob_class_max"] >= prob_class_max)
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
        if(a["prob_class_max"] >= prob_class_max)
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
  else if(hazard == "landslide")
  {
    value = feature.attributes["values_by_month"][month_short3];
  }

  if(filters != undefined)
  {
    $.each(filters, function(i, x){
      value = geodash[x](value, state["filters"]["popatrisk"], feature);
    });
  }

  return value;
};

var buildGroupsAndColumnsForCountry = function(chartConfig, popatrisk_config)
{
  var groups = [[]];
  var columns = [];
  var order = undefined;

  if(chartConfig.hazard == "cyclone")
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
  else if(chartConfig.hazard == "landslide")
  {
    var data = popatrisk_config["data"]["summary"]["all"]["by_month"];
    var g = "Population at Risk";
    columns.push([g].concat(data));
    groups[0].push(g);
  }

  return {'groups': groups, 'columns': columns, 'order': order};
};
var buildGroupsAndColumnsForAdmin2 = function(chartConfig, popatrisk_config, admin2_code)
{
  var groups = [[]];
  var columns = [];
  var order = undefined;

  if(chartConfig.hazard == "cyclone")
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
  else if(chartConfig.hazard == "flood")
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
  else if(chartConfig.hazard == "landslide")
  {
    var data = popatrisk_config["data"]["summary"]["admin2"][""+admin2_code]["by_month"];
    var g = "Risk";
    columns.push([g].concat(data));
    groups[0].push(g);
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

geodash.config = {
  'click_radius': 2.0
};

geodash.init_country = function(appName)
{
  var context = $.grep(geodash.map_config.featurelayers, function(x, i){ return x.id == "context"; })[0];

  var url_context_summary = context["urls"]["summary"]
    .replace("{iso3}", geodash.initial_state["iso3"]);

  var url_context_geojson = context["urls"]["geojson"]
    .replace("{iso3}", geodash.initial_state["iso3"]);

  var vam = $.grep(geodash.map_config.featurelayers, function(x, i){ return x.id == "vam"; })[0];

  var url_vam_geojson = vam["urls"]["geojson"]
    .replace("{iso3}", geodash.initial_state["iso3"]);

  $.when(
    $.ajax({dataType: "json", url: url_context_summary}),
    $.ajax({dataType: "json", url: url_context_geojson}),
    $.ajax({dataType: "json", url: url_vam_geojson})
  ).done(function(
    response_context_summary,
    response_context_geojson,
    response_vam_geojson
    ){
    geodash.initial_data["layers"]["context"]["data"]["summary"] = response_context_summary[0];
    geodash.initial_data["layers"]["context"]["data"]["geojson"] = response_context_geojson[0];
    geodash.initial_data["layers"]["vam"]["data"]["geojson"] = response_vam_geojson[0];

    geodash.breakpoints = {};

    $.each(geodash.initial_data["layers"]["context"]["data"]["summary"]["all"]["breakpoints"], function(k, v){
      geodash.breakpoints["context_"+k] = v;
    });

    geodash.init_country_main_app(appName);
  });
};

geodash.init_country_main_app = function(appName)
{
  geodash.app = app = angular.module(appName, ['ngRoute','ngSanitize']);

  geodash.init.templates(app);
  geodash.init.filters(app);
  geodash.init.directives(app);

  app.factory('state', function(){return $.extend({}, geodash.initial_state);});
  app.factory('stateschema', function(){return $.extend({}, geodash.state_schema);});
  app.factory('map_config', function(){return $.extend({}, geodash.map_config);});
  app.factory('live', function(){
    return {
      "map": undefined,
      "baselayers": {},
      "featurelayers": {
        "popatrisk":undefined
      }
    };
  });

  // Initialize UI interaction for intents.
  // Listen's for events bubbling up to body element, so can initialize before children.
  geodash.init.listeners();

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

  geodash.init_controller_base(app);

  var mainController = $('#geodash-main');
  init_sparc_controller_main(mainController, app);

  angular.bootstrap(document, [appName]);
};

geodash.init_countryhazardmonth = function(appName)
{
  var popatrisk = $.grep(geodash.map_config.featurelayers, function(x, i){ return x.id == "popatrisk"; })[0];

  var url_popatrisk_summary = popatrisk["sparc"]["summary"]
    .replace("{iso3}", geodash.initial_state["iso3"])
    .replace("{hazard}", geodash.initial_state["hazard"]);

  var url_popatrisk_geojson = popatrisk["geojson"]["url"]
    .replace("{iso3}", geodash.initial_state["iso3"])
    .replace("{hazard}", geodash.initial_state["hazard"]);

  var context = $.grep(geodash.map_config.featurelayers, function(x, i){ return x.id == "context"; })[0];

  var url_context_summary = context["sparc"]["summary"]
    .replace("{iso3}", geodash.initial_state["iso3"]);

  var url_context_geojson = context["geojson"]["url"]
    .replace("{iso3}", geodash.initial_state["iso3"]);

  var vam = $.grep(geodash.map_config.featurelayers, function(x, i){ return x.id == "vam"; })[0];

  var url_vam_geojson = vam["geojson"]["url"]
    .replace("{iso3}", geodash.initial_state["iso3"]);

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
    geodash.initial_data["layers"]["popatrisk"]["data"]["summary"] = response_popatrisk_summary[0];
    geodash.initial_data["layers"]["popatrisk"]["data"]["geojson"] = response_popatrisk_geojson[0];
    geodash.initial_data["layers"]["context"]["data"]["summary"] = response_context_summary[0];
    geodash.initial_data["layers"]["context"]["data"]["geojson"] = response_context_geojson[0];
    geodash.initial_data["layers"]["vam"]["data"]["geojson"] = response_vam_geojson[0];

    geodash.breakpoints = {};

    if("all" in geodash.initial_data["layers"]["popatrisk"]["data"]["summary"])
    {
      $.each(geodash.initial_data["layers"]["popatrisk"]["data"]["summary"]["all"]["breakpoints"], function(k, v){
        geodash.breakpoints["popatrisk_"+k] = v;
      });
    }

    if("all" in geodash.initial_data["layers"]["context"]["data"]["summary"])
    {
      $.each(geodash.initial_data["layers"]["context"]["data"]["summary"]["all"]["breakpoints"], function(k, v){
        geodash.breakpoints["context_"+k] = v;
      });
    }

    geodash.init_countryhazardmonth_main_app(appName);
  });
};

geodash.init_countryhazardmonth_main_app = function(appName)
{
  geodash.app = app = angular.module(appName, ['ngRoute','ngSanitize', 'ngCookies']);

  geodash.init.templates(app);
  geodash.init.filters(app);
  geodash.init.directives(app);

  app.factory('state', function(){return $.extend({}, geodash.initial_state);});
  app.factory('stateschema', function(){return $.extend({}, geodash.state_schema);});
  app.factory('map_config', function(){return $.extend({}, geodash.map_config);});
  app.factory('live', function(){
    return {
      "map": undefined,
      "baselayers": {},
      "featurelayers": {
        "popatrisk":undefined
      }
    };
  });
  // Initialize UI interaction for intents.
  // Listen's for events bubbling up to body element, so can initialize before children.
  geodash.init.listeners();

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

  geodash.init_controller_base(app);

  var mainController = $('#geodash-main');
  init_sparc_controller_main(mainController, app);

  angular.bootstrap(document, [appName]);
};

geodash.init_explore = function(appName)
{
  geodash.app = app = angular.module(appName, ['ngRoute','ngSanitize']);

  geodash.init.templates(app);
  geodash.init.filters(app);
  geodash.init.directives(app);

  app.factory('state', function(){return $.extend({}, geodash.initial_state);});
  app.factory('stateschema', function(){return $.extend({}, geodash.state_schema);});
  app.factory('map_config', function(){return $.extend({}, geodash.map_config);});
  app.factory('live', function(){
    return {
      "map": undefined,
      "baselayers": {},
      "featurelayers":{}
    };
  });

  // Initialize UI interaction for intents.
  // Listen's for events bubbling up to body element, so can initialize before children.
  geodash.init.listeners();

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

  geodash.init_controller_base(app);

  var mainController = $('#geodash-main');
  init_sparc_controller_main(mainController, app);

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

geodash.style_cyclone = function(f, state, map_config, options)
{
  var fl = geodash.api.getFeatureLayer("popatrisk");
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
    geodash.api.normalize_feature(f),
    state,
    options.filters);

  if(
    value >= popatrisk_range[0] && value <= popatrisk_range[1] &&
    (ldi == undefined || (ldi >= ldi_range[0] && ldi <= ldi_range[1])) &&
    (erosion_propensity == undefined || (erosion_propensity >= erosion_propensity_range[0] && erosion_propensity <= erosion_propensity_range[1])) &&
    (landcover_delta_negative == undefined || (landcover_delta_negative >= landcover_delta_negative_range[0] && landcover_delta_negative <= landcover_delta_negative_range[1]))
  )
  {
    var colors = fl["cartography"][0]["colors"]["ramp"];
    var breakpoints = geodash.breakpoints[options["breakpoints"]];
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

geodash.style_drought = function(f, state, map_config, options)
{
  var fl = geodash.api.getFeatureLayer("popatrisk");
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
    geodash.api.normalize_feature(f),
    state,
    options.filters);

  if(
    value >= popatrisk_range[0] && value <= popatrisk_range[1] &&
    (ldi == undefined || (ldi >= ldi_range[0] && ldi <= ldi_range[1])) &&
    (erosion_propensity == undefined || (erosion_propensity >= erosion_propensity_range[0] && erosion_propensity <= erosion_propensity_range[1])) &&
    (landcover_delta_negative == undefined || (landcover_delta_negative >= landcover_delta_negative_range[0] && landcover_delta_negative <= landcover_delta_negative_range[1]))
  )
  {
    var colors = fl["cartography"][0]["colors"]["ramp"];
    var breakpoints = geodash.breakpoints[options["breakpoints"]];
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
geodash.style_flood = function(f, state, map_config, options)
{
  var fl = geodash.api.getFeatureLayer("popatrisk");
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
    geodash.api.normalize_feature(f),
    state,
    options.filters);

  if(
    value >= popatrisk_range[0] && value <= popatrisk_range[1] &&
    (ldi == undefined || (ldi >= ldi_range[0] && ldi <= ldi_range[1])) &&
    (erosion_propensity == undefined || (erosion_propensity >= erosion_propensity_range[0] && erosion_propensity <= erosion_propensity_range[1])) &&
    (landcover_delta_negative == undefined || (landcover_delta_negative >= landcover_delta_negative_range[0] && landcover_delta_negative <= landcover_delta_negative_range[1]))
  )
  {
      var colors = fl["cartography"][0]["colors"]["ramp"];
      var breakpoints = geodash.breakpoints[options["breakpoints"]];
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
geodash.style_landslide = function(f, state, map_config, options)
{
  var fl = geodash.api.getFeatureLayer("popatrisk");
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
    'landslide',
    geodash.api.normalize_feature(f),
    state,
    options.filters);

  if(
    value >= popatrisk_range[0] && value <= popatrisk_range[1] &&
    (ldi == undefined || (ldi >= ldi_range[0] && ldi <= ldi_range[1])) &&
    (erosion_propensity == undefined || (erosion_propensity >= erosion_propensity_range[0] && erosion_propensity <= erosion_propensity_range[1])) &&
    (landcover_delta_negative == undefined || (landcover_delta_negative >= landcover_delta_negative_range[0] && landcover_delta_negative <= landcover_delta_negative_range[1]))
  )
  {
      var colors = fl["cartography"][0]["colors"]["ramp"];
      var breakpoints = geodash.breakpoints[options["breakpoints"]];
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
geodash.style_context = function(f, state, map_config, options)
{
  var fl = geodash.api.getFeatureLayer("context");
  var style = {};
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
    var breakpoints = geodash.initial_data.layers.context["data"]["summary"]["all"]["breakpoints"][breakPointsName];
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

geodash.meta = {};
geodash.meta.projects = [{"name":"geodash","version":"0.0.1","description":"geodash.js 0.0.1"},{"name":"SPARC 2.x","version":"0.0.1","description":"SPARC 2.x"}];
geodash.meta.plugins = [{"controllers":["controller_base.js"],"directives":["svg.js","onLinkDone.js","onRepeatDone.js","geodashModalDashboardConfig.js","tab.js","geodashBtnClose.js","geodashBtnInfo.js","geodashBtnClear.js"],"enumerations":["dates.js"],"templates":["geodash_modal_dashboard_config.tpl.html","geodash_tab.tpl.html","geodash_btn_close.tpl.html","geodash_btn_info.tpl.html","geodash_btn_clear.tpl.html"],"filters":["default.js","md2html.js","percent.js","tabLabel.js","as_float.js","add.js","title.js","as_array.js","sortItemsByArray.js","breakpoint.js","breakpoints.js","position_x.js","width_x.js","length.js","layer_is_visible.js","common/append.js","common/default_if_undefined.js","common/default_if_undefined_or_blank.js","common/extract.js","common/inArray.js","common/prepend.js","common/ternary.js","common/ternary_defined.js","common/yaml.js","array/join.js","array/first.js","array/last.js","array/choose.js","format/formatBreakPoint.js","format/formatFloat.js","format/formatInteger.js","format/formatArray.js","format/formatMonth.js m","math/eq.js","math/lte.js","math/gte.js","math/gt.js","string/replace.js","string/split.js","url/url_shapefile.js","url/url_geojson.js","url/url_kml.js","url/url_describefeaturetype.js"],"project":"geodash","id":"base"},{"controllers":["controller_legend.js"],"directives":["geodashModalLayerCarto.js","geodashModalLayerMore.js","geodashModalLayerConfig.js","geodashSymbolCircle.js","geodashSymbolEllipse.js","geodashSymbolGraduated.js","geodashSymbolGraphic.js","geodashLegendBaselayers.js","geodashLegendFeaturelayers.js"],"templates":["modal/geodash_modal_layer_carto.tpl.html","modal/geodash_modal_layer_more.tpl.html","modal/geodash_modal_layer_config.tpl.html","symbol/symbol_circle.tpl.html","symbol/symbol_ellipse.tpl.html","symbol/symbol_graduated.tpl.html","symbol/symbol_graphic.tpl.html","legend_baselayers.tpl.html","legend_featurelayers.tpl.html"],"less":["legend.less"],"project":"geodash","id":"legend"},{"controllers":[],"directives":["geodashModalWelcome.js"],"templates":["modal/geodash_modal_welcome.tpl.html"],"project":"geodash","id":"welcome"},{"controllers":[],"directives":["geodashModalAbout.js"],"templates":["geodash_modal_about.tpl.html"],"project":"geodash","id":"about"},{"controllers":[],"directives":["geodashModalDownload.js"],"templates":["geodash_modal_download.tpl.html"],"project":"geodash","id":"download"},{"controllers":[],"directives":["geodashMapOverlays.js"],"templates":["map_overlays.tpl.html"],"less":["map_overlays.less"],"project":"geodash","id":"overlays"},{"controllers":["controller_breadcrumb.js"],"directives":["geodashBreadcrumbs.js"],"enumerations":["breadcrumbs.js"],"templates":["breadcrumbs.tpl.html"],"less":["breadcrumbs.less"],"project":"SPARC 2.x","id":"breadcrumbs"},{"controllers":["controller_calendar.js"],"directives":["geodashCalendar.js"],"templates":["calendar.tpl.html"],"less":["calendar.less"],"project":"SPARC 2.x","id":"calendar"},{"controllers":["controller_filter.js"],"directives":["geodashModalFilterMore.js","geodashFilterCheckbox.js","geodashFilterRadio.js","geodashFilterSlider.js","geodashFilterContainer.js"],"templates":["modal/modal_filter_more.tpl.html","filter/filter_checkbox.tpl.html","filter/filter_radio.tpl.html","filter/filter_slider.tpl.html","filter_container.tpl.html"],"less":["filter.less"],"project":"SPARC 2.x","id":"filter"},{"controllers":["controller_map_map.js"],"directives":[],"templates":[],"less":["main_map.less"],"project":"SPARC 2.x","id":"map_map"},{"controllers":["controller_sparc_sidebar.js"],"directives":["sparcSidebar.js","sparcSidebarFeatureLayer.js"],"templates":["sparc_sidebar.tpl.html","sparc_sidebar_featurelayer.tpl.html"],"less":["sidebar.less","sidebar-toggle.less"],"project":"SPARC 2.x","id":"sparc_sidebar"},{"controllers":["controller_main.js"],"directives":[],"templates":[],"project":"SPARC 2.x","id":"main"},{"controllers":["controller_sparc_welcome.js"],"directives":["sparcModalWelcome.js"],"templates":["modal_welcome_sparc.tpl.html"],"less":["sparc_welcome.less"],"project":"SPARC 2.x","id":"sparc_welcome"}];
geodash.templates = {};
geodash.templates["geodash_modal_dashboard_config.tpl.html"] = "<div class=\"modal-dialog geodash-responsive\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button geodash-btn-close></button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">Configuration / {{ map_config.title }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li label=\"Projects\" target=\"#modal-dashboard-config-projects\" active=\"true\" geodash-tab></li>\n          <li label=\"Plugins\" target=\"#modal-dashboard-config-plugins\" geodash-tab></li>\n          <li label=\"Directives\" target=\"#modal-dashboard-config-directives\" geodash-tab></li>\n          <li label=\"Templates\" target=\"#modal-dashboard-config-templates\" geodash-tab></li>\n          <li label=\"Filters\" target=\"#modal-dashboard-config-filters\" geodash-tab></li>\n          <li label=\"YAML\" target=\"#modal-dashboard-config-yaml\" geodash-tab></li>\n          <li label=\"JSON\" target=\"#modal-dashboard-config-json\" geodash-tab></li>\n        </ul>\n        <div class=\"tab-content\">\n          <div\n            id=\"modal-dashboard-config-projects\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <h3>Projects</h3>\n            <table class=\"table\">\n              <thead>\n                <tr>\n                  <th>#</th>\n                  <th>Name</th>\n                  <th>Version</th>\n                  <th>Description</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr ng-repeat=\"project in meta.projects track by $index\">\n                  <th scope=\"row\" ng-bind-html=\"$index\"></th>\n                  <td ng-bind-html=\"project.name\"></td>\n                  <td ng-bind-html=\"project.version\"></td>\n                  <td ng-bind-html=\"project.description\"></td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n          <div\n            id=\"modal-dashboard-config-plugins\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <h3>Plugins</h3>\n            <table class=\"table\">\n              <thead>\n                <tr>\n                  <th>#</th>\n                  <th>Project</th>\n                  <th>Name</th>\n                  <th>Version</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr ng-repeat=\"plugin in meta.plugins track by $index\">\n                  <th scope=\"row\" ng-bind-html=\"$index\"></th>\n                  <td ng-bind-html=\"plugin.project\"></td>\n                  <td ng-bind-html=\"plugin.id\"></td>\n                  <td ng-bind-html=\"plugin.version\"></td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n          <div\n            id=\"modal-dashboard-config-directives\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <h3>Directives</h3>\n            <table class=\"table\">\n              <thead>\n                <tr>\n                  <th>#</th>\n                  <th>Name</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr ng-repeat=\"directive in meta.directives track by $index\">\n                  <th scope=\"row\" ng-bind-html=\"$index\"></th>\n                  <td ng-bind-html=\"directive\"></td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n          <div\n            id=\"modal-dashboard-config-templates\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <h3>Templates</h3>\n            <table class=\"table\">\n              <thead>\n                <tr>\n                  <th>#</th>\n                  <th>Name</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr ng-repeat=\"template in meta.templates track by $index\">\n                  <th scope=\"row\" ng-bind-html=\"$index\"></th>\n                  <td ng-bind-html=\"template\"></td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n          <div\n            id=\"modal-dashboard-config-filters\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <h3>Filters</h3>\n            <table class=\"table\">\n              <thead>\n                <tr>\n                  <th>#</th>\n                  <th>Name</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr ng-repeat=\"filter in meta.filters track by $index\">\n                  <th scope=\"row\" ng-bind-html=\"$index\"></th>\n                  <td ng-bind-html=\"filter\"></td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n          <div\n            id=\"modal-dashboard-config-yaml\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <h3>Dashboard Configuration as YAML</h3>\n            <pre style=\"word-wrap: break-word; white-space: pre-wrap;\">{{ map_config | yaml : 8 }}</pre>\n          </div>\n          <div\n            id=\"modal-dashboard-config-json\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <h3>Dashboard Configuration as JSON</h3>\n            <pre style=\"word-wrap: break-word; white-space: pre-wrap;\">{{ map_config | json }}</pre>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geodash.templates["geodash_tab.tpl.html"] = "<li\n  role=\"presentation\"\n  ng-class=\"(active && active != \'false\') ? \'active\' : \'\'\">\n  <a\n    href=\"#{{ target }}\"\n    aria-controls=\"{{ target }}\"\n    role=\"tab\"\n    data-toggle=\"tab\"\n    style=\"padding-left:8px; padding-right: 8px; height: {{ height | default_if_undefined : \'auto\'}}\">{{ label }}</a>\n</li>\n";
geodash.templates["geodash_btn_close.tpl.html"] = "<button\n  type=\"button\"\n  class=\"close\"\n  data-dismiss=\"{{ dismiss | default_if_undefined: \'modal\' }}\"\n  aria-hidden=\"true\"><i class=\"fa fa-times\"></i></button>\n";
geodash.templates["geodash_btn_info.tpl.html"] = "<div\n  class=\"input-group-addon btn btn-primary\"\n  data-toggle=\"tooltip\"\n  data-placement=\"{{ placement | default_if_undefined : \'left\' }}\"\n  ng-attr-title=\"{{ info }}\">\n  <i class=\"fa fa-info-circle\"></i>\n</div>\n";
geodash.templates["geodash_btn_clear.tpl.html"] = "<div\n  class=\"input-group-addon btn btn-danger btn-clear\"\n  data-clear=\"{{ target }}\">\n  <i class=\"fa fa-times\"></i>\n</div>\n";
geodash.templates["geodash_modal_layer_carto.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button geodash-btn-close></button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">Layer / {{ layer.title }} / Cartography</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <p class=\"navbar-text\" style=\"margin-bottom:0px;\"><b>Select</b><br><b>a Style:</b></p>\n          <li\n            role=\"presentation\"\n            ng-class=\"$first ? \'active\' : \'\'\"\n            ng-repeat=\"style in layer.cartography track by $index\">\n            <a\n              class=\"geodash-intent\"\n              href=\"#modal-layer-carto-style-{{ style.id }}\"\n              aria-controls=\"modal-layer-carto-style-{{ style.id }}\"\n              data-intent-name=\"selectStyle\"\n              data-intent-data=\"{&quot;layer&quot;:&quot;{{ layerID }}&quot;,&quot;style&quot;:&quot;{{ style.id }}&quot;}\"\n              data-intent-ctrl=\"geodash-map-legend\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\"\n              ng-bind-html=\"style.title | default:\'Default\' | tabLabel\"></a>\n          </li>\n        </ul>\n        <!-- Tab panes -->\n        <div class=\"tab-content\">\n          <div\n            ng-class=\"$first ? \'tab-pane fade in active\' : \'tab-pane fade\'\"\n            ng-repeat=\"style in layer.cartography track by $index\"\n            id=\"modal-layer-carto-style-{{ style.id }}\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span><b>Attribute: </b><span>{{ style.attribute | default:\"Not styled by attribute\" }}</span></span><br>\n            <span><b>Mask: </b><span ng-bind-html=\"style.mask | md2html | default:\'No Mask\'\"></span></span><br>\n            <span><b>Description: </b><span ng-bind-html=\"style.description | md2html | default:\'Not specified\'\"></span></span>\n            <br>\n            <br>\n            <div\n              ng-if=\"style.type == \'graduated\'\"\n              geodash-symbol-graduated\n              style=\"style\"\n              container-width=\"{{ \'392px\' }}\">\n            </div>\n            <div\n              ng-if=\"style.legend.symbol.type == \'circle\'\"\n              geodash-symbol-circle\n              style=\"style\">\n            </div>\n            <div\n              ng-if=\"style.legend.symbol.type == \'graphic\'\"\n              geodash-symbol-graphic\n              style=\"style\">\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geodash.templates["geodash_modal_layer_more.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button geodash-btn-close></button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">Layer / {{ layer.title }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li role=\"presentation\" class=\"active\">\n            <a\n              href=\"#modal-layer-more-general\"\n              aria-controls=\"modal-layer-more-general\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">General</a>\n          </li>\n          <li ng-if=\"layer.wfs\" role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-layer-more-attributes\"\n              aria-controls=\"modal-layer-more-attributes\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Attributes</a>\n          </li>\n          <li ng-if=\"layer.wms\" role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-layer-more-source\"\n              aria-controls=\"modal-layer-more-source\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Source</a>\n          </li>\n          <li ng-if=\"layer.wms\" role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-layer-more-wms\"\n              aria-controls=\"modal-layer-more-wms\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">WMS</a>\n          </li>\n          <li ng-if=\"layer.wfs\" role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-layer-more-wfs\"\n              aria-controls=\"modal-layer-more-wfs\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">WFS</a>\n          </li>\n          <li ng-if=\"layer.wfs\" role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-layer-more-download\"\n              aria-controls=\"modal-layer-more-download\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Download</a>\n          </li>\n        </ul>\n        <div class=\"tab-content\">\n          <div\n            id=\"modal-layer-more-general\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"layer.description | md2html | default:\'No description given.\'\"></span>\n            <br><br><b>Type:</b> {{ layer.type }}\n            <br><br><b>Source:</b> {{ layer.source.name | default:\"Not specified\" }}\n          </div>\n          <div\n            ng-if=\"layer.wfs\"\n            id=\"modal-layer-more-attributes\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <div>\n              Placeholder\n            </div>\n          </div>\n          <div\n            ng-if=\"layer.source\"\n            id=\"modal-layer-more-source\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span><b>Name:</b> {{ layer.source.name | default:\"Not specified\" }}</span><br>\n            <span><b>Attribution:</b> {{ layer.source.attribution | default:\"Not specified\" }}</span><br>\n            <span><b>URL:</b> {{ layer.source.url | default:\"Not specified\" }}</span><br>\n          </div>\n          <div\n            ng-if=\"layer.wms\"\n            id=\"modal-layer-more-wms\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span><b>URL:</b> {{ layer.wms.url | default:\"Not specified\" }}</span><br>\n            <span><b>Layers:</b> {{ layer.wms.layers|join:\', \'|default:\"Not specified\" }}</span><br>\n            <span><b>Styles:</b> {{ layer.wms.styles|join:\', \'|default:\"Not specified\" }}</span><br>\n            <span><b>Format:</b> {{ layer.wms.format | default:\"Not specified\" }}</span><br>\n            <span><b>Version:</b> {{ layer.wms.version | default:\"Not specified\" }}</span><br>\n            <span><b>Transparent:</b> {{ layer.wms.transparent | default:\"No\" }}</span><br>\n            <hr>\n            <span><a target=\"_blank\" href=\"{{ layer.wms.url }}?SERVICE=WMS&Request=GetCapabilities\">Capabilities</a><br>\n            <span><a target=\"_blank\" href=\"{{ layer.wms.url }}?SERVICE=WMS&Request=GetLegendGraphic&format=image/png&layer={{ layer.wms.layers|first }}\">Legend Graphic</a><br>\n          </div>\n          <div\n            ng-if=\"layer.wfs\"\n            id=\"modal-layer-more-wfs\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span><b>URL:</b> {{ layer.wfs.url | default:\"Not specified\" }}</span><br>\n            <span><b>Version:</b> {{ layer.wfs.version | default:\"Not specified\" }}</span><br>\n            <hr>\n            <span><a target=\"_blank\" href=\"{{ layer | url_describefeaturetype }}\">Describe Feature Type</a><br>\n          </div>\n          <div\n            ng-if=\"layer.wfs\"\n            id=\"modal-layer-more-download\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span><b>Download Shapefile</b>: <a target=\"_blank\" href=\"{{ layer | url_shapefile }}\">All</a>, <a target=\"_blank\" href=\"{{ layer | url_shapefile:state }}\">Current Extent</a><br>\n            <span><b>Download GeoJSON</b>: <a target=\"_blank\" href=\"{{ layer | url_geojson }}\">All</a>, <a target=\"_blank\" href=\"{{ layer | url_geojson:state }}\">Current Extent</a><br>\n            <span><b>Download Google Earth KML</b>: <a target=\"_blank\" href=\"{{ layer | url_kml }}\">All</a>, <a target=\"_blank\" href=\"{{ layer | url_kml:state }}\">Current Extent</a><br>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geodash.templates["geodash_modal_layer_config.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button geodash-btn-close></button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">Layer / {{ layer.title }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li class=\"active\" role=\"presentation\">\n            <a href=\"#modal-layer-config-input\"\n              aria-controls=\"modal-layer-config-input\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Configure</a>\n          </li>\n          <li class=\"\" role=\"presentation\">\n            <a href=\"#modal-layer-config-output\"\n              aria-controls=\"modal-layer-config-output\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Output</a>\n          </li>\n        </ul>\n        <!-- Tab panes -->\n        <div class=\"tab-content\">\n          <div\n            id=\"modal-layer-config-input\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <div class=\"form-group row\" style=\"margin:0; padding-top: 10px; padding-bottom: 10px;\">\n              <div class=\"col-md-3\"><h5>Title</h5></div>\n              <div class=\"col-md-9\">\n                <label for=\"layer-config-title\" class=\"sr-only control-label\">Title</label>\n                <input\n                  id=\"layer-config-title\"\n                  type=\"text\"\n                  class=\"form-control\"\n                  placeholder=\"Title ...\"\n                  data-geodash-field-type=\"text\"\n                  ng-model=\"layer.title\"\n                  ng-change=\"validateField()\"\n                  required\n                  value=\"{{ layer.title }}\">\n              </div>\n            </div>\n            <div class=\"form-group row\" style=\"margin:0; padding-top: 10px; padding-bottom: 10px;\">\n              <div class=\"col-md-3\"><h5>Description</h5></div>\n              <div class=\"col-md-9\">\n                <label for=\"layer-config-title\" class=\"sr-only control-label\">Description</label>\n                <input\n                  id=\"layer-config-description\"\n                  type=\"text\"\n                  class=\"form-control\"\n                  placeholder=\"Title ...\"\n                  data-geodash-field-type=\"text\"\n                  ng-model=\"layer.description\"\n                  ng-change=\"validateField()\"\n                  required\n                  value=\"{{ layer.Description }}\">\n              </div>\n            </div>\n          </div>\n          <div\n            id=\"modal-layer-config-output\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            {{ layer | json }}\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geodash.templates["symbol_circle.tpl.html"] = "<div>\n  <svg width=\"100%\" height=\"100%\" version=\"1.0\" xmlns=\"http://www.w3.org/2000/svg\">\n    <circle\n      cx=\"50%\"\n      cy=\"50%\"\n      ng-r=\"{{ style.legend.symbol.radius }}\"\n      ng-fill=\"{{ style.styles.default.static.color }}\"\n      stroke-width=\"1\"\n      stroke=\"#000000\"></circle>\n  </svg>\n</div>\n";
geodash.templates["symbol_ellipse.tpl.html"] = "<div>\n  <svg width=\"100%\" height=\"100%\" version=\"1.0\" xmlns=\"http://www.w3.org/2000/svg\">\n    <ellipse\n      cx=\"50%\"\n      cy=\"50%\"\n      ng-rx=\"{{ style.legend.symbol.width }}\"\n      ng-ry=\"{{ style.legend.symbol.height }}\"\n      ng-fill=\"{{ style.styles.default.static.color }}\"\n      stroke-width=\"1\"\n      stroke=\"#000000\"></circle>\n  </svg>\n</div>\n";
geodash.templates["symbol_graduated.tpl.html"] = "<div>\n  <div\n    style=\"display: inline-block; vertical-align:top;\"\n    ng-bind-html=\"style.ramp.label.left | md2html\"></div>\n  <svg\n    ng-attr-width=\"{{ containerWidth }}\"\n    height=\"90px\"\n    version=\"1.0\"\n    xmlns=\"http://www.w3.org/2000/svg\">\n    <g>\n      <rect\n        ng-repeat=\"color in style.colors.ramp track by $index\"\n        ng-attr-x=\"{{ style.colors.ramp | length | position_x : $index : containerWidth : 26 }}px\"\n        ng-attr-y=\"{{ \'0\' }}\"\n        ng-attr-width=\"{{ style.colors.ramp | length | width_x : containerWidth : 26 }}px\"\n        height=\"50px\"\n        ng-attr-fill=\"{{ color }}\"\n        stroke-width=\"1\"\n        stroke=\"#000000\"/>\n    </g>\n    <g>\n      <text\n        ng-repeat=\"breakpoint in style | breakpoints track by $index\"\n        ng-attr-x=\"{{ style | breakpoints | length | add: -1 | position_x : $index : containerWidth : 26 }}px\"\n        ng-attr-y=\"{{ $index | choose : 68 : 82 }}px\"\n        text-anchor=\"middle\"\n        ng-attr-fill=\"{{ \'black\' }}\"\n        font-size=\"14px\"\n        text-decoration=\"underline\"\n        font-family=\"\'Open Sans\', sans-serif\">{{ style | breakpoint: $index | formatBreakpoint }}</text>\n    </g>\n  </svg>\n  <div\n    style=\"display: inline-block; vertical-align:top;\"\n    ng-bind-html=\"style.ramp.label.right | md2html\"></div>\n</div>\n";
geodash.templates["symbol_graphic.tpl.html"] = "<i class=\"fa fa-image\" style=\"color:black; font-size: 20px;\"></i>\n";
geodash.templates["legend_baselayers.tpl.html"] = "<div class=\"geodash-map-legend-baselayers geodash-radio-group\">\n  <div\n    ng-repeat=\"layer in baselayers track by $index\"\n    ng-init=\"layerIndex = $index\"\n    ng-if=\"layer.legend!==undefined\"\n    class=\"geodash-map-legend-item noselect\"\n    data-layer=\"{{ layer.id }}\">\n    <div class=\"geodash-map-legend-item-left\">\n      <div class=\"geodash-map-legend-item-icon geodash-map-legend-item-more\">\n        <a\n          class=\"geodash-intent\"\n          data-intent-ctrl=\"geodash-map-legend\"\n          data-intent-name=\"toggleModal\"\n          data-intent-data=\"{{ html5data(\'toggleModal\', \'geodash-modal-layer-more\', \'baselayer\', layer) }}\">\n          <i class=\"fa fa-info-circle\"></i>\n        </a>\n      </div><!--\n      --><div class=\"geodash-map-legend-item-icon geodash-map-legend-item-visibility\">\n           <a\n             ng-class=\" layer.id == state.view.baselayer ? \'geodash-map-legend-item-visibility-button geodash-intent geodash-radio geodash-on\' : \'geodash-map-legend-item-visibility-button geodash-intent geodash-radio\'\"\n             data-intent-name=\"switchBaseLayer\"\n             data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n             data-intent-class-on=\"geodash-on\"\n             data-intent-class-off=\"\"\n             data-intent-ctrl=\"geodash-map-legend\">\n             <i class=\"fa fa-eye geodash-on\"></i><i class=\"fa fa-eye-slash geodash-off\"></i>\n           </a>\n         </div><!--\n      --><div class=\"geodash-map-legend-item-symbol\" style=\"width: 10px;\"></div>\n    </div><!--\n    --><div class=\"geodash-map-legend-item-right\">\n      <div\n        class=\"geodash-map-legend-item-label\"\n        style=\"{{ layer.id == state.view.baselayer ? \'width: 100%;\' : \'width: 100%;opacity: 0.4;\' }}\">\n        <span ng-bind-html=\"layer.legend.label | md2html\"></span>\n      </div>\n    </div>\n  </div>\n</div>\n";
geodash.templates["legend_featurelayers.tpl.html"] = "<div class=\"geodash-map-legend-featurelayers\">\n  <div\n    ng-repeat=\"layer in featurelayers track by $index\"\n    ng-init=\"layerIndex = $index\"\n    ng-if=\"layer.legend!==undefined\"\n    class=\"geodash-map-legend-item noselect\"\n    data-layer=\"{{ layer.id }}\">\n    <div class=\"geodash-map-legend-item-left\">\n      <div class=\"geodash-map-legend-item-icon geodash-map-legend-item-config\" style=\"display:none;\">\n        <a\n          class=\"geodash-intent\"\n          data-intent-name=\"toggleModal\"\n          data-intent-data=\"{{ html5data(\'toggleModal\', \'geodash-modal-layer-config\', \'featurelayer\', layer) }}\"\n          data-intent-ctrl=\"geodash-map-legend\">\n          <i class=\"fa fa-cog\"></i>\n        </a>\n      </div><!--\n      --><div class=\"geodash-map-legend-item-icon geodash-map-legend-item-more\">\n        <a\n          class=\"geodash-intent\"\n          data-intent-name=\"toggleModal\"\n          data-intent-data=\"{{ html5data(\'toggleModal\', \'geodash-modal-layer-more\', \'featurelayer\', layer) }}\"\n          data-intent-ctrl=\"geodash-map-legend\">\n          <i class=\"fa fa-info-circle\"></i>\n        </a>\n      </div><!--\n      --><div class=\"geodash-map-legend-item-icon geodash-map-legend-item-visibility\">\n         <a\n           ng-class=\"layer.id | inArray : state.view.featurelayers | ternary : \'geodash-map-legend-item-visibility-button geodash-intent geodash-toggle\' : \'geodash-map-legend-item-visibility-button geodash-intent geodash-toggle geodash-off\'\"\n           data-intent-names=\"[&quot;showLayer&quot;,&quot;hideLayer&quot;]\"\n           data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n           data-intent-ctrl=\"geodash-map-legend\">\n           <i class=\"fa fa-eye geodash-on\"></i><i class=\"fa fa-eye-slash geodash-off\"></i>\n         </a>\n     </div><!--\n     --><div\n          ng-class=\"layer.type == \'geojson\' ? \'geodash-map-legend-item-icon geodash-map-legend-item-zoomto\': \'geodash-map-legend-item-icon geodash-map-legend-item-zoomto fade disabled\'\">\n        <a\n          class=\"geodash-map-legend-item-zoomto-button geodash-intent\"\n          data-intent-name=\"zoomToLayer\"\n          data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n          data-intent-ctrl=\"geodash-map-legend\">\n          <i class=\"fa fa-compress\"></i>\n        </a>\n      </div>\n    </div><!--\n    --><div class=\"geodash-map-legend-item-right\">\n      <div\n        ng-if=\"layer.cartography[0].legend.symbol\"\n        class=\"geodash-map-legend-item-symbol\">\n        <a\n          class=\"geodash-intent\"\n          data-intent-name=\"toggleModal\"\n          data-intent-data=\"{{ html5data(\'toggleModal\', \'geodash-modal-layer-carto\', \'featurelayer\', layer) }}\"\n          data-intent-ctrl=\"geodash-map-legend\">\n          <div ng-if=\"layer.cartography[0].legend.symbol.type == \'circle\'\">\n            <svg width=\"100%\" height=\"100%\" version=\"1.0\" xmlns=\"http://www.w3.org/2000/svg\">\n              <circle\n                cx=\"50%\"\n                cy=\"50%\"\n                ng-r=\"{{ layer.cartography[0].legend.symbol.radius }}\"\n                ng-fill=\"{{ layer.cartography[0].styles.default.static.color }}\"\n                stroke-width=\"1\"\n                stroke=\"#000000\"></circle>\n            </svg>\n          </div>\n          <div ng-if=\"layer.cartography[0].legend.symbol.type == \'ellipse\'\">\n            <svg width=\"100%\" height=\"100%\" version=\"1.0\" xmlns=\"http://www.w3.org/2000/svg\">\n              <ellipse\n                cx=\"50%\"\n                cy=\"50%\"\n                ng-rx=\"{{ layer.cartography[0].legend.symbol.width }}\"\n                ng-ry=\"{{ layer.cartography[0].legend.symbol.height }}\"\n                ng-fill=\"{{ layer.cartography[0].styles.default.static.color }}\"\n                stroke-width=\"1\"\n                stroke=\"#000000\"></circle>\n            </svg>\n          </div>\n          <div\n            ng-if=\"layer.cartography[0].legend.symbol.type == \'graduated\'\">\n            <svg\n              ng-attr-width=\"{{ layer.cartography[0].legend.symbol.width }}\"\n              height=\"100%\"\n              version=\"1.0\"\n              xmlns=\"http://www.w3.org/2000/svg\">\n              <rect\n                ng-repeat=\"color in layer.cartography[0].colors.ramp track by $index\"\n                ng-attr-x=\"{{ $index|percent:layer.cartography[0].colors.ramp.length }}%\"\n                y=\"0\"\n                ng-attr-width=\"{{ 1|percent:layer.cartography[0].colors.ramp.length }}%\"\n                ng-attr-height=\"{{ layer.cartography[0].legend.symbol.height }}\"\n                ng-attr-fill=\"{{ color }}\"\n                stroke-width=\"1\"\n                stroke=\"#000000\"/>\n            </svg>\n          </div>\n          <div\n            ng-if=\"layer.cartography[0].legend.symbol.type == \'graphic\'\">\n            <i class=\"fa fa-image\" style=\"color:black; font-size: 20px;\"></i>\n          </div>\n        </a>\n      </div><!--\n      --><div\n           class=\"geodash-map-legend-item-label\"\n           style=\"{{ layer.id | inArray : state.view.featurelayers | ternary : \'\' : \'opacity: 0.4;\' }}\">\n        <span ng-bind-html=\"layer.legend.label | md2html\"></span>\n      </div>\n    </div>\n  </div>\n</div>\n";
geodash.templates["geodash_modal_welcome.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button geodash-btn-close></button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">{{ welcome.title }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li role=\"presentation\" class=\"active\">\n            <a\n              href=\"#modal-welcome-general\"\n              aria-controls=\"modal-welcome-general\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">General</a>\n          </li>\n          <li role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-welcome-about\"\n              aria-controls=\"modal-welcome-about\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">About</a>\n          </li>\n        </ul>\n        <div class=\"tab-content\">\n          <div\n            id=\"modal-welcome-general\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"welcome.general | md2html | default:\'No body given.\'\"></span>\n          </div>\n          <div\n            id=\"modal-welcome-about\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"welcome.about | md2html | default:\'No body given.\'\"></span>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geodash.templates["geodash_modal_about.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button geodash-btn-close></button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">{{ about.title }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li\n            role=\"presentation\"\n            ng-class=\"$first ? \'active\' : \'\'\"\n            ng-repeat=\"pane in about.panes track by $index\">\n            <a\n              href=\"#{{ pane.id }}\"\n              aria-controls=\"{{ pane.id }}\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\"\n              ng-bind-html=\"pane.tab.label | default:\'Default\' | tabLabel\"></a>\n          </li>\n        </ul>\n        <!-- Tab panes -->\n        <div class=\"tab-content\">\n          <div\n            ng-class=\"$first ? \'tab-pane fade in active\' : \'tab-pane fade\'\"\n            ng-repeat=\"pane in about.panes track by $index\"\n            id=\"{{ pane.id }}\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"pane.content | md2html | default:\'No content given.\'\"></span>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geodash.templates["geodash_modal_download.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button geodash-btn-close></button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">{{ download.title }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li\n            role=\"presentation\"\n            ng-class=\"$first ? \'active\' : \'\'\"\n            ng-repeat=\"pane in download.panes track by $index\">\n            <a\n              href=\"#{{ pane.id }}\"\n              aria-controls=\"{{ pane.id }}\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\"\n              ng-bind-html=\"pane.tab.label | default:\'Default\' | tabLabel\"></a>\n          </li>\n        </ul>\n        <!-- Tab panes -->\n        <div class=\"tab-content\">\n          <div\n            ng-class=\"$first ? \'tab-pane fade in active\' : \'tab-pane fade\'\"\n            ng-repeat=\"pane in download.panes track by $index\"\n            id=\"{{ pane.id }}\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"pane.content | md2html | default:\'No content given.\'\"></span>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geodash.templates["map_overlays.tpl.html"] = "<div class=\"geodash-map-overlays\">\n  <div ng-repeat=\"overlay in map_config.overlays track by $index\">\n    <div\n      ng-if=\"overlay.type == \'text\'\"\n      data-overlay-index=\"{{ $index }}\"\n      data-overlay-type=\"text\"\n      class=\"geodash-map-overlay\"\n      height=\"{{ overlay.height | default_if_undefined : initial }}\"\n      width=\"{{ overlay.width | default_if_undefined : initial }}\"\n      style=\"{{ style(overlay.type, overlay) }}\"\n      ng-bind-html=\"overlay.text.content | md2html\"\n      on-link-done=\"overlayLoaded\">\n    </div>\n    <div\n      ng-if=\"overlay.type == \'image\'\"\n      data-overlay-index=\"{{ $index }}\"\n      data-overlay-type=\"image\"\n      class=\"geodash-map-overlay\"\n      style=\"display: inline-block; {{ style(overlay.type, overlay) }}\"\n      on-link-done=\"overlayLoaded\">\n      <img\n        ng-src=\"{{ overlay.image.url }}\"\n        width=\"{{ overlay.width }}\"\n        height=\"{{ overlay.height }}\">\n    </div>\n  </div>\n</div>\n";
geodash.templates["breadcrumbs.tpl.html"] = "<div>\n  <div>\n    <a class=\"btn btn-primary btn-large\" title=\"Explore\" href=\"/explore\">Explore &gt;&gt;</a>\n  </div>\n  <div\n    ng-repeat=\"bc in breadcrumbs track by $index\">\n    <select\n      id=\"{{ bc.id }}\"\n      data-output=\"{{ bc.output }}\"\n      data-width=\"{{ bc.width }}\"\n      data-height=\"{{ bc.height }}\"\n      data-initial-data=\"{{ bc.data }}\"\n      data-breadcrumbs=\"{{ bc.breadcrumbs }}\">\n      <option\n        ng-if=\"bc.type == \'country\'\"\n        value=\"{{ state.iso3 }}\"\n        selected=\"selected\">{{ state.country_title }}</option>\n      <option\n        ng-if=\"bc.type == \'hazard\'\"\n        value=\"{{ state.hazard }}\"\n        selected=\"selected\">{{ state.hazard_title }}</option>\n      <option\n        ng-if=\"bc.type != \'country\' && bc.type != \'hazard\'\"\n        value=\"placeholder\"\n        selected=\"selected\">{{ bc.placeholder }}</option>\n    </select>\n  </div>\n</div>\n";
geodash.templates["calendar.tpl.html"] = "<ul class=\"nav nav-justified geodash-radio-group\">\n  <li\n    ng-repeat=\"month in months track by $index\">\n    <a\n      ng-class=\"state.month == month.num ? \'btn btn-primary selected geodash-intent geodash-radio geodash-on\' : \'btn btn-default geodash-intent geodash-radio\'\"\n      title=\"{{ month.long }}\"\n      href=\"/country/{{ state.iso3 }}/hazard/{{ state.hazard }}/month/{{ month.num }}\"\n      data-intent-name=\"stateChanged\"\n      data-intent-data=\"{&quot;month&quot;: {{ month.num }} }\"\n      data-intent-ctrl=\"sparc-map-calendar\"\n      data-intent-class-on=\"btn-primary selected\"\n      data-intent-class-off=\"btn-default\" ng-bind-html=\"month.short3 | title\"></a>\n  </li>\n</ul>\n";
geodash.templates["modal_filter_more.tpl.html"] = "<div class=\"modal-dialog\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-hidden=\"true\"><i class=\"fa fa-times\"></i></button>\n      <h4 class=\"modal-title\" id=\"myModalLabel\">Filter / {{ filter.label }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li\n            role=\"presentation\"\n            class=\"active\">\n            <a\n              href=\"#modal-filter-more-general\"\n              aria-controls=\"modal-filter-more-general\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">General</a>\n          </li>\n          <li\n            ng-if=\"filter.type == \'checkbox\' && filter.checkbox.options\"\n            role=\"presentation\"\n            class=\"\">\n            <a\n              href=\"#modal-filter-more-options\"\n              aria-controls=\"modal-filter-more-options\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Options</a>\n          </li>\n          <li\n            ng-if=\"filter.type == \'slider\' && filter.slider.options\"\n            role=\"presentation\"\n            class=\"\">\n            <a\n              href=\"#modal-filter-more-options\"\n              aria-controls=\"modal-filter-more-options\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Options</a>\n          </li>\n        </ul>\n        <div class=\"tab-content\">\n          <div\n            id=\"modal-filter-more-general\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"filter.description | md2html | default:\'No description given.\'\"></span>\n            <br><br><b>Type:</b> {{ filter.type }}\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'continuous\'\">\n              <b>Minimum Value:</b> <span ng-bind-html=\"filter.slider.min | formatInteger:\'delimited\':\' \'\"></span>\n            </div>\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'continuous\'\">\n              <b>Maximum Value:</b> <span ng-bind-html=\"filter.slider.max | formatInteger:\'delimited\':\' \'\"></span>\n            </div>\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'ordinal\'\">\n              <b>Minimum Value:</b> <span ng-bind-html=\"filter.slider.options | first\"></span>\n            </div>\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'ordinal\'\">\n              <b>Maximum Value:</b> <span ng-bind-html=\"filter.slider.options | last\"></span>\n            </div>\n            <hr>\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'ordinal\'\">\n              <b>Current Value:</b> <span ng-bind-html=\"value\"></span>\n            </div>\n            <div\n              ng-if=\"filter.type ==\'slider\' && filter.slider.type == \'continuous\'\">\n              <b>Current Value:</b> <span ng-bind-html=\"value | join:\' - \'\"></span>\n            </div>\n            <div\n              ng-if=\"filter.type ==\'checkbox\'\">\n              <b>Current Value:</b> <span ng-bind-html=\"value | formatArray\"></span>\n            </div>\n          </div>\n          <div\n            ng-if=\"filter.type == \'checkbox\' && filter.checkbox.options\"\n            id=\"modal-filter-more-options\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span\n              ng-repeat-start=\"option in filter.checkbox.options track by $index\">\n              <i ng-class=\"option.checked ? \'fa fa-check-square-o\' : \'fa fa-square-o\'\"></i>\n              <b ng-bind-html=\"option.label\"></b>:\n              <span ng-bind-html=\"option.description | default_if_undefined:\'No description given\'\"></span>\n            </span>\n            <br>\n            <br ng-repeat-end>\n          </div>\n          <div\n            ng-if=\"filter.type == \'slider\' && filter.slider.options\"\n            id=\"modal-filter-more-options\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span\n              ng-repeat-start=\"option in filter.slider.options track by $index\">\n              <i ng-class=\"option.checked ? \'fa fa-check-square-o\' : \'fa fa-square-o\'\"></i>\n              <b ng-bind-html=\"option\"></b>\n            </span>\n            <br ng-repeat-end>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\n    </div>\n  </div>\n</div>\n";
geodash.templates["filter_checkbox.tpl.html"] = "<div class=\"geodash-filter geodash-filter-checkbox\" style=\"height: {{ filter.height }};\">\n  <div class=\"geodash-filter-label\">\n    <a\n      class=\"geodash-intent\"\n      data-intent-name=\"toggleModal\"\n      data-intent-data=\"{&quot;id&quot;:&quot;geodash-modal-filter-more&quot;,&quot;static&quot;:{&quot;tab&quot;:&quot;modal-filter-more-general&quot;},&quot;dynamic&quot;:{&quot;value&quot;:[&quot;state&quot;,&quot;filters&quot;,&quot;popatrisk&quot;,&quot;{{ filter.checkbox.output }}&quot;],&quot;filter&quot;:[&quot;map_config&quot;,&quot;featurelayers&quot;,&quot;popatrisk&quot;,&quot;filters&quot;,&quot;{{ $index }}&quot;]}}\"\n      data-intent-ctrl=\"geodash-map-filter\">\n      <i class=\"fa fa-info-circle\"></i>\n    </a>\n    <span ng-bind-html=\"filter.label | md2html\"></span> :\n  </div>\n  <div\n    class=\"btn-group\"\n    style=\"float:left;\"\n    data-toggle=\"buttons\"\n    data-output=\"{{ filter.checkbox.output }}\">\n    <label\n      ng-repeat=\"opt in filter.checkbox.options track by $index\"\n      ng-class=\"opt.checked ? \'btn btn-sm btn-warning active\' : \'btn btn-sm btn-default\'\">\n      <input\n        type=\"checkbox\"\n        id=\"{{ opt.id }}\"\n        data-value=\"{{ opt.value }}\"\n        autocomplete=\"off\"\n        ng-checked=\"opt.checked || opt.selected\"/>\n      {{ opt.label }}\n    </label>\n  </div>\n</div>\n";
geodash.templates["filter_radio.tpl.html"] = "<div class=\"geodash-filter geodash-filter-radio\" style=\"height: {{ filter.height }};\">\n  <div class=\"geodash-filter-label\">\n    <a\n      class=\"geodash-intent\"\n      data-intent-name=\"toggleModal\"\n      data-intent-data=\"{&quot;id&quot;:&quot;geodash-modal-filter-more&quot;,&quot;static&quot;:{&quot;tab&quot;:&quot;modal-filter-more-general&quot;},&quot;dynamic&quot;:{&quot;value&quot;:[&quot;state&quot;,&quot;filters&quot;,&quot;popatrisk&quot;,&quot;{{ filter.radio.output }}&quot;],&quot;filter&quot;:[&quot;map_config&quot;,&quot;featurelayers&quot;,&quot;popatrisk&quot;,&quot;filters&quot;,&quot;{{ $index }}&quot;]}}\"\n      data-intent-ctrl=\"geodash-map-filter\">\n      <i class=\"fa fa-info-circle\"></i>\n    </a>\n    <span ng-bind-html=\"filter.label | md2html\"></span> :\n  </div>\n  <div\n    class=\"btn-group\"\n    style=\"float:left;\"\n    data-toggle=\"buttons\"\n    data-output=\"{{ filter.radio.output }}\">\n    <label\n      ng-repeat=\"opt in filter.radio.options track by $index\"\n      ng-class=\"opt.checked ? \'btn btn-default active\' : \'btn btn-default\'\">\n      <input\n        type=\"radio\"\n        id=\"{{ opt.id }}\"\n        name=\"{{ opt.name }}\"\n        value=\"{{ opt.value }}\"\n        data-output=\"{{ filter.radio.output }}\"\n        ng-checked=\"opt.checked || opt.selected\"/>\n      {{ opt.label }}\n    </label>\n  </div>\n</div>\n";
geodash.templates["filter_slider.tpl.html"] = "<div class=\"geodash-filter geodash-filter-slider\" style=\"height: {{ filter.height }};\">\n  <div class=\"geodash-filter-label\">\n    <a\n      class=\"geodash-intent\"\n      data-intent-name=\"toggleModal\"\n      data-intent-data=\"{&quot;id&quot;:&quot;geodash-modal-filter-more&quot;,&quot;static&quot;:{&quot;tab&quot;:&quot;modal-filter-more-general&quot;},&quot;dynamic&quot;:{&quot;value&quot;:[&quot;state&quot;,&quot;filters&quot;,&quot;popatrisk&quot;,&quot;{{ filter.slider.output }}&quot;],&quot;filter&quot;:[&quot;map_config&quot;,&quot;featurelayers&quot;,&quot;popatrisk&quot;,&quot;filters&quot;,&quot;{{ $index }}&quot;]}}\"\n      data-intent-ctrl=\"geodash-map-filter\">\n      <i class=\"fa fa-info-circle\"></i>\n    </a>\n    <span ng-bind-html=\"filter.label | md2html\"></span> :\n  </div>\n  <div style=\"display:table; height:{{ filter.height }};padding-left:10px;padding-right:10px;\">\n    <div style=\"display:table-cell;vertical-align:middle;\">\n      <div class=\"geodash-filter-slider-label\">Placeholder</div>\n      <div\n        class=\"geodash-filter-slider-slider\"\n        style=\"width:{{ filter.slider.width }};\"\n        data-type=\"{{ filter.slider.type }}\"\n        data-value=\"{{ filter.slider.value ? filter.slider.value : \'\' }}\"\n        data-values=\"{{ filter.slider.values ? filter.slider.values : \'\' }}\"\n        data-range=\"{{ filter.slider.range == \'true\' ? \'true\': filter.slider.range }}\"\n        data-output=\"{{ filter.slider.output }}\"\n        data-min-value=\"{{ filter.slider.min|default_if_undefined:\'\' }}\"\n        data-max-value=\"{{ filter.slider.max|default_if_undefined:\'\' }}\"\n        data-step=\"{{ filter.slider.step ? filter.slider.step : \'\' }}\"\n        data-options=\"{{ filter.slider.options ? filter.slider.options : \'\' }}\"\n        data-label-template=\"{{ filter.slider.label }}\"\n        ></div>\n    </div>\n  </div>\n</div>\n";
geodash.templates["filter_container.tpl.html"] = "<div id=\"geodash-map-filter-container\" class=\"collapse\" style=\"\">\n  <div\n    ng-repeat=\"filter in filters track by $index\">\n    <div geodash-filter-radio ng-if=\"filter.type == \'radio\'\"></div>\n    <div geodash-filter-checkbox ng-if=\"filter.type == \'checkbox\'\"></div>\n    <div geodash-filter-slider ng-if=\"filter.type == \'slider\'\"></div>\n  </div>\n</div>\n";
geodash.templates["sparc_sidebar.tpl.html"] = "<div\n  id=\"sparc-sidebar-left\"\n  class=\"geodash-sidebar geodash-sidebar-left geodash-controller sidebar-open sidebar-left-open\">\n  <div class=\"geodash-sidebar-charts\" style=\"width:100%;\">\n    <!-- Nav tabs -->\n    <ul class=\"nav nav-tabs\" role=\"tablist\">\n      <li label=\"Welcome\" target=\"sparc-sidebar-left-welcome\" active=\"true\" geodash-tab></li>\n      <li label=\"Charts\" target=\"sparc-sidebar-left-charts\" active=\"false\" geodash-tab></li>\n      <li label=\"Layers\" target=\"sparc-sidebar-left-layers\" active=\"false\" geodash-tab></li>\n    </ul>\n    <!-- Tab panes -->\n    <div class=\"tab-content\">\n      <div\n        id=\"sparc-sidebar-left-welcome\"\n        role=\"tabpanel\"\n        class=\"tab-pane fade in active\"\n        style=\"padding: 10px;\">\n        <div\n          ng-bind-html=\"map_config.welcome.intro | md2html\">\n        </div>\n      </div>\n      <div\n        id=\"sparc-sidebar-left-charts\"\n        role=\"tabpanel\"\n        class=\"tab-pane fade\"\n        style=\"padding: 10px;\">\n        <div\n          ng-repeat=\"chart in charts track by $index\"\n          on-repeat-done=\"chart_done\"\n          data-repeat-index=\"{{ $index }}\"\n          id=\"sparc-sidebar-left-charts-chart-{{ chart.id }}\">\n          <div>\n            <h4\n              style=\"text-align:center;\"\n              ng-bind-html=\"chart.title | md2html\"></h4>\n          </div>\n          <div\n            id=\"{{ chart.element }}\"\n            class=\"geodash-sidebar-chart\"\n            style=\"width:360px;margin:0 auto;\"\n          ></div>\n        </div>\n      </div>\n      <div\n        id=\"sparc-sidebar-left-layers\"\n        role=\"tabpanel\"\n        class=\"tab-pane fade\"\n        style=\"padding: 10px;\">\n        <h4>Selected Layers</h4>\n        <div class=\"geodash-sidebar-sparclayers\">\n          <div\n            ng-repeat=\"layer in visiblefeaturelayers track by $index\"\n            ng-init=\"layerIndex = $index\"\n            ng-if=\"layer.legend!==undefined\"\n            class=\"geodash-sidebar-item noselect\"\n            data-layer=\"{{ layer.id }}\">\n            <div class=\"geodash-sidebar-item-left\">\n              <div class=\"geodash-sidebar-item-icon geodash-sidebar-item-visibility\">\n                 <a\n                   class=\"geodash-sidebar-item-visibility-button geodash-intent\"\n                   data-intent-name=\"hideLayer\"\n                   data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n                   data-intent-ctrl=\"sparc-sidebar-left\">\n                   <i class=\"fa fa-times\"></i>\n                 </a>\n              </div><!--\n              --><div class=\"geodash-sidebar-item-icon geodash-sidebar-item-more\">\n                <a\n                  class=\"geodash-intent\"\n                  data-intent-name=\"toggleModal\"\n                  data-intent-data=\"{{ html5data(\'toggleModal\', \'geodash-modal-layer-more\', \'featurelayer\', layer) }}\"\n                  data-intent-ctrl=\"sparc-sidebar-left\">\n                  <i class=\"fa fa-info-circle\"></i>\n                </a>\n              </div><!--\n              --><div\n                   ng-class=\"layer.type == \'geojson\' ? \'geodash-sidebar-item-icon geodash-sidebar-item-zoomto\': \'geodash-sidebar-item-icon geodash-sidebar-item-zoomto fade disabled\'\">\n                 <a\n                   class=\"geodash-sidebar-item-zoomto-button geodash-intent\"\n                   data-intent-name=\"zoomToLayer\"\n                   data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n                   data-intent-ctrl=\"sparc-sidebar-left\">\n                   <i class=\"fa fa-compress\"></i>\n                 </a>\n              </div>\n            </div><!--\n            --><div class=\"geodash-sidebar-item-right\">\n              <div\n                class=\"geodash-sidebar-item-label\"\n                style=\"width: 100%;\">\n                <span ng-bind-html=\"layer.legend.label | md2html\"></span>\n              </div>\n            </div>\n          </div>\n        </div>\n        <hr>\n        <h4>SPARC Layers</h4>\n        <div class=\"geodash-sidebar-sparclayers\">\n          <div\n            ng-repeat=\"layer in sparclayers track by $index\"\n            ng-init=\"layerIndex = $index\"\n            ng-if=\"layer.legend!==undefined\"\n            class=\"geodash-sidebar-item noselect\"\n            data-layer=\"{{ layer.id }}\">\n            <div class=\"geodash-sidebar-item-left\">\n              <div class=\"geodash-sidebar-item-icon geodash-sidebar-item-more\">\n                <a\n                  class=\"geodash-intent\"\n                  data-intent-name=\"toggleModal\"\n                  data-intent-data=\"{{ html5data(\'toggleModal\', \'geodash-modal-layer-more\', \'featurelayer\', layer) }}\"\n                  data-intent-ctrl=\"sparc-sidebar-left\">\n                  <i class=\"fa fa-info-circle\"></i>\n                </a>\n              </div>\n            </div><!--\n            --><div class=\"geodash-sidebar-item-right\">\n              <div\n                class=\"geodash-sidebar-item-label geodash-intent\"\n                style=\"width: 100%; opacity: 0.6;\"\n                data-intent-name=\"showLayer\"\n                data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n                data-intent-ctrl=\"sparc-sidebar-left\">\n                <span ng-bind-html=\"layer.legend.label | md2html\"></span>\n              </div>\n            </div>\n          </div>\n        </div>\n        <hr>\n        <h4>WFP Layers</h4>\n        <div class=\"geodash-sidebar-sparclayers\">\n          <div\n            ng-repeat=\"layer in wfplayers track by $index\"\n            ng-init=\"layerIndex = $index\"\n            ng-if=\"layer.legend!==undefined\"\n            class=\"geodash-sidebar-item noselect\"\n            data-layer=\"{{ layer.id }}\">\n            <div class=\"geodash-sidebar-item-left\">\n              <div class=\"geodash-sidebar-item-icon geodash-sidebar-item-more\">\n                <a\n                  class=\"geodash-intent\"\n                  data-intent-name=\"toggleModal\"\n                  data-intent-data=\"{{ html5data(\'toggleModal\', \'geodash-modal-layer-more\', \'featurelayer\', layer) }}\"\n                  data-intent-ctrl=\"sparc-sidebar-left\">\n                  <i class=\"fa fa-info-circle\"></i>\n                </a>\n              </div>\n            </div><!--\n            --><div class=\"geodash-sidebar-item-right\">\n              <div\n                class=\"geodash-sidebar-item-label geodash-intent\"\n                style=\"width: 100%; opacity: 0.6;\"\n                data-intent-name=\"showLayer\"\n                data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n                data-intent-ctrl=\"sparc-sidebar-left\">\n                <span ng-bind-html=\"layer.legend.label | md2html\"></span>\n              </div>\n            </div>\n          </div>\n        </div>\n        <hr>\n        <h4>Other Layers</h4>\n        <div class=\"geodash-sidebar-otherlayers\">\n          <div\n            ng-repeat=\"layer in otherlayers track by $index\"\n            ng-init=\"layerIndex = $index\"\n            ng-if=\"layer.legend!==undefined\"\n            class=\"geodash-sidebar-item noselect\"\n            data-layer=\"{{ layer.id }}\">\n            <div class=\"geodash-sidebar-item-left\">\n              <div class=\"geodash-sidebar-item-icon geodash-sidebar-item-more\">\n                <a\n                  class=\"geodash-intent\"\n                  data-intent-name=\"toggleModal\"\n                  data-intent-data=\"{{ html5data(\'toggleModal\', \'geodash-modal-layer-more\', \'featurelayer\', layer) }}\"\n                  data-intent-ctrl=\"sparc-sidebar-left\">\n                  <i class=\"fa fa-info-circle\"></i>\n                </a>\n              </div>\n            </div><!--\n            --><div class=\"geodash-sidebar-item-right\">\n              <div\n                class=\"geodash-sidebar-item-label geodash-intent\"\n                style=\"width: 100%; opacity: 0.6;\"\n                data-intent-name=\"showLayer\"\n                data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n                data-intent-ctrl=\"sparc-sidebar-left\">\n                <span ng-bind-html=\"layer.legend.label | md2html\"></span>\n              </div>\n            </div>\n          </div>\n        </div>\n        <hr>\n        <h4>Base Layers</h4>\n        <div class=\"geodash-sidebar-baselayers geodash-radio-group\">\n          <div\n            ng-repeat=\"layer in baselayers track by $index\"\n            ng-init=\"layerIndex = $index\"\n            ng-if=\"layer.legend!==undefined\"\n            class=\"geodash-sidebar-item noselect\"\n            data-layer=\"{{ layer.id }}\">\n            <div class=\"geodash-sidebar-item-left\">\n              <div class=\"geodash-sidebar-item-icon geodash-sidebar-item-more\">\n                <a\n                  class=\"geodash-intent\"\n                  data-intent-name=\"toggleModal\"\n                  data-intent-data=\"{{ html5data(\'toggleModal\', \'geodash-modal-layer-more\', \'baselayer\', layer) }}\"\n                  data-intent-ctrl=\"sparc-sidebar-left\">\n                  <i class=\"fa fa-info-circle\"></i>\n                </a>\n              </div><!--\n              --><div class=\"geodash-sidebar-item-icon geodash-sidebar-item-visibility\">\n                   <a\n                     ng-class=\" layer.id == state.view.baselayer ? \'geodash-sidebar-item-visibility-button geodash-intent geodash-radio geodash-on\' : \'geodash-sidebar-item-visibility-button geodash-intent geodash-radio\'\"\n                     data-intent-name=\"switchBaseLayer\"\n                     data-intent-data=\"{&quot;layer&quot;:&quot;{{ layer.id }}&quot;}\"\n                     data-intent-class-on=\"geodash-on\"\n                     data-intent-class-off=\"\"\n                     data-intent-ctrl=\"sparc-sidebar-left\">\n                     <i class=\"fa fa-eye geodash-on\"></i><i class=\"fa fa-eye-slash geodash-off\"></i>\n                   </a>\n              </div><!--\n              --><div class=\"geodash-sidebar-item-symbol\" style=\"width: 10px;\"></div>\n            </div><!--\n            --><div class=\"geodash-sidebar-item-right\">\n              <div\n                class=\"geodash-sidebar-item-label\"\n                style=\"{{ layer.id == state.view.baselayer ? \'width: 100%;\' : \'width: 100%;opacity: 0.4;\' }}\">\n                <span ng-bind-html=\"layer.legend.label | md2html\"></span>\n              </div>\n            </div>\n          </div>\n        </div>\n\n      </div>\n    </div>\n  </div>\n</div>\n";
geodash.templates["modal_welcome_sparc.tpl.html"] = "<div class=\"modal-dialog\" data-backdrop=\"static\" role=\"document\">\n  <div class=\"modal-content\">\n    <div class=\"modal-header\">\n      <h4 class=\"modal-title\" id=\"myModalLabel\">{{ welcome.title }}</h4>\n    </div>\n    <div class=\"modal-body\">\n      <div>\n        <!-- Nav tabs -->\n        <ul class=\"nav nav-tabs\" role=\"tablist\">\n          <li role=\"presentation\" class=\"active\">\n            <a\n              href=\"#modal-welcome-intro\"\n              aria-controls=\"modal-welcome-intro\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">Introduction</a>\n          </li>\n          <li role=\"presentation\" class=\"\">\n            <a\n              href=\"#modal-welcome-about\"\n              aria-controls=\"modal-welcome-about\"\n              role=\"tab\"\n              data-toggle=\"tab\"\n              style=\"padding-left:8px; padding-right: 8px;\">About</a>\n          </li>\n        </ul>\n        <div class=\"tab-content\">\n          <div\n            id=\"modal-welcome-intro\"\n            class=\"tab-pane fade in active\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span\n              class=\"welcome-body\"\n              ng-bind-html=\"welcome.intro | md2html | default:\'No body given.\'\"></span>\n            <hr>\n            <h3 class=\"welcome-body\">Get Started: Select a county &amp; hazard!</h3>\n            <div class=\"input-group select2-bootstrap-prepend select2-bootstrap-append\">\n              <input\n                id=\"country-input-backend\"\n                name=\"country-input-backend\"\n                type=\"text\"\n                class=\"form-control\"\n                style=\"display:none;\"\n                ng-model=\"country\">\n              <span class=\"input-group-addon\" id=\"country-addon\">Country</span>\n              <input\n                id=\"country-input\"\n                name=\"country-input\"\n                type=\"text\"\n                class=\"typeahead form-control\"\n                style=\"width:400px; height: auto;\"\n                placeholder=\"Country (e.g., Haiti or Philippines)\"\n                aria-describedby=\"country-addon\"\n                data-placeholder=\"Country (e.g., Haiti, Nepal, or Philippines)\"\n                data-initial-data=\"countries_select2\"\n                data-backend=\"country-input-backend\"\n                data-template-empty=\"<div class=&quot;alert alert-danger empty-message&quot;>Unable to find country</div>\">\n                <div class=\"input-group-addon btn btn-danger btn-clear\" data-clear=\"#country-input\">\n                  <i class=\"fa fa-times\"></i>\n                </div>\n            </div>\n            <br>\n            <div class=\"input-group select2-bootstrap-prepend select2-bootstrap-append\">\n              <input\n                id=\"hazard-input-backend\"\n                name=\"hazard-input-backend\"\n                type=\"text\"\n                class=\"form-control\"\n                style=\"display:none;\"\n                ng-model=\"hazard\">\n              <span class=\"input-group-addon\" id=\"hazard-addon\">Hazard</span>\n              <input\n                id=\"hazard-input\"\n                name=\"hazard-input\"\n                type=\"text\"\n                class=\"typeahead form-control\"\n                style=\"width:400px; height: auto;\"\n                placeholder=\"Hazard (e.g., Flood, Cyclone, Drought, or Landslide)\"\n                aria-describedby=\"hazard-addon\"\n                data-placeholder=\"Hazard (e.g., Flood, Cyclone, Drought, or Landslide)\"\n                data-initial-data=\"hazards_select2\"\n                data-backend=\"hazard-input-backend\"\n                data-template-empty=\"<div class=&quot;empty-message&quot;>Unable to find hazard</div>\">\n                <div class=\"input-group-addon btn btn-danger btn-clear\" data-clear=\"#hazard-input\">\n                  <i class=\"fa fa-times\"></i>\n                </div>\n            </div>\n            <hr>\n            <ul class=\"nav nav-justified welcome-go\">\n              <li>\n                <a\n                  ng-disabled=\"country == undefined || hazard == undefined || country == \'\' || hazard == \'\'\"\n                  ng-class=\"country == undefined || hazard == undefined || country == \'\' || hazard == \'\' ? \'btn btn-default\' : \'btn btn-primary\' \"\n                  ng-href=\"{{ country == undefined || hazard == undefined || country == \'\' || hazard == \'\' ? \'#\' : \'/country/\'+country+\'/hazard/\'+hazard +\'/month/1\' }}\">Go!</a>\n              </li>\n            </ul>\n          </div>\n          <div\n            id=\"modal-welcome-about\"\n            class=\"tab-pane fade\"\n            role=\"tabpanel\"\n            style=\"padding: 10px;\">\n            <span ng-bind-html=\"welcome.about | md2html | default:\'No body given.\'\"></span>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n";

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

geodash.filters["default"] = function()
{
  return function(value, fallback)
  {
    return value || fallback;
  };
};

geodash.filters["md2html"] = function()
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

geodash.filters["percent"] = function()
{
  return function(value, denominator)
  {
    return 100.0 * value / denominator;
  };
};

geodash.filters["tabLabel"] = function()
{
  return function(value)
  {
    return value.split(" ").length == 2 ? value.replace(' ', '<br>') : value;
  };
};

geodash.filters["as_float"] = function()
{
  return function(value)
  {
    return 1.0 * value;
  };
};

geodash.filters["add"] = function()
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

geodash.filters["title"] = function()
{
  return function(value)
  {
    return $.type(value) === "string" ? value.toTitleCase() : value;
  };
};

geodash.filters["as_array"] = function()
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

geodash.filters["sortItemsByArray"] = function()
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

geodash.filters["breakpoint"] = function()
{
    return function(style, index)
    {
      var breakpoints = geodash.breakpoints[style.styles.default.dynamic.options.breakpoints];
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

geodash.filters["breakpoints"] = function()
{
    return function(style)
    {
      var breakpoints = geodash.breakpoints[style.styles.default.dynamic.options.breakpoints];
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

geodash.filters["position_x"] = function()
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

geodash.filters["width_x"] = function()
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

geodash.filters["len"] = geodash.filters["length"] = function()
{
  return function(value)
  {
    if(Array.isArray(value))
    {
      return value.length;
    }
    else if(angular.isString(value))
    {
      return value.length;
    }
    else
    {
      return 0;
    }
  };
};

geodash.filters["layer_is_visible"] = function()
{
  return function(layerID, state)
  {
    state = state || $("#geodash-main").scope().state;
    var visibleFeatureLayers = state.view.featurelayers;
    return (layerID == state.view.baselayer) || $.inArray(layerID, visibleFeatureLayers) != -1;
  };
};

geodash.filters["append"] = function()
{
  return function(value, arg)
  {
    if(Array.isArray(value))
    {
      if(Array.isArray(arg))
      {
        return value.concat(arg);
      }
      else
      {
        return value.push(arg);
      }
    }
    else if(angular.isString(value))
    {
      var arr = Array.prototype.slice.call(arguments, [1]);
      return value + arr.join("");
    }
    else
    {
      return value + arg;
    }
  };
};

geodash.filters["default_if_undefined"] = function()
{
  return function(value, fallback)
  {
    if(value != undefined && value != null)
    {
      return value;
    }
    else
    {
      return fallback;
    }
  };
};

geodash.filters["default_if_undefined_or_blank"] = function()
{
  return function(value, fallback)
  {
    if(value != undefined && value != null && value != "")
    {
      return value;
    }
    else
    {
      return fallback;
    }
  };
};

geodash.filters["extract"] = function()
{
  return function(node)
  {
    var keyChain = Array.prototype.slice.call(arguments, [1]);
    if(keyChain.length > 0)
    {
      return extract(expand(keyChain), node);
    }
    else
    {
      return null;
    }
  };
};

geodash.filters["inArray"] = function()
{
  return function(value, arr)
  {
      if(Array.isArray(arr))
      {
        return arr.indexOf(value) != -1;
      }
      else
      {
        return false;
      }
  };
};

geodash.filters["prepend"] = function()
{
  return function(value, arg)
  {
    if(Array.isArray(value))
    {
      if(Array.isArray(arg))
      {
        return arg.concat(value);
      }
      else
      {
        return [arg].concat(value);
      }
    }
    else if(angular.isString(value))
    {
      var arr = Array.prototype.slice.call(arguments, [1]);
      return arr.join("") + value;
    }
    else
    {
      return arg + value;
    }
  };
};

geodash.filters["ternary"] = function()
{
  return function(value, t, f)
  {
    return value ? t : f;
  };
};

geodash.filters["ternary_defined"] = function()
{
  return function(value, t, f)
  {
    if(value != undefined && value != null && value != "")
    {
      return t;
    }
    else
    {
      return f;
    }
  };
};

geodash.filters["yaml"] = function()
{
  return function(value, depth)
  {
    if(value != undefined)
    {
      return YAML.stringify(value, (depth || 4));
    }
    else
    {
      return "";
    }
  };
};

geodash.filters["join"] = function()
{
    return function(array, arg)
    {
        if(Array.isArray(array))
        {
            return array.join(arg);
        }
        else
        {
            return array;
        }
    };
};

geodash.filters["first"] = function()
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

geodash.filters["last"] = function()
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

geodash.filters["choose"] = function()
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

geodash.filters["formatBreakpoint"] = function()
{
    return function(value)
    {
      if(Number.isInteger(value))
      {
        return geodash.filters["formatInteger"]()(value, 'delimited', ' ');
      }
      else if($.isNumeric(value))
      {
        return geodash.filters["formatFloat"]()(value, 2);
      }
      else
      {
        return "" + value;
      }
    };
};

geodash.filters["formatFloat"] = function()
{
  return function(value, decimals)
  {
    if(value != undefined && value !== "")
    {
      if(decimals != undefined)
      {
        return value.toFixed(decimals);
      }
      else
      {
        return value.toString();
      }
    }
    else
    {
      return "";
    }
  };
};

geodash.filters["formatInteger"] = function()
{
  return function(value, type, delimiter)
  {
    if(value != undefined && value !== "")
    {
      if(type == "delimited")
      {
        delimiter = delimiter || ',';
        var str = Math.round(value).toString(); // Round in case value is a float
        var pattern = new RegExp('(\\d+)(\\d{3})','gi');
        while(pattern.test(str)){str=str.replace(pattern,'$1'+ delimiter +'$2');}
        return str;
      }
      else
      {
        return Math.round(value).toString();
      }
    }
    else
    {
        return "";
    }
  };
};

geodash.filters["formatArray"] = function()
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

geodash.filters["eq"] = function()
{
  return function(value, arg)
  {
    if(angular.isNumber(value) && angular.isNumber(arg))
    {
      return value == arg;
    }
    else
    {
      return false;
    }
  };
};

geodash.filters["lte"] = function()
{
  return function(value, arg)
  {
    if(angular.isNumber(value) && angular.isNumber(arg))
    {
      return value <= arg;
    }
    else
    {
      return false;
    }
  };
};

geodash.filters["gte"] = function()
{
  return function(value, arg)
  {
    if(angular.isNumber(value) && angular.isNumber(arg))
    {
      return value >= arg;
    }
    else
    {
      return false;
    }
  };
};

geodash.filters["gt"] = function()
{
  return function(value, arg)
  {
    if(angular.isNumber(value) && angular.isNumber(arg))
    {
      return value > arg;
    }
    else
    {
      return false;
    }
  };
};

geodash.filters["replace"] = function()
{
  return function(value, oldSubstring, newSubstring)
  {
      if(angular.isString(value))
      {
        if(angular.isString(oldSubstring) && angular.isString(newSubstring))
        {
          if(oldSubstring == ".")
          {
            return value.replace(new RegExp('[.]', 'g'), newSubstring);
          }
          else
          {
            return value.replace(oldSubstring, newSubstring);
          }
        }
        else
        {
          return value;
        }
      }
      else
      {
        return "";
      }
  };
};

geodash.filters["split"] = function()
{
    return function(value, delimiter)
    {
        if(angular.isString(value))
        {
            return value.split(delimiter || ",");
        }
        else
        {
            return value;
        }
    };
};

geodash.filters["url_shapefile"] = function()
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

geodash.filters["url_geojson"] = function()
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

geodash.filters["url_kml"] = function()
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

geodash.filters["url_describefeaturetype"] = function()
{
    return function(layer)
    {
        var url = "";
        if("wfs" in layer)
        {
          var version = layer.wfs.version || "1.0.0";
          var params = {
            "service": "WFS",
            "request": "DescribeFeatureType",
            "version": version,
            "outputFormat": "application/json"
          };

          var typename = "";
          if("layers" in layer.wms)
          {
            typename = layer.wms.layers.unique().join(",");
          }
          else if("layers" in layer.wfs)
          {
            typename = layer.wfs.layers.unique().join(",");
          }
          if(version == "1.1.0" || version == "1.0.0")
          {
            params["typeName"] = typename;
          }
          else
          {
            params["typeNames"] = typename;
          }

          var querystring = $.map(params, function(v, k){return encodeURIComponent(k) + '=' + encodeURIComponent(v);}).join("&");
          url = layer.wfs.url + "?" + querystring;
        }
        return url;
    };
};

geodash.directives["ngX"] = function(){
  return {
    scope: true,
    link: function ($scope, $element, attrs){
      $scope.$watch(attrs.ngX, function(value) {
        $element.attr('x', value);
      });
    }
  };
};
geodash.directives["ngY"] = function(){
  return {
    scope: true,
    link: function ($scope, $element, attrs){
      $scope.$watch(attrs.ngY, function(value) {
        $element.attr('y', value);
      });
    }
  };
};
geodash.directives["ngWidth"] = function(){
  return {
    scope: true,
    link: function ($scope, $element, attrs){
      $scope.$watch(attrs.ngWidth, function(value) {
        $element.attr('width', value);
      });
    }
  };
};
geodash.directives["ngR"] = function(){
  return {
    scope: true,
    link: function ($scope, $element, attrs){
      $scope.$watch(attrs.ngR, function(value) {
        $element.attr('r', value);
      });
    }
  };
};
geodash.directives["ngFill"] = function(){
  return {
    scope: true,
    link: function ($scope, $element, attrs){
      $scope.$watch(attrs.ngFill, function(value) {
        $element.attr('fill', value);
      });
    }
  };
};

geodash.directives["onLinkDone"] = function(){
  return {
    restriction: 'A',
    link: function($scope, element, attributes ) {
      $scope.$emit(attributes["onLinkDone"] || "link_done", {
        'element': element,
        'attributes': attributes
      });
    }
  };
};

geodash.directives["onRepeatDone"] = function(){
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

geodash.directives["geodashModalDashboardConfig"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'geodash_modal_dashboard_config.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashTab"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      'target': '@target',
      'label': '@label',
      'active': '@active',
      'height': '@height'
    },  // Inherit exact scope from parent controller
    templateUrl: 'geodash_tab.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashBtnClose"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      'dismiss': '@target'
    },  // Inherit exact scope from parent controller
    templateUrl: 'geodash_btn_close.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashBtnInfo"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      'placement': '@placement',
      'info': '@info'
    },
    templateUrl: 'geodash_btn_info.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashBtnClear"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      'target': '@target'
    },
    templateUrl: 'geodash_btn_clear.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashModalLayerCarto"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'geodash_modal_layer_carto.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geodash.directives["geodashModalLayerMore"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'geodash_modal_layer_more.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geodash.directives["geodashModalLayerConfig"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'geodash_modal_layer_config.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geodash.directives["geodashSymbolCircle"] = function(){
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

geodash.directives["geodashSymbolEllipse"] = function(){
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

geodash.directives["geodashSymbolGraduated"] = function(){
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

geodash.directives["geodashSymbolGraphic"] = function(){
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

geodash.directives["geodashLegendBaselayers"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'legend_baselayers.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geodash.directives["geodashLegendFeaturelayers"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'legend_featurelayers.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geodash.directives["geodashModalWelcome"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'geodash_modal_welcome.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashModalAbout"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'geodash_modal_about.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashModalDownload"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'geodash_modal_download.tpl.html',
    link: function ($scope, element, attrs){}
  };
};

geodash.directives["geodashMapOverlays"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'map_overlays.tpl.html',
    link: function ($scope, element, attrs){

      $scope.style = function(type, overlay)
      {
        var styleMap = {};

        $.extend(styleMap,{
          "top": extract("position.top", overlay, 'auto'),
          "bottom": extract("position.bottom", overlay, 'auto'),
          "left": extract("position.left", overlay, 'auto'),
          "right": extract("position.right", overlay, 'auto'),
          "padding": extract("padding", overlay, '0'),
          "background": extract("background", overlay, 'transparent'),
          "opacity": extract("opacity", overlay, '1.0'),
          "width": extract("width", overlay, 'initial'),
          "height": extract("height", overlay, 'initial')
        });

        if(type == "text")
        {
          $.extend(styleMap, {
            "font-family": extract("text.font.family", overlay, 'Arial'),
            "font-size": extract("text.font.size", overlay, '12px'),
            "font-style": extract("text.font.style", overlay, 'normal'),
            "text-shadow": extract("text.shadow", overlay, 'none')
          });
        }
        else if(type == "image")
        {

        }
        return $.map(styleMap, function(value, style){
          return style+": "+value
        }).join(";") +";";
      };

      $(element).on('mouseenter', '.geodash-map-overlay', function(event, args){
        $(this).draggable('enable');
        $('.geodash-map-grid').addClass('on');
      });

      $(element).on('mouseleave', '.geodash-map-overlay', function(event, args){
        $(this).draggable('disable');
        $('.geodash-map-grid').removeClass('on');
      });

      $scope.$on("overlayLoaded", function(event, args) {

        console.log("overlayLoaded", event, args);
        var overlayType = args.attributes.overlayType;
        var overlayElement = $(args.element);

        var container = overlayElement.parents(".geodash-map:first");

        if(overlayType == "text")
        {
          /*overlayElement.resizable({
            "containment": container,
            "helper": "ui-resizable-helper"
          });*/
        }
        else if(overlayType == "image")
        {
          //See: http://stackoverflow.com/questions/10703450/draggable-and-resizable-in-jqueryui-for-an-image-is-not-working
          /*$("img", overlayElement).resizable({
            "containment": container,
            "helper": "ui-resizable-helper"
          });*/
        }

        overlayElement.draggable({
          "containment": container,
          start: function(event, args) {
            // http://www.w3schools.com/cssref/pr_class_cursor.asp
            $(this).css('cursor', '-webkit-grabbing');
          },
          drag: function(event, args) {

          },
          stop: function(event, args) {
            // http://www.w3schools.com/cssref/pr_class_cursor.asp
            $(this).css('cursor', 'pointer');
            console.log(event, args);
            var newPosition = args.position;
            var overlayIndex = $(this).data('overlay-index');
            var scope = geodash.api.getScope("geodash-sidebar-right");
            if(scope != undefined)
            {
              var mapWidth = container.width();
              var mapHeight = container.height();

              scope.map_config_flat["overlays__"+overlayIndex+"__position__top"] = newPosition.top < (mapHeight / 2.0) ? newPosition.top+'px' : 'auto';
              scope.map_config_flat["overlays__"+overlayIndex+"__position__bottom"] = newPosition.top >= (mapHeight / 2.0) ? (mapHeight - newPosition.top)+'px' : 'auto';
              scope.map_config_flat["overlays__"+overlayIndex+"__position__left"] = newPosition.left < (mapWidth / 2.0) ? newPosition.left+'px' : 'auto';
              scope.map_config_flat["overlays__"+overlayIndex+"__position__right"] = newPosition.left >= (mapWidth / 2.0) ? (mapWidth - newPosition.left)+'px' : 'auto';

              setTimeout(function(){
                scope.validateFields([
                  "overlays__"+overlayIndex+"__position__top",
                  "overlays__"+overlayIndex+"__position__bottom",
                  "overlays__"+overlayIndex+"__position__left",
                  "overlays__"+overlayIndex+"__position__right"
                ])
              }, 0);
            }
          }
        });
      });
    }
  };
};

geodash.directives["geodashBreadcrumbs"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'breadcrumbs.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geodash.directives["geodashCalendar"] = function(){
  return {
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'calendar.tpl.html',
    link: function ($scope, element, attrs){
    }
  };
};

geodash.directives["geodashModalFilterMore"] = function(){
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

geodash.directives["geodashFilterCheckbox"] = function(){
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

geodash.directives["geodashFilterRadio"] = function(){
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

geodash.directives["geodashFilterSlider"] = function(){
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

geodash.directives["geodashFilterContainer"] = function(){
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

geodash.directives["sparcSidebar"] = function(){
  return {
    controller: geodash.controllers.controller_sparc_sidebar,
    restrict: 'EA',
    replace: true,
    //scope: {
    //  layer: "=layer"
    //},
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'sparc_sidebar.tpl.html',
    link: function ($scope, $element, attrs)
    {
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
            buildHazardChart($scope.charts[i], geodash.initial_data.layers.popatrisk, options);
          }
        }

      }, 10);
    }
  };
};

geodash.directives["sparcSidebarFeatureLayer"] = function(){
  return {
    controller: geodash.controllers.controller_sparc_sidebar,
    restrict: 'EA',
    replace: true,
    scope: true,  // Inherit exact scope from parent controller
    templateUrl: 'sparc_sidebar_feature_layer.tpl.html',
    link: function ($scope, $element, attrs)
    {
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
            buildHazardChart($scope.charts[i], geodash.initial_data.layers.popatrisk, options);
          }
        }

      }, 10);
    }
  };
};

geodash.directives["sparcModalWelcome"] = function(){
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

geodash.controllers["controller_base"] = function(
  $scope, $element, $controller, state, map_config, live)
{
  //$scope.map_config = map_config;
};

geodash.controllers["controller_legend"] = function(
  $scope,
  $element,
  $controller,
  state,
  map_config,
  live)
{
  angular.extend(this, $controller('GeoDashControllerBase', {$element: $element, $scope: $scope}));
  //
  $scope.map_config = map_config;
  $scope.state = state;
  //////////////
  // Watch

  $scope.html5data = function()
  {
    var args = arguments;
    var zero_lc = args[0].toLowerCase();
    if(zero_lc == "togglemodal")
    {
      var id = args[1];
      var layerType = args[2];
      var layer = args[3];
      return {
        "id": args[1],
        "static": {
          "layerID": layer.id,
        },
        "dynamic" : {
          "layer": [layerType, layer.id]
        }
      };
    }
    else
    {
      return "";
    }
  };

  $scope.updateVariables = function(){
    var arrayFilter = $scope.map_config.legendlayers;

    if("baselayers" in $scope.map_config && $scope.map_config.baselayers != undefined)
    {
      var baselayers = $.grep($scope.map_config.baselayers,function(x, i){ return $.inArray(x["id"], arrayFilter) != -1; });
      baselayers.sort(function(a, b){ return $.inArray(a["id"], arrayFilter) - $.inArray(b["id"], arrayFilter); });
      $scope.baselayers = baselayers;
    }
    else
    {
      $scope.baselayers = [];
    }

    if("featurelayers" in $scope.map_config && $scope.map_config.featurelayers != undefined)
    {
      //var featurelayers = $.map($scope.map_config.featurelayers, function(item, key){ return {'key': key, 'item': item}; });
      var featurelayers = $.grep($scope.map_config.featurelayers,function(x, i){ return $.inArray(x["id"], arrayFilter) != -1; });
      featurelayers.sort(function(a, b){ return $.inArray(a["id"], arrayFilter) - $.inArray(b["id"], arrayFilter); });
      $scope.featurelayers = featurelayers;
    }
    else
    {
      $scope.featurelayers = [];
    }

  };
  $scope.updateVariables();
  $scope.$watch('map_config.featurelayers', $scope.updateVariables);
  $scope.$watch('map_config.legendlayers', $scope.updateVariables);
  $scope.$watch('state', $scope.updateVariables);
  //////////////
  var jqe = $($element);

  $scope.$on("refreshMap", function(event, args){
    console.log('args: ', args);

    $scope.state = args.state;
    /*
    $scope.$apply(function()
    {
      $scope.state = args.state;
    });*/

  });
};

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

geodash.controllers["controller_calendar"] = function(
  $scope,
  $element,
  $controller,
  state,
  map_config,
  live)
{
  angular.extend(this, $controller('GeoDashControllerBase', {$element: $element, $scope: $scope}));
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

geodash.controllers["controller_filter"] = function(
  $scope, $element, $controller, $interpolate, state, map_config, live)
{
  var maxValueFromSummary = geodash.initial_data.layers.popatrisk["data"]["summary"]["all"]["max"]["at_admin2_month"];
  
  angular.extend(this, $controller('GeoDashControllerBase', {$element: $element, $scope: $scope}));

  $scope.filters = geodash.api.getFeatureLayer("popatrisk")["filters"];

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
          $(this).parent('label').removeClass('btn-default').addClass('btn-warning');
        }
        else
        {
          $(this).parent('label').addClass('btn-default').removeClass('btn-warning');
        }
      });
      geodash.api.intend("filterChanged", {"layer": "popatrisk", "filter": filter}, $scope);
    });

    // Initialize Radio Filters
    $($element).on('change', 'input:radio[name="cat"]', function(event) {
      console.log(event);
      var output = $(this).data('output');
      var filter = {};
      filter[output] = this.value;
      geodash.api.intend("filterChanged", {"layer": "popatrisk", "filter": filter}, $scope);
    });

    // Initialize Slider Filters
    $(".geodash-filter-slider", $($element)).each(function(){

      var slider = $(this).find(".geodash-filter-slider-slider");
      var label = $(this).find(".geodash-filter-slider-label");

      var type = slider.data('type');
      var output = slider.data('output');

      if(type=="ordinal")
      {
        var range = slider.data('range');
        //var value = slider.data('value');
        var value = state["filters"]["popatrisk"][output];
        var options = slider.data('options');

        slider.data('label', label);
        geodash.ui_init_slider_label($interpolate, slider, type, range, value);
        geodash.ui_init_slider_slider($interpolate, $scope, slider, type, range, options.indexOf(value), 0, options.length - 1, 1);
      }
      else
      {
        var range = slider.data('range');
        //var value = slider.data('value');
        var minValue = geodash.assert_float(slider.data('min-value'), 0);
        var step = slider.data('step');
        //var label_template = slider.data('label');

        if(($.type(range) == "boolean" && range ) || (range.toLowerCase() == "true"))
        {
          var maxValue = (maxValueFromSummary != undefined && slider.data('max-value') == "summary") ?
              maxValueFromSummary :
              geodash.assert_float(slider.data('max-value'), undefined);
          //
          var values = state["filters"]["popatrisk"][output];
          values = geodash.assert_array_length(values, 2, [minValue, maxValue]);
          var values_n = [Math.floor(values[0]), Math.floor(values[1])];
          var min_n = Math.floor(minValue);
          var max_n = Math.floor(maxValue);
          var step_n = Math.floor(step);

          slider.data('label', label);
          geodash.ui_init_slider_label($interpolate, slider, type, range, values);
          geodash.ui_init_slider_slider($interpolate, $scope, slider, type, range, values_n, min_n, max_n, step_n);
          console.log(value_n, min_n, max_n, step_n, range);
        }
        else
        {
          var maxValue = geodash.assert_float(slider.data('max-value'), undefined);
          var value = state["filters"]["popatrisk"][output];
          var value_n = Math.floor(value * 100);
          var min_n = Math.floor(minValue * 100);
          var max_n = Math.floor(maxValue * 100);
          var step_n = Math.floor(step * 100);

          slider.data('label', label);
          geodash.ui_init_slider_label($interpolate, slider, type, range, value);
          geodash.ui_init_slider_slider($interpolate, $scope, slider, type, range, values_n, min_n, max_n, step_n);
          console.log(value_n, min_n, max_n, step_n, range);
        }
      }
    });

  }, 10);

};

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
  $("#geodash-map-sidebar-toggle-left").click(function (){
    $(this).toggleClass("sidebar-open sidebar-left-open");
    $("#sparc-sidebar-left, #geodash-map").toggleClass("sidebar-open sidebar-left-open");
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

geodash.controllers["controller_sparc_sidebar"] = function($scope, $element, $controller, state, map_config, live)
{
  angular.extend(this, $controller('GeoDashControllerBase', {$element: $element, $scope: $scope}));
  //
  $scope.charts = map_config.charts;

  $scope.updateVariables = function(){
    var layerGroups = {
      "sidebar": $scope.map_config.legendlayers,
      "sparc": ["popatrisk", "context"],
      "wfp": ["wld_poi_facilities_wfp", "wld_trs_supplyroutes_wfp"],
      "other": [
        "landscan",
        "flood_events", "landslide_events",
        "flood_probability", "cyclone_probability",
        "imerg_1day", "imerg_3day", "imerg_7day"]
    };

    if("baselayers" in $scope.map_config && $scope.map_config.baselayers != undefined)
    {
      var baselayers = $.grep($scope.map_config.baselayers,function(x, i){ return $.inArray(x["id"], layerGroups["sidebar"]) != -1; });
      baselayers.sort(function(a, b){ return $.inArray(a["id"], layerGroups["sidebar"]) - $.inArray(b["id"], layerGroups["sidebar"]); });
      $scope.baselayers = baselayers;
    }
    else
    {
      $scope.baselayers = [];
    }

    if("featurelayers" in $scope.map_config && $scope.map_config.featurelayers != undefined)
    {
      var featurelayers = $.grep($scope.map_config.featurelayers,function(x, i){ return $.inArray(x["id"], layerGroups["sidebar"]) != -1; });
      featurelayers.sort(function(a, b){ return $.inArray(a["id"], layerGroups["sidebar"]) - $.inArray(b["id"], layerGroups["sidebar"]); });
      $scope.featurelayers = featurelayers;

      var visiblefeaturelayers = $.grep($scope.map_config.featurelayers,function(x, i){
        return $.inArray(x["id"], layerGroups["sidebar"]) != -1 &&
          $.inArray(x["id"], $scope.state.view.featurelayers) != -1;
      });
      visiblefeaturelayers.sort(function(a, b){ return $.inArray(a["id"], $scope.state.view.featurelayers) - $.inArray(b["id"], $scope.state.view.featurelayers); });
      $scope.visiblefeaturelayers = visiblefeaturelayers;

      var sparclayers = $.grep($scope.map_config.featurelayers,function(x, i){ return $.inArray(x["id"], layerGroups["sparc"]) != -1; });
      sparclayers.sort(function(a, b){ return $.inArray(a["id"], layerGroups["sparc"]) - $.inArray(b["id"], layerGroups["sparc"]); });
      $scope.sparclayers = sparclayers;

      var wfplayers = $.grep($scope.map_config.featurelayers,function(x, i){ return $.inArray(x["id"], layerGroups["wfp"]) != -1; });
      wfplayers.sort(function(a, b){ return $.inArray(a["id"], layerGroups["wfp"]) - $.inArray(b["id"], layerGroups["wfp"]); });
      $scope.wfplayers = wfplayers;

      var otherlayers = $.grep($scope.map_config.featurelayers,function(x, i){ return $.inArray(x["id"], layerGroups["other"]) != -1; });
      otherlayers.sort(function(a, b){ return $.inArray(a["id"], layerGroups["other"]) - $.inArray(b["id"], layerGroups["other"]); });
      $scope.otherlayers = otherlayers;
    }
    else
    {
      $scope.featurelayers = [];
    }

  };
  $scope.updateVariables();
  $scope.$watch('map_config.featurelayers', $scope.updateVariables);
  $scope.$watch('map_config.legendlayers', $scope.updateVariables);
  $scope.$watch('state', $scope.updateVariables);

  $scope.$on("refreshMap", function(event, args) {
    if("state" in args)
    {
      $scope.state = args["state"];
      $scope.updateVariables();
      $scope.$digest();
    }
  });

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

geodash.controllers["controller_main"] = function(
  $interpolate, $scope, $element, $controller, $http, $q,
  state, map_config, stateschema, live)
{
    $scope.map_config = map_config;
    $scope.state = geodash.init_state(state, stateschema);
    $scope.live = live;

    $scope.refreshMap = function(state){


      // Refresh all child controllers
      $scope.$broadcast("refreshMap", {'state': state});
    };

    $.each(geodash.listeners, function(i, x){ $scope.$on(i, x); });

    // Calendar, Country, Hazard, or Filter Changed
    $scope.$on("stateChanged", function(event, args) {
        console.log('event', event);
        console.log('args', args);
        //
        var $scope = geodash.api.getScope("geodash-main");
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
        var $scope = geodash.api.getScope("geodash-main");
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
        var $scope = geodash.api.getScope("geodash-main");
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
        var $scope = geodash.api.getScope("geodash-main");
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
        var $scope = geodash.api.getScope("geodash-main");
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
        var $scope = geodash.api.getScope("geodash-main");
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
        var $scope = geodash.api.getScope("geodash-main");
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
        var $scope = geodash.api.getScope("geodash-main");
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
        var $scope = geodash.api.getScope("geodash-main");
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
        var $scope = geodash.api.getScope("geodash-main");
        $scope.state.view.baselayer = args.layer;
        $scope.refreshMap($scope.state);
    });

    $scope.$on("zoomToLayer", function(event, args) {
        var $scope = geodash.api.getScope("geodash-main");
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
        var $scope = geodash.api.getScope("geodash-main");
        var z = $scope.state.view.z;
        var visibleFeatureLayers = $scope.state.view.featurelayers;
        console.log("visibleFeatureLayers", visibleFeatureLayers);
        var featurelayers_by_featuretype = {};
        var fields_by_featuretype = {};
        var urls = [];
        for(var i = 0; i < visibleFeatureLayers.length; i++)
        {
            var fl = geodash.api.getFeatureLayer(visibleFeatureLayers[i], {"scope": $scope});
            if("wfs" in fl && fl.wfs != undefined)
            {
              var params = {
                service: "wfs",
                version: fl.wfs.version,
                request: "GetFeature",
                srsName: "EPSG:4326",
              };

              var targetLocation = new L.LatLng(args.lat, args.lon);
              var bbox = geodash.tilemath.point_to_bbox(args.lon, args.lat, z, 4).join(",");
              var typeNames = fl.wfs.layers || fl.wms.layers || [] ;
              for(var j = 0; j < typeNames.length; j++)
              {
                typeName = typeNames[j];
                var url = fl.wfs.url + "?" + $.param($.extend(params, {typeNames: typeName, bbox: bbox}));
                urls.push(url);
                fields_by_featuretype[typeName.toLowerCase()] = geodash.layers.aggregate_fields(fl);
                featurelayers_by_featuretype[typeName.toLowerCase()] = fl;
              }
            }
          }

          $q.all(geodash.http.build_promises($http, urls)).then(function(responses){
              var features = geodash.http.build_features(responses, fields_by_featuretype);
              console.log("Features: ", features);
              if(features.length > 0 )
              {
                var featureAndLocation = geodash.vecmath.getClosestFeatureAndLocation(features, targetLocation);
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
  geodash.init_controller(that, app, geodash.controllers.controller_main);

  var selector_controller_base = [
    ".geodash-controller.geodash-about",
    ".geodash-controller.geodash-download",
    ".geodash-controller.geodash-dashboard-config",
    "[geodash-controller='geodash-modal']",
    "[geodash-controller='geodash-base']"
  ].join(", ");

  geodash.init_controllers(that, app, [{
    "selector": selector_controller_base,
    "controller": geodash.controllers.controller_base
  }]);

  geodash.init_controllers(that, app, [{
    "selector": "[geodash-controller='sparc-sidebar-left']",
    "controller": geodash.controllers.controller_sidebar_sparc
  }]);

  $("[geodash-controller='geodash-map']", that).each(function(){
    // Init This
    geodash.init_controller($(this), app, geodash.controllers.controller_base);

    // Init Children
    geodash.init_controllers($(this), app, [
      { "selector": "[geodash-controller='geodash-map-map']", "controller": geodash.controllers.controller_map_map },
      { "selector": "[geodash-controller='sparc-map-calendar']", "controller": geodash.controllers.controller_calendar },
      { "selector": "[geodash-controller='sparc-map-breadcrumb']", "controller": geodash.controllers.controller_breadcrumb },
      { "selector": "[geodash-controller='geodash-map-filter']", "controller": geodash.controllers.controller_filter },
      { "selector": "[geodash-controller='geodash-map-legend']", "controller": geodash.controllers.controller_legend },
      { "selector": "[geodash-controller='sparc-welcome']", "controller": geodash.controllers.controller_sparc_welcome }
    ]);

  });
};

geodash.controllers["controller_sparc_welcome"] = function(
  $scope, $element, $controller, $interpolate, state, map_config, live)
{
  angular.extend(this, $controller('GeoDashControllerBase', {$element: $element, $scope: $scope}));
  //angular.extend(this, $controller('GeoDashControllerModal', {$element: $element, $scope: $scope}));

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
        local: geodash.initial_data["data"][initialData]
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

    sparc.welcome({'scope': $scope});

  }, 10);

};
