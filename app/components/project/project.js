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
      })
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
      })
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

    // go to the conflicts / rebase view
    $scope.gotoConflictsView = function() {
      $location.url('#/projects/project/' + $scope.project.key + '/conflicts')
    }
  }]);