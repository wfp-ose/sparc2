var buildPageURL = function(page, state)
{
  var url = geosite.pages[page]
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
