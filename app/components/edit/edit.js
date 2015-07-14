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

  .controller('EditCtrl', function AboutCtrl($scope, $rootScope, scaService, snowowlService, objectService, $routeParams, $timeout) {
    $scope.conceptLoaded = false;
    $rootScope.pageTitle = 'Edit Concept';
    $scope.count = 1;
    $scope.showModel = function (length, concept) {
      if (length === $scope.count) {
        $scope.conceptLoaded = true;
        $timeout(function() {
            $scope.resizeSvg(concept);
        }, 200);
        
        $scope.count = 1;
      }
      else {
        $scope.count++;
      }
    };
    
    $scope.resizeSvg = function(concept){
        var height = $('#editPanel-' + concept.id).find('.editHeightSelector').height() + 42;
        var elem = document.getElementById('model' + concept.id);
        console.log(elem);
        elem.setAttribute('height', height + 'px');
    };

    // TODO: Update this when $scope.branching is enabled
    $scope.branch = 'MAIN';

    // displayed concept array
    $scope.concepts = [];

    // easy-access concept id list for edit panel ui state updates
    // initialized as null, an empty list is []
    $scope.editPanelUiState = null;

    var panelId = 'edit-panel';

    scaService.getUIState(
      $routeParams.projectId, $routeParams.taskId, 'edit-panel')
      .then(function (uiState) {

        if (!uiState || Object.getOwnPropertyNames(uiState).length === 0) {
          $scope.editPanelUiState = [];
        }
        else {
          $scope.editPanelUiState = uiState;
          for (var i = 0; i < $scope.editPanelUiState.length; i++) {
            $scope.addConceptToListFromId($scope.editPanelUiState[i]);
          }
        }

      }
    );

    $scope.addConceptToListFromId = function (conceptId) {

      if (!conceptId) {
        return;
      }
      // get the concept and add it to the stack
      snowowlService.getFullConcept(conceptId, $scope.branch).then(function (response) {
        $scope.concepts.push(response);
      });
    };

    // helper function to save current edit list
    $scope.updateUiState = function() {

      console.debug('saving ui state');

      scaService.saveUIState($routeParams.projectId, $routeParams.taskId, panelId, $scope.editPanelUiState);
    };

    // watch for concept selection from the edit sidebar
    $scope.$on('savedList.editConcept', function (event, data) {
      $scope.conceptLoaded = false;
      if (!data || !data.conceptId) {
        $scope.conceptLoaded = false;
        return;
      }

      $scope.addConceptToListFromId(data.conceptId);
      $scope.editPanelUiState.push(data.conceptId);
      $scope.updateUiState();

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
          $scope.editPanelUiState.push(conceptId);
          $scope.updateUiState();
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

        // update the ui state
        $scope.saveUiState();
      });
    });

    // watch for removal request from concept-edit
    $scope.$on('conceptEdit.removeConcept', function (event, data) {
      if (!data || !data.concept) {
        console.error('Cannot remove concept: concept must be supplied');
        return;
      }

      // remove the concept
      var index = $scope.concepts.indexOf(data.concept);
      console.debug('index', index);
      $scope.concepts.splice(index, 1);
      $scope.editPanelUiState.splice($scope.editPanelUiState.indexOf(data.concept.id), 1);
      $scope.updateUiState();

    });

    // watch for removal request from concept-edit
    $scope.$on('conceptEdit.updateConcept', function (event, data) {
      if (!data || !data.newConcept || !data.oldConcept) {
        console.error('Cannot remove concept: must specify both new content and concept to replace');
        return;
      }

      var index = $scope.concepts.indexOf(data.oldConcept);

      // TODO Once refactoring of concept object done (to match server
      // structure), replace old concept with newly updated
      // console.debug('FOUND CONCEPT TO REMOVE', index);
      // $scope.concepts.splice(index, 1, data.newConcept);
    });

    $scope.createConcept = function () {
      var concept = objectService.getNewConcept($scope.branch);
      $scope.concepts.push(concept);

      // TODO Add ui-state improvement once concept is saved
    };

// removes concept from editing list (unused currently)
    $scope.closeConcept = function (index) {
      if ($scope.concepts) {
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
  })
;