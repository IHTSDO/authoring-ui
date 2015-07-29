'use strict';

angular.module('singleConceptAuthoringApp.edit', [
  //insert dependencies here
  'ngRoute'
])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/edit/:projectId/:taskId', {
        controller: 'EditCtrl',
        templateUrl: 'components/edit/edit.html',
        resolve: {
          classifyMode: function () {
            return false;
          }
        }
      });

    $routeProvider
      .when('/classify/:projectId/:taskId', {
        controller: 'EditCtrl',
        templateUrl: 'components/edit/edit.html',
        resolve: {
          classifyMode: function () {
            return true;
          }
        }
      });
  })

  .controller('EditCtrl', function EditCtrl($scope, $rootScope, scaService, snowowlService, objectService, $routeParams, $timeout, classifyMode) {

    // TODO: Update this when $scope.branching is enabled
    $scope.branch = 'MAIN/' + $routeParams.projectId + '/' + $routeParams.taskId;
    $scope.projectKey = $routeParams.projectId;
    $scope.taskKey = $routeParams.taskId;

    // displayed concept array
    $scope.concepts = [];

    // ui states
    $scope.editPanelUiState = null;
    $scope.savedList = null;

    // miscellaneous
    $scope.saveIndicator = false;
    $rootScope.pageTitle = $scope.classifyMode ? 'Classification / ' + $routeParams.projectId + ' / ' + $routeParams.taskId: 'Edit Concept / ' + $routeParams.projectId + ' / ' + $routeParams.taskId;

    // initialize hide element variables
    $scope.hideSidebar = classifyMode;
    $scope.hideModel = classifyMode;
    $scope.hideClassification = !classifyMode;

    $scope.thisView = null;
    $scope.lastView = null;

    $scope.setView = function (name) {
      // console.debug('setting view (requested, this, last)', name,
      // $scope.thisView, $scope.lastView); do nothing if no name supplied
      if (!name) {
        return;
      }
      // if same state requested, do nothing
      if (name === $scope.thisView) {
        return;
      }

      // special case for returning to edit view from classify view
      if (name === 'edit') {
        if (!$scope.lastView || $scope.lastView === 'classification') {
          name = 'edit-default';
        } else {
          name = $scope.lastView;
        }
      }

      // set this and last view
      $scope.lastView = $scope.thisView;
      $scope.thisView = name;

      switch ($scope.thisView) {
        case 'classification':
          $scope.hideClassification = false;
          $scope.hideModel = true;
          $scope.hideSidebar = true;
          break;
        case 'edit-default':
          $scope.hideClassification = true;
          $scope.hideModel = false;
          $scope.hideSidebar = false;
          break;
        case 'edit-no-sidebar':
          $scope.hideClassification = true;
          $scope.hideModel = false;
          $scope.hideSidebar = true;
          break;
        case 'edit-no-model':
          $scope.hideClassification = true;
          $scope.hideModel = true;
          $scope.hideSidebar = false;
          break;
        default:
          break;
      }

      $rootScope.$broadcast('layoutChanged');
    };

    // set the initial view
    if ($scope.hideClassification) {
      $scope.setView('edit-default');
    } else {
      $scope.setView('classification');
    }

    // function to resize svg elements for concept models
    $scope.resizeSvg = function (concept) {

      // if in classify mode, modify side-by-side models
      if (classifyMode) {
        // do nothing currently
      }

      // if in edit mode, modify the central model diagrams
      else {

        // get the svg drawModel object
        var elem = document.getElementById('model' + concept.conceptId);

        // get the parent div containing this draw model object
        var parentElem = document.getElementById('drawModel' + concept.conceptId);

        if (!elem || !parentElem) {
          // console.debug('could not find svg element or parent div', elem,
          // parentElem);
          return;
        }

        // set the height and width`
        var width = parentElem.offsetWidth - 30;
        var height = $('#editPanel-' + concept.conceptId).find('.editHeightSelector').height() + 41;

        // check that element is actually visible (i.e. we don't have negative
        // width)
        if (width < 0) {
          return;
        }

        elem.setAttribute('width', width);
        elem.setAttribute('height', height);
      }
    };

// function to flag items in saved list if they exist in edit panel
    function flagEditedItems() {

      if ($scope.editPanelUiState && $scope.savedList) {
        // check if this item is in saved list, flag it as editing if so
        angular.forEach($scope.savedList.items, function (item) {
          // set false initially
          item.editing = false;

          // for each item in the edit list
          angular.forEach($scope.editPanelUiState, function (conceptId) {
            // check if being edited
            if (item.concept.conceptId === conceptId) {
              item.editing = true;
            }
          });
        });
      }
    }

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

        // set editing flags
        flagEditedItems();

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

        // set editing flags
        flagEditedItems();
      }
    );
    scaService.getTaskForProject($routeParams.projectId, $routeParams.taskId).then(function (response) {
        $scope.task = response;
    });

    $scope.addConceptToListFromId = function (conceptId) {

      if (!conceptId) {
        return;
      }
      // get the concept and add it to the stack
      snowowlService.getFullConcept(conceptId, $scope.branch).then(function (response) {

        if (!response) {
          return;
        }

        snowowlService.cleanConcept(response);

        // search for an FSN description to display as name
        // TODO Fix this when we finally get our concept retrieval!
        angular.forEach(response.descriptions, function (desc) {
          if (desc.type === 'FSN') {
            response.fsn = desc.term;
          }
        });

        $scope.concepts.push(response);
//        $timeout(function () {
//          $scope.resizeSvg(response);
//        }, 500);

        /*
         // force update to get FSN, not PT
         snowowlService.updateConcept($routeParams.projectId, $routeParams.taskId, response).then(function (response) {
         $scope.concepts.push(response);
         $timeout(function () {
         $scope.resizeSvg(response);
         }, 500);
         });*/

      });
    };

