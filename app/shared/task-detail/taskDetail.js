'use strict';
angular.module('singleConceptAuthoringApp.taskDetail', [])

  .controller('taskDetailCtrl', ['$scope', '$routeParams', '$location', 'scaService', function taskDetailCtrl($scope, $routeParams, $location, scaService) {

    var panelId = 'task-detail';
    $scope.task = null;

    // scope function to save UI state for project, task, and panel
    // TODO Here just for the sake of wiring, unused
    $scope.saveUIState = function (projectKey, taskKey, uiState) {
      scaService.saveUIStateForProjectAndTaskAndPanel(
        projectKey, taskKey, panelId, uiState)
        .then(function (uiState) {
          return uiState;
        });
    };

    function initialize() {
      scaService.getTaskForProject($routeParams.projectId, $routeParams.taskId).then(function (response) {
        $scope.task = response;
      });
    }

    initialize();

  }]);
