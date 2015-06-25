'use strict';

angular.module('singleConceptAuthoringApp')
.directive('navbarSearch', ['$timeout', function($timeout) {
  return {
    restrict: 'A',
    templateUrl: 'shared/navbar/navbar-search.html',
    link: function(scope, element, attrs) {
      scope.showNavbarSearch = false;

      scope.toggleSearch = function(){
        scope.showNavbarSearch = !scope.showNavbarSearch;
      };

      scope.submitNavbarSearch = function(){
        scope.showNavbarSearch = false;
      };
    }
  };
}]);
