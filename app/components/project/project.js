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

  .controller('ProjectCtrl', ['$scope', '$rootScope', '$routeParams', 'scaService', 'snowowlService', function ProjectCtrl($scope, $rootScope, $routeParams, scaService, snowowlService) {

    $scope.project = null;

    // set the branch
    $scope.branch = 'MAIN/' + $routeParams.projectKey;

    $scope.validationContainer = {status: 'Loading...'};
    $scope.classificationContainer = {status: 'Loading...'};
    scaService.getProjects().then(function (response) {
      console.debug('projects', response);
      angular.forEach(response, function (project) {
        if (project.key === $routeParams.projectKey) {
          console.debug('found project', project);
          $scope.project = project


          // get the lateswt classification for this project
          snowowlService.getClassificationForProject($scope.project.key, $scope.project.latestClassificationJson.id, 'MAIN').then(function (response) {
            $scope.classificationContainer = response;
          });


        }
      });
    });

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

    $scope.validate = function () {
      console.debug('validating project');
      scaService.startValidationForProject($scope.project.key).then(function (response) {
        if (response && response.status) {
          $scope.validationContainer = response;
        } else {
          $scope.validationContainer.executionStatus = 'Error attempting to start validation';
        }
      });
    };

    $scope.promote = function () {
      // TODO Promoting not yet available
    };

  }]);