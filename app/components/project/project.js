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
        templateUrl: 'components/project/project.html'
      });
  })

  .controller('ProjectCtrl', ['$scope', '$rootScope', '$routeParams', '$modal', '$filter', 'metadataService', 'scaService', 'snowowlService', 'notificationService', '$location', 'ngTableParams', 'accountService', 'promotionService', '$q', '$timeout','hotkeys',
    function ProjectCtrl($scope, $rootScope, $routeParams, $modal, $filter, metadataService, scaService, snowowlService, notificationService, $location, ngTableParams, accountService, promotionService, $q, $timeout,hotkeys) {

      $rootScope.pageTitle = 'Project/' + $routeParams.projectKey;

      // project and project branch
      $scope.projectBranch = null;
      $scope.project = null;

      // initialize the containers
      $scope.validationContainer = null;
      $scope.classificationContainer = null;
      $scope.conflictsContainer = null;

      // initialize the header notification
      $rootScope.classificationRunning = false;
      $rootScope.validationRunning = false;
      $scope.browserLink = '..';

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

      $scope.getProject = function () {
        scaService.getProjectForKey($routeParams.projectKey).then(function (response) {

          // set the local project and branch for use by containers (classification/validation)
          $scope.project = response;
          $scope.branch = response.branchPath;

          // set the branch metadata for use by other elements
          metadataService.setBranchMetadata($scope.project);

          // set the extension metadata for use by other elements
          metadataService.setExtensionMetadata($scope.project.metadata);

          if ($scope.project.metadata && $scope.project.metadata.defaultModuleId) {
            snowowlService.getFullConcept($scope.project.metadata.defaultModuleId, $scope.project.branchPath, null).then(function(response) {
              metadataService.setModuleName(response.conceptId, response.fsn);
            });
          }

          $rootScope.classificationRunning = $scope.project.latestClassificationJson && ($scope.project.latestClassificationJson.status === 'RUNNING' || $scope.project.latestClassificationJson.status === 'BUILDING');
          $rootScope.validationRunning =
            $scope.project.validationStatus && ($scope.project.validationStatus !== 'COMPLETED' && $scope.project.validationStatus !== 'NOT_TRIGGERED' && $scope.project.validationStatus !== 'FAILED');

          // get the latest validation for this project (if exists)
          if ($scope.project.validationStatus !== 'FAILED') {
            scaService.getValidationForProject($scope.project.key).then(function (response) {
              $scope.validationContainer = response;
            });
          }
        });
      };


      $scope.$on('reloadProject', function (event, data) {
        $scope.getProject();
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

      // on load, retrieve latest validation
      scaService.getValidationForProject($routeParams.projectKey).then(function (response) {
        $scope.validationContainer = response;

      });

      // validate the project
      $scope.validate = function () {
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
      };

      // rebase the project -- simply route to merge/rebase view
      $scope.mergeAndRebase = function () {
        $location.url('projects/project/' + $routeParams.projectKey + '/conflicts');
      };
      $scope.mergeAndRebase = function (task) {
        snowowlService.getBranch($scope.branch).then(function (response) {
          if (!response.metadata || response.metadata && !response.metadata.lock) {
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
            snowowlService.getBranch($scope.branch).then(function (response) {
              if (!response.metadata || response.metadata && !response.metadata.lock) {
                snowowlService.getBranch(metadataService.getBranchRoot()).then(function (response) {
                  if (!response.metadata || response.metadata && !response.metadata.lock) {
                    notificationService.sendMessage('Promoting project...');
                    scaService.promoteProject($routeParams.projectKey).then(function (response) {
                      notificationService.sendMessage('Project successfully promoted', 5000);
                      $scope.getProject();
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
                snowowlService.getBranch($scope.branch).then(function (response) {
                  if (!response.metadata || response.metadata && !response.metadata.lock) {
                    snowowlService.getBranch(metadataService.getBranchRoot()).then(function (response) {
                      if (!response.metadata || response.metadata && !response.metadata.lock) {
                        notificationService.sendMessage('Promoting project...');
                        scaService.promoteProject($routeParams.projectKey).then(function (response) {
                          notificationService.sendMessage('Project successfully promoted', 5000);
                          $scope.getProject();
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
                    item.reviewer.username.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.reviewer.displayName.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
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
              $scope.task = response.data;
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
        });
      };


      // on load, retrieve tasks for project
      function initialize() {

        // initialize the project
        $scope.getProject();

        // get the project task list
        scaService.getTasksForProject($routeParams.projectKey).then(function (response) {
          $scope.tasks = response;
          angular.forEach($scope.tasks, function (task) {
            task.authorKey = task.assignee ? task.assignee.displayName : '';
            task.reviewerKey = task.reviewer ? task.reviewer.displayName : '';
          });
          $scope.taskTableParams.reload();
        });
      }

      // on reload task broadcast, re-initialize
      $scope.$on('reloadTasks', function (event, data) {
        initialize();
      });

      // on open classification results from notification link
      $scope.$on('toggleClassificationResults', function () {
        setTimeout(function waitForValidationContainerPresent() {         
          if ($scope.project.latestClassificationJson) {
             $scope.classificationCollapsed = false;
          } else {
            setTimeout(waitForValidationContainerPresent, 500);
          }
        }, 500);
      });

      // on open validation report from notification link
      $scope.$on('toggleValidationReport', function () {
         $scope.validationContainer = null;
         scaService.getValidationForProject($scope.project.key).then(function (response) {
            $scope.validationContainer = response;
            $scope.validationCollapsed = true;
          });  
      });

      //
      // Initialize on load
      //
      initialize();



    }]);
