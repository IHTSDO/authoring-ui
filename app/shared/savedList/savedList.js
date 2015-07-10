'use strict';
angular.module('singleConceptAuthoringApp.savedList', [])

  .controller('savedListCtrl', ['$scope', '$rootScope', '$location', 'scaService', 'snowowlService', '$routeParams', function savedListCtrl($scope, $rootScope, $location, scaService, snowowlService, $routeParams) {

    // name of the panel for the Saved List
    var panelId = 'edit-panel';

    // scope function to save UI state for project, task, and panel
    // TODO Here just for the sake of wiring, unused
    $scope.saveUIState = function (projectKey, taskKey, uiState) {
      console.log('Saving: ' + panelId);
      scaService.saveUIState(
        projectKey, taskKey, panelId, uiState)
        .then(function (uiState) {
          return uiState;
        });
    };

    // scope function to get UI state for project, task, and panel
    // TODO Here just for the sake of wiring, unused

    // function to select an item from the saved list
    // broadcasts selected conceptId
    $scope.selectItem = function (item) {
      if (item) {
        $scope.items.push(item.concept.conceptId);
        $scope.saveUIState($routeParams.projectId, $routeParams.taskId, $scope.items);
        $rootScope.$broadcast('savedList.editConcept', { conceptId : item.concept.conceptId } );
      }
    };

    $scope.clone = function(item) {
      if (item) {
        $scope.items.push(item.concept.conceptId);
        $scope.saveUIState($routeParams.projectId, $routeParams.taskId, $scope.items);
        $rootScope.$broadcast('savedList.cloneConcept', { conceptId : item.concept.conceptId });
      }
    };

    $scope.getConceptPropertiesObj = function(item) {
      return {id: item.concept.conceptId, name: item.term};
    };

  }]);
