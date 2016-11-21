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


      //
      // Helper function to mark the task for review
      //
      function markTaskForReview() {
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
          $scope.task = response;
        }, function (error) {
          notificationService.sendError('Error submitting task for review');
        });
      }

      $scope.unsavedConcepts = null;
      $scope.submitForReview = function () {
        notificationService.sendMessage('Submitting task for review...');

        // if unsaved concepts already calculated, clear and "submit anyway"
        if ($scope.unsavedConcepts) {
          $scope.unsavedConcepts = null;
          markTaskForReview();
        } else {

          // first, check if traceability returns changes on this task
          snowowlService.getTraceabilityForBranch($scope.task.branchPath).then(function (traceability) {

            if (!traceability || !traceability.numberOfElements || traceability.numberOfElements === 0) {
              notificationService.sendWarning('No changes detected on task; are you sure you want to submit for review?');

              // empty array for unsaved concepts to bypass null check
              $scope.unsavedConcepts = [];

              return;
            }

            // retrieve the modified concepts for this task
            scaService.getModifiedConceptIdsForTask($routeParams.projectKey, $routeParams.taskKey).then(function (conceptIds) {

              // if no modified concepts stored, submit directly
              if ((conceptIds && conceptIds.length === 0) || $scope.unsavedConcepts) {

                // clear array of unsaved content
                $scope.unsavedConcepts = null;
                markTaskForReview();

              }

              // otherwise, prepare the unsaved concepts array
              else {

                // initialize the unsaved concept array
                var unsavedConcepts = [];


                // if bad result, throw user error
                if (!conceptIds) {
                  notificationService.sendError('Unexpected error checking for unsaved changes');
                }

                // otherwise get the unsaved content for display
                else {

                  var conceptCt = 0;

                  angular.forEach(conceptIds, function (conceptId) {
                    console.debug('checking ', conceptId);
                    if (snowowlService.isSctid(conceptId)) {
                      console.debug('  is sctid');
                      scaService.getModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, conceptId).then(function (concept) {

                        // Account for case where new concepts are marked 'current' in UI State
                        if (concept) {

                          if (!concept.conceptId) {
                            concept.conceptId = '(New concept)';
                          }
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
                          unsavedConcepts.push(concept);
                        }
                        // if no concepts survive processing, proceed with submission
                        if (++conceptCt === conceptIds.length) {
                          if (unsavedConcepts.length === 0) {
                            markTaskForReview();
                          } else {
                            $scope.unsavedConcepts = unsavedConcepts;
                            notificationService.sendWarning('Save your changes before submitting for review');

                          }
                        }

                      }, function (error) {
                        notificationService.sendError('Application error: reporting unsaved content for concept ' + conceptId);
                      });
                    } else {
                      // if no concepts survive processing, proceed with submission
                      if (++conceptCt === conceptIds.length) {
                        if (unsavedConcepts.length === 0) {
                          markTaskForReview();
                        } else {
                          $scope.unsavedConcepts = unsavedConcepts;
                          notificationService.sendWarning('Save your changes before submitting for review');

                        }
                      }
                    }
                  });
                }
              }
            });

          }, function (error) {

            // TODO This will fire on actual errors as well as 404s, but other areas of the application rely on the reject()
            notificationService.sendWarning('No changes detected on task; are you sure you want to submit for review?');

            // empty array for unsaved concepts to bypass null check
            $scope.unsavedConcepts = [];


          })
        }
      };

      // cancel review
      $scope.cancelReview = function () {
        scaService.markTaskInProgress($routeParams.projectKey, $routeParams.taskKey).then(function() {
          notificationService.sendMessage('Review cancelled', 2000);
          $rootScope.$broadcast('reloadTask');
        }, function(error) {
          notificationService.sendError('Unexpected error cancelling review: ' + error);
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
          if($scope.classificationLockCheck){
            $timeout(function () {
              $scope.checkForLock()
            }, 10000);
           }
          // if lock found, set rootscope variable and continue polling
          if (response.metadata && response.metadata.lock) {
            if(response.metadata.lock.context.description === 'classifying the ontology')
                {
                    $scope.ontologyLock = true;
                }
            $rootScope.branchLocked = true;
            $timeout(function () {
              $scope.checkForLock()
            }, 10000);
           }
          else if($scope.classificationLockCheck && !$scope.ontologyLock){
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

        // retrieve the task
        scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          $scope.task = response;
          $scope.classificationLockCheck = false;
          $scope.ontologyLock = $rootScope.classificationRunning;
          $scope.checkForLock();

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
