geosite.utility = {};

geosite.utility.getClosestFeature = function(nearbyFeatures, target)
{
  var closestFeature = undefined;
  var closestDistance = 0;
  if(nearbyFeatures != undefined)
  {
    if(nearbyFeatures.length > 0)
    {
      closestFeature = nearbyFeatures[0];
      closestDistance = target.distanceTo(nearbyFeatures[0].geometry);
      for(var i = 0; i < nearbyFeatures.length ;i++)
      {
        var f = nearbyFeatures[i];
        if(target.distanceTo(f.geometry) < closestDistance)
        {
          closestFeature = f;
          closestDistance = target.distanceTo(f.geometry);
        }
      }
    }
  }
  return closestFeature;
};
