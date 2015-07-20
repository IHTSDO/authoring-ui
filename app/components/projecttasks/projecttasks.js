'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.projecttasks', [
  //insert dependencies here
  'ngRoute',
  'ngTable'
])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/projecttasks', {
        controller: 'ProjecttasksCtrl',
        templateUrl: 'components/projecttasks/projecttasks.html'
      });
  })

  .controller('ProjecttasksCtrl', function ProjecttasksCtrl($scope, $rootScope, ngTableParams, $filter, $modal, scaService, $timeout) {

    // TODO Placeholder, as we only have the one tab at the moment
    $rootScope.pageTitle = "My Tasks"
    $scope.tasks = null;


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
          console.debug('getData', params);

          if (!$scope.tasks || $scope.tasks.length == 0) {
            console.debug('  returning empty array');
            $defer.resolve(new Array());
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

    // watch for task creation events
    $scope.$on('taskCreated', function (event, task) {
      console.debug('ProjecttasksCtrl: Received task created event', event, task);
      if ($scope.tasks) {
        $scope.tasks.unshift(task);
      }
    });


    // on successful set, reload table parameters
    $scope.$watch('tasks', function () {
      if (!$scope.tasks || $scope.tasks.length == 0) {
      } 
      else 
      {
          $scope.tableParams.reload();
      }

      }, true);

    $scope.openCreateTaskModal = function() {
      var modalInstance = $modal.open({
        templateUrl: 'shared/task/task.html',
        controller: 'taskCtrl',
        resolve: {}
      });

      modalInstance.result.then(function () {
      }, function () {
      });
    }


// Initialization:  get tasks
    function initialize() {

      console.debug('ProjecttasksCtrl initialization');

      $scope.tasks = [];

      // get tasks from all projects and append sample data
      scaService.getTasks().then(function (response) {
        console.debug('home.js, getTasks results:', response);
        if (!response || response.length == 0) {
          console.debug('  no tasks, returning');
          $scope.tasks
          return;
        }

        $scope.tasks = response;

      }, function (error) {
        // TODO Handle errors
      });

    }

    initialize();
  })
;
