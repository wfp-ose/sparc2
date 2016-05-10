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
