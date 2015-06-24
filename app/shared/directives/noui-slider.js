'use strict';
// jshint ignore: start
angular.module('angularAppTemplateApp')
.directive('nouiSlider', function() {

  return {
    restrict: 'A',
    link: function(scope, element, attrs) {

      var bind = angular.element(attrs.bind);
      var bindRange = angular.element(attrs.bindRange);

      if ( bind.length ) start = bind.val();

      // setting range or start
      start = ( attrs.start ? attrs.start : 0 );
      range = ( attrs.range ? attrs.range : 0 );

      if(range){
        startPoint = [start, range];
        element.addClass('noUi-range');
      } else {
        startPoint = [start];
      }

      // settings
      step = ( attrs.step ? parseInt(attrs.step) : 0 );
      min = ( attrs.min ? parseInt(attrs.min) : 0 );
      max = ( attrs.max ? parseInt(attrs.max) : 10 );

      $(element).noUiSlider({
        start: startPoint,
        step: step,
        range: {
          'min': [ min ],
          'max': [ max ]
        }
      });

      $(element).on('slide', function(a,b){

        if ( bindRange.length ) {
          v = parseInt(b[0]);
          v2 = parseInt(b[1]);
        } else {
          v = parseInt(b);
        }

        if ( bind.length ) {
          if (bind[0].value !== undefined) {
            bind.val(v);
          } else {
            bind.html(v);
          }
        }

        if ( bindRange.length ) {
          if (bindRange[0].value !== undefined) {
            bindRange.val(v2);
          } else {
            bindRange.html(v2);
          }
        }
      });
    }
  };

});
