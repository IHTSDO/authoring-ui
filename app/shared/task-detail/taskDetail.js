'use strict';
angular.module('singleConceptAuthoringApp.taskDetail', [])

  .controller('taskDetailCtrl', ['$rootScope', '$scope', '$routeParams', '$location', '$timeout', '$modal', 'metadataService', 'accountService', 'scaService', 'snowowlService', 'promotionService', 'crsService', 'notificationService', '$q',
    function taskDetailCtrl($rootScope, $scope, $routeParams, $location, $timeout, $modal, metadataService, accountService, scaService, snowowlService, promotionService, crsService, notificationService, $q, reviewService) {

      $scope.task = null;
      $scope.branch = metadataService.getBranch();
      $rootScope.branchLocked = false;

      // the project and task branch objects
      $scope.projectBranch = null;
      $scope.taskBranch = null;

      // set the parent concept for initial taxonomy load (null -> SNOMEDCT
      // root)
      $scope.taxonomyConcept = null;

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

          $rootScope.$broadcast('reloadTask');


        }, function () {
          // do nothing on error
        });
      };


      $scope.promote = function () {

        notificationService.sendMessage('Preparing for task promotion...');

        promotionService.checkPrerequisitesForTask($routeParams.projectKey, $routeParams.taskKey).then(function (flags) {

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

            promotionService.promoteTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
              $rootScope.$broadcast('reloadTask');
            }, function (error) {
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

                promotionService.promoteTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
                  $rootScope.$broadcast('reloadTask');
                }, function (error) {
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
          $rootScope.$broadcast('reloadTask');
          notificationService.sendMessage('Task successfully submitted for validation', 5000, null);
        }, function () {
          notificationService.sendMessage('Error submitting task for validation', 10000, null);
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

      $scope.checkForLock = function () {

        snowowlService.getBranch($scope.branch).then(function (response) {

          // if lock found, set rootscope variable and continue polling
          if (response.metadata && response.metadata.lock) {
            $rootScope.branchLocked = true;
            $timeout(function () {
              $scope.checkForLock()
            }, 10000);
          }
          else {
            $rootScope.branchLocked = false;
          }
        });

      };

      //
      // Issue Links
      //

      $scope.issueLinkFilter = function (issue) {

        // only return issues on the allowed projects (currently only CRT)
        // NOTE: Used project key as more stable than project name (SCT Content Request Ticket)
        // TODO Consider moving this to config file
        return issue && issue.outwardIssue && issue.outwardIssue.key && issue.outwardIssue.key.startsWith('CRT');
      };

      $scope.gotoLinkedIssue = function (issue) {
        // TODO Make this configurable?
        var issueKey = issue.outwardIssue.key;
        var rootUrl = /^(https:\/\/[^\/]*).*$/.exec(issue.outwardIssue.self);

        window.open(rootUrl[1] + '/browse/' + issueKey, issueKey);
      };

      function initialize() {

        // clear the branch variables (but not the task to avoid display re-initialization)
        $scope.taskBranch = null;

        $scope.checkForLock();

        // retrieve the task
        scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          $scope.task = response;

          snowowlService.getTraceabilityForBranch($scope.task.branchPath).then(function (traceability) {
          });

          // get role for task
          accountService.getRoleForTask($scope.task).then(function (role) {
            $scope.role = role;
          });

          if ($scope.task.branchState === 'DIVERGED') {
            $rootScope.$broadcast('branchDiverged');
          }

          if ($scope.task.labels && $scope.task.labels.indexOf('CRS') !== -1) {
            $scope.isCrsTask = true;
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
        if ($scope.task.status === 'Review Completed') {
          scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, {'status': 'IN_PROGRESS'}).then(function (response) {
            $scope.task = response;

          });
        }
      });

      initialize();


    }

  ])
;
