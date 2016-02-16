'use strict';

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

  .controller('ProjectCtrl', ['$scope', '$rootScope', '$routeParams', '$modal', '$filter', 'scaService', 'snowowlService', 'notificationService', '$location', 'ngTableParams', 'accountService', 'promotionService', '$q', '$timeout',
    function ProjectCtrl($scope, $rootScope, $routeParams, $modal, $filter, scaService, snowowlService, notificationService, $location, ngTableParams, accountService, promotionService, $q, $timeout) {

      $rootScope.pageTitle = 'Project/' + $routeParams.projectKey;

      $scope.project = null;

      // initialize the containers
      $scope.validationContainer = null;
      $scope.classificationContainer = null;
      $scope.conflictsContainer = null;

      // initialize the header notifications
      $rootScope.classificationRunning = false;
      $rootScope.validationRunning = false;
      $scope.browserLink = '..';

      // set the branch
      $scope.branch = 'MAIN/' + $routeParams.projectKey;

      $scope.getProject = function () {
        scaService.getProjectForKey($routeParams.projectKey).then(function (response) {

          $scope.project = response;

          $rootScope.classificationRunning = $scope.project.latestClassificationJson && ($scope.project.latestClassificationJson.status === 'RUNNING' || $scope.project.latestClassificationJson.status === 'BUILDING');
          $rootScope.validationRunning =
            $scope.project.validationStatus && ($scope.project.validationStatus !== 'COMPLETED' && $scope.project.validationStatus !== 'NOT_TRIGGERED' && $scope.project.validationStatus !== 'FAILED');

          // get the latest classification for this project (if exists)
          if ($scope.project.latestClassificationJson) {
            snowowlService.getClassificationForProject($scope.project.key, $scope.project.latestClassificationJson.id, 'MAIN').then(function (response) {
              console.log(response);
              $scope.classificationContainer = response;
            });
          }

          // get the latest validation for this project (if exists)
          if ($scope.project.validationStatus !== 'FAILED') {
            scaService.getValidationForProject($scope.project.key).then(function (response) {
              $scope.validationContainer = response;
            });
          }
        });
      };

      $scope.getProject();

      $scope.$on('reloadProject', function (event, data) {
        console.debug('Received reload project request, current project: ', $scope.project);
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

      function reloadProject() {
        scaService.getProjectForKey($scope.project.key).then(function (response) {
          $scope.project = response;
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

      // on load, retrieve latest validation
      scaService.getValidationForProject($routeParams.projectKey).then(function (response) {
        console.debug('latest validation', response);
        $scope.validationContainer = response;

      });

      // validate the project
      $scope.validate = function () {
        notificationService.sendMessage('Starting validation for project...');
        scaService.startValidationForProject($scope.project.key).then(function (response) {
          notificationService.sendMessage('Validation running');
          $scope.validationContainer.status = response;
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
      $scope.mergeAndRebase = function(task){
        snowowlService.getBranch('MAIN' + $routeParams.projectKey).then(function(response){
            if(!response.metadata)
            {
                snowowlService.getBranch().then(function(response){
                    if(!response.metadata)
                    {
                        $location.url('projects/project/' + $routeParams.projectKey + '/conflicts');
                    }
                    else{
                        notificationService.sendWarning('Unable to start rebase on project as the MAIN is locked due to ongoing changes.', 3000);
                    }
                });
            }
            else{
                notificationService.sendWarning('Unable to start rebase on project as the branch is locked due to ongoing changes.', 3000);
            }
        });
        
    };



      $scope.promote = function () {

        notificationService.sendMessage('Preparing for project promotion...');

        promotionService.checkPrerequisitesForProject($routeParams.projectKey).then(function (flags) {

          console.debug('promotion flags', flags);

          // detect whether any user warnings were detected
          var warningsFound = false;
          angular.forEach(flags, function (flag) {
            if (flag.checkWarning) {
              warningsFound = true;
            }
          });

          // if response contains no flags, simply promote
          if (!warningsFound) {
            notificationService.sendMessage('Promoting project...');
            scaService.promoteProject($routeParams.projectKey).then(function (response) {
              notificationService.sendMessage('Project successfully promoted', 5000);
              $scope.getProject();
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
                notificationService.sendMessage('Promoting project...');
                scaService.promoteProject($routeParams.projectKey).then(function (response) {
                  notificationService.sendMessage('Project successfully promoted', 5000);
                  $scope.getProject();
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

      // on load, retrieve tasks for project
      function initialize() {
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
          console.debug('modal closed with response', response);
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

      initialize();

    }]);