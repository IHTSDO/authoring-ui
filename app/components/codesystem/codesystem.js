'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.codesystem', [
    //insert dependencies here
    'ngRoute'
  ])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/codesystem/:projectKey', {
        controller: 'CodesystemCtrl',
        templateUrl: 'components/codesystem/codesystem.html',
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

  .controller('CodesystemCtrl', ['$scope', '$rootScope', '$routeParams', '$modal', '$filter', 'metadataService', 'scaService', 'terminologyServerService', 'aagService', 'rnmService', 'notificationService', '$location', 'ngTableParams', 'accountService', 'promotionService', 'templateService', '$q', '$timeout','hotkeys','$interval', 'permissionService','modalService',
    function ProjectCtrl($scope, $rootScope, $routeParams, $modal, $filter, metadataService, scaService, terminologyServerService, aagService, rnmService, notificationService, $location, ngTableParams, accountService, promotionService, templateService, $q, $timeout,hotkeys,$interval, permissionService, modalService) {

      $rootScope.pageTitle = 'Code System/' + $routeParams.projectKey;

      // project and project branch
      $scope.projectBranch = null;
      $scope.codeSystem = null;
      $scope.branch = null;
      $scope.project = {};

      // initialize the containers
      $scope.validationContainer = null;
      $scope.classificationContainer = null;
      $scope.conflictsContainer = null;
      $scope.creationDate = null;

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
      
      $scope.getCodeSystem = function () {
          terminologyServerService.getCodeSystem($routeParams.projectKey).then(function (codeSystem) {
              terminologyServerService.getBranch(codeSystem.branchPath).then(function (response) {
                  $scope.branch = codeSystem.branchPath;
                  $scope.codeSystem = codeSystem;
                  if (codeSystem.dependantVersionEffectiveTime) {
                    $scope.project.lastRebaseTime =  codeSystem.dependantVersionEffectiveTime;
                  }
                  scaService.getValidationForBranch($scope.codeSystem.branchPath).then(function (response) {
                    $scope.validationContainer = response;
                  });
                  let metadata = response;
                  response.branchPath = response.path;
                  metadataService.setBranchMetadata(response);
              });
          });
          
      }

//      $scope.getProject = function () {
//        scaService.getProjectForKey($routeParams.projectKey).then(function (response) {
//          aagService.getBranchSAC(response.branchPath, false).then(function (sac) {
//              aagService.getBranchCriteria(response.branchPath).then(function (criteria) {
//                  $scope.fullSac = [];
//                  if (sac && sac.criteriaItems) {
//                    $scope.fullSac = sac.criteriaItems;
//                    $scope.sortSacLists(sac);
//                  }
//                  if(criteria && criteria.creationDateLong && criteria.creationDateLong !== null){
//                      $scope.creationDate = criteria.creationDateLong;
//                  }
//                });
//          });
//
//          // set the local project and branch for use by containers (classification/validation)
//          $scope.project = response;
//          $scope.project.projectDroolsValidationDisabled = response.metadata && response.metadata.enableDroolsInRVF ? response.metadata.enableDroolsInRVF !== 'true' : true;
//          $scope.branch = response.branchPath;
//
//          // last rebased time
//          if ($scope.project.branchBaseTimestamp) {
//            let date = new Date($scope.project.branchBaseTimestamp);
//            $scope.project.lastRebaseTime =  date.toUTCString();
//          }
//
//          // last promotion time to MAIN
//          terminologyServerService.getLastPromotionTimeToMain($scope.branch).then(function (promotionTime) {
//            if (promotionTime) {
//              let date = new Date(promotionTime);
//              $scope.project.lastPromotionTimeToMain = date.toUTCString();
//            }
//          });
//
//          // last TASK promotion time to project
//          terminologyServerService.getLastTaskPromotionTime($scope.branch).then(function (promotionTime) {
//            if (promotionTime) {
//              let date = new Date(promotionTime);
//              $scope.project.lastTaskPromotionTime = date.toUTCString();
//            }
//          });
//
//
//
//          terminologyServerService.getBranch(($scope.branch)).then(function(response) {
//            if (response.hasOwnProperty('userRoles')) {
//              $scope.userRoles = response.userRoles;
//              permissionService.setRolesForBranch($scope.branch, response.userRoles);
//            } else {
//              permissionService.setRolesForBranch($scope.branch, []);
//            }
//          });
//
//          // set the branch metadata for use by other elements
//          metadataService.setBranchMetadata($scope.project);
//
//          // set the extension metadata for use by other elements
//          metadataService.setExtensionMetadata($scope.project.metadata);
//
//          if ($scope.project.metadata && $scope.project.metadata.defaultModuleId) {
//            terminologyServerService.getFullConcept($scope.project.metadata.defaultModuleId, $scope.project.branchPath, null).then(function(response) {
//              metadataService.setModuleName(response.conceptId, response.fsn);
//            });
//          }
//
//          $rootScope.classificationRunning = $scope.project.latestClassificationJson && ($scope.project.latestClassificationJson.status === 'RUNNING' || $scope.project.latestClassificationJson.status === 'SCHEDULED' || $scope.project.latestClassificationJson.status === 'BUILDING');
//          $rootScope.validationRunning = $scope.project.validationStatus && ($scope.project.validationStatus === 'SCHEDULED' || $scope.project.validationStatus === 'QUEUED' || $scope.project.validationStatus === 'RUNNING');
//
//          // get the latest validation for this project (if exists)
//          if ($scope.project.validationStatus !== 'FAILED') {
//            scaService.getValidationForProject($scope.project.key).then(function (response) {
//              $scope.validationContainer = response;
//            });
//          }
//        });
//      };

      $scope.$on('reloadProject', function (event, data) {
        if (!data || data.project === $routeParams.projectKey) {
          $scope.getCodeSystem();
        }
      });

      // task creation from codesystem page
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
        
      // classify the codesystem
      $scope.classify = function () {
        notificationService.sendMessage('Starting classification for codesystem...');
        scaService.startClassificationForProject($scope.project.key).then(function (response) {

          notificationService.sendMessage('Classification running', 10000);
          $scope.classificationContainer = response;
          $rootScope.classificationRunning = true;
          $timeout(function () {
            $scope.getCodeSystem();
          }, 2000);
        }, function (error) {
          notificationService.sendError('Error starting classification: ' + error);
        });
      };

      // validate the project
      $scope.validate = function () {
//        checkPrerequisitesForValidation().then(function(message) {
//          if (message) {
//            modalService.confirm(message).then(function () {
//              doValidate();
//            });
//          } else {
            doValidate();
          //}
        //});
      };

//      function checkPrerequisitesForValidation() {
//        var deferred = $q.defer();
//        scaService.getProjectForKey($routeParams.projectKey).then(function (response) {
//          let msg = null;
//          if (response.latestClassificationJson) {
//            let latestClassificationJson = response.latestClassificationJson;
//            if (latestClassificationJson.status === 'SAVED' &&
//              (new Date(response.branchHeadTimestamp)).getTime() - (new Date(latestClassificationJson.saveDate)).getTime() < 1000) {
//              msg = null;
//            } else if ((new Date(latestClassificationJson.creationDate)).getTime() < response.branchHeadTimestamp) {
//              msg = 'There are new changes on this project since the last classification. Do you still want to start a validation?';
//            } else {
//              if ((latestClassificationJson.inferredRelationshipChangesFound || latestClassificationJson.equivalentConceptsFound)
//                && latestClassificationJson.status !== 'SAVED') {
//                  msg = 'Classification has been run, but the results have not been saved. Do you still want to start a validation?'
//              }
//            }
//          } else {
//            msg = 'Classification has not been run. Do you still want to start a validation?';
//          }
//          deferred.resolve(msg);
//        });
//        return deferred.promise;
//      }

      function doValidate() {
        notificationService.sendMessage('Starting validation for codesystem...');
        scaService.startValidationForBranch($scope.codeSystem.branchPath).then(function (response) {
          notificationService.sendMessage('Validation running');
          $scope.validationContainer = { status : response };
          $rootScope.validationRunning = true;
          $timeout(function () {
            $scope.getCodeSystem();
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
        $scope.getCodeSystem();

//        // get the project task list
//        scaService.getTasksForProject($routeParams.projectKey).then(function (response) {
//          $scope.tasks = response;
//          angular.forEach($scope.tasks, function (task) {
//            task.authorKey = task.assignee ? task.assignee.displayName : '';
//          });
//          $scope.taskTableParams.reload();
//        });

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

      //
      // Initialize on load
      //
      initialize();



    }]);
