'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('taskCtrl', function ($scope, $rootScope, $modalInstance, scaService, metadataService, task, canDelete) {

    console.debug('task.js with task', task);
    // scope variables
    $scope.projects = null;
    $scope.task = task;
    $scope.canDelete = canDelete;

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
    }

    // TODO Consider relaxing jshint to allow functions to be called pre
    // declaration
    initialize();

    // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };

    // Creates a task from modal form
    $scope.createTask = function () {

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

          console.debug('MODAL: task created', response);
          // close modal
          $modalInstance.close(response);
        }, function (error) {
          $scope.disabled = false;
          $scope.msgSuccess = '';
          $scope.msgError = 'Error occurred when trying to create task: ' + error;
        });

    };

    $scope.updateTask = function () {

      console.debug('updateTask', $scope.task);

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

      scaService.updateTask($scope.task.projectKey, $scope.task.key, taskUpdate).then(function (response) {
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
