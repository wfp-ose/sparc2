/**
 * init_state will overwrite the default state from the server with params in the url.
 * @param {Object} state - Initial state from server
 */
var init_state = function(state, stateschema)
{
  var newState = $.extend({}, state);

  // Update View
  var lat = getHashValueAsFloat(["latitude", "lat", "y"]) || state["lat"] || 0.0;
  var lon = getHashValueAsFloat(["longitude", "lon", "long", "lng", "x"]) || state["lon"] || 0.0;
  var z = getHashValueAsInteger(["zoom", "z"]) || state["z"] || 3;
  newState["view"] = $.extend(newState["view"], {'lat': lat, 'lon': lon, 'z': z});

  // Update Filters
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

  return newState;
};
