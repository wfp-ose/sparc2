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
