geosite.filters["default_if_undefined"] = function()
{
  return function(value, fallback)
  {
    return value != undefined ? value : fallback;
  };
};
