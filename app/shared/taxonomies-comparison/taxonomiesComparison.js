'use strict';
angular.module('singleConceptAuthoringApp')
  .directive('taxonomiesComparison', function ($rootScope, $q, snowowlService) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        concept: '=',
        branch: '=',
        parentBranch: '=',
        view: '=?',
      },
      templateUrl: 'shared/taxonomies-comparison/taxonomiesComparison.html',

      link: function (scope) {

        scope.taskConcept = scope.concept;
        scope.parentConcept = scope.concept;
        
        scope.closeTaxonomy = function (isParentConcept) {
          if (isParentConcept)  {
            scope.parentConcept = null;
          } else {
            scope.taskConcept = null;
          }
        };        
      }
    };
  })
;
