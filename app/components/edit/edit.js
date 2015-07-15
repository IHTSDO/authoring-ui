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

    $rootScope.pageTitle = 'Edit Concept';

    $scope.resizeSvg = function (concept) {
      var height = $('#editPanel-' + concept.conceptId).find('.editHeightSelector').height() + 42;
      var elem = document.getElementById('model' + concept.conceptId);
      console.log(elem);
      elem.setAttribute('height', height + 'px');
    };

    // TODO: Update this when $scope.branching is enabled
    $scope.branch = 'MAIN/' + $routeParams.projectId + '/' + $routeParams.taskId;

    // displayed concept array
    $scope.concepts = [];

    // easy-access concept id list for edit panel ui state updates
    // initialized as null, an empty list is []
    $scope.editPanelUiState = null;

    var panelId = 'edit-panel';

    // get edit panel list
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

    // get saved list
    scaService.getUIState(
      $routeParams.projectId, $routeParams.taskId, 'saved-list')
      .then(function (uiState) {

        if (!uiState || Object.getOwnPropertyNames(uiState).length === 0) {
          $scope.savedList = {items: []};
        }
        else {
          $scope.savedList = uiState;
        }

      }
    );

    $scope.addConceptToListFromId = function (conceptId) {

      if (!conceptId) {
        return;
      }
      // get the concept and add it to the stack
      snowowlService.getFullConcept(conceptId, $scope.branch).then(function (response) {

        if (!response) {
          return;
        }

        console.debug(response);

        $scope.concepts.push(response);
        $timeout(function () {
          $scope.resizeSvg(response);
        }, 800);

      });
    };

    // helper function to save current edit list
    $scope.updateUiState = function () {

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


        var conceptId = response.conceptId;
        var conceptEt = response.effectiveTime;

        // check if original concept already exists, if not add it
        var conceptExists = false;
        angular.forEach($scope.concepts, function (concept) {

          if (concept.properties.id === conceptId && concept.properties.effectiveTime === conceptEt) {
            conceptExists = true;
          }
        });
        if (!conceptExists) {
          $scope.concepts.push(response);
          $timeout(function () {
            $scope.resizeSvg(response);
          }, 800);
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

        $timeout(function () {
          $scope.resizeSvg(clonedConcept);
        }, 600);


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

      console.debug('edit.js, conceptEdit.updateConcept notification', data);
      if (!data || !data.newConcept || !data.oldConcept) {
        console.error('Cannot remove concept: must specify both new content and concept to replace');
        return;
      }
    
      var index;

      console.debug('old list', $scope.concepts);
      if(data.newConcept.conceptId === data.oldConcept.conceptId){
          index = $scope.concepts.indexOf(data.oldConcept);
      }
//      else{
//          
//      }
//      
//        
//      // replace the item
//      
//      angular.forEach($scope.concepts, function(item){
//          
//      });
        
      
//      if (index === -1) {
//        $scope.concepts.push(data.newConcept);
//      }
      else {
        $scope.concepts.splice(index, 1, data.newConcept);
      }

      console.debug('new list', $scope.concepts);

      // update the UI state if concept not saved
      if ($scope.editPanelUiState.indexOf(data.newConcept.conceptId) === -1 && data.newConcept.conceptId) {
        $scope.editPanelUiState.push(data.newConcept.conceptId);
        $scope.updateUiState();
        $timeout(function () {
          $scope.resizeSvg(data.newConcept);
        }, 600);

      }
    });

    $scope.createConcept = function () {
      var concept = objectService.getNewConcept($scope.branch);

      // add IsaRelationship
      //concept.relationships
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

  })
;