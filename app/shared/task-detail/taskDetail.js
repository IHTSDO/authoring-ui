'use strict';
angular.module('singleConceptAuthoringApp.taskDetail', [])

  .controller('taskDetailCtrl', ['$rootScope', '$scope', '$routeParams', '$location', '$timeout', '$modal', 'scaService', 'snowowlService', 'notificationService',
    function taskDetailCtrl($rootScope, $scope, $routeParams, $location, $timeout, $modal, scaService, snowowlService, notificationService) {

      $scope.task = null;

      $scope.classify = function () {

        notificationService.sendMessage('Starting classification for task ' + $routeParams.taskKey, 5000);
        
        scaService.startClassificationForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {

          if (!response || !response.data || !response.data.id) {
            notificationService.sendError('Error starting classification');
            return;
          }

          if (response.data.status) {
            notificationService.sendMessage('Classification is ' + response.data.status, 10000);
          } else {
            notificationService.sendMessage('Task submitted for classification', 10000);
          }

          // save the id for convenience
          $scope.classificationId = response.data.id;

          // if running, broadcast to edit.js for polling
          if ($scope.classificationStatus === 'RUNNING') {
            $rootScope.$broadcast('startClassification', $scope.classificationId);
          }
        });
      };
      $scope.promote = function () {

        notificationService.sendMessage('Promoting task...', 0);

        // force refresh of task status
        scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          if (response) {
            $scope.task = response;

            if ($scope.task.branchState === 'BEHIND' || $scope.task.branchState === 'DIVERGED' || $scope.task.branchState === 'STALE') {
              notificationService.sendError('Error promoting task -- rebase required first');
              return;
            }

            if ($scope.task.branchState === 'UP_TO_DATE') {
              notificationService.sendWarning('Cannot promote task -- already up to date');
            }

            scaService.promoteTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
            });
          } else {
            notificationService.sendError('Error promoting task: Could not verify task was eligible for promotion', 0);
          }
        });

      };

      $scope.startValidation = function () {
        notificationService.sendMessage('Submitting task for validation...');
        scaService.startValidationForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          notificationService.sendMessage('Task successfully submitted for validation', 10000, null);
        }, function () {
          notificationService.sendMessage('Error submitting task for validation', 5000, null);
        });
      };
      $scope.submitForReview = function () {
        scaService.updateTask(
          $routeParams.projectKey, $routeParams.taskKey,
          {
            'status': 'IN_REVIEW'
          });
      };

      $scope.updateTask = function() {
        var modalInstance = $modal.open({
          templateUrl: 'shared/task/task.html',
          controller: 'taskCtrl',
          resolve: {
            task: function() {
              console.debug('resolved task', $scope.task);
              return $scope.task;
            }
          }
        });

        modalInstance.result.then(function (response) {
          console.debug('modal closed with response', response);
          if (response) {
            $scope.task = response.data;
          }
        }, function () {
        });
      };


      function initialize() {
        scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          $scope.task = response;
          if ($scope.task.branchState === 'DIVERGED') {
            $rootScope.$broadcast('branchDiverged');
          }
        });
      }

      // re-initialize if branch state changes
      $scope.$on('notification.branchState', function (event, data) {
        initialize();
      });

      // re-initialize if concept change occurs and task is new
      $scope.$on('conceptEdit.conceptChange', function(event, data) {
        if ($scope.task.status === 'NEW') {
          initialize();
        }
      });

      initialize();

    }]);
