'use strict';
// jshint ignore: start
angular.module('angularAppTemplateApp')
.directive('formControl', function() {
  return {
    restrict: 'C',
    link: function(scope, element, attrs) {

      // set initial filled
      if(element.val()){
        element.parent().addClass('filled');
      }

      element.bind('blur', function (e) {
        input = angular.element(e.currentTarget);
        if(input.val()){
          input.parent().addClass('filled');
        } else {
          input.parent().removeClass('filled');
        }
        input.parent().removeClass('active');
      }).bind('focus', function (e) {
        input = angular.element(e.currentTarget);
        input.parent().addClass('active');
      });

    }
  };
});
