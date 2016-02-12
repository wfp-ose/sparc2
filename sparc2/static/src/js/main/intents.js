var intend = function(name, data, scope)
{
    scope.$emit(name, data);
};
var init_intents = function(element, scope)
{
  element.on('click', '.geosite-intent', function(event) {
    event.preventDefault();  // For anchor tags
    var that = $(this);
    if(that.hasClass('geosite-toggle'))
    {
      if(that.hasClass('geosite-off'))
      {
        that.removeClass('geosite-off');
        intend(that.data('intent-names')[0], that.data('intent-data'), scope)
      }
      else
      {
        that.addClass('geosite-off');
        intend(that.data('intent-names')[1], that.data('intent-data'), scope)
      }
    }
    else if(that.hasClass('geosite-radio'))
    {
      var siblings = that.parents('.geosite-radio-group:first').find(".geosite-radio").not(that);
      if(!(that.hasClass('geosite-on')))
      {
        that.addClass('geosite-on');
        if(that.data("intent-class-on"))
        {
          that.addClass(that.data("intent-class-on"));
          siblings.removeClass(that.data("intent-class-on"));
        }
        siblings.removeClass('geosite-on');
        if(that.data("intent-class-off"))
        {
          that.removeClass(that.data("intent-class-off"));
          siblings.addClass(that.data("intent-class-off"));
        }
        intend(that.data('intent-name'), that.data('intent-data'), scope)
      }
    }
    else
    {
      intend(that.data('intent-name'), that.data('intent-data'), scope)
    }
  });
};
