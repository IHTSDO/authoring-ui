'use strict';
angular.module('singleConceptAuthoringApp')
  .directive('conceptEdit', function (snowowlService, objectService) {
    return {
      restrict: 'A',
      transclude: true,
      replace: true,
      scope: {
        // the concept being displayed
        concept: '=concept',

        // the branch of the concept
        branch: '=branch'
      },
      templateUrl: 'shared/concept-edit/conceptEdit.html',

      link: function (scope, element, attrs, linkCtrl) {

        console.debug('concept-edit link', scope.concept, scope.branch);

        if (!scope.concept) {
          console.error('conceptEdit directive requires concept to be specified');
          return;
        }

        if (!scope.branch) {
          console.error('conceptEdit directive requires branch to be specified');
        }

        ////////////////////////////////
        // Description Elements
        ////////////////////////////////
        
        // ensure at least one empty description is present
        if (!scope.concept.descriptions || scope.concept.descriptions.length === 0) {
          scope.concept.descriptions = [];
          scope.concept.descriptions.push(objectService.getNewDescription(scope.concept.id));
        }

        // Define available languages
        scope.languages = [
          {id: 'en', abbr: 'en'}
        ];

        // Define definition types
        scope.typeIds = [
          {id: '900000000000003001', abbr: 'FSN'},
          {id: '900000000000013009', abbr: 'SYN'},
          {id: '900000000000550004', abbr: 'DEF'}
        ];

        // define acceptability types
        scope.acceptabilities = [
          {id: 'PREFERRED', abbr: 'Preferred'},
          {id: 'ACCEPTABLE', abbr: 'Acceptable'},
          {id: 'NOT ACCEPTABLE', abbr: 'Not acceptable'}
        ];

        scope.addDescription = function () {

          console.debug('adding new description');

          var description = objectService.getNewDescription(scope.concept.id);
          scope.concept.descriptions.push(description);
        };

        scope.addRelationship = function () {

          console.debug('adding new relationship');

          var relationship = objectService.getNewRelationship(scope.concept.id);
          scope.concept.outboundRelationships.push(relationship);
        };

        ////////////////////////////////
        // Relationship Elements
        ////////////////////////////////
        
        // ensure at least one empty outbound relationship is present
        if (!scope.concept.outboundRelationships || scope.concept.outboundRelationships.length === 0) {
          scope.concept.outboundRelationships = [];
          scope.concept.outboundRelationships.push(objectService.getNewRelationship(scope.concept.id));
        }

        // define characteristic types
        scope.characteristicTypes = [
          {id: 'STATED_RELATIONSHIP', abbr: 'Stated'},
          {id: 'INFERRED_RELATIONSHIP', abbr: 'Inferred'}
        ];

        scope.nameMap = {};

        // retrieve names of all relationship targets
        angular.forEach(scope.concept.outboundRelationships, function (rel) {
          console.debug('getting name for rel', rel);

          snowowlService.getConceptPreferredTerm(rel.destinationId, scope.branch).then(function (response) {
            rel.destinationName = response.term;
          });
          /*
           snowowlService.getConceptPreferredTerm(scope.concept.outboundRelationships[i].sourceId, scope.branch).then(function (response) {
           scope.nameMap[response.id] = response.term;
           console.debug(scope.nameMap);
           })
           */
        });
      }
    };
  })
;