// helper function to save current edit list
    $scope.updateUiState = function () {
      scaService.saveUIState($routeParams.projectId, $routeParams.taskId, 'edit-panel', $scope.editPanelUiState);
    };

// watch for concept saving from the edit panel
    $scope.$on('conceptEdit.saving', function (event, data) {
      $scope.saveIndicator = true;
      $scope.saveMessage = data.concept.conceptId ? 'Saving concept with id: ' + data.concept.conceptId : 'Saving new concept';
    });
    $scope.formatDate = function (date) {
      var hours = date.getHours();
      var minutes = date.getMinutes();
      var ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      minutes = minutes < 10 ? '0' + minutes : minutes;
      var strTime = hours + ':' + minutes + ' ' + ampm;
      var offset = String(String(new Date().toString()).split('(')[1]).split(')')[0];
      return date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + '  ' + strTime + ' (' + offset + ')';
    };

// on show model requests, toggle the model if not active
    $scope.$on('conceptEdit.showModel', function (event, data) {
      if ($scope.hideModel) {
        $scope.toggleModel();
      }
    });

    $scope.$on('conceptEdit.saveSuccess', function (event, data) {
      if (data.response && data.response.conceptId) {
        $scope.saveMessage = 'Concept with id: ' + data.response.conceptId + ' saved at: ' + $scope.formatDate(new Date());


        // ensure concept is in edit panel ui state
        if ($scope.editPanelUiState.indexOf(data.response.conceptId) === -1) {
          $scope.editPanelUiState.push(data.response.conceptId);
          $scope.updateUiState();
        }
      }
      else {
        $scope.saveMessage = 'Error saving concept, please make an additional change.';
      }
      $timeout(function () {
        $scope.saveIndicator = false;
      }, 4000);
    });

// watch for concept selection from the edit sidebar
    $scope.$on('editConcept', function (event, data) {
      $scope.conceptLoaded = false;
      if (!data || !data.conceptId) {
        $scope.conceptLoaded = false;
        return;
      }

      $scope.addConceptToListFromId(data.conceptId);
      $scope.editPanelUiState.push(data.conceptId);
      $scope.updateUiState();

      // set editing flags
      flagEditedItems();

    });

// watch for concept cloning from the edit sidebar
    $scope.$on('cloneConcept', function (event, data) {

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
//          $timeout(function () {
//            $scope.resizeSvg(response);
//          }, 800);

          $scope.editPanelUiState.push(conceptId);
          $scope.updateUiState();

          // set editing flags
          flagEditedItems();
        }

        // deep copy the object -- note: does not work in IE8, but screw that!
        var clonedConcept = JSON.parse(JSON.stringify(response));

        // add a cloned tag to differentiate the clonedConcept
        clonedConcept.pt.term += ' [Cloned]';

        // clear the id and effectiveTime of the descriptions and
        // relationships
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

//        $timeout(function () {
//          $scope.resizeSvg(clonedConcept);
//        }, 600);
      });
    });

// watch for removal request from concept-edit
    $scope.$on('stopEditing', function (event, data) {
      if (!data || !data.concept) {
        console.error('Cannot remove concept: concept must be supplied');
        return;
      }

      // remove the concept
      var index = $scope.concepts.indexOf(data.concept);
      $scope.concepts.splice(index, 1);
      $scope.editPanelUiState.splice($scope.editPanelUiState.indexOf(data.concept.conceptId), 1);
      $scope.updateUiState();

      // set editing flags
      flagEditedItems();

    });

// creates a blank (unsaved) concept in the editing list
    $scope.createConcept = function () {
      var concept = objectService.getNewConcept($scope.branch);

      // add IsaRelationship
      //concept.relationships
      $scope.concepts.unshift(concept);

//      $timeout(function () {
//        $scope.resizeSvg(concept);
//      }, 500);
    };

