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
                  || item.status.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
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
    function loadWRPASTasks() {

      notificationService.sendMessage('Loading tasks...', 0);

      $scope.tasks = [];
      $scope.reviewTasks = [];

      var tasks = [];
      var reviewTasks = [];

      // get tasks from WRPAS project
      // TODO Change this once we have API call for review-tasks
      scaService.getTasksForProject('WRPAS').then(function (response) {
        console.debug('Retrieved tasks for project WRPAS', response);
        angular.forEach(response, function (task) {

      //    console.debug('Checking task', task.key, task.status, task.reviewer);

          // add all ready for review tasks
          if (task.status === 'In Review' && !task.reviewer) {
            reviewTasks.push(task);
          }

          // add all assigned tasks in review that match the logged in user
          // into My Tasks.
          else if (task.reviewer && task.reviewer.username === $rootScope.accountDetails.login) {
            tasks.push(task);
          }

          // otherwise, push into tasks
          else if (task.assignee && task.assignee.username === $rootScope.accountDetails.login) {
            tasks.push(task);
          }
        });

        $scope.tasks = tasks;
        $scope.reviewTasks = reviewTasks;

        notificationService.sendMessage('All tasks loaded', 5000);

      });
    }

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
        controller: 'taskCtrl'
      });

      modalInstance.result.then(function (response) {
        console.debug('modal closed with response', response);
        if (response) {

          // TODO CHange to loadAllTasks once endpoints are complete
          loadWRPASTasks();
        }
      }, function () {
      });
    };

    $scope.assignReviewer = function (task) {
      if (task && !task.reviewer) {
        var updateObj = {
          "reviewer": {
            "email": $rootScope.accountDetails.email,
            "avatarUrl": "",
            "username": $rootScope.accountDetails.login,
            "displayName": $rootScope.accountDetails.firstName + ' ' + $rootScope.accountDetails.lastName
          }
        };

        scaService.updateTask(task.projectKey, task.key, updateObj).then(function () {
          $location.url('feedback/' + task.projectKey + '/' + task.key);
        })
      } else {
        notificationService.sendError("Cannot claim review task, already assigned", 10000, null, null);
      }
    }
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
      loadWRPASTasks();

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
