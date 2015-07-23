'use strict';
angular.module('singleConceptAuthoringApp.taskDetail', [])

  .controller('taskDetailCtrl', ['$rootScope', '$scope', '$routeParams', '$location', 'scaService', 'snowowlService', function taskDetailCtrl($rootScope, $scope, $routeParams, $location, scaService) {

    var panelId = 'task-detail';
    $scope.task = null;

    $rootScope.$on('setClassification', function setClassification(event, data) {

      console.debug('task.js received setClassification event', data);

    });

    // scope function to save UI state for project, task, and panel
    // TODO Here just for the sake of wiring, unused
    $scope.saveUIState = function (projectKey, taskKey, uiState) {
      scaService.saveUIStateForProjectAndTaskAndPanel(
        projectKey, taskKey, panelId, uiState)
        .then(function (uiState) {
          return uiState;
        });
    };

    $scope.classify = function() {
      scaService.startClassification($routeParams.projectId, $routeParams.taskId).then(function(response) {
        $rootScope.$broadcast('startClassification', {result : response});
      })
    };



    function initialize() {
      scaService.getTaskForProject($routeParams.projectId, $routeParams.taskId).then(function (response) {
        $scope.task = response;
      });
    }

    initialize();

  }]);
