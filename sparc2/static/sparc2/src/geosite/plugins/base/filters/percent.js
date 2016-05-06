geosite.filters["percent"] = function()
{
  return function(value, denominator)
  {
    return 100.0 * value / denominator;
  };
};
