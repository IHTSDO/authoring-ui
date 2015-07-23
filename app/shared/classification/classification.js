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

        // function to get the latest classification
        scope.getLatestClassification = function () {


          scope.classificationResult = null;
          scope.equivalentConcepts = [];
          scope.relationshipChanges = [];

          // TODO Update branch when branching is implemented
          snowowlService.getClassificationResultsForTask($routeParams.projectId, $routeParams.taskId, scope.branch).then(function (response) {
            if (!response) {
               // do nothing
            } else {

              // sort by completion date to ensure latest result first
              response.sort(function (a, b) {
                var aDate = new Date(a.completionDate);
                var bDate = new Date(b.completionDate);
                return aDate < bDate;
              });

              scope.classificationResult = response[0];

              if (scope.classificationResult.id) {
                snowowlService.getEquivalentConcepts(scope.classificationResult.id, $routeParams.projectId,
                  $routeParams.taskId, scope.branch).then(function (equivalentConcepts) {
                    scope.equivalentConcepts = equivalentConcepts;
                  });
                snowowlService.getRelationshipChanges(scope.classificationResult.id, $routeParams.projectId,
                  $routeParams.taskId, scope.branch
                ).
                  then(function (relationshipChanges) {
                    
                    scope.relationshipChanges = relationshipChanges;
                    
                    angular.forEach(scope.relationshipChanges, function(item) {
                      // get source name
                      snowowlService.getConceptPreferredTerm(item.sourceId, scope.branch).then(function(response) {
                        item.sourceName = response.term;
                      });
                      // get destination name 
                      snowowlService.getConceptPreferredTerm(item.destinationId, scope.branch).then(function(response) {
                        item.destinationName = response.term;
                      });
                      // get type name
                      snowowlService.getConceptPreferredTerm(item.typeId, scope.branch).then(function(response) {
                        item.typeName = response.term;
                      });
                    });
                  });
              }
            }

          });
        };

        // if classify mode, retrieve the latest classification
        if (!scope.hideClassification) {
          scope.getLatestClassification();
        }
      }
    };
  }]);