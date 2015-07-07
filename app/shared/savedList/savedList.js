'use strict';
angular.module('singleConceptAuthoringApp.savedList', [])

  .controller('savedListCtrl', ['$scope', '$rootScope', '$location', 'scaService', 'snowowlService', function savedListCtrl($scope, $rootScope, $location, scaService, snowowlService) {

    // name of the panel for the Saved List
    var panelId = 'saved-list';

    // scope function to save UI state for project, task, and panel
    // TODO Here just for the sake of wiring, unused
    $scope.saveUIState = function (projectKey, taskKey, uiState) {
      scaService.saveUIStateForProjectAndTaskAndPanel(
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
        $rootScope.$broadcast('savedList.selectConceptId', { conceptId : item.concept.conceptId } );
      }
    };

  }]);
