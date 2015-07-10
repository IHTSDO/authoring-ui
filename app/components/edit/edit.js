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
    $scope.conceptLoaded = false;
    $rootScope.pageTitle = 'Edit Concept';
    $scope.count = 1;
    $scope.items = [];
    $scope.showModel = function (length) {
      if (length === $scope.count) {
        console.log($scope.count + ' ' + length);
        $scope.conceptLoaded = true;
        $scope.count = 1;
      }
      else {
        $scope.count++;
      }
    };

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
      }
    );
    scaService.getUIState(
      $routeParams.projectId, $routeParams.taskId, 'edit-panel')
      .then(function (uiState) {
        console.log(uiState);
        $scope.items = uiState;
        for (var i = 0; i < $scope.items.length; i++ ) {
          $rootScope.$broadcast('savedList.editConcept', { conceptId : $scope.items[i] } );
        }
        console.log($scope.items);
        
      }
    );

    // watch for concept selection from the edit sidebar
    $scope.$on('savedList.editConcept', function (event, data) {
      console.log("Watcher");
      $scope.conceptLoaded = false;
      if (!data || !data.conceptId) {
        $scope.conceptLoaded = false;
        return;
      }
      // get the concept and add it to the stack
      snowowlService.getFullConcept(data.conceptId, $scope.branch).then(function (response) {
        console.debug('full concept received', response);
        $scope.concepts.push(response);
      });
    });

    // watch for concept cloning from the edit sidebar
    $scope.$on('savedList.cloneConcept', function (event, data) {

      if (!data || !data.conceptId) {
        return;
      }

      var concept = {'id': null, 'branch': $scope.branch};

      // get the concept and add it to the stack
      snowowlService.getFullConcept(data.conceptId, $scope.branch).then(function (response) {

        var conceptId = response.properties.id;
        var conceptEt = response.properties.effectiveTime;

        // check if original concept already exists, if not add it
        var conceptExists = false;
        angular.forEach($scope.concepts, function (concept) {

          if (concept.properties.id === conceptId && concept.properties.effectiveTime === conceptEt) {
            conceptExists = true;
          }
        });
        if (!conceptExists) {
          $scope.concepts.push(response);
        }

        // deep copy the object -- note: does not work in IE8, but screw that!
        var clonedConcept = JSON.parse(JSON.stringify(response));

        // add a cloned tag to differentiate the clonedConcept
        clonedConcept.pt.term += ' [Cloned]';

        // clear the id and effectiveTime of the descriptions and relationships
        angular.forEach(clonedConcept.descriptions, function (description) {
          description.id = null;
          description.effectiveTime = null;
        });

        angular.forEach(clonedConcept.relationship, function (relationship) {
          relationship.id = null;
          relationship.effectiveTime = null;
        });

        // push the cloned clonedConcept
        $scope.concepts.push(clonedConcept);
      });
    });

    $scope.createConcept = function() {
      var concept = objectService.getNewConcept($scope.branch);
      $scope.concepts.push(concept);
    };

    // removes concept from editing list (unused currently)
    $scope.closeConcept = function (concept) {
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

    /**
     * Function called when
     */
    $scope.dropConcept = function (conceptProperties) {
      // check conceptProperties requirements
      if (!conceptProperties) {
        console.error('Concept properties object dropped is empty');
        return;
      }
      if (!conceptProperties.id) {
        console.error('Concept properties object dropped has no id');
      }
      if (!conceptProperties.pt) {
        console.error('Concept properties object dropped has no name');
      }
      if (!conceptProperties.effectiveTime) {
        console.error('Concept properties object dropped has no effectiveTime');
      }
      if (!conceptProperties.branch) {
        console.error('Concept properties object dropped has no branch');
      }

      // ensure this concept is not already present
      angular.forEach($scope.concepts, function (concept) {

        // TODO Revisit once branching enabled
        // check if this concept already exists
        if (concept.id === conceptProperties.id && concept.pt === conceptProperties.pt && concept.effectiveTime === conceptProperties.effectiveTime && $scope.branch === conceptProperties.branch) {

          console.warn('Concept already on list:', conceptProperties);
          return;
        }
        // get the concept and add it to the stack
        snowowlService.getFullConcept(conceptProperties.conceptId, $scope.branch).then(function (response) {
          $scope.concepts.push(response);
        });
      });

    };
  });