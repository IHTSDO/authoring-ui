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

        console.debug('classification directive init', scope.branch, scope.projectKey, scope.taskKey);


        var data = [{
          differences: 'added',
          source: 'Medication monitoring not indicated',
          type: 'Is a',
          destination: 'Procedure not indicated',
          group: 0,
          charType: 'Inferred'
        },
          {
            differences: 'added',
            source: 'Medication monitoring not indicated',
            type: 'Is a',
            destination: 'Associated procedure',
            group: 0,
            charType: 'Inferred'
          },
          {
            differences: 'added',
            source: 'Medication monitoring not indicated',
            type: 'Is a',
            destination: 'Subject relationship context',
            group: 0,
            charType: 'Inferred'
          },
          {
            differences: 'added',
            source: 'Medication monitoring not indicated',
            type: 'Is a',
            destination: 'Procedure not indicated',
            group: 0,
            charType: 'Inferred'
          },
          {
            differences: 'added',
            source: 'Medication monitoring not indicated',
            type: 'Is a',
            destination: 'Procedure not indicated',
            group: 0,
            charType: 'Inferred'
          },
          {
            differences: 'added',
            source: 'Medication monitoring not indicated',
            type: 'Is a',
            destination: 'Procedure not indicated',
            group: 0,
            charType: 'Inferred'
          },
          {
            differences: 'added',
            source: 'Medication monitoring not indicated',
            type: 'Is a',
            destination: 'Procedure not indicated',
            group: 0,
            charType: 'Inferred'
          },
          {
            differences: 'added',
            source: 'Medication monitoring not indicated',
            type: 'Is a',
            destination: 'Procedure not indicated',
            group: 0,
            charType: 'Inferred'
          },
          {
            differences: 'inactivated',
            source: 'Medication monitoring not indicated',
            type: 'Is a',
            destination: 'Procedure not indicated',
            group: 0,
            charType: 'Inferred'
          }];

        scope.tableParams = new NgTableParams({
          page: 1,            // show first page
          count: 10,          // count per page
          sorting: {
            name: 'asc'     // initial sorting
          }
        }, {
          total: data.length, // length of data
          getData: function ($defer, params) {
            console.debug('getData called');
            // use build-in angular filter
            var orderedData = params.sorting() ?
              $filter('orderBy')(data, params.orderBy()) :
              data;

            $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
        });

        // function to get the latest classification
        scope.getLatestClassification = function () {

          console.debug('getting latest classification result');

          scope.classificationResult = null;
          scope.equivalentConcepts = [];
          scope.relationshipChanges = [];

          // TODO Update branch when branching is implemented
          snowowlService.getClassificationResultsForTask($routeParams.projectId, $routeParams.taskId, scope.branch).then(function (response) {
            if (!response) {
              console.debug('no classification results');
              // do nothing
            } else {

              console.debug('classification results list', response);

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
        console.debug('classification hid?', scope.hideClassification);
        if (!scope.hideClassification) {
          scope.getLatestClassification();
        }
      }
    };
  }]);