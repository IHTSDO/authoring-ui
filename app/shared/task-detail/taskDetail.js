'use strict';
angular.module('singleConceptAuthoringApp.taskDetail', [])

  .controller('taskDetailCtrl', ['$rootScope', '$scope', '$routeParams', '$location', 'scaService', 'snowowlService', 'notificationService', function taskDetailCtrl($rootScope, $scope, $routeParams, $location, scaService, snowowlService, notificationService) {

    var panelId = 'task-detail';
    $scope.task = null;

    // State of classification and display variables
    $scope.classificationStatus = null;
    $scope.classificationDisplayText = null;
    $scope.classificationDisplayColor = null;

    // rebase and promotion variables
    $scope.canPromote = false;

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
    $scope.promote = function(){

      notificationService.sendMessage('Promoting task...', 0);

      // force refresh of task status
      scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function(response) {
        if (response) {
          $scope.task = response;

          if ($scope.task.branchState === 'BEHIND' || $scope.task.branchState === 'DIVERGED' || $scope.task.branchState === 'STALE') {
            notificationService.sendError('Error promoting task -- rebase required first');
            return;
          }

          if ($scope.task.branchState === 'UP_TO_DATE') {
            notificationService.sendWarning('Cannot promote task -- already up to date');
          }

          scaService.promoteTask($routeParams.projectKey, $routeParams.taskKey).then(function(response) {
          });
        } else {
          notificationService.sendError('Error promoting task: Could not verify task was eligible for promotion', 0);
        }
      });


    };

    $scope.startValidation = function() {
      notificationService.sendMessage('Submitting task for validation...');
      scaService.startValidationForTask($routeParams.projectKey, $routeParams.taskKey).then(function(response) {
        notificationService.sendMessage('Task successfully submitted for validation', 10000, null);
      }, function() {
        notificationService.sendMessage('Error submitting task for validation', 5000, null);
      });
    };
    $scope.submitForReview = function() {
      scaService.updateTask(
        $routeParams.projectKey, $routeParams.taskKey,
        {
          'status': 'IN_REVIEW'
        });
    };

    function initialize() {
      scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
        $scope.task = response;
        if($scope.task.branchState === 'DIVERGED'){
            $rootScope.$broadcast('branchDiverged');
        }
      });

      // initialize classification display with ready status
      setClassifyDisplay('READY');
    }

    // re-initialize if branch state changes
    $scope.$on('notification.branchState', function(event, data) {
      initialize();
    });

    // re-initialize if concept edit triggers change from New status
    $scope.$on('conceptEdit.saveSuccess', function(event, data) {
      if ($scope.task.status === 'New') {
        initialize();
      }
    });

    initialize();

  }]);
