'use strict';
angular.module('singleConceptAuthoringApp.taskDetail', [])

  .controller('taskDetailCtrl', ['$rootScope', '$scope', '$routeParams', '$location', 'scaService', 'snowowlService', function taskDetailCtrl($rootScope, $scope, $routeParams, $location, scaService) {

    var panelId = 'task-detail';
    $scope.task = null;

    // State of classification and display variables
    $scope.classificationStatus = null;
    $scope.classificationDisplayText = null;
    $scope.classificationDisplayColor = null;

    function setClassifyDisplay(status) {
      $scope.classificationStatus = status;
      switch ($scope.classificationStatus) {
        case 'FAILED':
          $scope.classificationDisplayText = 'Classification Failed';
          $scope.classificationDisplayColor = 'red';
          break;
        case 'RUNNING':
          $scope.classificationDisplayText = 'Classification Running';
          $scope.classificationDisplayColor = 'amber';
          break;
        case 'COMPLETED':
        case 'READY':
          $scope.classificationDisplayText = 'Classify';
          $scope.classificationDisplayColor = 'green';
          break;
        default:
          $scope.classificationDisplayText = 'Unexpected Problem';
          $scope.classificationDisplayColor = 'red';
          break;
      }
    }


    // watch for classification information from edit.js
    $rootScope.$on('setClassification', function setClassification(event, data) {
      console.debug('task.js received setClassification event', data);

      setClassifyDisplay(data.status);
      $scope.classification = data;
    });

    // watch for updates to edit panel from conceptEdit.js
    $rootScope.$on('conceptEdit.saveSuccess', function enableClassification(event, data) {
      console.debug('task.js received saveSuccess notification');
      $scope.classificationStatus = 'READY';
      $scope.classificationDisplayText = 'Classify';
      $scope.classificationDisplayColor = 'green';
    });

    $scope.classify = function() {
      scaService.startClassificationForTask($routeParams.projectKey, $routeParams.taskKey).then(function(response) {

        console.debug('Classification start response', response);

        // save the id for convenience
        $scope.classificationId = response.data.id;

        // save the status:  FAILED, RUNNING, COMPLETED
        setClassifyDisplay(response.data.status);

        // if running, broadcast to edit.js for polling
        if ($scope.classificationStatus === 'RUNNING') {
          $rootScope.$broadcast('startClassification', $scope.classificationId);
        }
      });
    };

    $scope.submitForReview = function() {
      scaService.updateTask(
        $routeParams.projectKey, $routeParams.taskKey,
        {
          'status': 'In Review'
        });
    };

    function initialize() {
      scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
        $scope.task = response;
      });

      // initialize classification display with ready status
      setClassifyDisplay('READY');
    }

    initialize();

  }]);
