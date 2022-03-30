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
      $scope.projects = [];

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
                  // get the project task list
                  scaService.getProjects().then(function (projects) {
                    angular.forEach(projects, function (project) {
                      let path = project.branchPath.substr(0, project.branchPath.lastIndexOf("/"));
                      console.log(path);
                      if(path === $scope.codeSystem.branchPath){
                          $scope.projects.push(project);
                      }
                    });
                    console.log($scope.projects);
//                    angular.forEach($scope.tasks, function (task) {
//                      task.authorKey = task.assignee ? task.assignee.displayName : '';
//                    });
                    $scope.taskTableParams.reload();
                  });
                  if (codeSystem.dependantVersionEffectiveTime) {
                    $scope.project.lastRebaseTime =  codeSystem.dependantVersionEffectiveTime;
                  }
                  scaService.getValidationForBranch($scope.codeSystem.branchPath).then(function (response) {
                    $scope.validationContainer = response;
                  });
                  terminologyServerService.getClassificationsForBranchRoot(codeSystem.branchPath).then(function (classifications) {                   
                    if (!classifications || classifications.length === 0) {
                    } else {
                      $scope.classificationContainer = classifications[classifications.length - 1];
                      console.log($scope.classificationContainer);
                    }
                  });
                  
                  let metadata = response;
                  response.branchPath = response.path;
                  metadataService.setBranchMetadata(response);
              });
          });
          
      }

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
        scaService.startClassificationForBranch($scope.codeSystem.branchPath).then(function (response) {

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
            doValidate();
      };

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

      // tasks table params
      // declare table parameters
      $scope.taskTableParams = new ngTableParams({
          page: 1,
          count: 10,
          sorting: {updated: 'desc', name: 'asc'}
        },
        {
          filterDelay: 50,
          total: $scope.projects ? $scope.projects.length : 0, // length of
          // data
          getData: function ($defer, params) {

            if (!$scope.projects || $scope.projects.length === 0) {
              $defer.resolve([]);
            } else {

              var searchStr = params.filter().search;
              var mydata = [];

              if (searchStr) {
                mydata = $scope.projects.filter(function (item) {
                  return item.summary.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.projectKey.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.status.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.assignee.username.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.assignee.displayName.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    $scope.convertReviewersToText(item.reviewers,'username').toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    $scope.convertReviewersToText(item.reviewers,'displayName').toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                });
              } else {
                mydata = $scope.projects;
              }
              params.total(mydata.length);
              mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;

              $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }

          }
        }
      );
        
      $scope.getBranchStateText = function (project) {
          if (!project) {
            return null;
          }

          switch (project.branchState) {

            case 'UP_TO_DATE':
              return 'Up To Date';
            case 'FORWARD' :
              return 'Forward';
            case 'BEHIND':
              return 'Behind';
            case 'DIVERGED':
              return 'Diverged';
            case 'STALE':
              return 'Stale';
            default:
              return '??';
          }
        };
        
      $scope.viewProject = function (project) {
        $location.url('project/' + project.key);
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
        $scope.getCodeSystem();

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
