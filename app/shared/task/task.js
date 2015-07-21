'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('taskCtrl', ['$scope', '$rootScope', '$modalInstance', 'scaService', function ($scope, $rootScope, $modalInstance, scaService) {

    // scope variables
    $scope.projects = null;

    ///////////////////////////////////////////

    // TODO Temporary function to retrieve projects for picklist, should be
    // cached values
    function initialize() {
      scaService.getProjects().then(function (response) {
        $scope.projects = response;

        // set default project to first project (if it exists)
        if ($scope.projects && $scope.projects.length > 0) {
          $scope.taskProject = $scope.projects[0];
        }
      }, function (error) {
        // TODO Handle error
      });
    }

    // TODO Consider relaxing jshint to allow functions to be called pre
    // declaration
    initialize();

    // closes the modal instance (if applicable)
    $scope.close = function() {
      $modalInstance.close();
    };

    // Creates a task from modal form
    $scope.createTask = function (taskTitle, taskProject, taskDetails) {

      // check that all required fields are present
      if (!taskTitle) {
        window.alert('You must specify a title');
        return;
      }
      if (!taskProject) {
        window.alert('You must specify a project');
        return;
      }
      if (!taskDetails) {
        window.alert('You must specify task details');
        return;
      }

      // create JSON object for task creation and call API
      var authoringTaskCreateRequest = {
        'summary': taskTitle,
        'description': taskDetails
      };
      scaService.createTaskForProject(taskProject.key, authoringTaskCreateRequest).then(
        function (response) {

          $scope.msgSuccess = 'Task successfully created: ' + response.data.summary;
          $scope.taskTitle = '';
          $scope.taskProject = '';
          $scope.taskDetails = '';

          // broadcast new task to any listening pages
          $rootScope.$broadcast('taskCreated', response.data);
          $modalInstance.close();
      }, function (error) {
          $scope.msgError = 'Error occurred when trying to create task';
      });

    };

    $scope.clearMessages = function() {
      $scope.msgError = '';
      $scope.msgSuccess = '';
    };
  }]);
