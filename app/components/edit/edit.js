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

  .controller('EditCtrl', function AboutCtrl($scope, $rootScope, scaService, snowowlService, objectService, $routeParams) {

    $rootScope.pageTitle = 'Edit Concept';

    // TODO: Update this when $scope.branching is enabled
     $scope.branch = 'MAIN';

    // displayed concept array
    $scope.concepts = [];

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
    $scope.$on('savedList.editConcept', function (event, data) {
      console.debug('EditCtrl: notification savedList.selectConcept', data.conceptId);

      if (!data || !data.conceptId) {
        return;
      }

      // get the concept and add it to the stack
      snowowlService.getFullConcept(data.conceptId, $scope.branch).then(function(response) {
        console.debug('full concept received', response);
        $scope.concepts.push(response);
      });
    });

    // watch for concept selection from the edit sidebar
    $scope.$on('savedList.cloneConcept', function (event, data) {
      console.debug('EditCtrl: notification savedList.cloneConcept', data.conceptId);

      if (!data || !data.conceptId) {
        return;
      }

      var concept = { 'id' : null, 'branch' : $scope.branch };

      // get the concept and add it to the stack
      snowowlService.getFullConcept(data.conceptId, $scope.branch).then(function(response) {
        console.debug('full concept to clone received', response);

        // deep copy the object -- note: does not work in IE8, but screw that!
        var concept = JSON.parse(JSON.stringify(response))

        // add a cloned tag to differentiate the concept
        concept.pt.term += ' [Cloned]';
        
        // clear the descriptions
        // TODO: Need to clear the others?
        concept.descriptions = [];

        // push the cloned concept
        $scope.concepts.push(concept);
      });
    });

    // removes concept from editing list (unused currently)
    $scope.closeConcept = function(concept) {
      var index = $scope.concepts.indexOf(concept);
      if (index > -1) {
        $scope.concepts.splice(index, 1);
      }
    };

    // tab and popover controls for initial buttons
    $scope.tabs = ['Log', 'Timeline', 'Messages'];
    $scope.popover = {
      placement: 'left',
      'title': 'Title',
      'content': 'Hello Popover<br />This is a multiline message!'
    };
  });