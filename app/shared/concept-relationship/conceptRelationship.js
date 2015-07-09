'use strict';
angular.module('singleConceptAuthoringApp')
  .directive('conceptRelationship', function () {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        relationship: '=relationship',
        branch: '=branch'
      },
      templateUrl: 'shared/concept-relationship/conceptRelationship.html',

      link: function (scope, element, attrs, linkCtrl, snowowlService) {

        console.debug('concept-relationship link', scope.relationship, scope.cid);

        if (!scope.relationship) {
          console.error('conceptRelationship requires specifying a relationship attribute');
          return;
        }


      }
    };
  });
