'use strict';
angular.module('singleConceptAuthoringApp.taskDetail', [])

  .controller('taskDetailCtrl', ['$rootScope', '$scope', '$routeParams', '$route', '$location', '$timeout', '$modal', 'metadataService', 'accountService', 'scaService', 'terminologyServerService', 'aagService', 'promotionService', 'crsService', 'notificationService', '$q', 'reviewService', 'rnmService', 'permissionService', 'modalService',
    function taskDetailCtrl($rootScope, $scope, $routeParams, $route, $location, $timeout, $modal, metadataService, accountService, scaService, terminologyServerService, aagService, promotionService, crsService, notificationService, $q, reviewService, rnmService, permissionService, modalService) {

      $scope.task = null;
      $scope.branch = metadataService.getBranch();
      $rootScope.branchLocked = false;
      $scope.crsConcepts = [];

      // the project and task branch objects
      $scope.projectBranch = null;
      $scope.promoting = false;
      $scope.automatePromotionStatus = "";
      $scope.automatePromotionErrorMsg = "";    
      $scope.hasRequestPendingClarification = crsService.hasRequestPendingClarification;
      $scope.isTaskPromotionDisabled = metadataService.isTaskPromotionDisabled;
      $scope.sac = [];
      $scope.userRoles = [];
      $scope.complex = false;
      $scope.batch = false;
      $scope.sacSet = false;
      $scope.lineItems = [];
      $scope.globalLineItems = [];
      $scope.releaseNotesDisabled = true;
      $scope.releaseNotesCollapsed = false;

      // set the parent concept for initial taxonomy load (null -> SNOMEDCT
      // root)
      $scope.taxonomyConcept = null;
        
      $scope.sacSignedOff = function () {
          let value = true;
          angular.forEach($scope.sac, function (criteria) {                      
              if (criteria.complete === false) {
                value = false;                       
              }
            });
          return value;
      }
      
      $scope.markBranchAsComplex = function () {
        scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          $scope.task = response;
          terminologyServerService.markBranchAsComplex($scope.branch, !$scope.complex).then(function (response) {
            var branchMetadata = metadataService.getBranchMetadata();
            if (!response.metadata) {
              delete branchMetadata.metadata;
            } else {
              branchMetadata.metadata = response.metadata;
            }
            metadataService.setBranchMetadata(branchMetadata);
            $scope.complex = metadataService.isComplex();
            aagService.getBranchSAC($scope.branch).then(function (sac) {
                $scope.sac = [];
                if (sac && sac.criteriaItems) {
                  angular.forEach(sac.criteriaItems, function (criteria) {
                    if (criteria.authoringLevel === "TASK") {
                      if ($scope.complex && criteria.id.includes('task-review-changes') && $scope.task.status === 'Review Completed' && !criteria.complete) {
                        aagService.acceptBranchSAC($scope.branch, criteria.id).then(function() {
                          criteria.complete = true;
                          $scope.sac.push(criteria);
                        }, function() {
                          $scope.sac.push(criteria);
                        });                                                 
                      } else {
                        $scope.sac.push(criteria);
                      }                                          
                    }
                  }); 
                }                
              });
          });          
        });
      }
      
      rnmService.getBranchLineItems($scope.branch).then(function (lineItems) {
          if (lineItems) {
            angular.forEach(lineItems, function (item) {
                $scope.lineItems.push(item);
            });
            if($scope.lineItems.length === 1){
                $scope.lineItem = $scope.lineItems[0];
            }
          }
      });
        
      rnmService.getBranchLineItems('MAIN').then(function (lineItems) {
          if (lineItems) {
            angular.forEach(lineItems, function (item) {
                $scope.globalLineItems.push(item);
            });
          }
      });
        
      $scope.openLineItemModal = function (id) {
          let item = {};
          let items = [];
          let globalItems = [];
          let readOnly = false;
          if(!$scope.userRoles.includes('AUTHOR') || $scope.role !== 'AUTHOR') {
             readOnly = true;
          }
          angular.forEach($scope.lineItems, function (lineItem) {
            if (lineItem.id === id) {
              item = lineItem;
            }
          });
          angular.forEach($scope.globalLineItems, function (lineItem) {
            if(lineItem.title === "Content Development Activity"){
                angular.forEach(lineItem.children, function (child) {
                  if ($scope.lineItems.filter(function(item) {return item.title === child.title}).length == 0) {
                    globalItems.push(child);
                  }                    
                });
            }
          });
          var modalInstance = $modal.open({
            templateUrl: 'shared/releaseNotes/lineItem.html',
            controller: 'lineItemCtrl',
            backdrop: readOnly ? '' : 'static',
            keyboard: readOnly ? true: false,
            resolve: {
                branch: function() {
                  return $scope.branch;
                },
                lineItem: function() {
                  return item;
                },
                lineItems: function() {
                  return items;
                },
                globalLineItems: function() {
                  return globalItems;
                },
                readOnly: function() {
                  return readOnly;
                },
                all: function() {
                  return false;
                }
              }
          });

          modalInstance.result.then(function () {
              rnmService.getBranchLineItems($scope.branch).then(function (lineItems) {
                  if (lineItems && lineItems.length > 0) {
                    $scope.lineItems = [];
                    angular.forEach(lineItems, function (item) {
                        $scope.lineItems.push(item);
                    });
                    if($scope.lineItems.length === 1){
                        $scope.lineItem = $scope.lineItems[0];
                    }
                  }
                  else{
                      $scope.lineItems = [];
                      delete $scope.lineItem;
                  }
              });
          });
      };
        
      $scope.acceptManualSac = function (id) {
          aagService.acceptBranchSAC($scope.branch, id).then(function (sac) {
              aagService.getBranchSAC($scope.branch).then(function (sac) {
                  $scope.sac = [];
                  if (sac && sac.criteriaItems) {
                    angular.forEach(sac.criteriaItems, function (criteria) {
                      if (criteria.authoringLevel === "TASK") {
                        $scope.sac.push(criteria);
                      }
                    });
                  }                  
              });
          });
      };
        
      $scope.unacceptManualSac = function (id) {
          aagService.unacceptBranchSAC($scope.branch, id).then(function (sac) {
              aagService.getBranchSAC($scope.branch).then(function (sac) {
                  $scope.sac = [];
                  if (sac && sac.criteriaItems) {
                    angular.forEach(sac.criteriaItems, function (criteria) {
                      if (criteria.authoringLevel === "TASK") {
                        $scope.sac.push(criteria);
                      }
                    });
                  }                  
              });
          });
      };

      $scope.classify = function () {

        notificationService.sendMessage('Starting classification for task ' + $routeParams.taskKey);

        if ($scope.task && $scope.task.status && $scope.task.status === 'New') {
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
        if ($scope.isTaskPromotionDisabled()) {
          return;
        }

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
            $rootScope.branchLocked = true;
            notificationService.sendMessage('Promoting task...');
            promotionService.promoteTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
              if (response.status === 'CONFLICTS') {
                var merge = JSON.parse(response.message);
                terminologyServerService.fetchConflictMessage(merge).then(function(conflictMessage) {
                  notificationService.sendError(conflictMessage);
                  $scope.branchLocked = false;
                });
              }
            }, function (error) {
              $scope.promoting = false;
              $rootScope.branchLocked = false;
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
                $rootScope.branchLocked = true;
                notificationService.sendMessage('Promoting task...');
                promotionService.promoteTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
                  if (response.status === 'CONFLICTS') {
                    var merge = JSON.parse(response.message);
                    terminologyServerService.fetchConflictMessage(merge).then(function(conflictMessage) {
                      notificationService.sendError(conflictMessage);
                      $scope.branchLocked = false;
                    });
                  }
                  if($scope.lineItems){
                      angular.forEach($scope.lineItems, function (lineItem){
                          lineItem.content = lineItem.content.slice(0, -2);
                          lineItem.content = lineItem.content + ' : ' + $rootScope.accountDetails.firstName + ' ' + $rootScope.accountDetails.lastName;
                          rnmService.updateBranchLineItem($scope.branch, lineItem).then(function (lineItem){
                              rnmService.promoteBranchLineItem($scope.branch, lineItem.id).then(function (lineItem) {
                                });
                          });
                      });
                  }
                }, function (error) {
                  $scope.promoting = false;
                  $rootScope.branchLocked = false;
                  notificationService.sendError('Error promoting task to project: ' + error);
                });
              } else {
                notificationService.clear();
                $scope.promoting = false;
                $rootScope.branchLocked = false;
              }
            }, function () {
              notificationService.clear();
              $scope.promoting = false;
              $rootScope.branchLocked = false;
            });
          }
        }, function (error) {
          notificationService.sendError('Unexpected error preparing for promotion: ' + error);
          $scope.promoting = false;
          $rootScope.branchLocked = false;
        });
      };
      
      $scope.proceedAutomatePromotion = function () {
        if ($scope.isTaskPromotionDisabled()) {
          return;
        }
        notificationService.sendMessage('Preparing for task promotion automation...');
        $scope.automatePromotionErrorMsg = '';
        $scope.automatePromotionStatus = '';       

        promotionService.checkPrerequisitesForAutomatedPromotionTask($routeParams.projectKey, $routeParams.taskKey).then(function (flags) {

          // detect whether any user warnings were detected
          var warningsFound = false;
          angular.forEach(flags, function (flag) {
            if (flag.checkWarning) {
              warningsFound = true;
            }
          });

          // if response contains no flags, simply promote
          if (!warningsFound) {
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
              setTimeout(function(){
                angular.element(document.activeElement).trigger('blur');
              });
            });            
          }
        }, function (error) {
          notificationService.sendError('Unexpected error preparing for promotion: ' + error);
          $scope.promoting = false;
        });
      };     

      function promoteTaskAutomation() {
        notificationService.sendMessage('Starting automated promotion...');
        promotionService.proceedAutomatePromotion($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
            $scope.checkForAutomatedPromotionStatus(false);
          }, function (error) {
            $scope.automatePromotionStatus = '';
          }
        );
      }

      $scope.startValidation = function () {
        if ($scope.task.status === 'Promoted' || $scope.task.status === 'Completed') {
          return;
        }

        checkPrerequisitesForValidation().then(function(message) {
          if (message) {
            modalService.confirm(message).then(function () {        
              markTaskInProgressIfAnyAndValidate();
            }, function() {
              setTimeout(function(){
                angular.element(document.activeElement).trigger('blur');
              });
            });
          } else {
            markTaskInProgressIfAnyAndValidate();
          }
        });
      };

      function markTaskInProgressIfAnyAndValidate() {
        if ($scope.task.status === 'New') {
          scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, {'status': 'IN_PROGRESS'}).then(function (response) {
            doValidate();
          });
        } else {
          doValidate();
        }
      }

      function checkPrerequisitesForValidation() {
        var deferred = $q.defer();
        scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          let msg = null;
          if (response.latestClassificationJson) {
            let latestClassificationJson = response.latestClassificationJson;
            if (latestClassificationJson.status === 'SAVED' &&  
              (new Date(response.branchHeadTimestamp)).getTime() - (new Date(latestClassificationJson.saveDate)).getTime() < 1000) {
              msg = null;
            } else if ((new Date(latestClassificationJson.creationDate)).getTime() < response.branchHeadTimestamp) {
              msg = 'There are new changes on this task since the last classification. Do you still want to start a validation?';
            } else {
              if ((latestClassificationJson.inferredRelationshipChangesFound || latestClassificationJson.equivalentConceptsFound) 
                && latestClassificationJson.status !== 'SAVED') {
                msg = 'Classification has been run, but the results have not been saved. Do you still want to start a validation?'
              }
            } 
          } else {
            msg = 'Classification has not been run. Do you still want to start a validation?';
          }

          deferred.resolve(msg);         
        });
        return deferred.promise;
      }

      function doValidate() {
        // NOTE: Validation does not lock task
        notificationService.sendMessage('Submitting task for validation...');

        scaService.startValidationForTask($routeParams.projectKey, $routeParams.taskKey, $scope.enableMRCMValidation).then(function (response) {
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
            reviewChecks: function() {
              return reviewChecks;
            }
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

              if (reviewChecks.hasChangedContent && reviewChecks.unsavedConcepts && reviewChecks.unsavedConcepts.length === 0 && reviewChecks.classificationStatuses.length === 0) {
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
            let updatedTask = response.data;
            if ($scope.task.assignee.username !== updatedTask.assignee.username) {
              $route.reload();
              return;
            }

            $scope.task.summary = updatedTask.summary;
            $scope.task.description = updatedTask.description;

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

        terminologyServerService.getBranch($scope.branch).then(function (response) {

          // if lock found, set rootscope variable and continue polling
          if (response.locked) {            
            $rootScope.branchLocked = true;
            $timeout(function () {
              // Stop checking for lock if the task key not found
              if ($routeParams.taskKey && $scope.branch.endsWith($routeParams.taskKey)) {
                $scope.checkForLock();
              }              
            }, 10000);
           }
          else {            
            $rootScope.classificationRunning = $scope.task.latestClassificationJson && ($scope.task.latestClassificationJson.status === 'RUNNING' || $scope.task.latestClassificationJson.status === 'SCHEDULED' || $scope.task.latestClassificationJson.status === 'BUILDING');            
            $rootScope.branchLocked = $rootScope.classificationRunning;
          }
          if (response.hasOwnProperty('userRoles')) {
              permissionService.setRolesForBranch($scope.branch, response.userRoles);
              $scope.userRoles = response.userRoles;
            } else {
              permissionService.setRolesForBranch($scope.branch, []);
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

      $scope.checkForAutomatedPromotionStatus = function (isInitialPageLoad) {
        $scope.automatePromotionErrorMsg = '';
        promotionService.getAutomatePromotionStatus($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          if (response && $scope.task.status !== 'Promoted' && $scope.task.status !== 'Completed') {
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
                  if ($scope.task.branchState !== 'FORWARD' && $scope.task.branchState !== 'UP_TO_DATE') {
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
              case 'Classification in progress':
                  if(!isInitialPageLoad) {
                    $rootScope.branchLocked = true;
                    $rootScope.automatedPromotionInQueued = false;
                    $rootScope.classificationRunning = true;
                    $scope.automatePromotionErrorMsg =  'Error automate promotion: Classification already in progress on this branch.';
                  }
                  notificationService.clear();
                  $scope.checkForLock();                  
                  break;
              case 'Classified with results':
              case 'Classified with equivalencies Found':
                // Manual classification is running
                if(isInitialPageLoad && $rootScope.classificationRunning) {
                  $scope.automatePromotionStatus = '';
                  break;
                }

                $rootScope.classificationRunning = false;
                $rootScope.branchLocked = false;
                $rootScope.automatedPromotionInQueued = false;

                if(!isInitialPageLoad) {
                  $rootScope.$broadcast('reloadTask');
                  break;
                }

                if ($scope.task.latestClassificationJson.status === 'SAVED' || new Date($scope.task.latestClassificationJson.completionDate) > new Date(response.completeDate)) {
                  $scope.automatePromotionStatus = '';
                } else {
                  if ($scope.automatePromotionStatus === 'Classified with results') {
                    $scope.automatePromotionErrorMsg = 'Classification results detected during automated promotion. Please review and accept classification results, then restart automation.';
                  } else {
                    $scope.automatePromotionErrorMsg = 'Classification reports equivalent concepts on this branch. You may not promote until these are resolved.';
                  }
                }
                break;
              case 'Promoting':
                $rootScope.classificationRunning = false;
                $rootScope.branchLocked = true;
                $rootScope.automatedPromotionInQueued = false;
                notificationService.clear();
                break;
              case 'Completed':
                break;
              case 'Failed':
                $rootScope.automatedPromotionInQueued = false;
                $rootScope.classificationRunning = false;
                $rootScope.branchLocked = false;
                if (!isInitialPageLoad) {
                  $scope.automatePromotionErrorMsg =  'Error automate promotion' + (typeof response.message !== 'undefined' ? ': ' + response.message : '');
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
                $scope.checkForAutomatedPromotionStatus(false);
              }, 10000);
            }
          } else {
            $scope.automatePromotionStatus = '';
          }
          if(isInitialPageLoad && $scope.automatePromotionStatus === '') {
            $scope.checkForLock();
          }
        });
      };

      $scope.viewConflicts = function () {
        terminologyServerService.getBranch(metadataService.getBranchRoot() + '/' + $routeParams.projectKey).then(function (response) {
          if (!response.locked) {
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
        
      $scope.pollForCompletion = function () {
          scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
              // Poll if still running
              if (response.summary.includes('- Running')) {
                  $timeout(function () {
                      $scope.pollForCompletion();
                    }, 10000);
              }
              else{
                $scope.task = response;
              }
          });
      }

      function filterDuplicatedCRSRequests() {
        if ($scope.crsConcepts.length !== 0) {
          $scope.crsConcepts = $scope.crsConcepts.filter((value, index, self) =>
            index === self.findIndex((t) => (
              t.crsId === value.crsId
            ))
          );
        }
      }

      function getCRSRequests() {
        scaService.getCRSRequests($routeParams.projectKey, $routeParams.taskKey).then(function(response) {
          $scope.crsConcepts = response;
          filterDuplicatedCRSRequests();          
        });
      }

      function initialize() {

        // retrieve the task
        scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          aagService.getBranchSAC(response.branchPath).then(function (sac) {
              $scope.sac = [];
              if (sac && sac.criteriaItems) {
                $scope.sacSet = true;
                angular.forEach(sac.criteriaItems, function (criteria) {
                  if (criteria.authoringLevel === "TASK") {
                    $scope.sac.push(criteria);
                  }
                });
              }
              else{
                $scope.sacSet = false;
              }
              $scope.complex = metadataService.isComplex();
              $scope.batch = metadataService.isBatch();
          });
          $scope.task = response;
          $scope.releaseNotesDisabled = metadataService.isExtensionSet();
          if($scope.task.summary.includes('- Running')){
              $scope.pollForCompletion();
          }
          if ($scope.task.status !== 'Promoted' && $scope.task.status !== 'Completed') {
            $scope.checkForAutomatedPromotionStatus(true);
          } else {
            $rootScope.branchLocked = true;
          }
          
          // get role for task
          accountService.getRoleForTask($scope.task).then(function (role) {
            $scope.role = role;
          });

          if ($scope.task.branchState === 'DIVERGED') {
            $rootScope.$broadcast('branchDiverged');
          }

          if ($scope.task.labels && $scope.task.labels.indexOf('CRS') !== -1) {
            $scope.isCrsTask = true;
            $scope.crsConcepts = crsService.getCrsConcepts();
            filterDuplicatedCRSRequests();
          } else {
            getCRSRequests();
          }
        });

        // Check MRCM validation for task
        scaService.getUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'task-mrcm-validation').then(function (response) {
          if (response !== null) {
            $scope.enableMRCMValidation = response.enableMRCMValidation;
          }
        });
      }

      $scope.$on('reloadCRSRequests', function (event, data) {
        getCRSRequests();
      });

      $scope.$on('initialiseCrsConceptsComplete', function (event, data) {
        $scope.crsConcepts = crsService.getCrsConcepts();
        filterDuplicatedCRSRequests();
      });

      $scope.$on('reloadTask', function (event, data) {
        if (!data || (data && data.project === $routeParams.projectKey && data.task === $routeParams.taskKey)) {
          initialize();
        }        
      });

      $scope.$on('promotion.completed', function (event, data) {
        if (data && data.project === $routeParams.projectKey && data.task === $routeParams.taskKey) {          
            scaService.getProjectForKey($routeParams.projectKey).then(function (response) {
                if(response.metadata && response.metadata.internal && response.metadata.internal.integrityIssue) {
                    terminologyServerService.branchUpgradeIntegrityCheck(metadataService.getBranchRoot() + '/' + $routeParams.projectKey, 'MAIN/' + metadataService.getExtensionMetadata().codeSystemShortName).then( function(response) {
                        $rootScope.$broadcast('reloadTask');
                    });
                }
                else{
                    $rootScope.$broadcast('reloadTask');
                }
            });
        }
      });

// re-initialize if branch state changes
      $scope.$on('notification.branchState', function (event, data) {
        if (data.project === $routeParams.projectKey && data.task === $routeParams.taskKey) {
          initialize();
        }        
      });

// reload SAC
    $scope.$on('reloadSAC', function (event, data) {
      if (data.task && data.task === $routeParams.taskKey && data.project === $routeParams.projectKey) {
        aagService.getBranchSAC($scope.branch).then(function (sac) {
          $scope.sac = [];
          if (sac && sac.criteriaItems) {
            angular.forEach(sac.criteriaItems, function (criteria) {
              if (criteria.authoringLevel === "TASK") {
                $scope.sac.push(criteria);                  
              }
            }); 
          }                
        });
      }      
    });

// re-initialize if concept change occurs and task is new
      $scope.$on('conceptEdit.conceptChange', function (event, data) {
        angular.forEach($scope.sac, function (criteria) {
          if (criteria.authoringLevel === "TASK" && criteria.id.includes('task-review-changes') && criteria.complete) {
            criteria.complete = false;
            aagService.unacceptBranchSAC($scope.branch, criteria.id).then(function() {
              console.log('Task review-changes has been updated to false');
            });
            return;
          }
        });
        
        initialize();
      });

      $scope.$on('conceptEdit.conceptModified', function (event, data) {
        if ($scope.task.status === 'Review Completed') {
          scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, {'status': 'IN_PROGRESS'}).then(function (response) {
            $scope.task = response;            
          });
        }
      });
      
      $scope.$on('triggerTaskValidation', function (event, data) {
        if (data.task && data.task === $routeParams.taskKey && data.project === $routeParams.projectKey) {
          $scope.startValidation();
        }
      });

      initialize();
    }

  ])
;
