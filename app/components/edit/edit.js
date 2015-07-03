'use strict';

angular.module('singleConceptAuthoringApp.edit', [
  //insert dependencies here
  'ngRoute'
])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/edit/:projectId/:taskId', {
        controller: 'EditCtrl',
        templateUrl: 'components/edit/edit.html'
      });
  })

  .controller('EditCtrl', function AboutCtrl($scope, $rootScope, scaService, $routeParams) {
    
    $rootScope.pageTitle = 'Edit Concept';

    // get the required ui state elements
    scaService.getUIState(
      $routeParams.projectId, $routeParams.taskId, 'saved-list')
      .then(function (uiState) {
        if (!uiState || !uiState.items) {
          $scope.savedList = {'items':[]};
        }
        else {
          $scope.savedList = uiState;
        }
        console.debug('saved-list', $scope.savedList);
      }
    );
    $scope.tabs = ['Log', 'Timeline', 'Messages'];
    $scope.popover = {
      placement: 'left',
      'title': 'Title',
      'content': 'Hello Popover<br />This is a multiline message!'
    };

  });