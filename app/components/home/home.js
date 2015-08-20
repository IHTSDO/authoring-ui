'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.home', [
  //insert dependencies here
  'ngRoute',
  'ngTable'
])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/home', {
        controller: 'HomeCtrl',
        templateUrl: 'components/home/home.html'
      });
  })

  .controller('HomeCtrl', function HomeCtrl($scope, $rootScope, $timeout, ngTableParams, $filter, $modal, scaService, snowowlService) {

    // TODO Placeholder, as we only have the one tab at the moment
    $rootScope.pageTitle = "My Tasks";
    $scope.tasks = null;
    $scope.reviewTasks = null;
    $scope.projects = [];

    // declare table parameters
    $scope.tableParams = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {name: 'asc'}
      },
      {
        filterDelay: 50,
        total: $scope.tasks ? $scope.tasks.length : 0, // length of data
        getData: function ($defer, params) {

          if (!$scope.tasks || $scope.tasks.length == 0) {
            $defer.resolve([]);
          } else {

            var searchStr = params.filter().search;
            var mydata = [];

            if (searchStr) {
              mydata = $scope.tasks.filter(function (item) {
                return item.summary.toLowerCase().indexOf(searchStr) > -1 || item.projectKey.toLowerCase().indexOf(searchStr) > -1;
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

    // declare table parameters
    $scope.reviewTableParams = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {name: 'asc'}
      },
      {
        filterDelay: 50,
        total: $scope.reviewTasks ? $scope.reviewTasks.length : 0, // length of
                                                                   // data
        getData: function ($defer, params) {

          if (!$scope.reviewTasks || $scope.reviewTasks.length == 0) {
            $defer.resolve([]);
          } else {

            var searchStr = params.filter().search;
            var mydata = [];

            if (searchStr) {
              mydata = $scope.reviewTasks.filter(function (item) {
                return item.summary.toLowerCase().indexOf(searchStr) > -1 || item.projectKey.toLowerCase().indexOf(searchStr) > -1;
              });
            } else {
              mydata = $scope.reviewTasks;
            }
            params.total(mydata.length);
            mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;

            $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }

        }
      }
    );

    // watch for task creation events
    $scope.$on('taskCreated', function (event, task) {
      if ($scope.tasks) {
        $scope.tasks.unshift(task);
      }
    });

    // on successful set, reload table parameters
    $scope.$watch('tasks', function () {
      if (!$scope.tasks || $scope.tasks.length == 0) {
      }
      else {
        $scope.tableParams.reload();
      }

    }, true);

    // on successful set, reload table parameters
    $scope.$watch('reviewTasks', function () {
      if (!$scope.reviewTasks || $scope.reviewTasks.length == 0) {
      }
      else {
        $scope.reviewTableParams.reload();
      }

    }, true);

    $scope.openCreateTaskModal = function () {
      var modalInstance = $modal.open({
        templateUrl: 'shared/task/task.html',
        controller: 'taskCtrl'
      });

      modalInstance.result.then(function () {
      }, function () {
      });
    };

// Initialization:  get tasks and classifications
    function initialize() {
      $scope.reviewTasks = [];
      // get all projects for task creation
      scaService.getProjects().then(function (response) {
        if (!response || response.length == 0) {
          $scope.projects = [];
          return;
        } else {
          $scope.projects = response;

          // get tasks from WRPAS project
          // TODO Change this once we have API call for review-tasks
          
          scaService.getTasksForProject('WRPAS').then(function (response) {
            console.debug('Retrieved tasks for project WRPAS', response);
            angular.forEach(response, function (task) {

              console.debug('Checking task', task.key, task.status, task.reviewer);

              // add all ready for review tasks
              if (task.status === 'Ready for Review') {
                $scope.reviewTasks.push(task);
              }

              // add all assigned tasks in review that match the logged in user into My Tasks.
              else if (task.status === 'In Review' || task.status === 'Review Complete' && task.reviewer && task.reviewer.name === $rootScope.accountDetails.login) {
                $scope.tasks.push(task);
              }
            });
          })
        }
      });

      // get tasks across all projects
      $scope.tasks = [];
      scaService.getTasks().then(function (response) {
        if (!response || response.length == 0) {
          $scope.tasks = [];
          return;
        }

        $scope.tasks = response;
      }, function (error) {
      });

      $timeout(function () {
        scaService.getTasks().then(function (response) {
          if (!response || response.length == 0) {
            $scope.tasks = [];
            return;
          }

          $scope.tasks = response;
        }, function (error) {
        });
      }, 30000);

    }

    initialize();
  })
;
