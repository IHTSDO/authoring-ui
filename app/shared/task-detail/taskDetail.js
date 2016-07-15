'use strict';
angular.module('singleConceptAuthoringApp.taskDetail', [])

  .controller('taskDetailCtrl', ['$rootScope', '$scope', '$routeParams', '$location', '$timeout', '$modal', 'metadataService', 'accountService', 'scaService', 'snowowlService', 'promotionService', 'notificationService', '$q',
    function taskDetailCtrl($rootScope, $scope, $routeParams, $location, $timeout, $modal, metadataService, accountService, scaService, snowowlService, promotionService, notificationService, $q) {

      $scope.task = null;
      $scope.branch = metadataService.getBranch();
      $rootScope.branchLocked = false;

      // the project and task branch objects
      $scope.projectBranch = null;
      $scope.taskBranch = null;

      // set the parent concept for initial taxonomy load (null -> SNOMEDCT
      // root)
      $scope.taxonomyConcept = null;
      $scope.reviewClicked = false;

      $scope.classify = function () {

        notificationService.sendMessage('Starting classification for task ' + $routeParams.taskKey, 5000);

        // start the classification
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

          $rootScope.$broadcast('reloadTask');


        }, function () {
          // do nothing on error
        });
      };


      $scope.promote = function () {

        notificationService.sendMessage('Preparing for task promotion...');

        promotionService.checkPrerequisitesForTask($routeParams.projectKey, $routeParams.taskKey).then(function (flags) {

          //console.debug('promotion flags', flags);

          // detect whether any user warnings were detected
          var warningsFound = false;
          angular.forEach(flags, function (flag) {
            if (flag.checkWarning) {
              warningsFound = true;
            }
          });

          // if response contains no flags, simply promote
          if (!warningsFound) {
            notificationService.sendMessage('Promoting task...');

            // manually lock the task in expectation of server lock post-promotion
            //lockTask();

            scaService.promoteTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
              notificationService.sendMessage('Task successfully promoted', 5000);
              $rootScope.$broadcast('reloadTask');
            });
          } else {

            // clear the preparation notification

            var modalInstance = $modal.open({
              templateUrl: 'shared/promote-modal/promoteModal.html',
              controller: 'promoteModalCtrl',
              resolve: {
                flags: function () {
                  return flags;
                },
                isTask: function () {
                  return true;
                }
              }
            });

            modalInstance.result.then(function (proceed) {
              if (proceed) {
                notificationService.sendMessage('Promoting task...');

                // manually lock the task in expectation of server lock post-promotion
                //lockTask();

                scaService.promoteTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
                  notificationService.sendMessage('Task successfully promoted', 5000);
                  $rootScope.$broadcast('reloadTask');
                });
              } else {
                notificationService.clear();
              }
            }, function () {
              notificationService.clear();
            });
          }
        }, function (error) {
          notificationService.sendError('Unexpected error preparing for promotion: ' + error);
        });
      };

      $scope.startValidation = function () {
        notificationService.sendMessage('Submitting task for validation...');

        // NOTE: Validation does not lock task

        scaService.startValidationForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          $rootScope.validationRunning = true;
          $rootScope.$broadcast('reloadTask');
          notificationService.sendMessage('Task successfully submitted for validation', 5000, null);
        }, function () {
          notificationService.sendMessage('Error submitting task for validation', 10000, null);
          $rootScope.$broadcast('reloadTask');
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
            notificationService.sendMessage('Task submitted for review', 5000);
            scaService.saveUiStateForReviewTask($routeParams.projectKey, $routeParams.taskKey, 'reviewed-list', []);
            $rootScope.$broadcast('reloadTask');
            $scope.reviewClicked = true;
            $scope.task = response;
          }, function (error) {
            notificationService.sendError('Error submitting task for review');
          });
        });

      };
      // cancel review
      $scope.cancelReview = function () {
        var taskObj = {
          'status': 'IN_PROGRESS',
          'reviewer': {
            'username': ''
          }
        };
        scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, taskObj).then(function (response) {
          notificationService.sendMessage('Review Cancelled', 2000);
          $rootScope.$broadcast('reloadTask');
        });

      };
      $scope.updateTask = function () {
        var modalInstance = $modal.open({
          templateUrl: 'shared/task/task.html',
          controller: 'taskCtrl',
          resolve: {
            task: function () {
              return $scope.task;
            },
            canDelete: function () {
              return true;
            }
          }
        });

        modalInstance.result.then(function (response) {
          //console.debug('UPDATE TASK:', response);

          // check for task deletion
          if (response === 'DELETED') {
            $location.url('home');
          } else {
            // broadcast reload task event
            // NOTE:  Not necessary to broadcast as of 12/11, but in place in
            // case further task revision scenarios require app-wide reload
            // NOTE:  Also triggers up-to-date task reload here
            $rootScope.$broadcast('reloadTask');
          }
        }, function () {
        });
      };

      $scope.pollStatus = function() {
            snowowlService.getBranch($scope.branch).then(function (response) {

            if(response.metadata && response.metadata.lock)
            {
                $rootScope.branchLocked = true;
                $timeout($scope.pollStatus, 4000);
            }
            else{

                $rootScope.branchLocked = false;
            }
          });

        };


      //
      // Project polling for lock status updates
      // TODO Inquire as to whether notifications can serve this purpose? Seems like locking would be a branch state notification
      // TODO Update: Changing project metadata does not trigger a notification
      //
