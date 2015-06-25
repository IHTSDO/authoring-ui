'use strict'

angular.module('singleConceptAuthoringApp')
.directive('scrollSpy', ['$window',function($window) {
  return {
    link: function(scope, element, attrs) {
      angular.element($window).bind('scroll', function() {
        scope.scroll = this.pageYOffset;
        if(!scope.$$phase) {
          scope.$apply();
        }
      });
    }
  };
}]);
