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

  .controller('ProjectCtrl', ['$scope', '$rootScope', '$routeParams', 'scaService', function ProjectCtrl($scope, $rootScope, $routeParams, scaService) {

    $scope.project = null;
    $scope.validationStatus = null;
    $scope.classificationStatus = null;

    // on load, retrieve projects list to retrieve name
    scaService.getProjects().then(function (response) {
      console.debug('projects', response);
      angular.forEach(response, function (project) {
        if (project.key === $routeParams.projectKey) {
          console.debug('found project', project);
          $scope.project = project;
          $scope.project.lead = 'Lead data not yet implemented in back-end';
        }
      });
    });

    // on load, retrieve latest classification
    // TODO API not yet implemented, scaService call not yet implemented
    /* scaService.getClassificationForProject($routeParams.projectKey).then(function(response) {
     $scope.classification = response;
     });*/
    $scope.classificationStatus = 'Latest classification status not yet implemented in back-end';
    $scope.qaStatus = 'QA Results not yet implemented in back-end';

    // on load, retrieve latest validation
    scaService.getValidationForProject($routeParams.projectKey).then(function (response) {
      $scope.validationStatus = response.status;
    });

    $scope.classify = function () {
      console.debug('classifying project');
      scaService.startClassificationForProject($scope.project.key).then(function (response) {
        if (response && response.status === 'RUNNING') {
          $scope.classificationStatus = 'Running';
        } else {
          $scope.classificationStatus = 'Error attempting to start classification';
        }
      });
    };

    $scope.validate = function () {
      console.debug('validating project');
      scaService.startValidationForProject($scope.project.key).then(function (response) {
        if (response && response.status === 'SCHEDULED') {
          $scope.validationStatus = 'Scheduled';
        } else {
          $scope.validationStatus = 'Error attempting to start validation';
        }
      });
    };

    $scope.promote = function () {
      // TODO Promoting not yet available
    };

    // test data put in by Ashley
    var data = [{
      differences: 'added',
      source: 'Medication monitoring not indicated',
      type: 'Is a',
      destination: 'Procedure not indicated',
      group: 0,
      charType: 'Inferred'
    },
      {
        differences: 'added',
        source: 'Medication monitoring not indicated',
        type: 'Is a',
        destination: 'Associated procedure',
        group: 0,
        charType: 'Inferred'
      },
      {
        differences: 'added',
        source: 'Medication monitoring not indicated',
        type: 'Is a',
        destination: 'Subject relationship context',
        group: 0,
        charType: 'Inferred'
      },
      {
        differences: 'added',
        source: 'Medication monitoring not indicated',
        type: 'Is a',
        destination: 'Procedure not indicated',
        group: 0,
        charType: 'Inferred'
      },
      {
        differences: 'added',
        source: 'Medication monitoring not indicated',
        type: 'Is a',
        destination: 'Procedure not indicated',
        group: 0,
        charType: 'Inferred'
      },
      {
        differences: 'added',
        source: 'Medication monitoring not indicated',
        type: 'Is a',
        destination: 'Procedure not indicated',
        group: 0,
        charType: 'Inferred'
      },
      {
        differences: 'added',
        source: 'Medication monitoring not indicated',
        type: 'Is a',
        destination: 'Procedure not indicated',
        group: 0,
        charType: 'Inferred'
      },
      {
        differences: 'added',
        source: 'Medication monitoring not indicated',
        type: 'Is a',
        destination: 'Procedure not indicated',
        group: 0,
        charType: 'Inferred'
      },
      {
        differences: 'inactivated',
        source: 'Medication monitoring not indicated',
        type: 'Is a',
        destination: 'Procedure not indicated',
        group: 0,
        charType: 'Inferred'
      }];

  }]);