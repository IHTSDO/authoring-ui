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

  .controller('EditCtrl', function AboutCtrl($scope, $rootScope, scaService, snowowlService, $routeParams) {

    $rootScope.pageTitle = 'Edit Concept';

    // TODO: Update this when branching is enabled
    var branch = 'MAIN';

    // concept scope variables
    $scope.properties = null;
    $scope.pt = null;
    $scope.descriptions = null;
    $scope.relationshipsInbound = null;
    $scope.relationshipsOutbound = null;

    // get the required ui state elements
    scaService.getUIState(
      $routeParams.projectId, $routeParams.taskId, 'saved-list')
      .then(function (uiState) {
        if (!uiState || !uiState.items) {
          $scope.savedList = {'items': []};
        }
        else {
          $scope.savedList = uiState;
        }
        console.debug('saved-list', $scope.savedList);
      }
    );

    // watch for concept selection from the edit sidebar
    $scope.$on('savedList.selectConceptId', function (event, data) {
      console.debug('EditCtrl: notification savedList.selectConceptId', data.conceptId);

      if (!data || !data.conceptId) {
        return;
      }
      var conceptId = data.conceptId;

      snowowlService.getConceptProperties(conceptId, branch).then(function (response) {
        console.debug('concept properties', response);
        $scope.properties = response;

      });
      snowowlService.getConceptPreferredTerm(conceptId, branch).then(function (response) {
        $scope.pt = response;
      });
      snowowlService.getConceptDescriptions(conceptId, branch).then(function (response) {
        console.debug('concept descriptions', response);
        $scope.descriptions = response;
        console.debug('descriptions', $scope.descriptions);
      });
      snowowlService.getConceptRelationshipsInbound(conceptId, branch).then(function (response) {
        console.debug('concept relationships inbound', response);
        $scope.relationshipsInbound = response;

        // get the concept names for display
        angular.forEach($scope.relationshipsInbound, function (rel) {
          snowowlService.getConceptPreferredTerm(rel.sourceId, branch).then(function (response) {
            rel.sourceName = response.term;
          });
        });
      });
      snowowlService.getConceptRelationshipsOutbound(conceptId, branch).then(function (response) {
        console.debug('concept relationships outbound', response);
        $scope.relationshipsOutbound = response;

        // get the concept names for display
        angular.forEach($scope.relationshipsOutbound, function (rel) {
          snowowlService.getConceptPreferredTerm(rel.destinationId, branch).then(function (response) {
            rel.destinationName = response.term;
          });
        });

        console.debug($scope.relationshipsOutbound);
      });
    });
  });