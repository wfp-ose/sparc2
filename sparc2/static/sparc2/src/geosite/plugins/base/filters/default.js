geosite.filters["default"] = function()
{
  return function(value, fallback)
  {
    return value || fallback;
  };
};
