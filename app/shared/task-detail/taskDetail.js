'use strict';
angular.module('singleConceptAuthoringApp.taskDetail', [])

  .controller('taskDetailCtrl', ['$rootScope', '$scope', '$routeParams', '$location', '$timeout', '$modal', 'accountService', 'scaService', 'snowowlService', 'notificationService', '$q',
    function taskDetailCtrl($rootScope, $scope, $routeParams, $location, $timeout, $modal, accountService, scaService, snowowlService, notificationService, $q) {

      $scope.task = null;
      $scope.branch = 'MAIN/' + $routeParams.projectKey + '/' + $routeParams.taskKey;

      // set the parent concept for initial taxonomy load (null -> SNOMEDCT
      // root)
      $scope.taxonomyConcept = null;

      $scope.classify = function () {

        notificationService.sendMessage('Starting classification for task ' + $routeParams.taskKey, 5000);

        scaService.startClassificationForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {

          if (!response || !response.data || !response.data.id) {
            notificationService.sendError('Error starting classification');
            return;
          }

          if (response.data.status) {
            notificationService.sendMessage('Classification is ' + response.data.status, 10000);
          } else {
            notificationService.sendMessage('Task submitted for classification', 10000);
          }

          // save the id for convenience
          $scope.classificationId = response.data.id;
          $rootScope.classificationRunning = true;

          // if running, broadcast to edit.js for polling
          if ($scope.classificationStatus === 'RUNNING') {
            $rootScope.$broadcast('startClassification', $scope.classificationId);
          }
        });
      };
      $scope.promote = function () {

        // force refresh of task status
        scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          if (response) {
            $scope.task = response;

            if ($scope.task.branchState === 'BEHIND' || $scope.task.branchState === 'DIVERGED' || $scope.task.branchState === 'STALE') {
              notificationService.sendError('Error promoting task -- rebase required first');
              return;
            }

            if ($scope.task.branchState === 'UP_TO_DATE') {
              notificationService.sendWarning('Cannot promote task -- already up to date');
            }

            $scope.openPromoteModal();
            /* scaService.promoteTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
             $rootScope.$broadcast('reloadTask');
             });*/
          } else {
            notificationService.sendError('Error promoting task: Could not verify task was eligible for promotion', 0);
          }
        });
      };

      /**
       * Function to check a task for any promotion requirements not fulfilled
       * TODO Move this to scaService or some such place
       * @returns {*|promise}
       */
      function checkPromotionRequirements() {
        var deferred = $q.defer();

        var flags = [];

        console.debug('task', $scope.task);

        ////////////////////////////
        // ERRORS
        // Resolve immediately
        ////////////////////////////

        if (!$scope.task) {
          flags.push({
            key: 'Task Verified',
            message: 'ERROR: Could not retrieve task status.  You may promote, but exercise extreme caution.',
            value: false
          });
          deferred.resolve(flags);
        } else if (!$scope.task.latestClassificationJson) {
          flags.push({
            key: 'Classification Found',
            message: 'ERROR: Could not retrieve classification information for this task. You may promote, but exercise extreme caution.',
            value: false
          });
          deferred.resolve(flags);
        } else {

          // get the ui state for classiifcation saving timestamp and status
          // information
          scaService.getUiStateForUser('classification-' + $scope.task.latestClassificationJson.id).then(function (classificationStatus) {

            // get the branch details
            snowowlService.getBranch('MAIN/' + $routeParams.projectKey + ($routeParams.taskKey ? '/' + $routeParams.taskKey : '')).then(function (branchStatus) {

              console.debug('promote statuses', classificationStatus, branchStatus);

              /////////////////////////////////////////
              // Normal checks
              /////////////////////////////////////////

              // declare the flags relevant to promotion with their
              // user-displayed messages
              flags.push({
                key: 'Classification Run',
                message: 'Classification was not run for this task. Promote only if you are sure your changes will not affect future classifications.',
                value: $scope.task.latestClassificationJson.status === 'COMPLETED' || $scope.task.latestClassificationJson === 'SAVING_IN_PROGRESS' || $scope.task.latestClassificationJson === 'SAVED'
              });

              // check if classification saved
              flags.push({
                key: 'Classification Accepted',
                message: 'Classification was run for this task, but was not accepted. Promoting may dramatically impact the experience of other users.',
                value: $scope.task.latestClassificationJson && $scope.task.latestClassificationJson.status === 'SAVED'
              });

              // if classification results were accepted, check that the
              // results are current relative to task modifications
              if ($scope.task.latestClassificationJson.status === 'SAVED') {

                // if no classification status saved or saved state was not captured by application
                if (!classificationStatus || classificationStatus.status === 'SAVING_IN_PROGRESS') {
                  flags.push({
                    key: 'Classification Current',
                    message: 'Classification was run, but could not determine if modifications were made after saving classificationt.  Promote only if you are sure no modifications were made after saving classification results.',
                    value: false
                  });
                }

                // otherwise compare the head timestamp of the branch to the
                // saved timestamp of classification results acceptance
                else {

                  flags.push({
                    key: 'Classification Current',
                    message: 'Classification was run, but modifications were made to the task afterwards.  Promote only if you are sure those changes will not affect future classifications.',
                    value: classificationStatus.timestamp > branchState.headTimestamp
                  });
                }
              }

              deferred.resolve(flags);
            })
          })

        }

        return deferred.promise;
      };

      $scope.openPromoteModal = function () {

        checkPromotionRequirements().then(function (response) {
          console.debug('checked promotion requirements', response);

          var modalInstance = $modal.open({
            templateUrl: 'shared/promote-modal/promoteModal.html',
            controller: 'promoteModalCtrl',
            resolve: {
              task: function () {
                return $scope.task;
              },
              project: function () {
                return null;
              },
              flags: function () {
                return response;
              }
            }
          });

          modalInstance.result.then(function (response) {
          }, function () {
          });
        }, function (error) {

        });
      };

      $scope.startValidation = function () {
        notificationService.sendMessage('Submitting task for validation...');
        scaService.startValidationForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          $rootScope.validationRunning = true;
          notificationService.sendMessage('Task successfully submitted for validation', 10000, null);
        }, function () {
          notificationService.sendMessage('Error submitting task for validation', 5000, null);
        });
      };
      $scope.submitForReview = function () {
        notificationService.sendMessage('Submitting task for review...');
        var updateObj = {
          'reviewer': {
            'username': ''
          }
        };
        scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, updateObj).then(function () {
          scaService.updateTask(
            $routeParams.projectKey, $routeParams.taskKey,
            {
              'status': 'IN_REVIEW'
            }).then(function (response) {
              notificationService.sendMessage('Task submitted for review');
              $scope.task = response;
            }, function (error) {
              notificationService.sendError('Error submitting task for review');
            });
        });

      };

      $scope.updateTask = function () {
        var modalInstance = $modal.open({
          templateUrl: 'shared/task/task.html',
          controller: 'taskCtrl',
          resolve: {
            task: function () {
              console.debug('resolved task', $scope.task);
              return $scope.task;
            },
            canDelete: function () {
              return true;
            }
          }
        });

        modalInstance.result.then(function (response) {
          console.debug('modal closed with response', response);
          if (response) {
            $scope.task = response.data;
          }
        }, function () {
        });
      };

      function initialize() {
        scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          $scope.task = response;

          // get role for task
          $scope.role = accountService.getRoleForTask($scope.task);
          console.debug('ROLE', $scope.role);

          // set button flags
          if ($scope.task && $scope.task.latestClassificationJson) {
            $rootScope.classificationRunning = $scope.task.latestClassificationJson.status === 'RUNNING' || $scope.task.latestClassificationJson.status === 'BUILDING';
          }
          if ($scope.task) {
            $rootScope.validationRunning = $scope.task.latestValidationStatus === 'SCHEDULED' || $scope.task.latestValidationStatus === 'RUNNING' || $scope.task.latestValidationStatus === 'BUILDING';
          }
          if ($scope.task.branchState === 'DIVERGED') {
            $rootScope.$broadcast('branchDiverged');
          }

        });
      }

      $scope.$on('reloadTask', function (event, data) {
        initialize();
      });

// re-initialize if branch state changes
      $scope.$on('notification.branchState', function (event, data) {
        initialize();
      });

// re-initialize if concept change occurs and task is new
      $scope.$on('conceptEdit.conceptChange', function (event, data) {
        initialize();
      });

// re-initialize if concept change occurs and task is new
      $scope.$on('conceptEdit.conceptModified', function (event, data) {
        console.debug('taskDetail received conceptModified broadcast', $scope.task, data);
        if ($scope.task.status === 'Review Completed') {
          console.debug('updating task');
          scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, {'status': 'IN_PROGRESS'}).then(function (response) {
            $scope.task = response;
          });
        }
      });

      initialize();

    }

  ])
;
