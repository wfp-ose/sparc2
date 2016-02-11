var buildPageURL = function(page, state)
{
  var url = sparc["pages"][page]["url"]
    .replace("{iso3}", state["iso3"])
    .replace("{hazard}", state["hazard"])
    .replace("{month}", state["month"]);

  var hash_args = []
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
    url += "#"+hash_args.join("&")
  }
  return url;
};

var getHashValue = function(keys, type)
{
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
      var value = '';
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
        else if(type == "float")
        {
          value = (value != undefined && value != null && value != "") ? parseFloat(value) : undefined;
        }
    }
    return value;
};
var hasHashValue = function(keys)
{
    var value = getHashValue(keys);
    return value != undefined && value != null && value != "";
};
var getHashValueAsInteger = function(keys)
{
  return getHashValue(keys, "integer");
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
    renderLayers.reverse()
  return renderLayers
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
  return $.map(layers, function(layer, id){return {'id':id,'layer':layer};});
};
