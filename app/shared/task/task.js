'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('taskCtrl', ['$scope', '$rootScope', 'bootstrap3ElementModifier', 'scaService', function ($scope, $rootScope, bootstrap3ElementModifier, scaService) {

    bootstrap3ElementModifier.enableValidationStateIcons(false);

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

    // Creates a task from modal form
    $scope.createTask = function (taskTitle, taskProject, taskDetails) {

      // check that all required fields are present
      if (!taskTitle) {
        window.alert('You must specify a title');
      }
      if (!taskProject) {
        window.alert('You must specify a project');
      }
      if (!taskDetails) {
        window.alert('You must specify task details');
      }

      // create JSON object for task creation and call API
      var authoringTaskCreateRequest = {
        'summary': taskTitle,
        'description': taskDetails
      };
      scaService.createTaskForProject(taskProject.key, authoringTaskCreateRequest).then(
        function (response) {

          console.debug('TaskCtrl, created task: ', response);

          $scope.msgSuccess = 'Task successfully created: ' + response.data.summary;
          $scope.taskTitle = '';
          $scope.taskProject = '';
          $scope.taskDetails = '';

          // broadcast new task to any listening pages
          $rootScope.$broadcast('taskCreated', response.data);
      }, function (error) {
          $scope.msgError = 'Error occurred when trying to create task';
      });

    };

    $scope.clearMessages = function() {
      $scope.msgError = '';
      $scope.msgSuccess = '';
    }
  }]);
