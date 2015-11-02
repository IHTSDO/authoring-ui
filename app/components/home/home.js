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

  .controller('HomeCtrl', function HomeCtrl($scope, $rootScope, $timeout, ngTableParams, $filter, $modal, $location, scaService, snowowlService, notificationService) {

    // clear task-related i nformation
    $rootScope.validationRunning = false;
    $rootScope.classificationRunning = false;

    // TODO Placeholder, as we only have the one tab at the moment
    $rootScope.pageTitle = "My Tasks";
    $scope.tasks = null;
    $scope.reviewTasks = null;
    $scope.projects = [];

    // declare table parameters
    $scope.tableParams = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {updated: 'desc', name: 'asc'}
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
                return item.summary.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                  || item.projectKey.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                  || item.status.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
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
        sorting: {updated: 'desc', name: 'asc'}
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
                return item.summary.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                  || item.projectKey.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                  || item.status.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                  || item.assignee.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
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

    // TODO Workaround to capture full review functionality
    // Replace with loadAllTasks when endpoints are complete
    function loadTasks() {

      notificationService.sendMessage('Loading tasks...', 0);

      $scope.tasks = null;
      $scope.reviewTasks = null;
      scaService.getTasks().then(function (response) {
        $scope.tasks = response;
        if ($scope.tasks && $scope.reviewTasks) {
          notificationService.sendMessage('All tasks loaded', 5000);
        }
      });

      scaService.getReviewTasks().then(function (response) {
        $scope.reviewTasks = response;
        if ($scope.tasks && $scope.reviewTasks) {
          notificationService.sendMessage('All tasks loaded', 5000);
        }
      });

    };

    // on successful set, reload table parameters
    $scope.$watch('tasks', function () {
      $scope.tableParams.reload();

    }, true);

    // on successful set, reload table parameters
    $scope.$watch('reviewTasks', function () {
      $scope.reviewTableParams.reload();
    }, true);

    $scope.openCreateTaskModal = function () {
      var modalInstance = $modal.open({
        templateUrl: 'shared/task/task.html',
        controller: 'taskCtrl',
          resolve: {
            task: function() {
              return null;
            }
          }
      });

      modalInstance.result.then(function (response) {
        
          loadTasks();
      }, function () {
      });
    };

    $scope.viewReviewTask = function (task) {

      // if no reviewer, attempt to assign
      if (task && !task.reviewer) {

        // re-retrieve task to doublecheck availability for assignment
        scaService.getTaskForProject(task.projectKey, task.key).then(function (response) {

          // if a reviewer specified, has been claimed since last task refresh
          // send warning and reload tasks
          if (response.reviewer) {
            notificationService.sendWarning('Review task ' + task.key + ' has been claimed by another user', 1000);
            loadTasks();
          }

          // otherwise assign the current user
          else {

            // TODO Think we only need username here, doublecheck required fields (BE supplies others)
            var updateObj = {
              "reviewer": {
                "email": $rootScope.accountDetails.email,
                "avatarUrl": "",
                "username": $rootScope.accountDetails.login,
                "displayName": $rootScope.accountDetails.firstName + ' ' + $rootScope.accountDetails.lastName
              }
            };

            scaService.updateTask(task.projectKey, task.key, updateObj).then(function () {
              $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/feedback');
            });
          }
        });
        // otherwise, simply go to feedback view
      } else {
        $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/feedback');
      }
    };
    $scope.isReviewer = function () {
      return accountService.isReviewer();
    };

// Initialization:  get tasks and classifications
    function initialize() {
      $scope.tasks = [];
      $scope.reviewTasks = [];

      // get all projects for task creation
      scaService.getProjects().then(function (response) {
        if (!response || response.length == 0) {
          $scope.projects = [];
          return;
        } else {
          $scope.projects = response;
        }
      });

      // temporary workaround, restricting to WRPAS tasks
      // and getting
      loadTasks();

      /*
       // TODO Commented out until endpoints are fleshed out for review tasks
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
       */
      /*
       // disable polling
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
       */

    }

    initialize();
  })
;
