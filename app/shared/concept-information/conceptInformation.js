'use strict';
angular.module('singleConceptAuthoringApp')
  .directive('conceptInformation', function (snowowlService) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        // the concept being displayed (required)
        conceptId: '=',

        // the branch of the concept (required)
        branch: '=',
      },
      templateUrl: 'shared/concept-information/conceptInformation.html',

      link: function (scope, element, attrs, linkCtrl) {

        console.debug('concept information entered', scope.conceptId, scope.branch);

        scope.loadComplete = false;

        // get full concept if not retrieved
        snowowlService.getFullConcept(scope.conceptId, scope.branch).then(function (concept) {
          scope.fullConcept = concept;
          if (scope.fullConcept && scope.children && scope.parents) {
            scope.loadComplete = true;
          }
        });

        // get children if not retrieved
        snowowlService.getConceptChildren(scope.conceptId, scope.branch).then(function (children) {
          scope.children = children;
          if (scope.fullConcept && scope.children && scope.parents) {
            scope.loadComplete = true;
          }
        });

        snowowlService.getConceptParents(scope.conceptId, scope.branch).then(function (parents) {
          scope.parents = parents;
          if (scope.fullConcept && scope.children && scope.parents) {
            scope.loadComplete = true;
          }
        });

      }
    };
  }
)
;

