geodash.directives["sparcModalWelcome"] = function(){
  return {
    controller: geodash.controllers.SPARCControllerModalWelcome,
    restrict: 'EA',
    replace: true,
    scope: {},
    templateUrl: 'sparc_modal_welcome.tpl.html',
    link: function ($scope, element, attrs){

      setTimeout(function(){

        $('#country-input, #hazard-input', element).each(function(){
          var s = $(this);
          var placeholder = s.data('placeholder');
          var initialData = s.data('initialData');
          var w = s.data('width');
          var h = s.data('height');
          var css = 'sparc-welcome-select-dropdown';
          var template_empty = s.data('template-empty');
          var template_suggestion = s.data('template-suggestion');

          // Twitter Typeahead with
          //https://github.com/bassjobsen/typeahead.js-bootstrap-css
          var engine = new Bloodhound({
            identify: function(obj) {
              return obj['text'];
            },
            datumTokenizer: function(d) {
              return Bloodhound.tokenizers.whitespace(d.text);
            },
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: geodash.initial_data["data"][initialData]
          });

          s.typeahead(null, {
            name: s.attr('name'),
            minLength: 1,
            limit: 10,
            hint: false,
            highlight: true,
            displayKey: 'text',
            source: engine,
            templates: {
              empty: template_empty,
              suggestion: function (data) {
                  return '<p><strong>' + data.text + '</strong> - ' + data.id + '</p>';
              },
              footer: function (data) {
                return '<div>Searched for <strong>' + data.query + '</strong></div>';
              }
            }
          }).on('blur', function(event) {
            var results = engine.get($(this).val());
            var backend = $('#'+$(this).data('backend'))
              .val(results.length == 1 ? results[0]['id'] : null)
              .trigger('input')
              .change();
          })
          .on('typeahead:change', function(event, value) {
            console.log("Event: ", event, value);
            var results = engine.get(value);
            var backend = $('#'+$(this).data('backend'))
              .val(results.length == 1 ? results[0]['id'] : null)
              .trigger('input')
              .change();
          })
          .on('typeahead:select typeahead:autocomplete typeahead:cursorchange', function(event, obj) {
            console.log("Event: ", event, obj);
            var backend = $('#'+$(this).data('backend'))
              .val("id" in obj ? obj["id"] : null)
              .trigger('input')
              .change();
          });
        });

        sparc.welcome();

      }, 10);

    }
  };
};
