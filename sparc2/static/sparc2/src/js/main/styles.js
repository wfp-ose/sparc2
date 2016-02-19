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
