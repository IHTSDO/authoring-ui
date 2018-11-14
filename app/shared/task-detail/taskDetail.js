'use strict';
angular.module('singleConceptAuthoringApp.taskDetail', [])

  .controller('taskDetailCtrl', ['$rootScope', '$scope', '$routeParams', '$location', '$timeout', '$modal', 'metadataService', 'accountService', 'scaService', 'snowowlService', 'promotionService', 'crsService', 'notificationService', '$q', 'reviewService','modalService',
    function taskDetailCtrl($rootScope, $scope, $routeParams, $location, $timeout, $modal, metadataService, accountService, scaService, snowowlService, promotionService, crsService, notificationService, $q, reviewService, modalService) {

      $scope.task = null;
      $scope.branch = metadataService.getBranch();
      $rootScope.branchLocked = false;

      // the project and task branch objects
      $scope.projectBranch = null;
      $scope.taskBranch = null;
      $scope.promoting = false;
      $scope.automatePromotionStatus = "";
      $scope.automatePromotionErrorMsg = "";

      // set the parent concept for initial taxonomy load (null -> SNOMEDCT
      // root)
      $scope.taxonomyConcept = null;

      $scope.classify = function () {

        notificationService.sendMessage('Starting classification for task ' + $routeParams.taskKey, 5000);

        if ($scope.task.status === 'New') {
          scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, {'status': 'IN_PROGRESS'}).then(function (response) {
            doClassify();
          });
        } else {
          doClassify();
        }
      };

      function doClassify() {
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
      }

      $scope.promote = function () {
        $scope.promoting = true;
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
              if (response.status === 'CONFLICTS') {
                var merge = JSON.parse(response.message);
                snowowlService.searchMerge(merge.source, merge.target, 'CONFLICTS').then( function(response) {
                  if (response && response.items && response.items.length > 0) {
                    var msg = '';
                    var conflictCount = 0;
                    angular.forEach(response.items, function (item) {
                      if (item.id == merge.id) {
                        angular.forEach(item.conflicts, function (conflict) {
                          if (msg.length > 0) {
                            msg = msg + ' \n';
                          }
                          msg += conflict.message;
                          conflictCount++;
                        });
                      }                        
                    });
                    if (msg.length > 0) {
                      notificationService.sendError('Confilcts : ' + (conflictCount > 1 ?  ' \n' : '') + msg);
                    }
                  }
                });
              } else {
                $rootScope.$broadcast('reloadTask');
              }
            }, function (error) {
              $scope.promoting = false;
              notificationService.sendError('Error promoting task to project: ' + error);
            });
          } else {

            // clear the preparation notification
            notificationService.clear();
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
                  if (response.status === 'CONFLICTS') {
                    var merge = JSON.parse(response.message);
                    snowowlService.searchMerge(merge.source, merge.target, 'CONFLICTS').then( function(response) {
                      if (response && response.items && response.items.length > 0) {
                        var msg = '';
                        var conflictCount = 0;
                        angular.forEach(response.items, function (item) {
                          if (item.id == merge.id) {
                            angular.forEach(item.conflicts, function (conflict) {
                              if (msg.length > 0) {
                                msg = msg + ' \n';
                              }
                              msg += conflict.message;
                              conflictCount++;
                            });
                          }                        
                        });
                        if (msg.length > 0) {
                          notificationService.sendError('Confilcts : ' + (conflictCount > 1 ?  ' \n' : '') + msg);
                        }
                      }
                    });
                  } else {
                    $rootScope.$broadcast('reloadTask');
                  }
                }, function (error) {
                  $scope.promoting = false;
                   notificationService.sendError('Error promoting task to project: ' + error);
                });
              } else {
                notificationService.clear();
                $scope.promoting = false;
              }
            }, function () {
              notificationService.clear();
              $scope.promoting = false;
            });
          }
        }, function (error) {
          notificationService.sendError('Unexpected error preparing for promotion: ' + error);
          $scope.promoting = false;
        });
      };
      $scope.proceedAutomatePromotion = function () {
        notificationService.sendMessage('Preparing for task promotion automation...');
        $scope.automatePromotionErrorMsg = '';
        $scope.automatePromotionStatus = '';

        /* Check unsaved concepts*/
        scaService.getUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'edit-panel')
          .then(function (uiState) {
            if (!uiState || Object.getOwnPropertyNames(uiState).length === 0) {
              validateReviewStatus();
            }
            else {
              var promises = [];
              for (var i = 0; i < uiState.length; i++) {
                promises.push(scaService.getModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, uiState[i]));
              }
              // on resolution of all promises
              $q.all(promises).then(function (responses) {
                var hasUnsavedConcept = responses.filter(function(concept){return concept !== null}).length > 0;
                if (hasUnsavedConcept) {
                  notificationService.clear();
                  modalService.message('There are some unsaved concepts. Please save them before promoting task automation.');
                } else {
                  validateReviewStatus();
                }
              });
            }
          }
        );
      };

      function validateReviewStatus() {
        var flags = [];
        /* Check review */
        scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (branchStatus) {
          ////////////////////////////////////////////////////////////
          // CHECK:  Has the Task been reviewed?
          ////////////////////////////////////////////////////////////
          if (branchStatus.status !== 'In Review' && branchStatus.status !== 'Review Completed') {
            flags.push({
              checkTitle: 'No review completed',
              checkWarning: 'No review has been completed on this task, are you sure you would like to promote?',
              blocksPromotion: false
            });
          }

          ////////////////////////////////////////////////////////////
          // CHECK:  Is the task still in Review?
          ////////////////////////////////////////////////////////////
          if (branchStatus.status === 'In Review') {
            flags.push({
              checkTitle: 'Task is still in review',
              checkWarning: 'The task review has not been marked as complete.',
              blocksPromotion: false
            });
          }

          if (flags.length === 0) {
            promoteTaskAutomation();
          } else {
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
            notificationService.clear();
            modalInstance.result.then(function (proceed) {
              if (proceed) {
                promoteTaskAutomation();
              } else {
                notificationService.clear();
              }
            }, function () {
              notificationService.clear();
            });
          }

        });
      }

      function promoteTaskAutomation() {
        notificationService.sendMessage('Starting automated promotion...');
        promotionService.proceedAutomatePromotion($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
            $scope.checkAutomatePromotionStatus(false);
          }, function (error) {
            $scope.automatePromotionStatus = '';
          }
        );
      }

      $scope.startValidation = function () {
        notificationService.sendMessage('Submitting task for validation...');

        if ($scope.task.status === 'New') {
          scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, {'status': 'IN_PROGRESS'}).then(function (response) {
            doValidate();
          });
        } else {
          doValidate();
        }
      };

      function doValidate() {
        // NOTE: Validation does not lock task

        scaService.startValidationForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          $rootScope.$broadcast('reloadTask');
          notificationService.sendMessage('Task successfully submitted for validation', 3000, null);
        }, function (error) {
          notificationService.sendError('Error submitting task for validation: ' + error);
          $rootScope.$broadcast('reloadTask');
        });
      }

      // list of tracked unsaved concepts
      $scope.reviewChecks = null;

      $scope.cancelSubmitForReview = function () {
        $scope.reviewChecks = null;
      };

      function openReviewChecksModal(reviewChecks) {

        // check if unsaved concepts are already in edit panel
        angular.forEach(reviewChecks.unsavedConcepts, function (uc) {
          angular.forEach($scope.editList, function (ec) {
            if (ec === uc.conceptId) {
              uc.editing = true;
            }
          });
        });

        var deferred = $q.defer();
        var modalInstance = $modal.open({
          templateUrl: 'shared/review-check-modal/reviewCheckModal.html',
          controller: 'reviewCheckModalCtrl',
          resolve: {
            reviewChecks: reviewChecks
          }
        });

        modalInstance.result.then(function (results) {
          deferred.resolve(results);
        }, function () {
          deferred.reject();
        });
        return deferred.promise;

      }

      $scope.toggleReview = function (ignoreWarnings) {
        $scope.reviewChecks = null;
        switch ($scope.task.status) {
          case 'New':
          case 'In Progress':

            notificationService.sendMessage('Submit for review requested: checking content changes...');

            reviewService.checkReviewPrerequisites($scope.task).then(function (reviewChecks) {

              if (reviewChecks.hasChangedContent && reviewChecks.unsavedConcepts && reviewChecks.unsavedConcepts.length === 0) {
                reviewService.submitForReview($scope.task).then(function () {
                  notificationService.sendMessage('Submitted for review', 3000);
                }, function (error) {
                  notificationService.sendError('Error submitting for review: ' + error);
                });
              } else {
                openReviewChecksModal(reviewChecks).then(function () {
                  reviewService.submitForReview($scope.task).then(function () {
                    notificationService.sendMessage('Submitted for review', 3000);
                  }, function (error) {
                    notificationService.sendError('Error submitting for review: ' + error);
                  });
                }, function () {
                  notificationService.sendMessage('Cancelled submit for review', 3000);
                });
              }
            }, function (error) {
              notificationService.sendWarning('Task submitted for review, but could not verify content changes: ' + error);
            });


            break;
          case 'In Review':
          case 'Review Complete':
            accountService.getRoleForTask($scope.task).then(function (role) {
              if (role === 'AUTHOR') {
                scaService.getUiStateForReviewTask($routeParams.projectKey, $routeParams.taskKey, 'reviewed-list').then(function (response) {
                  var reviewedListIds = response;
                  if (reviewedListIds && reviewedListIds.length > 0) {
                    modalService.confirm('There are ' + reviewedListIds.length + ' approved concepts in the review. Cancelling will reset all concepts to unapproved and will require all concepts to be (re-)approved in a new review. To keep the approved work, please ask the reviewer to unclaim the review. Are you sure you want to cancel this review?').then(function () {
                      reviewService.cancelReview($scope.task).then(function () {
                        notificationService.sendMessage('Review Cancelled', 2000);
                      });
                    }, function () {
                      // do nothing
                    });
                  } else {
                    reviewService.cancelReview($scope.task).then(function () {
                      notificationService.sendMessage('Review Cancelled', 2000);
                    });
                  }
                });
              } else {
                reviewService.unclaimReview($scope.task).then(function () {
                  $location.url('review-tasks');
                  notificationService.sendMessage('Review unclaimed', 3000);
                }, function (error) {
                  notificationService.sendError('Error unclaiming review: ' + error);
                });
              }
            });
            break;
          default:
            notificationService.sendError('Unexpected task status: ' + $scope.task.status);
        }
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
            if(response.metadata.lock.context.description === 'classifying the ontology')
                {
                    $scope.ontologyLock = true;
                }
            $rootScope.branchLocked = true;
            $timeout(function () {
              $scope.checkForLock();
            }, 10000);
           }
          else {
            snowowlService.getClassificationsForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
              if (response && response.length > 0) {
                var item = response[response.length -1];
                if (item.status === 'SCHEDULED' || item.status === 'RUNNING') {
                  $rootScope.branchLocked = true;
                  $timeout(function () {
                    $scope.checkForLock();
                  }, 10000);
                } else {
                  $rootScope.branchLocked = false;
                }
              } else {
                $rootScope.branchLocked = false;
              }
            });

          }
        });

      };

      $scope.isAutomatePromotionRunning = function (){
        if($scope.automatePromotionStatus === 'Rebasing'
          || $scope.automatePromotionStatus === 'Classifying'
          || $scope.automatePromotionStatus === 'Promoting') {
          return true;
        }
        return false;
      }

      $scope.checkAutomatePromotionStatus = function (isInitialInvoke) {
        $scope.automatePromotionErrorMsg = '';
        promotionService.getAutomatePromotionStatus($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          if (response && $scope.task.status !== 'Promoted') {
            $scope.automatePromotionStatus = response.status;
            switch ($scope.automatePromotionStatus) {
              case 'Queued':
                $rootScope.automatedPromotionInQueued = true;
                $rootScope.branchLocked = false;
                notificationService.clear();
                break;
              case 'Rebasing':
                $rootScope.branchLocked = true;
                $rootScope.automatedPromotionInQueued = false;
                notificationService.clear();
                break;
              case 'Rebased with conflicts':
                scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
                  $scope.task = response;
                  if ($scope.task.branchState !== 'FORWARD'
                    && $scope.task.branchState !== 'UP_TO_DATE') {
                    $rootScope.branchLocked = false;
                $rootScope.automatedPromotionInQueued = false;
                $scope.automatePromotionErrorMsg = 'Merge conflicts detected during automated promotion. Please rebase task manually, resolve merge conflicts and then restart automation.';
                  }
                });
                break;
              case 'Classifying':
                $rootScope.branchLocked = true;
                $rootScope.automatedPromotionInQueued = false;
                $rootScope.classificationRunning = true;
                notificationService.clear();
                break;
              case 'Classified with results':
                if ($scope.task.latestClassificationJson.status === 'SAVED'
                    || $scope.task.latestClassificationJson.status === 'RUNNING'
                    || new Date($scope.task.latestClassificationJson.completionDate) > new Date(response.completeDate)) {
                   $scope.automatePromotionStatus = '';
                  break;
                }
                $rootScope.classificationRunning = false;
                $rootScope.branchLocked = false;
                $rootScope.automatedPromotionInQueued = false;
                if(!isInitialInvoke) {
                  $rootScope.$broadcast('reloadTask');
                }
                $timeout(function () {
                  $scope.automatePromotionErrorMsg = 'Classification results detected during automated promotion. Please review and accept classification results, then restart automation.';
                }, 2000);
                break;
              case 'Promoting':
                $rootScope.classificationRunning = false;
                $rootScope.branchLocked = true;
                $rootScope.automatedPromotionInQueued = false;
                notificationService.clear();
                break;
              case 'Completed':
                $rootScope.classificationRunning = false;
                $rootScope.automatedPromotionInQueued = false;
                $rootScope.branchLocked = true;
                if (!isInitialInvoke) {
                  $rootScope.$broadcast('reloadTask');
                }
                break;
              case 'Failed':
                $rootScope.automatedPromotionInQueued = false;
                $rootScope.classificationRunning = false;
                $rootScope.branchLocked = false;
                if (!isInitialInvoke) {
                  $scope.automatePromotionErrorMsg =  'Error automate promotion: ' + response.message;
                  notificationService.clear();
                }
                break;
              default:
                $rootScope.automatedPromotionInQueued = false;
                $rootScope.classificationRunning = false;
                $rootScope.branchLocked = false;
            }
            if ($scope.automatePromotionStatus === 'Queued'
                || response.status === 'Rebasing'
                || response.status === 'Classifying'
                || response.status === 'Promoting') {
              $timeout(function () {
                $scope.checkAutomatePromotionStatus(false);
              }, 10000);
            }
          } else {
            $scope.automatePromotionStatus = '';
          }
          if(isInitialInvoke && $scope.automatePromotionStatus === '') {
            $scope.checkForLock();
          }
        });
      };

      $scope.viewConflicts = function () {
        snowowlService.getBranch(metadataService.getBranchRoot() + '/' + $routeParams.projectKey).then(function (response) {
          if (!response.metadata || response.metadata && !response.metadata.lock) {
            $location.url('tasks/task/' + $routeParams.projectKey + '/' + $routeParams.taskKey + '/conflicts');
          }
          else {
            notificationService.sendWarning('Unable to start rebase on task ' + $routeParams.taskKey + ' as the project branch is locked due to ongoing changes.', 7000);
          }
        });
      };

      $scope.viewClassification = function () {
        $rootScope.$broadcast('viewClassification');
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
          $scope.ontologyLock = $rootScope.classificationRunning;
          if ($scope.task.status !== 'Promoted') {
            $scope.checkAutomatePromotionStatus(true);
          } else {
            $rootScope.branchLocked = true;
          }

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
