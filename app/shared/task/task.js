'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('taskCtrl', function ($scope, $rootScope, $modalInstance, scaService, metadataService, task, canDelete, $location, accountService) {

    // scope variables
    $scope.projects = null;
    $scope.task = task;
    $scope.canDelete = canDelete;
    $scope.preferences = {};

    // if no task passed in, create empty object
    if (!$scope.task) {
      $scope.task = {};
    }

    ///////////////////////////////////////////

    // TODO Temporary function to retrieve projects for picklist, should be
    // cached values
    function initialize() {
      $scope.disabled = false;
      $scope.projects = metadataService.getProjects();

      accountService.getUserPreferences().then(function (preferences) {
        $scope.preferences = preferences;
        
        if(preferences.hasOwnProperty("lastProjectKey") && !$scope.task.key) {
          $scope.task.projectKey = $scope.preferences.lastProjectKey;
        }
      });
      
    }

    // TODO Consider relaxing jshint to allow functions to be called pre
    // declaration

	   // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };
    initialize();



    // Creates a task from modal form
    $scope.createTask = function (openTask) {

      // check that all required fields are present
      if (!$scope.task.summary) {
        window.alert('You must specify a title');
        return;
      }
      if (!$scope.task.projectKey) {
        window.alert('You must specify a project');
        return;
      }
      $scope.msgError = null;
      $scope.msgSuccess = 'Creating task...';
      $scope.disabled = true;
      scaService.createTaskForProject($scope.task.projectKey, $scope.task).then(
        function (response) {
          if (openTask) {
            $modalInstance.close();
            $location.url('tasks/task/' + response.projectKey + '/' + response.key + '/edit');
          } else {
            // close modal
            $modalInstance.close(response);
          }

          $scope.preferences.lastProjectKey = $scope.task.projectKey;
          accountService.saveUserPreferences($scope.preferences);
          
        }, function (error) {
          $scope.disabled = false;
          $scope.msgSuccess = '';
          $scope.msgError = 'Error occurred when trying to create task: ' + error;
        });

    };

    $scope.createAndOpenTask = function () {
      $scope.createTask(true);
    };

    $scope.updateTask = function () {

      // check that all required fields are present
      if (!$scope.task.summary) {
        window.alert('You must specify a title');
        return;
      }
      var taskUpdate = {};
      taskUpdate.summary = $scope.task.summary;
      taskUpdate.description = $scope.task.description;

      $scope.msgError = null;
      $scope.msgSuccess = 'Updating task...';
      $scope.disabled = true;
      scaService.updateTask($scope.task.projectKey, $scope.task.key, taskUpdate).then(function (response) {
        $modalInstance.close(response);
      }, function (error) {
        $scope.disabled = false;
        $scope.msgSuccess = '';
        $scope.msgError = 'Error occurred when trying to update task: ' + error;
      });
    };

    $scope.deleteTask = function() {
      $scope.msgSuccess = 'Deleting task...';
      $scope.disabled = true;

      var taskUpdate = {};
      taskUpdate.status = 'DELETED';

      scaService.updateTask($scope.task.projectKey, $scope.task.key, taskUpdate).then(function () {
        $modalInstance.close('DELETED');
      }, function (error) {
        $scope.disabled = false;
        $scope.msgSuccess = '';
        $scope.msgError = 'Error occurred when trying to delete task: ' + error;
      });
    };

    $scope.clearMessages = function () {
      $scope.msgError = '';
      $scope.msgSuccess = '';
    };
  });
