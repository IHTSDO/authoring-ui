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


  .controller('ProjectCtrl', ['$scope', '$rootScope', '$routeParams', '$modal', 'scaService', 'snowowlService', 'notificationService', function ProjectCtrl($scope, $rootScope, $routeParams, $modal, scaService, snowowlService, notificationService) {

    // clear task-related i nformation
    $rootScope.validationRunning = false;
    $rootScope.classificationRunning = false;

    $rootScope.pageTitle = 'Project/' + $routeParams.projectKey;

    $scope.project = null;

    // set the branch
    $scope.branch = 'MAIN/' + $routeParams.projectKey;

    $scope.validationContainer = {status: 'Loading...'};
    $scope.classificationContainer = {status: 'Loading...'};
    $scope.conflictsContainer = { conflicts: {}};

    // TODO Replace this with straight getProject call when available
    scaService.getProjects().then(function (response) {
      console.debug('projects', response);
      angular.forEach(response, function (project) {
        if (project.key === $routeParams.projectKey) {
          console.debug('found project', project);
          $scope.project = project;


          // get the lateswt classification for this project (if exists)
          if ($scope.project.latestClassificationJson) {
            snowowlService.getClassificationForProject($scope.project.key, $scope.project.latestClassificationJson.id, 'MAIN').then(function (response) {
              $scope.classificationContainer = response;
            });
          } else {
            $scope.classificationContainer.status = 'Classification not yet run';
          }


        }
      });
    });

    // task creation from projects page
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

      modalInstance.result.then(function () {
      }, function () {
      });
    };


    // classify the project
    $scope.classify = function () {
      console.debug('classifying project');
      scaService.startClassificationForProject($scope.project.key).then(function (response) {
        if (response && response.status) {
          $scope.classificationContainer = response;
        } else {
          $scope.classificationContainer.executionStatus = 'Error starting classification';
        }
      });
    };

    // on load, retrieve latest validation
    scaService.getValidationForProject($routeParams.projectKey).then(function (response) {
      $scope.validationContainer = response;

    });

    // validate the project
    $scope.validate = function () {
      console.debug('validating project');
      scaService.startValidationForProject($scope.project.key).then(function (response) {
        $scope.validationContainer.status = response;
      });
    };

    // rebase the project
    $scope.rebase = function () {
      scaService.rebaseProject($scope.project.key).then(function (response) {
        notificationService.sendMessage('Project Rebasing...', 10000, null);
      });
    };

    // promote the project
    $scope.promote = function () {
      scaService.promoteProject($scope.project.key).then(function (response) {
        notificationService.sendMessage('Project promoting...', 10000, null);
      });
    };
  }]);