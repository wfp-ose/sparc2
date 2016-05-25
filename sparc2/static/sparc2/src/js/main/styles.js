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
