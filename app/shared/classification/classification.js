'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('classification', function ($rootScope, $filter, ngTableParams, $routeParams, snowowlService) {
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

        scope.getLatestClassification = function () {

          console.debug('getting latest classification result');

          scope.classificationResult = null;

          // TODO Update branch when branching is implemented
          snowowlService.getClassificationResultsForTask($routeParams.projectId, $routeParams.taskId, scope.branch).then(function (response) {
            if (!response || !response.data || !response.data.items) {
              console.debug('no classification results');
              // do nothing
            } else {

              console.debug('classification results list', response.data.items);

              // sort by completion date to ensure latest result first
              response.data.items.sort(function (a, b) {
                var aDate = new Date(a.completionDate);
                var bDate = new Date(b.completionDate);
                return aDate < bDate;
              });

              scope.classificationResult = response.data.items[0];

              if (scope.classificationResult.id) {
                snowowlService.getEquivalentConcepts(scope.classificationResult.id, $routeParams.projectId,
                  $routeParams.taskId, scope.branch).then(function (response) {
                  scope.equivalentConcepts = response;
                });
                snowowlService.getRelationshipChanges(scope.classificationResult.id, $routeParams.projectId,
                  $routeParams.taskId, scope.branch
                ).
                  then(function (response) {
                    scope.relationshipChanges = response;
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

        scope.equivalentConcepts = [];
        scope.relationshipChanges = [];

        // watch for id set and retrieve elements
        scope.$watch('classificationId', function () {

        });

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

        scope.tableParams = new ngTableParams({
          page: 1,            // show first page
          count: 10,          // count per page
          sorting: {
            name: 'asc'     // initial sorting
          }
        }, {
          total: data.length, // length of data
          getData: function ($defer, params) {
            // use build-in angular filter
            var orderedData = params.sorting() ?
              $filter('orderBy')(data, params.orderBy()) :
              data;

            $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
        });
      }
    };
  });