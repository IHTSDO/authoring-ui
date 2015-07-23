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
    $rootScope.pageTitle = $scope.classifyMode ? 'Classification' : 'Edit Concept';

    // initialize flags for hiding elements
    $scope.hideSidebar = classifyMode;
    $scope.hideModel = classifyMode;
    $scope.hideClassification = !classifyMode;

    // toggles classification view
    $scope.toggleClassification = function () {
      $scope.hideClassification = !$scope.hideClassification;

      // toggle the model display, always opposite of classification
      $scope.toggleModel();
    };

    $scope.toggleSidebar = function () {
      $scope.hideSidebar = !$scope.hideSidebar;

      // resize models if they are shown
      if (!$scope.hideModel) {
        angular.forEach($scope.concepts, function (concept) {
          $timeout(function () {
            $scope.resizeSvg(concept);
          }, 500);
        });
      }
    };

    // toggle for hiding model
    $scope.toggleModel = function () {

      // if in classification view, model always hidden
      if (!$scope.hideClassification) {
        $scope.hideModel = false;
      } else {
        $scope.hideModel = !$scope.hideModel;

        // resize models if they are shown
        if (!$scope.hideModel) {
          angular.forEach($scope.concepts, function (concept) {
            $timeout(function () {
              $scope.resizeSvg(concept);
            }, 500);
          });
        }
      }
    };

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
          console.debug('could not find svg element or parent div', elem, parentElem);
          return;
        }

        console.debug('elements', elem, parentElem);

        // set the height and width`
        var width = parentElem.offsetWidth - 30;
        var height = $('#editPanel-' + concept.conceptId).find('.editHeightSelector').height() + 41;

        console.debug(height, width);

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
        $timeout(function () {
          $scope.resizeSvg(response);
        }, 500);

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
      $scope.saveMessage = 'Saving concept with id: ' + data.concept.conceptId;
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
      }
      else {
        $scope.saveMessage = 'Error saving concept, please make an additional change.';
      }
      $timeout(function () {
        $scope.saveIndicator = false;
      }, 4000);
    });

    //initial function to poll for the result of a classification run
    $scope.pollForResult = function () {
      $timeout(function () {
        snowowlService.checkClassificationResult($scope.classifactionJobId, $routeParams.taskId, 'MAIN').then(function (data) {
          if (data.data.status === 'COMPLETED') {
            $scope.validationResultsComplete = true;
            return;
          }
        });
        if ($scope.validationResultsComplete === true) {
          $scope.generateClassifierResults();
          return;
        }
        $scope.pollForResult();
      }, 20000);
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

      // set editing flags
      flagEditedItems();

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
      $scope.concepts.splice(index, 1);
      $scope.editPanelUiState.splice($scope.editPanelUiState.indexOf(data.concept.id), 1);
      $scope.updateUiState();

      // set editing flags
      flagEditedItems();

    });

    // watch for new concept creation
    $scope.$on('conceptEdit.newConceptCreated', function (event, data) {
      if (!data || !data.conceptId) {
        console.error('Cannot add newly created concept to edit-panel list, conceptId not supplied');
      }

      $scope.editPanelUiState.push(data.conceptId);
      $scope.updateUiState();

      // set editing flags
      flagEditedItems();
    });

    // creates a blank (unsaved) concept in the editing list
    $scope.createConcept = function () {
      var concept = objectService.getNewConcept($scope.branch);

      // add IsaRelationship
      //concept.relationships
      $scope.concepts.push(concept);

      $timeout(function () {
        $scope.resizeSvg(concept);
      }, 500);
    };

// removes concept from editing list (unused currently)
    $scope.closeConcept = function (index) {
      if ($scope.concepts) {
        $scope.concepts.splice(index, 1);
      }
    };

  }
)
;