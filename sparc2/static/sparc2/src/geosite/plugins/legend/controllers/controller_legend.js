geosite.controllers["controller_legend"] = function(
  $scope,
  $element,
  $controller,
  state,
  popatrisk_config,
  map_config,
  live)
{
  angular.extend(this, $controller('GeositeControllerBase', {$element: $element, $scope: $scope}));
  //
  var jqe = $($element);

  $scope.$on("refreshMap", function(event, args){
    console.log('args: ', args);
    var element_featurelayers = jqe.find('.geosite-map-legend-featurelayers');
    $('.geosite-map-legend-item', element_featurelayers).each(function(){
      var layerID = $(this).data('layer');
      var element_symbol = $(this).find('.geosite-map-legend-item-symbol:first');
      var styleID = args.state.styles[layerID];
      var styles = $.grep(geosite.map_config.featurelayers["context"].cartography, function(x, i){
        return x["id"] == styleID;
      });
      var style =  styles.length > 0 ? styles[0] : undefined;


    });
  });
};
