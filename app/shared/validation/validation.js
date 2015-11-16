'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('validation', ['$rootScope', '$filter', 'ngTableParams', '$routeParams', 'scaService', 'snowowlService', 'notificationService', '$timeout', '$modal',
    function ($rootScope, $filter, NgTableParams, $routeParams, scaService, snowowlService, notificationService, $timeout, $modal) {
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
          scope.taskKey = $routeParams.taskKey;

          // instantiate validation container if not supplied
          if (!scope.validationContainer) {
            scope.validationContainer = {executionStatus: '', report: ''};
          }

          console.debug('entered validation.js', scope.validationContainer);

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

            if (scope.validationContainer.report && scope.validationContainer.report.rvfValidationResult) {

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
              total: assertionsFailed ? assertionsFailed.length : 0,
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
                  var orderedData = failures;
                  params.total(orderedData.length);
                  orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;
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

            console.debug('validationContainer changed - report:', scope.validationContainer.report);

            // extract the failed assertions
            assertionsFailed = scope.validationContainer.report.rvfValidationResult.sqlTestResult.assertionsFailed;

            // reset view to full report
            scope.viewTop = true;

            // reload the tables
            scope.topTableParams.reload();
            scope.failureTableParams.reload();

          }, true); // make sure to check object inequality, not reference!

          scope.viewFailures = function (assertionFailure) {

            console.debug('assertionFailure', assertionFailure);

            scope.assertionFailureViewed = assertionFailure.assertionText;
            scope.viewTop = false;

            var objArray = [];

            // different handling for projects and tasks
            if (!$routeParams.taskKey) {
              console.debug('project detected');

              angular.forEach(assertionFailure.firstNInstances, function (instance) {
                var obj = {
                  concept: null,
                  errorMessage: instance,
                  selected: false
                };
                objArray.push(obj);
              });
              failures = objArray;
              scope.failureTableParams.reload();
            }

            // task handling
            else {

              // convert instances into table objects
              if (!scope.changedList) {
                scaService.getReviewForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
                  scope.changedList = response;
                  angular.forEach(assertionFailure.firstNInstances, function (instance) {
                    var obj = {
                      concept: null,
                      errorMessage: instance,
                      selected: false,
                      userModified: false
                    };
                    angular.forEach(scope.changedList.concepts, function (concept) {
                      if (instance.conceptId === concept.id) {
                        obj.userModified = true;
                      }
                    });
                    objArray.push(obj);
                  });
                });

              }

              else {
                angular.forEach(assertionFailure.firstNInstances, function (instance) {

                  var obj = {
                    concept: null,
                    errorMessage: instance,
                    selected: false,
                    userModified: false
                  };
                  angular.forEach(scope.changedList.concepts, function (concept) {
                    if (instance.conceptId === concept.id) {
                      obj.userModified = true;
                    }
                  });

                  objArray.push(obj);
                });
              }
              // TODO Set edit enable/disable for edit panel
            }

            console.debug('failures', failures);

            // set failures to trigger watch
            failures = objArray;

            scope.failureTableParams.reload();
          };

          scope.selectAll = function (selectAllActive) {
            angular.forEach(failures.firstNInstances, function (failure) {
              failure.selected = selectAllActive;
            });
          };

          // TODO Decide how to represent concepts and implement
          scope.editConcept = function (conceptId) {
            $rootScope.$broadcast('editConcept', {conceptId: conceptId});
          };

          scope.openCreateTaskModal = function (task, editList, savedList) {

            var modalInstance = $modal.open({
              templateUrl: 'shared/task/task.html',
              controller: 'taskCtrl',
              resolve: {
                task: function () {
                  return task;
                }
              }
            });

            modalInstance.result.then(function (task) {

              notificationService.sendMessage('Task ' + task.key + ' created', -1, '#/tasks/task/' + task.projectKey + '/' + task.key + '/edit');

              console.debug('Task created', task.projectKey, task.key);


              scaService.saveUiStateForTask(task.projectKey, task.key, 'edit-panel', editList).then(function(response) {
                scaService.saveUiStateForTask(task.projectKey, task.key, 'saved-list', { items : savedList }) ; // TODO Seriously rethink the saved list
              })

            }, function () {
            });
          };

          scope.createTaskFromFailures = function () {

            notificationService.sendMessage('Constructing task from project validation...');

            console.debug('failures.firstNInstances', failures, failures.firstNInstances);

            // attempt to construct the edit list from user selections
            var editList = [];
            angular.forEach(failures, function (failure) {
              if (editList.selected && editList.indexOf(failure.errorMessage.conceptId) === -1) {
                editList.push(failure.errorMessage.conceptId);
              }
            });

            // if edit list is empty, use all failure instances
            angular.forEach(failures, function (failure) {
              if (editList.indexOf(failure.errorMessage.conceptId === -1)) {
                editList.push(failure.errorMessage.conceptId);
              }
            });

            console.debug('editList', editList);

            // temporary restriction on number of items to prevent giant server
            // load
            if (editList.length > 10) {
              notificationService.sendWarning('No more than 20 failures can be put into a task at this time');
              return;
            }

            notificationService.sendMessage('Adding concept information to new task ...');

            // retrieve the requested concept information and construct the
            // saved list
            var idConceptMap = {};
            var savedList = [];
            angular.forEach(editList, function (conceptId) {
              snowowlService.getFullConcept(conceptId, scope.branch).then(function (response) {

                // add concept to map for properties retrieval (for task detail)
                idConceptMap[conceptId] = response.fsn;

                // construct the saved list item
                var savedListItem = {
                  active: response.active,
                  concept: {
                    conceptId: conceptId,
                    fsn: response.fsn,
                    active: response.active,
                    definitionStatus: response.definitionStatus,
                    moduleId: response.moduleId
                  }
                };

                savedList.push(savedListItem);
                notificationService.sendMessage('Adding concept information to new task... (' + (savedList.length) + '/' + editList.length + ')');

                if (savedList.length === editList.length) {

                  notificationService.sendMessage('Creating task...');

                  console.debug('idConceptMap', idConceptMap);

                  // construct the saved list and task details
                  var taskDetails = 'Error Type: ' + scope.assertionFailureViewed + '\n\n';
                  angular.forEach(failures, function (failure) {
                    // if this concept was encountered, add it to details
                    if (idConceptMap[failure.errorMessage.conceptId]) {
                      taskDetails += 'Concept: ' + idConceptMap[failure.errorMessage.conceptId] + ', Error: ' + failure.errorMessage.detail + '\n';
                    }
                  });

                  console.debug('editList', editList);
                  console.debug('savedList', savedList);
                  console.debug('taskDetails', taskDetails);

                  var task = {
                    projectKey: $routeParams.projectKey,
                    summary: 'Validation errors found at project level',
                    description: taskDetails
                  };

                  scope.openCreateTaskModal(task, editList, savedList);
                }
              });
            });

          };
        }

      };

    }])
;