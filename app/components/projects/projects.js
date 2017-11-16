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

  .controller('ProjectsCtrl', function ProjectsCtrl($scope, $rootScope, ngTableParams, $filter, $modal, scaService, snowowlService, $timeout, $q, notificationService, hotkeys) {

    // clear task-related i nformation
    $rootScope.validationRunning = false;
    $rootScope.classificationRunning = false;

    // TODO Placeholder, as we only have the one tab at the moment
    $rootScope.pageTitle = "All Projects"
    $scope.projects = null;
    $scope.browserLink = '..';
    
    hotkeys.bindTo($scope)
        .add({
          combo: 'alt+n',
          description: 'Create a New Task',
          callback: function() {$scope.openCreateTaskModal();}
        })
        .add({
          combo: 'alt+l',
          description: 'Go to notification link',
          callback: function() {
             $rootScope.$broadcast('gotoNotificationLink', {});
          }
        });

    // declare table parameters
    $scope.tableParams = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {
          title: 'asc',
          lead: 'asc',
          latestClassificationJson: 'asc',
          validationStatus: 'asc'
        },
        orderBy: 'title'
      },
      {
        filterDelay: 50,
        total: $scope.projects ? $scope.projects.length : 0, // length of data
        getData: function ($defer, params) {

          if (!$scope.projects || $scope.projects.length === 0) {
            $defer.resolve(new Array());
          } else {

            var searchStr = params.filter().search;
            var mydata = [];

            if (searchStr) {
              mydata = $scope.projects.filter(function (item) {
                return item.title.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                || item.projectLead.displayName.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                || item.projectLead.username.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                || item.key.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
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

    // on successful set, reload table parameters
    $scope.$watch('projects', function () {
      if (!$scope.projects || $scope.projects.length === 0) {
      }
      else {
        // add top-level element for ng-table sorting
        angular.forEach($scope.projects, function(project) {
          project.lead = project.projectLead.displayName;
        });
        $scope.tableParams.reload();
      }

    }, true);

    $scope.openCreateTaskModal = function () {
      var modalInstance = $modal.open({
        templateUrl: 'shared/task/task.html',
        controller: 'taskCtrl',
        resolve: {
            task: function() {
              return null;
            },
            canDelete: function() {
              return false;
            }
          }
      });

      modalInstance.result.then(function () {
      }, function () {
      });
    };


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


    // Initialization:  get projects
    function initialize() {

      notificationService.sendMessage('Loading projects...');

      $scope.projects = [];

      // get projects from all projects and append sample data
      scaService.getProjects().then(function (response) {
        if (!response || response.length === 0) {
          $scope.projects = [];
          return;
        }

        $scope.projects = response;

        notificationService.sendMessage('Projects loaded.', 5000);

      }, function (error) {
        // TODO Handle errors
      });

    }


    $scope.openCreateTaskModal = function () {
      var modalInstance = $modal.open({
        templateUrl: 'shared/task/task.html',
        controller: 'taskCtrl',
        resolve: {
          task: function() {
            return null;
          },
          canDelete: function() {
              return false;
            }
        }
      });

      modalInstance.result.then(function () {
        initialize();
      }, function () {
      });
    };


    initialize();
  })
;
