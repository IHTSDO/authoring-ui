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

  .controller('ProjectCtrl', ['$scope', '$rootScope', '$routeParams', '$modal', '$filter', 'scaService', 'snowowlService', 'notificationService', '$location', 'ngTableParams', function ProjectCtrl($scope, $rootScope, $routeParams, $modal, $filter, scaService, snowowlService, notificationService, $location, ngTableParams) {

    $rootScope.pageTitle = 'Project/' + $routeParams.projectKey;

    $scope.project = null;

    // initialize the containers
    $scope.validationContainer = null;
    $scope.classificationContainer = null;
    $scope.conflictsContainer = null;

    // initialize the header notifications
    $rootScope.classificationRunning = false;
    $rootScope.validationRunning = false;

    // set the branch
    $scope.branch = 'MAIN/' + $routeParams.projectKey;

    // TODO Replace this with straight getProject call when available
    scaService.getProjectForKey($routeParams.projectKey).then(function (response) {

      $scope.project = response;

      $rootScope.classificationRunning = $scope.project.latestClassificationJson && $scope.project.latestClassificationJson.status !== 'COMPLETED';
      $rootScope.validationRunning = $scope.project.validationStatus && $scope.project.validationStatus !== 'COMPLETED';

      // get the latest classification for this project (if exists)
      if ($scope.project.latestClassificationJson && $scope.project.latestClassificationJson.status === 'COMPLETED' ) {
        snowowlService.getClassificationForProject($scope.project.key, $scope.project.latestClassificationJson.id, 'MAIN').then(function (response) {
          $scope.classificationContainer = response;
        });
      }

      // get the latest validation for this project (if exists)
      if ($scope.project.validationStatus && $scope.project.validationStatus === 'COMPLETED') {
         scaService.getValidationForProject($scope.project.key).then(function(response) {
          $scope.validationContainer = response;
        });
      }

      // TODO Retrieve rebase/conflicts report

    });

    // task creation from projects page
    $scope.openCreateTaskModal = function () {
      var modalInstance = $modal.open({
        templateUrl: 'shared/task/task.html',
        controller: 'taskCtrl',
        resolve: {
          task: function () {
            return null;
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

        notificationService.sendMessage('Classification running', 5000);
        $scope.classificationContainer = response;
      }, function(error) {
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
      }, function(error) {
        notificationService.sendError('Error starting validation: ' + error);
      });
    };

    // rebase the project
    $scope.rebase = function () {
      notificationService.sendMessage('Rebasing project...');
      scaService.rebaseProject($scope.project.key).then(function (response) {
        notificationService.sendMessage('Project successfully rebased', 10000, null);
      }, function(error) {
        notificationService.sendError('Error rebasing project: ' + error);
      });
    };

    // promote the project
    $scope.promote = function ()  {
    notificationService.sendMessage('Promoting project....');
      scaService.promoteProject($scope.project.key).then(function (response) {
        notificationService.sendMessage('Project successfully promoted', 10000, null);
      }, function(error) {
        notificationService.sendError('Error promoting project: ' + error);
      });
    };

    // go to the conflicts / rebase view
    $scope.gotoConflictsView = function() {
      $location.url('#/projects/project/' + $scope.project.key + '/conflicts');
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

          if (!$scope.tasks || $scope.tasks.length == 0) {
            $defer.resolve([]);
          } else {

            var searchStr = params.filter().search;
            var mydata = [];

            if (searchStr) {
              mydata = $scope.tasks.filter(function (item) {
                return item.summary.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                  || item.projectKey.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                  || item.status.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                  || item.assignee.username.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                  || item.assignee.displayName.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                  || item.reviewer.username.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                  || item.reviewer.displayName.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
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
    scaService.getTasksForProject($routeParams.projectKey).then(function(response) {
      $scope.tasks = response;
      angular.forEach($scope.tasks, function(task) {
        task.authorKey = task.assignee ? task.assignee.displayName : '';
        task.reviewerKey = task.reviewer ? task.reviewer.displayName : '';
      });
      $scope.taskTableParams.reload();
    });
  }]);