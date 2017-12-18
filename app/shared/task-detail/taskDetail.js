'use strict';
angular.module('singleConceptAuthoringApp.taskDetail', [])

  .controller('taskDetailCtrl', ['$rootScope', '$scope', '$routeParams', '$location', '$timeout', '$modal', 'metadataService', 'accountService', 'scaService', 'snowowlService', 'promotionService', 'crsService', 'notificationService', '$q', 'reviewService',
    function taskDetailCtrl($rootScope, $scope, $routeParams, $location, $timeout, $modal, metadataService, accountService, scaService, snowowlService, promotionService, crsService, notificationService, $q, reviewService) {

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
              $rootScope.$broadcast('reloadTask');
            }, function (error) {
              $scope.promoting = false;
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
                  $scope.promoting = false;
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
        notificationService.sendMessage('Starting automated promotion...');       
        $scope.automatePromotionErrorMsg = '';        
        $scope.automatePromotionStatus = '';
        promotionService.proceedAutomatePromotion($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
            $scope.checkAutomatePromotionStatus(false);
          }, function (error) {
            $scope.automatePromotionStatus = '';
          }
        );
      };
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
                reviewService.cancelReview($scope.task).then(function () {
                  notificationService.sendMessage('Review cancelled', 3000);
                }, function (error) {
                  notificationService.sendError('Error cancelling review: ' + error);
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
          if($scope.classificationLockCheck){
            $timeout(function () {
              $scope.checkForLock();
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
              $scope.checkForLock();
            }, 10000);
           }
          else if($scope.classificationLockCheck && !$scope.ontologyLock){
            $timeout(function () {
              $scope.checkForLock();
            }, 10000);
           }
          else {
            $rootScope.branchLocked = false;
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
          if (response) {
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
                $rootScope.branchLocked = false;
                $rootScope.automatedPromotionInQueued = false;                              
                $scope.automatePromotionErrorMsg = 'Merge conflicts detected during automated promotion. Please rebase task manually, resolve merge conflicts and then restart automation.';
                break;
              case 'Classifying':                
                $rootScope.branchLocked = true;
                $rootScope.automatedPromotionInQueued = false;                
                $rootScope.classificationRunning = true;
                notificationService.clear();
                break;
              case 'Classified with results':                
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
                if (!isInitialInvoke) {  
                  $rootScope.$broadcast('reloadTask');
                  $timeout(function () {
                     notificationService.sendMessage('Automated promotion completed');
                  }, 1000); 
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