//      var projectPoll = null;
  //      function pollProjectStatus() {
//        snowowlService.getBranch('MAIN' + '/' + $routeParams.projectKey).then(function (response) {
//
//          $scope.projectBranch = response;
//
//          // if a timeout already scheduled, cancel it
//          if (projectPoll) {
//            $timeout.cancel(projectPoll);
//          }
//          projectPoll = $timeout(pollProjectStatus, 4000);
//        });
//      };

      function initialize() {

        //console.debug('task detail initialization, lock = ' + $rootScope.branchLocked);

        // clear the branch variables (but not the task to avoid display re-initialization)
        $scope.taskBranch = null;

        // retrieve the task
        scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          $scope.task = response;
          // get role for task
          accountService.getRoleForTask($scope.task).then(function (role) {
            $scope.role = role;
          });
        snowowlService.getBranch($scope.branch).then(function (response) {
            if(response.metadata && !response.metadata.lock)
            {
                $rootScope.branchLocked = true;
                $scope.pollStatus();
            }
            else if(response.status === 404)
            {
                notificationService.sendWarning('Task initializing');
                snowowlService.createBranch(metadataService.getBranchRoot() + '/' + $routeParams.projectKey, $routeParams.taskKey).then(function (response) {
                    notificationService.sendWarning('Task initialization complete', 3000);
                    $rootScope.$broadcast('reloadTaxonomy');
              });
            }
            else{
                $scope.pollStatus();
            }
          });

          console.debug('task detail task retrieved', $scope.task);

          // set button flags
          if ($scope.task && $scope.task.latestClassificationJson) {
            $rootScope.classificationRunning = $scope.task.latestClassificationJson && $scope.task.latestClassificationJson.status === 'RUNNING' || $scope.task.latestClassificationJson.status === 'BUILDING';
          }
          if ($scope.task) {
            $rootScope.validationRunning = $scope.task.latestValidationStatus === 'SCHEDULED' || $scope.task.latestValidationStatus === 'RUNNING' || $scope.task.latestValidationStatus === 'BUILDING';
          }
          if ($scope.task.branchState === 'DIVERGED') {
            $rootScope.$broadcast('branchDiverged');
          }

        });

        // retrieve the task branch
        snowowlService.getBranch($scope.branch).then(function (response) {
          console.log('Task branch', $rootScope.branchLocked ? 'Locked' : 'Unlocked', response);

          // store the latest task branch
          $scope.taskBranch = response;

          if ($scope.taskBranch.status === 404) {
            notificationService.sendWarning('Task initializing');
            snowowlService.createBranch(metadataService.getBranchRoot() + '/' + $routeParams.projectKey, $routeParams.taskKey).then(function () {
              notificationService.sendWarning('Task initialization complete', 3000);
              $rootScope.$broadcast('reloadTaxonomy');
            });
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
        //console.debug('taskDetail received conceptModified broadcast', $scope.task, data);
        if ($scope.task.status === 'Review Completed') {
          //console.debug('updating task');
          scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, {'status': 'IN_PROGRESS'}).then(function (response) {
            $scope.task = response;
          });
        }
      });

      initialize();

    }

  ])
;
