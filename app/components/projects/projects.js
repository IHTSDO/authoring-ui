'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.projects', [
  //insert dependencies here
  'ngRoute',
  'ngTable'
])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/projects', {
        controller: 'ProjectsCtrl',
        templateUrl: 'components/projects/projects.html'
      });
  })

  .controller('ProjectsCtrl', function ProjectsCtrl($scope, $rootScope, ngTableParams, $filter, $modal, scaService, $timeout, $q) {

    // TODO Placeholder, as we only have the one tab at the moment
    $rootScope.pageTitle = "My Projects"
    $scope.projects = null;

    // declare table parameters
    $scope.tableParams = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {name: 'asc'}
      },
      {
        filterDelay: 50,
        total: $scope.projects ? $scope.projects.length : 0, // length of data
        getData: function ($defer, params) {

          if (!$scope.projects || $scope.projects.length == 0) {
            $defer.resolve(new Array());
          } else {

            var searchStr = params.filter().search;
            var mydata = [];

            if (searchStr) {
              mydata = $scope.projects.filter(function (item) {
                return item.summary.toLowerCase().indexOf(searchStr) > -1 || item.projectKey.toLowerCase().indexOf(searchStr) > -1;
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

    // watch for task creation events
    $scope.$on('taskCreated', function (event, task) {
      if ($scope.projects) {
        $scope.projects.unshift(task);
      }
    });

    // on successful set, reload table parameters
    $scope.$watch('projects', function () {
      if (!$scope.projects || $scope.projects.length == 0) {
      }
      else {
        $scope.tableParams.reload();
      }

    }, true);

    $scope.openCreateTaskModal = function () {
      var modalInstance = $modal.open({
        templateUrl: 'shared/task/task.html',
        controller: 'taskCtrl',
        resolve: {}
      });

      modalInstance.result.then(function () {
      }, function () {
      });
    };

    // Initialization:  get projects
    function initialize() {

      $scope.projects = [];

      // get projects from all projects and append sample data
      scaService.getProjects().then(function (response) {
        if (!response || response.length == 0) {
          $scope.projects = [];
          return;
        }

        angular.forEach(response, function (project) {
          var validation = scaService.getValidationForProject(project.key);
          // TODO Implement this call in scaService once api call becomes available
          // var classification = scaService.getClassificationForProject(project.key);

          // TODO Add classification to this once it's implemented
          $q.all([validation]).then(function (data) {

            // add the validation status
            project.latestValidationStatus = data[0].executionStatus;

            // add the classification status
            // TODO Implement

            // push onto the projects list
            $scope.projects.push(project);

            console.debug($scope.projects);
          });
        });


      }, function (error) {
        // TODO Handle errors
      });

    }

    initialize();
  })
;
