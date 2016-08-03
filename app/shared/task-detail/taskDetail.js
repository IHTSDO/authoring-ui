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
          $rootScope.$broadcast('reloadTask');
          notificationService.sendMessage('Task successfully submitted for validation', 5000, null);
        }, function () {
          notificationService.sendMessage('Error submitting task for validation', 10000, null);
          $rootScope.$broadcast('reloadTask');
        });
      };
      $scope.submitForReview = function () {
        notificationService.sendMessage('Submitting task for review...');


        // check if unsaved content exists
        scaService.getModifiedConceptIdsForTask($routeParams.projectKey, $routeParams.taskKey).then(function (conceptIds) {

          // if no unsaved changes, proceed
          if (conceptIds && conceptIds.length === 0) {

            // create the request body
            var updateObj = {
              'reviewer': {
                'username': ''
              },
              'status': 'IN_REVIEW'
            };

            // update the task
            scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, updateObj).then(function (response) {
              notificationService.sendMessage('Task submitted for review', 5000);
              scaService.saveUiStateForReviewTask($routeParams.projectKey, $routeParams.taskKey, 'reviewed-list', []);
              $rootScope.$broadcast('reloadTask');
              $scope.reviewClicked = true;
              $scope.task = response;
            }, function (error) {
              notificationService.sendError('Error submitting task for review');
            });

          }

          // if unsaved changes
          else {
            // if bad result, throw user error
            if (!conceptIds) {
              notificationService.sendError('Unexpected error checking for unsaved changes');
            }

            // otherwise get the unsaved content for display
            else {
              notificationService.sendWarning('Save your changes before submitting for review');
              $scope.unsavedConcepts = [];
              angular.forEach(conceptIds, function (conceptId) {
                scaService.getModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, conceptId).then(function (concept) {

                  // find the FSN for display
                  if (!concept.fsn) {
                    angular.forEach(concept.descriptions, function (d) {
                      if (d.type === 'FSN') {
                        concept.fsn = d.term;
                      }
                    })
                  }
                  if (!concept.fsn) {
                    concept.fsn = 'Could not determine FSN';
                  }

                  $scope.unsavedConcepts.push(concept);
                });
              });
            }
          }

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

        console.debug('checking lock status');
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

      $scope.gotoLinkedIssue = function (issue) {
        // TODO Make this configurable?
        var issueKey = issue.outwardIssue.key;
        var rootUrl = /^(https:\/\/[^\/]*).*$/.exec(issue.outwardIssue.self);

        console.debug(issueKey, rootUrl[1]);
        window.open(rootUrl[1] + '/browse/' + issueKey, issueKey);
      };

      function initialize() {

        console.debug('task detail initialization, lock = ' + $rootScope.branchLocked);

        // clear the branch variables (but not the task to avoid display re-initialization)
        $scope.taskBranch = null;

        $scope.checkForLock();

        // retrieve the task
        scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          $scope.task = response;
          // get role for task
          accountService.getRoleForTask($scope.task).then(function (role) {
            $scope.role = role;
          });

          if ($scope.task.branchState === 'DIVERGED') {
            $rootScope.$broadcast('branchDiverged');
          }
        });
      }

      $scope.$on('reloadTask', function (event, data) {
        console.debug('task detail detected reloadTask event', event, data);
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
