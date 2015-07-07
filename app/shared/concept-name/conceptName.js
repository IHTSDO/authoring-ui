'use strict';
angular.module('singleConceptAuthoringApp')
  .directive('conceptName', function() {
    return {
      restrict: 'A',
      transclude: true,
      replace: true,
      scope: {
        name : '='
      },
      templateUrl: 'shared/concept-name/conceptName.html',
      controller: ['$element', '$location', '$rootScope', function($element, $location, $rootScope) {

      }],
      link: function(scope, element, attrs, linkCtrl) {

      }
    };
  });