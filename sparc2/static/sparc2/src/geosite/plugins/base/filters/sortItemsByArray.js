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
