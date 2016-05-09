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

  value = geosite.vam_filter_fcs(value, filters, f);
  value = geosite.vam_filter_csi(value, filters, f);

  if(value >= range[0] && value <= range[1])
  {
    var colors = map_config["featurelayers"]["popatrisk"]["cartography"][0]["colors"]["ramp"];
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

  value = geosite.vam_filter_fcs(value, filters, f);
  value = geosite.vam_filter_csi(value, filters, f);

  if(value >= range[0] && value <= range[1])
  {
    var colors = map_config["featurelayers"]["popatrisk"]["cartography"][0]["colors"]["ramp"];
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

  value = geosite.vam_filter_fcs(value, filters, f);
  value = geosite.vam_filter_csi(value, filters, f);

  if(value >= range[0] && value <= range[1])
  {
      var colors = map_config["featurelayers"]["popatrisk"]["cartography"][0]["colors"]["ramp"];
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
geosite.style_context = function(f, state, map_config, context_config)
{
  var style = {};

  var fl = map_config["featurelayers"]["context"];
  var filters = state["filters"]["context"];
  var currentStyleID = state["styles"]["context"];
  var currentStyleList = $.grep(fl["cartography"], function(style, i){return style.id == currentStyleID;});
  var currentStyle = (currentStyleList.length == 1) ? currentStyleList[0] : fl["cartography"][0];
  //
  var mask = f.properties[currentStyle["mask"]];
  var value = f.properties[currentStyle["attribute"]];
  if(mask == 1)
  {
    var colors = currentStyle["colors"]["ramp"];
    var breakPointsName = currentStyle["breakpoints"] || "natural_adjusted";
    var breakpoints = context_config["data"]["summary"]["all"]["breakpoints"][breakPointsName];
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
    style["fillColor"] = currentStyle["colors"]["outside"]
  }
  return style;
};
