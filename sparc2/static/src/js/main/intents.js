var intend = function(name, data, scope)
{
    scope.$emit(name, data);
};
var init_intents = function(element, scope)
{
  element.on('click', '.sparc-intent', function(event) {
    event.preventDefault();  // For anchor tags
    var that = $(this);
    if(that.hasClass('sparc-toggle'))
    {
      if(that.hasClass('sparc-off'))
      {
        that.removeClass('sparc-off');
        intend(that.data('intent-names')[0], that.data('intent-data'), scope)
      }
      else
      {
        that.addClass('sparc-off');
        intend(that.data('intent-names')[1], that.data('intent-data'), scope)
      }
    }
    else if(that.hasClass('sparc-radio'))
    {
      var siblings = that.parents('.sparc-radio-group:first').find(".sparc-radio").not(that);
      if(!(that.hasClass('sparc-on')))
      {
        that.addClass('sparc-on');
        if(that.data("intent-class-on"))
        {
          that.addClass(that.data("intent-class-on"));
          siblings.removeClass(that.data("intent-class-on"));
        }
        siblings.removeClass('sparc-on');
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
