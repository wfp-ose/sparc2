geosite.filters["title"] = function()
{
  return function(value)
  {
    return $.type(value) === "string" ? value.toTitleCase() : value;
  };
};