// removes concept from editing list (unused currently)
    $scope.closeConcept = function (index) {
      if ($scope.concepts) {
        $scope.concepts.splice(index, 1);
      }
    };

    ////////////////////////////////////////
    // Classification functions           //
    ////////////////////////////////////////


    // function to poll for the result of a classification run
    $scope.pollForResult = function (classificationId) {

      console.debug('Polling for classification result', classificationId);

      // check prerequisites
      if (!classificationId) {
        console.error('Cannot poll results for null classification');
      }

      // otherwise, update the result
      else {
        $timeout(function () {
          console.debug('New poll');
          snowowlService.getClassificationResult($routeParams.projectId, $routeParams.taskId, classificationId, 'MAIN').then(function (data) {

            console.debug('Classification result status: ', data);
            // if completed, set flag and return
            if (data.data.status === 'COMPLETED') {
              console.debug('Polled -- COMPLETED');
              $scope.classification = data.data;
              $scope.setClassificationComponents();

              return;
            } else {
              console.debug('POLLED -- ', data.data.status);
              // otherwise, continue polling
              $scope.pollForResult(classificationId);
            }
          });
        }, 5000);
      }
    };


    // get the various elements of a classification once it has been retrieved
    $scope.setClassificationComponents = function () {

      // console.debug('Retrieving classification components for',
      // $scope.classification);

      if (!$scope.classification || !$scope.classification.id) {
        console.error('Cannot set classification components, classification or its id not set');
        return;
      }

      // get equivalent concepts
      if ($scope.classification.equivalentConceptsFound) {
        snowowlService.getEquivalentConcepts($scope.classification.id, $routeParams.projectId,
          $routeParams.taskId, $scope.branch).then(function (equivalentConcepts) {
            $scope.equivalentConcepts = equivalentConcepts ? equivalentConcepts : {};
            console.debug('set equivalent concepts', $scope.equivalentConcepts);
          });
      } else {
        $scope.equivalentConcepts = [];
        console.debug('set equivalent concepts', $scope.equivalentConcepts);
      }

      // get relationship changes
      snowowlService.getRelationshipChanges($scope.classification.id, $routeParams.projectId,
        $routeParams.taskId, $scope.branch).then(function (relationshipChanges) {
          $scope.relationshipChanges = relationshipChanges ? relationshipChanges : {};
          console.debug('set relationship changes', $scope.relationshipChanges);
        });
    };

    // function to get the latest classification result
    $scope.getLatestClassification = function () {

      // console.debug('Getting latest classification');

      // TODO Update branch when branching is implemented
      snowowlService.getClassificationResultsForTask($routeParams.projectId, $routeParams.taskId, $scope.branch).then(function (response) {
        if (!response) {
          // console.debug('No classifications found');
          // do nothing
        } else {

          // if different result, replace
          if ($scope.classification !== response[response.length-1]) {

            // console.debug('New classification detected');
            $scope.classification = response[response.length-1];

            // if completed, retrieve all components
            if ($scope.classification.status === 'COMPLETED') {
              // console.debug('New classification is COMPLETED');
              $scope.setClassificationComponents();
            }

            // if still running, start polling for result
            else if ($scope.classification.status === 'RUNNING') {
              // console.debug('New classification is RUNNING');
              $scope.pollForResult();
            }
          }
        }
      });
    };

    // watch classification for changes requiring broadcast
    $scope.$watchGroup(['classification', 'relationshipChanges', 'equivalentConcepts'], function () {

      console.debug('change detected', $scope.classification, $scope.relationshipChanges, $scope.equivalentConcepts);
      // do nothing if not set
      if (!$scope.classification ) {
        return;
      }

      // if running, broadcast result without elements
      if ($scope.classification.status === 'RUNNING') {
        $rootScope.$broadcast('setClassification', {classification: $scope.classification});
      }

      // if completed, check for all required fields and broadcast if populated
      else if ($scope.classification.status === 'COMPLETED' && $scope.relationshipChanges && $scope.equivalentConcepts) {

        // assemble the arrays
        // TODO:  Artifact of bizarre watch behavior
        $scope.classification.relationshipChanges = $scope.relationshipChanges;
        $scope.classification.equivalentConcepts = $scope.equivalentConcepts;

        $rootScope.$broadcast('setClassification', $scope.classification);
      }
    });

    // watch for notification of classification starting
    $scope.$on('startClassification', function (event, classificationId) {

       console.debug('edit.js, received notification startClassification',
      classificationId);

      $scope.pollForResult(classificationId);

    });

    // on load, get the latest classification
    $scope.classification = null;
    $scope.relationshipChanges = null;
    $scope.equivalentConcepts = null;
    $scope.getLatestClassification();

  }
)
;