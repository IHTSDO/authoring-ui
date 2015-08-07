'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('validation', ['$rootScope', '$filter', 'ngTableParams', '$routeParams', 'snowowlService', 'scaService', '$timeout',
    function ($rootScope, $filter, ngTableParams, $routeParams, snowowlService, scaService, $timeout) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
         editable: '&'
        },
        templateUrl: 'shared/validation/validation.html',

        link: function (scope, element, attrs, linkCtrl) {

          console.debug('validation.js', element, attrs, linkCtrl);

          scope.editable = attrs.editable === 'true';
          scope.showTitle = attrs.showTitle === 'true';
          scope.viewTop = true;
          scope.displayStatus = '';

          var assertionsFailed = [];
          var failures = [];

          scope.$on('setValidation', function(event, data) {
            console.debug('setValidation received', data.validation);
            scope.validation = data.validation;

            switch(data.validation.executionStatus) {
              case 'RUNNING':
                scope.displayStatus = 'Running';
                break;
              case 'FAILED':
                scope.displayStatus = 'Failed';
                break;
              case 'COMPLETED':
                scope.displayStatus = 'Completed on ' + data.validation['report']['RVF Validation Result']['End time']
                break;
            }

            assertionsFailed = scope.validation['report']['RVF Validation Result']['SQL test result']['assertionsFailed'];
            console.debug(assertionsFailed);
            scope.topTableParams.reload();
          });


          // declare table parameters
          scope.topTableParams = new ngTableParams({
              page: 1,
              count: 10,
              sorting: {failureCount: 'desc'},
              orderBy: 'failureCount'
            },
            {
              filterDelay: 50,
              total: assertionsFailed.length,
              getData: function ($defer, params) {

                console.debug('get main data', assertionsFailed);

                if (!assertionsFailed || assertionsFailed.length == 0) {
                  $defer.resolve([]);
                } else {

                  var orderedData = assertionsFailed;

                  params.total(orderedData.length);
                  orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;

                  $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
              }
            }
          );

          scope.$watch('assertionsFailed', function () {
            console.debug('assertionsFailed changed', assertionsFailed);
            scope.topTableParams.reload();
          });

          // declare table parameters
          scope.failureTableParams = new ngTableParams({
              page: 1,
              count: 10,
              sorting: {concept: 'asc'},
              orderBy: 'concept'
            },
            {
              filterDelay: 50,
              total: failures.length,
              getData: function ($defer, params) {

                console.debug('get failure data', failures);

                if (!failures || failures.length == 0) {
                  $defer.resolve([]);
                } else {

                  var orderedData = failures;

                  params.total(orderedData.length);
                  orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;

                  $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }

              }
            }
          );

          scope.$watch('failures', function () {
            console.debug('failures changed', failures);
            scope.failureTableParams.reload();
          });

          scope.viewFailures = function (assertionFailure) {

            console.debug('View failures', assertionFailure);

            scope.assertionFailureViewed = assertionFailure.assertionText;
            scope.viewTop = false;

            // convert instances into table objects
            var objArray = [];

            angular.forEach(assertionFailure.firstNInstances, function (instance) {
              var obj = {
                concept: null,
                errorMessage: instance,
                selected: false
              };
              objArray.push(obj);

            });

            // TODO Set edit enable/disable for edit panel loading

            // set failures to trigger watch
            failures = objArray;

            scope.failureTableParams.reload();
          };

          // TODO Make this respect paging
          scope.selectAll = function(selectAllActive) {
            angular.forEach(failures, function(failure) {
              failure.selected = selectAllActive;
            });
          };

          // TODO Decide how to represent concepts and implement
          scope.editConcept = function(concept) {

          };

        }

      };

    }])
;