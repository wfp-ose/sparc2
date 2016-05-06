geosite.filters["as_float"] = function()
{
  return function(value)
  {
    return 1.0 * value;
  };
};
