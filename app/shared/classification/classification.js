'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('classification', ['$rootScope', '$filter', 'ngTableParams', '$routeParams', 'snowowlService', function ($rootScope, $filter, NgTableParams, $routeParams, snowowlService) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        // the branch
        branch: '=branch'
      },
      templateUrl: 'shared/classification/classification.html',

      link: function (scope, element, attrs, linkCtrl) {

        if (!scope.branch) {
          console.error('Classification display requires branch');
          return;
        }

        // helper function to populate names for all relationship display names
        function getRelationshipNames(relationship) {
          // get source name
          snowowlService.getConceptPreferredTerm(relationship.sourceId, scope.branch).then(function (response) {
            relationship.sourceName = response.term;
          });
          // get destination name
          snowowlService.getConceptPreferredTerm(relationship.destinationId, scope.branch).then(function (response) {
            relationship.destinationName = response.term;
          });
          // get type name
          snowowlService.getConceptPreferredTerm(relationship.typeId, scope.branch).then(function (response) {
            relationship.typeName = response.term;
          });
        }

        // notification of classification retrieved and set
        $rootScope.$on('setClassification', function (event, classification) {

          console.debug('classification received setClassification event', classification);

          if (!classification) {
            console.error('Received setClassification notification, but no classification was sent');
            return;
          }

          scope.classification = classification;


          // get the relationship names
          angular.forEach(scope.classification.relationshipChanges, function (item) {
            getRelationshipNames(item);
          });
          angular.forEach(scope.classification.equivalentConcepts, function (item) {
            getRelationshipNames(item);
          });

          // sort the changed relationships
          scope.classification.redundantStatedRelationships = [];
          scope.classification.classificationResults = [];
          console.debug('sorting: ', scope.classification.relationshipChanges);
          angular.forEach(scope.classification.relationshipChanges, function(item) {
            console.debug('checking', item.changeNature, item);
            if (item.changeNature === 'INFERRED') {

              scope.classification.classificationResults.push(item);
            } else if (item.changeNature === 'REDUNDANT') {
              scope.classification.redundantStatedRelationships.push(item);
            } else {
              console.warning('Unhandled relationship change with change nature ' + item.changeNature, item);
            }
          })


          console.debug(scope.classification);

        })
      }

    };
  }]);