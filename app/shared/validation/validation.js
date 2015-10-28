'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('validation', ['$rootScope', '$filter', 'ngTableParams', '$routeParams', 'scaService', 'snowowlService', '$timeout',
    function ($rootScope, $filter, NgTableParams, $routeParams, scaService, snowowlService, $timeout) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          // validation container structure:
          // { report: [validation report], ...}
          validationContainer: '=',

          // flag for whether or not to allow editing controls
          editable: '&',

          // branch this report is good for
          branch: '='
        },
        templateUrl: 'shared/validation/validation.html',

        link: function (scope, element, attrs, linkCtrl) {

          scope.editable = attrs.editable === 'true';
          scope.showTitle = attrs.showTitle === 'true';
          scope.viewTop = true;
          scope.displayStatus = '';
          

          // instantiate validation container if not supplied
          if (!scope.validationContainer) {
            scope.validationContainer = {executionStatus: '', report: ''};
          }

          // local variables for ng-table population
          var assertionsFailed = [];
          var failures = [];

          // Allow broadcasting of new validation results
          // e.g. from server-side notification of work complete
          scope.$on('setValidation', function (event, data) {
             scope.validationContainer = data.validation;

          });

          // function to get formatted summary text
          scope.getStatusText = function () {

            // check required elements
            if (!scope.validationContainer) {
              return;
            }
            if (!scope.validationContainer.executionStatus || scope.validationContainer.executionStatus === '') {
              return;
            }

            // get the human-readable execution status
            var status = scope.validationContainer.executionStatus.toLowerCase().replace(/\w\S*/g, function (txt) {
              return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });

            if (scope.validationContainer.report) {

              // get the end time if specified
              if (scope.validationContainer.report.rvfValidationResult.endTime) {
                var endTime = scope.validationContainer.report.rvfValidationResult.endTime;
                return status + ' ' + endTime;
              }

              if (scope.validationContainer.report.rvfValidationResult.startTime) {
                var startTime = scope.validationContainer.report.rvfValidationResult.startTime;
                return status + ', started ' + startTime;
              }
            }

            return status;
          };

          // declare table parameters
          scope.topTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {failureCount: 'desc'},
              orderBy: 'failureCount'
            },
            {
              filterDelay: 50,
              total: assertionsFailed.length,
              getData: function ($defer, params) {

                if (!assertionsFailed || assertionsFailed.length === 0) {
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

          // declare table parameters
          scope.failureTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {userModified: 'desc'},
              orderBy: 'userModified'
            },
            {
              total: failures ? failures.length : 0,
              getData: function ($defer, params) {

                if (!failures || failures.length === 0) {
                  $defer.resolve([]);
                } else {
                  var orderedData = params.sorting() ?
                    $filter('orderBy')(failures, params.orderBy()) :
                    failures;
                    params.total(orderedData.length);
                    $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
              }
            }
          );

          // watch for changes in the validation in order to populate tables
          scope.$watch('validationContainer', function () {

            if (!scope.validationContainer || !scope.validationContainer.report) {
              return;
            }

            // extract the failed assertions
            assertionsFailed = scope.validationContainer.report.rvfValidationResult.sqlTestResult.assertionsFailed;

            // clear the viewed failure type
            failures = [];

            // reset view to full report
            scope.viewTop = true;

            // reload the tables
            scope.topTableParams.reload();
            scope.failureTableParams.reload();

          }, true); // make sure to check object inequality, not reference!

          scope.viewFailures = function (assertionFailure) {

            
            scope.assertionFailureViewed = assertionFailure.assertionText;
            scope.viewTop = false;

            // convert instances into table objects
            var objArray = [];

            angular.forEach(assertionFailure.firstNInstances, function (instance) {
              
              var obj = {
                concept: null,
                errorMessage: instance,
                selected: false,
                userModified: false
              };
              if(scope.changedList)
              {
                  angular.forEach(scope.changedList.concepts, function (concept) {
                      if(instance.errorMessage.conceptId === concept.conceptId)
                      {
                        obj.userModified = true;   
                      }
                  });
              }
              else{
                scaService.getReviewForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
                  scope.changedList = response ? response : {};
                  angular.forEach(scope.changedList.concepts, function (concept) {
                      if(instance.errorMessage.conceptId === concept.conceptId)
                      {
                        obj.userModified = true;   
                      }
                  });
              });   
              }
              objArray.push(obj);

            });

            // TODO Set edit enable/disable for edit panel loading

            // set failures to trigger watch
            failures = objArray;

            scope.failureTableParams.reload();
          };
            
          scope.getChangedList = function(obj){
              
          };

          // TODO Make this respect paging
          scope.selectAll = function (selectAllActive) {
            angular.forEach(failures, function (failure) {
              failure.selected = selectAllActive;
            });
          };

          // TODO Decide how to represent concepts and implement
          scope.editConcept = function (concept) {

          };

        }

      };

    }])
;