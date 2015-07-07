'use strict';
angular.module('singleConceptAuthoringApp')
  .directive('conceptRelationship', function () {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        relationship: '=relationship',
        cid: '=cid'
      },
      templateUrl: 'shared/concept-relationship/conceptRelationship.html',

      link: function (scope, element, attrs, linkCtrl) {

        console.debug('concept-relationship link', scope.relationship, scope.cid);

        if (!scope.relationship) {
          console.error('conceptRelationship requires specifying a relationship attribute');
          return;
        }

        if (!scope.cid) {
          console.error('conceptRelationship requires specifying the owning concept id (required to determine direction');
        }

        // definecharacteristic types
        scope.characteristicTypes = [
          {id: 'STATED_RELATIONSHIP', abbr: 'Stated'},
          {id: 'INFERRED_RELATIONSHIP', abbr: 'Inferred'}
        ];

      }
    };
  });
