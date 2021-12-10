'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.project', [
    //insert dependencies here
    'ngRoute'
  ])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/project/:projectKey', {
        controller: 'ProjectCtrl',
        templateUrl: 'components/project/project.html',
        resolve: ['terminologyServerService', 'metadataService', '$q', function(terminologyServerService, metadataService, $q) {
            var defer = $q.defer();
            $q.all([terminologyServerService.getEndpoint(), metadataService.isProjectsLoaded()]).then(function() {
                defer.resolve();
            });
            return defer.promise;
          }
        ]
      });
  })

  .controller('ProjectCtrl', ['$scope', '$rootScope', '$routeParams', '$modal', '$filter', 'metadataService', 'scaService', 'terminologyServerService', 'aagService', 'notificationService', '$location', 'ngTableParams', 'accountService', 'promotionService', 'templateService', '$q', '$timeout','hotkeys','$interval', 'permissionService','modalService',
    function ProjectCtrl($scope, $rootScope, $routeParams, $modal, $filter, metadataService, scaService, terminologyServerService, aagService, notificationService, $location, ngTableParams, accountService, promotionService, templateService, $q, $timeout,hotkeys,$interval, permissionService, modalService) {

      $rootScope.pageTitle = 'Project/' + $routeParams.projectKey;

      // project and project branch
      $scope.projectBranch = null;
      $scope.project = null;

      // initialize the containers
      $scope.validationContainer = null;
      $scope.classificationContainer = null;
      $scope.conflictsContainer = null;
      $scope.sac = null;
      $scope.creationDate = null;
      $scope.fullSac = [];
      $scope.firstHalfManualSac = [];
      $scope.secondHalfManualSac = [];

      // initialize the header notification
      $rootScope.classificationRunning = false;
      $rootScope.validationRunning = false;
      $scope.browserLink = '..';
      $rootScope.rebaseRunning = false;

      $scope.userRoles = [];

      var expandValidation = $location.search().expandValidation;
      var expandClassification = $location.search().expandClassification;
      $scope.validationCollapsed = expandValidation ? !expandValidation : true;
      $scope.classificationCollapsed = expandClassification ? !expandClassification : true;

      hotkeys.bindTo($scope)
      .add({
        combo: 'alt+y',
        description: 'Start classification',
        callback: function() {$scope.classify();}
      })
      .add({
        combo: 'alt+v',
        description: 'Start validation ',
        callback: function() {$scope.validate();}
      })
      .add({
        combo: 'alt+l',
        description: 'Go to notification link',
        callback: function() {
           $rootScope.$broadcast('gotoNotificationLink', {});
        }
      });

      $scope.sacSignedOff = function () {
          let value = true;
          angular.forEach($scope.sac, function (criteria) {
              if (criteria.complete === false) {
                value = false;
              }
            });
          return value;
      }

      $scope.getProject = function () {
        scaService.getProjectForKey($routeParams.projectKey).then(function (response) {
          aagService.getBranchSAC(response.branchPath, false).then(function (sac) {
              aagService.getBranchCriteria(response.branchPath).then(function (criteria) {
                  $scope.fullSac = [];
                  if (sac && sac.criteriaItems) {
                    $scope.fullSac = sac.criteriaItems;
                    $scope.sortSacLists(sac);
                  }
                  if(criteria && criteria.creationDateLong && criteria.creationDateLong !== null){
                      $scope.creationDate = criteria.creationDateLong;
                  }
                });
          });

          // set the local project and branch for use by containers (classification/validation)
          $scope.project = response;
          $scope.project.projectDroolsValidationDisabled = response.metadata && response.metadata.enableDroolsInRVF ? response.metadata.enableDroolsInRVF !== 'true' : true;
          $scope.branch = response.branchPath;

          // last rebased time
          if ($scope.project.branchBaseTimestamp) {
            let date = new Date($scope.project.branchBaseTimestamp);
            $scope.project.lastRebaseTime =  date.toUTCString();
          }

          // last promotion time to MAIN
          terminologyServerService.getLastPromotionTimeToMain($scope.branch).then(function (promotionTime) {
            if (promotionTime) {
              let date = new Date(promotionTime);
              $scope.project.lastPromotionTimeToMain = date.toUTCString();
            }
          });

          // last TASK promotion time to project
          terminologyServerService.getLastTaskPromotionTime($scope.branch).then(function (promotionTime) {
            if (promotionTime) {
              let date = new Date(promotionTime);
              $scope.project.lastTaskPromotionTime = date.toUTCString();
            }
          });



          terminologyServerService.getBranch(($scope.branch)).then(function(response) {
            if (response.hasOwnProperty('userRoles')) {
              $scope.userRoles = response.userRoles;
              permissionService.setRolesForBranch($scope.branch, response.userRoles);
            } else {
              permissionService.setRolesForBranch($scope.branch, []);
            }
          });

          // set the branch metadata for use by other elements
          metadataService.setBranchMetadata($scope.project);

          // set the extension metadata for use by other elements
          metadataService.setExtensionMetadata($scope.project.metadata);

          if ($scope.project.metadata && $scope.project.metadata.defaultModuleId) {
            terminologyServerService.getFullConcept($scope.project.metadata.defaultModuleId, $scope.project.branchPath, null).then(function(response) {
              metadataService.setModuleName(response.conceptId, response.fsn);
            });
          }

          $rootScope.classificationRunning = $scope.project.latestClassificationJson && ($scope.project.latestClassificationJson.status === 'RUNNING' || $scope.project.latestClassificationJson.status === 'SCHEDULED' || $scope.project.latestClassificationJson.status === 'BUILDING');
          $rootScope.validationRunning = $scope.project.validationStatus && ($scope.project.validationStatus === 'SCHEDULED' || $scope.project.validationStatus === 'QUEUED' || $scope.project.validationStatus === 'RUNNING');

          // get the latest validation for this project (if exists)
          if ($scope.project.validationStatus !== 'FAILED') {
            scaService.getValidationForProject($scope.project.key).then(function (response) {
              $scope.validationContainer = response;
            });
          }
        });
      };

      $scope.$on('reloadProject', function (event, data) {
        if (!data || data.project === $routeParams.projectKey) {
          $scope.getProject();
        }
      });

      // reload SAC
      $scope.$on('reloadSAC', function (event, data) {
        if (!data.task && data.project === $routeParams.projectKey) {
          aagService.getBranchSAC($scope.branch, false).then(function (sac) {
            $scope.sac = [];
            $scope.fullSac = [];
            if (sac && sac.criteriaItems) {
              $scope.fullSac = sac.criteriaItems;
              angular.forEach(sac.criteriaItems, function (criteria) {
                if (criteria.authoringLevel === "PROJECT") {
                  $scope.sac.push(criteria);
                }
              });
            }
          });
        }
      });

      // task creation from projects page
      $scope.openCreateTaskModal = function () {
        var modalInstance = $modal.open({
          templateUrl: 'shared/task/task.html',
          controller: 'taskCtrl',
          resolve: {
            task: function () {
              return null;
            },
            canDelete: function () {
              return false;
            }
          }
        });

        modalInstance.result.then(function () {
        }, function () {
        });
      };

      $scope.sortSacLists = function (sac){
          $scope.firstHalfManualSac = [];
          $scope.secondHalfManualSac = [];
          $scope.sac = [];
          if (sac && sac.criteriaItems) {
            angular.forEach(sac.criteriaItems, function (criteria) {
              if (criteria.authoringLevel === "PROJECT") {
                $scope.sac.push(criteria);
                if (criteria.manual && $scope.firstHalfManualSac.length < (sac.criteriaItems.length/2)) {
                    $scope.firstHalfManualSac.push(criteria);
                }
                else{
                    if(criteria.manual){
                        $scope.secondHalfManualSac.push(criteria);
                    }
                }
              }
          });
        };
      }

      $scope.acceptManualSac = function (id) {
          aagService.acceptBranchSAC($scope.branch, id).then(function (sac) {
              aagService.getBranchSAC($scope.branch, false).then(function (sac) {
                  $scope.sortSacLists(sac);
              });
          });
      };

      $scope.unacceptManualSac = function (id) {
          aagService.unacceptBranchSAC($scope.branch, id).then(function (sac) {
              aagService.getBranchSAC($scope.branch, false).then(function (sac) {
                  $scope.sortSacLists(sac);
              });
          });
      };

      $scope.openSACConfigModal = function () {
          var modalInstance = $modal.open({
            templateUrl: 'shared/sacconfig/sacconfig.html',
            controller: 'sacconfigCtrl',
            resolve: {
                branch: function() {
                  return $scope.branch;
                },
                criteria: function() {
                  return $scope.fullSac;
                }
              }
          });

          modalInstance.result.then(function () {
              aagService.getBranchSAC($scope.branch, false).then(function (sac) {
                  $scope.sac = [];
                  $scope.fullSac = [];
                  $scope.sortSacLists(sac);
                  if (sac && sac.criteriaItems) {
                    $scope.fullSac = sac.criteriaItems;
                  }
              });
          });
        };

      $scope.refsetUpdate = function (name) {
          modalService.confirm('This will update the relevant refset/s, create a new task and redirect you to it.  Continue?').then(function () {
              templateService.refsetUpdate($scope.project.key, name).then(function (response) {
                  $location.url('tasks/task/' + $scope.project.key + '/' + response + '/edit');
              });
            }, function () {
              // do nothing
            });
      }

      // classify the project
      $scope.classify = function () {
        notificationService.sendMessage('Starting classification for project...');
        scaService.startClassificationForProject($scope.project.key).then(function (response) {

          notificationService.sendMessage('Classification running', 10000);
          $scope.classificationContainer = response;
          $rootScope.classificationRunning = true;
          $timeout(function () {
            $scope.getProject();
          }, 2000);
        }, function (error) {
          notificationService.sendError('Error starting classification: ' + error);
        });
      };

      // validate the project
      $scope.validate = function () {
        checkPrerequisitesForValidation().then(function(message) {
          if (message) {
            modalService.confirm(message).then(function () {
              doValidate();
            });
          } else {
            doValidate();
          }
        });
      };

      function checkPrerequisitesForValidation() {
        var deferred = $q.defer();
        scaService.getProjectForKey($routeParams.projectKey).then(function (response) {
          let msg = null;
          if (response.latestClassificationJson) {
            let latestClassificationJson = response.latestClassificationJson;
            if (latestClassificationJson.status === 'SAVED' &&
              (new Date(response.branchHeadTimestamp)).getTime() - (new Date(latestClassificationJson.saveDate)).getTime() < 1000) {
              msg = null;
            } else if ((new Date(latestClassificationJson.creationDate)).getTime() < response.branchHeadTimestamp) {
              msg = 'There are new changes on this project since the last classification. Do you still want to start a validation?';
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
        notificationService.sendMessage('Starting validation for project...');
        scaService.startValidationForProject($scope.project.key).then(function (response) {
          notificationService.sendMessage('Validation running');
          $scope.validationContainer = { status : response };
          $rootScope.validationRunning = true;
          $timeout(function () {
            $scope.getProject();
          }, 2000);
        }, function (error) {
          notificationService.sendError('Error starting validation: ' + error);
        });
      }

      // rebase the project -- simply route to merge/rebase view
      $scope.mergeAndRebase = function () {
        $location.url('projects/project/' + $routeParams.projectKey + '/conflicts');
      };
      $scope.mergeAndRebase = function (task) {
        terminologyServerService.getBranch($scope.branch).then(function (response) {
          if (!response.locked) {
            $location.url('projects/project/' + $routeParams.projectKey + '/conflicts');
          }
          else {
            notificationService.sendWarning('Unable to start rebase on project as the root branch is locked due to ongoing changes.', 7000);
          }
        });
      };


      $scope.promote = function () {

        notificationService.sendMessage('Preparing for project promotion...');

        promotionService.checkPrerequisitesForProject($routeParams.projectKey).then(function (flags) {

          // detect whether any user warnings were detected
          var warningsFound = false;
          angular.forEach(flags, function (flag) {
            if (flag.checkWarning) {
              warningsFound = true;
            }
          });

          // if response contains no flags, simply promote
          if (!warningsFound) {
            terminologyServerService.getBranch($scope.branch).then(function (response) {
              if (!response.locked) {
                terminologyServerService.getBranch(metadataService.getBranchRoot()).then(function (response) {
                  if (!response.locked) {
                    notificationService.sendMessage('Promoting project...');
                    scaService.promoteProject($routeParams.projectKey).then(function (response) {
                      if (response.status === 'CONFLICTS') {
                        var merge = JSON.parse(response.message);
                        terminologyServerService.searchMerge(merge.source, merge.target, 'CONFLICTS').then( function(response) {
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
                              notificationService.sendError('Conflicts : ' + (conflictCount > 1 ?  ' \n' : '') + msg);
                            }
                          }
                        });
                      }
                    });
                  }
                  else {
                    notificationService.sendWarning('Unable to start rebase as branch root is locked due to ongoing changes.', 7000);
                  }
                });
              }
              else {
                notificationService.sendWarning('Unable to start rebase as the project branch is locked due to ongoing changes.', 7000);
              }
            });

          } else {
            notificationService.clear();
            var modalInstance = $modal.open({
              templateUrl: 'shared/promote-modal/promoteModal.html',
              controller: 'promoteModalCtrl',
              resolve: {
                flags: function () {
                  return flags;
                },
                isTask: function () {
                  return false;
                }
              }
            });

            modalInstance.result.then(function (proceed) {
              if (proceed) {
                terminologyServerService.getBranch($scope.branch).then(function (response) {
                  if (!response.locked) {
                    terminologyServerService.getBranch(metadataService.getBranchRoot()).then(function (response) {
                      if (!response.locked) {
                        notificationService.sendMessage('Promoting project...');
                        scaService.promoteProject($routeParams.projectKey).then(function (response) {
                          if (response.status === 'CONFLICTS') {
                            var merge = JSON.parse(response.message);
                            terminologyServerService.searchMerge(merge.source, merge.target, 'CONFLICTS').then( function(response) {
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
                                  notificationService.sendError('Conflicts : ' + (conflictCount > 1 ?  ' \n' : '') + msg);
                                }
                              }
                            });
                          } else {
                            $scope.getProject();
                          }
                        });
                      }
                      else {
                        notificationService.sendWarning('Unable to start rebase as branch root is locked due to ongoing changes.', 7000);
                      }
                    });
                  }
                  else {
                    notificationService.sendWarning('Unable to start rebase as the project branch is locked due to ongoing changes.', 7000);
                  }
                });
              } else {
                notificationService.clear();
              }
            }, function () {
            });
          }
        }, function (error) {
          notificationService.sendError('Unexpected error preparing for promotion: ' + error);
        });
      };

      // tasks table params
      // declare table parameters
      $scope.taskTableParams = new ngTableParams({
          page: 1,
          count: 10,
          sorting: {updated: 'desc', name: 'asc'}
        },
        {
          filterDelay: 50,
          total: $scope.tasks ? $scope.tasks.length : 0, // length of
          // data
          getData: function ($defer, params) {

            if (!$scope.tasks || $scope.tasks.length === 0) {
              $defer.resolve([]);
            } else {

              var searchStr = params.filter().search;
              var mydata = [];

              if (searchStr) {
                mydata = $scope.tasks.filter(function (item) {
                  return item.summary.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.projectKey.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.status.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.assignee.username.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.assignee.displayName.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    $scope.convertReviewersToText(item.reviewers,'username').toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    $scope.convertReviewersToText(item.reviewers,'displayName').toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                });
              } else {
                mydata = $scope.tasks;
              }
              params.total(mydata.length);
              mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;

              $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }

          }
        }
      );


      $scope.editTask = function (task) {
        var modalInstance = $modal.open({
          templateUrl: 'shared/task/task.html',
          controller: 'taskCtrl',
          resolve: {
            task: function () {
              return task;
            },
            canDelete: function () {
              return true;
            }
          }
        });

        modalInstance.result.then(function (response) {
          if (response) {
            if (response === 'DELETED') {
              initialize();
            } else {
              let updatedTask = response.data;
              angular.forEach($scope.tasks, function (task) {
                if (task.key === updatedTask.key) {
                  task.assignee = updatedTask.assignee;
                  task.summary = updatedTask.summary;
                  task.description = updatedTask.description;
                  task.authorKey = task.assignee ? task.assignee.displayName : '';
                }
              });
              $scope.taskTableParams.reload();
            }
          } else {
            // do nothing
          }
        }, function () {
        });
      };

      $scope.viewTask = function (task) {

        // determine destination based on role
        accountService.getRoleForTask(task).then(function (role) {
          switch (role) {
            case 'REVIWER':
              $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/feedback');
              break;
            case 'AUTHOR':
              $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/edit');
              break;
            default:
              $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/edit');
              break;
          }
        }, function() {
          $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/edit');
        });
      };

      $scope.convertReviewersToText = function (reviewers, property) {
        if (reviewers) {
          var list = reviewers.map(a => a[property]);
          return list.join(', ');
        }
        return '';
      };

       $scope.toggleProjectScheduledRebase = function () {
        $scope.project.projectScheduledRebaseDisabled = !$scope.project.projectScheduledRebaseDisabled;
        notificationService.sendMessage('Updating Project Scheduled Rebase...');
        scaService.updateProject($scope.project.key, {'projectScheduledRebaseDisabled': $scope.project.projectScheduledRebaseDisabled}).then(function (response) {
          notificationService.sendMessage('Project Scheduled Rebase successfully updated', 5000);
        }, function (error) {
          $scope.project.projectScheduledRebaseDisabled = !$scope.project.projectScheduledRebaseDisabled;
          notificationService.sendError('Error udpating Project Scheduled Rebase: ' + error);
        });
      };

      $scope.toggleProjectDroolsValidation = function () {
        $scope.project.projectDroolsValidationDisabled = !$scope.project.projectDroolsValidationDisabled;
        notificationService.sendMessage('Updating Project Drools Validation...');
        var metadata = {'enableDroolsInRVF': !$scope.project.projectDroolsValidationDisabled + ''}
        terminologyServerService.updateBranchMetadata($scope.branch, metadata).then(function (response) {
          notificationService.sendMessage('Project Drools Validation has been ' + ($scope.project.projectDroolsValidationDisabled ? 'disabled' : 'enabled') + ' successfully', 5000);
        }, function (error) {
          $scope.project.projectDroolsValidationDisabled = !$scope.project.projectDroolsValidationDisabled;
          notificationService.sendError('Error udpating Project Drools Validation: ' + error);
        });
      };

      // on load, retrieve tasks for project
      function initialize() {
        // initialize the project
        $scope.getProject();

        // start monitoring of project
        scaService.monitorProject($routeParams.projectKey);

        // get the project task list
        scaService.getTasksForProject($routeParams.projectKey).then(function (response) {
          $scope.tasks = response;
          angular.forEach($scope.tasks, function (task) {
            task.authorKey = task.assignee ? task.assignee.displayName : '';
          });
          $scope.taskTableParams.reload();
        });

        // Get uiState for project
        scaService.getUiStateForUser($routeParams.projectKey + '-merge-review-id').then(function (mergeReviewId) {
          if (mergeReviewId) {
            var viewedMergePoll = null;

            viewedMergePoll = $interval(function () {
              terminologyServerService.getMergeReview(mergeReviewId).then(function (response) {
                if (response.status === 'PENDING' || response.status === 'CURRENT') {
                  $rootScope.rebaseRunning = true;
                } else {
                  $rootScope.rebaseRunning = false;
                  scaService.deleteUiStateForUser($routeParams.projectKey + '-merge-review-id');
                  viewedMergePoll = $interval.cancel(viewedMergePoll);
                }
              });
            }, 2000);
          }
        });
      }

      // on reload task broadcast, re-initialize
      $scope.$on('reloadTasks', function (event, data) {
        initialize();
      });

      $scope.$on('promotion.completed', function (event, data) {
        if (data && data.project === $routeParams.projectKey && !data.task) {
          $scope.getProject();
        }
      });

      //
      // Initialize on load
      //
      initialize();



    }]);
