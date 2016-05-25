geosite.api.getScope = function(options)
{
  var scope = undefined;
  if(options != undefined)
  {
    if("scope" in options)
    {
      scope = options["scope"];
    }
  }
  return scope || angular.element("#geosite-main").scope();
}
