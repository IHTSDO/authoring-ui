'use strict';

angular.module('singleConceptAuthoringApp.edit', [
  //insert dependencies here
  'ngRoute'
])

  // TODO Seriously (SERIOUSLY) need to rethink this approach
  .config(function config($routeProvider) {
    $routeProvider
      .when('/edit/:projectKey/:taskKey', {
        controller: 'EditCtrl',
        templateUrl: 'components/edit/edit.html',
        resolve: {
          classifyMode: function () {
            return false;
          },
          validateMode: function () {
            return false;
          },
          feedbackMode: function () {
            return false;
          }
        }
      });

    $routeProvider
      .when('/classify/:projectKey/:taskKey', {
        controller: 'EditCtrl',
        templateUrl: 'components/edit/edit.html',
        resolve: {
          classifyMode: function () {
            return true;
          },
          validateMode: function () {
            return false;
          },
          feedbackMode: function () {
            return false;
          }
        }
      });

    $routeProvider
      .when('/feedback/:projectKey/:taskKey', {
        controller: 'EditCtrl',
        templateUrl: 'components/edit/edit.html',
        resolve: {
          classifyMode: function () {
            return false;
          },
          validateMode: function () {
            return false;
          },
          feedbackMode: function () {
            return true;
          }
        }
      });

    $routeProvider
      .when('/validate/:projectKey/:taskKey', {
        controller: 'EditCtrl',
        templateUrl: 'components/edit/edit.html',
        resolve: {
          classifyMode: function () {
            return false;
          },
          validateMode: function () {
            return true;
          },
          feedbackMode: function () {
            return false;
          }
        }
      });
  })

  .controller('EditCtrl', function EditCtrl($scope, $rootScope, scaService, snowowlService, objectService, notificationService, $routeParams, $timeout, classifyMode, validateMode, feedbackMode) {

    console.debug('Mode variables', classifyMode, validateMode, feedbackMode);

    // TODO: Update this when $scope.branching is enabled
    $scope.branch = 'MAIN/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
    $scope.projectKey = $routeParams.projectKey;
    $scope.taskKey = $routeParams.taskKey;

    // displayed concept array
    $scope.concepts = [];

    // ui states
    $scope.editPanelUiState = null;
    $scope.savedList = null;

    // view saving
    $scope.thisView = null;
    $scope.lastView = null;

    $scope.setView = function (name) {
      console.debug('setting view (requested, this, last)', name,
        $scope.thisView, $scope.lastView);

      // do nothing if no name supplied
      if (!name) {
        return;
      }
      // if same state requested, do nothing
      if (name === $scope.thisView) {
        return;
      }

      // set this and last view
      $scope.lastView = $scope.thisView;
      $scope.thisView = name;

      switch ($scope.thisView) {
        case 'validation':
          $scope.hideValidation = false;
          $scope.hideClassification = true;
          $scope.hideModel = true;
          $scope.hideSidebar = true;
          $scope.hideFeedback = true;
          $rootScope.pageTitle = 'Validation/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          break;
        case 'feedback':
          $scope.hideValidation = true;
          $scope.hideClassification = true;
          $scope.hideModel = true;
          $scope.hideSidebar = true;
          $scope.hideFeedback = false;
          $rootScope.pageTitle = 'Providing Feedback/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          break;
        case 'classification':
          $scope.hideValidation = true;
          $scope.hideClassification = false;
          $scope.hideModel = true;
          $scope.hideSidebar = true;
          $scope.hideFeedback = true;
          $rootScope.pageTitle = 'Classification/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          break;
        case 'edit-default':
          $scope.hideValidation = true;
          $scope.hideClassification = true;
          $scope.hideModel = false;
          $scope.hideSidebar = false;
          $scope.hideFeedback = true;
          $rootScope.pageTitle = 'Edit Concepts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          break;
        case 'edit-no-sidebar':
          $scope.hideValidation = true;
          $scope.hideClassification = true;
          $scope.hideModel = false;
          $scope.hideSidebar = true;
          $scope.hideFeedback = true;
          $rootScope.pageTitle = 'Edit Concepts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          break;
        case 'edit-no-model':
          $scope.hideValidation = true;
          $scope.hideClassification = true;
          $scope.hideModel = true;
          $scope.hideSidebar = false;
          $scope.hideFeedback = true;
          $rootScope.pageTitle = 'Edit Concepts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          break;
        default:
          $scope.hideValidation = true;
          $scope.hideClassification = true;
          $scope.hideModel = true;
          $scope.hideSidebar = true;
          $scope.hideFeedback = true;
          $rootScope.pageTitle = 'Invalid View Requested';
          break;
      }

      $timeout(function () {
        $rootScope.$broadcast('editModelDraw');
      }, 500);
    };

    // on load, set the initial view based on classify/validate parameters
    if (classifyMode === true) {
       $scope.setView('classification');
    } else if (validateMode === true) {
      $scope.setView('validation');
    } else if (feedbackMode === true) {
      $scope.setView('feedback');
    } else {
      $scope.setView('edit-default');
    }

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
      $routeParams.projectKey, $routeParams.taskKey, 'edit-panel')
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
      $routeParams.projectKey, $routeParams.taskKey, 'saved-list')
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

      // send loading notification for user display
      notificationService.sendMessage('Loading concepts...', 10000, null);

      // console.debug('adding concept to edit list from id', conceptId);
      if (!conceptId) {
        return;
      }
      // get the concept and add it to the stack
      snowowlService.getFullConcept(conceptId, $scope.branch).then(function (response) {

        // console.debug('Response received for ' + conceptId, response);
        if (!response) {
          return;
        }

        snowowlService.cleanConcept(response);

        $scope.concepts.push(response);

        $timeout(function () {
          $rootScope.$broadcast('editModelDraw');
        }, 800);
      }, function (error) {

        // console.debug('Error loading concept ' + conceptId, error);

        // if an error, remove from edit list and update
        // TODO This is not fully desired behavior, but addresses WRP-887
        var index = $scope.editPanelUiState.indexOf(conceptId);
        if (index !== -1) {
          // console.debug('REMOVING', conceptId);
          $scope.editPanelUiState.splice(index, 1);
          $scope.updateUiState(); // update the ui state
          flagEditedItems();        // update edited item flagging
        }
      }).finally(function () {
        // send loading notification
        if ($scope.concepts.length === $scope.editPanelUiState.length) {
          notificationService.sendMessage('All concepts loaded', 10000, null);
        } else {
          // send loading notification for user display
          notificationService.sendMessage('Loading concepts...', 10000, null);
        }

      });
    };

    $scope.dropConcept = function (conceptIdNamePair) {

      // console.debug('Dropping concept', conceptIdNamePair);

      var conceptId = conceptIdNamePair.id;

      notificationService.sendMessage('Adding concept ' + conceptId + ' to edit panel', 10000, null);

      snowowlService.getFullConcept(conceptId, $scope.branch).then(function (concept) {

        var conceptLoaded = false;
        angular.forEach($scope.concepts, function (existingConcept) {
          if (concept.id === existingConcept.id) {
            var conceptLoaded = true;
          }
        });
        if (!conceptLoaded) {
          $scope.concepts.push(concept);
          notificationService.sendMessage('Concept ' + concept.fsn + ' successfully added to edit list', 5000, null);
        } else {
          notificationService.sendWarning('Concept ' + concept.fsn + ' already present in edit list', 5000, null);
        }
      });
    };

// helper function to save current edit list
    $scope.updateUiState = function () {
      scaService.saveUIState($routeParams.projectKey, $routeParams.taskKey, 'edit-panel', $scope.editPanelUiState);
    };

    // TODO Make the two-way binding handle this via a $watch
    $scope.$on('conceptEdit.saveSuccess', function (event, data) {
      if (data.response && data.response.conceptId) {

        // commented out in favor of notification service
        //$scope.saveMessage = 'Concept with id: ' + data.response.conceptId +
        // ' saved at: ' + $scope.formatDate(new Date());

        // ensure concept is in edit panel ui state
        if ($scope.editPanelUiState.indexOf(data.response.conceptId) === -1) {
          $scope.editPanelUiState.push(data.response.conceptId);
          $scope.updateUiState();
        }

        // replace the concept in the array
        for (var i = 0; i < $scope.concepts.length; i++) {
          // if matching concept OR saveConceptId was blank (newly saved)
          // replace the concept in list and break
          if ($scope.concepts[i].conceptId === data.response.conceptId || (!$scope.saveConceptId && !$scope.concepts[i].conceptId)) {
            $scope.concepts.splice(i, 1, data.response);
            break;
          }
        }
        $timeout(function () {
          $rootScope.$broadcast('editModelDraw');
        }, 300);
        // console.debug('after save success', $scope.concepts);
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
          if (concept.conceptId === conceptId) {
            conceptExists = true;
          }
        });
        if (!conceptExists) {
          $scope.concepts.push(response);
          $timeout(function () {
            $rootScope.$broadcast('editModelDraw');
          }, 800);

          $scope.editPanelUiState.push(conceptId);
          $scope.updateUiState();

          // set editing flags
          flagEditedItems();
        }

        // deep copy the object -- note: does not work in IE8, but screw that!
        var clonedConcept = JSON.parse(JSON.stringify(response));
        // add a cloned tag to differentiate the clonedConcept
        clonedConcept.fsn += ' [Cloned]';

        // clear the id and effectiveTime of the descriptions and
        // relationships
        angular.forEach(clonedConcept.descriptions, function (description) {
          description.descriptionId = null;
        });

        angular.forEach(clonedConcept.relationship, function (relationship) {
          relationship.relationshipId = null;
        });

        // push the cloned clonedConcept
        $scope.concepts.push(clonedConcept);

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

      // console.debug('createConcept', $scope.concepts);
      var concept = objectService.getNewConcept($scope.branch);

      $scope.concepts.unshift(concept);

      // console.debug('after', $scope.concepts);

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


    // get the various elements of a classification once it has been retrieved
    $scope.setClassificationComponents = function () {

      // console.debug('Retrieving classification components for',
      // $scope.classificationContainer);

      if (!$scope.classificationContainer || !$scope.classificationContainer.id) {
        console.error('Cannot set classification components, classification or its id not set');
        return;
      }

      // get relationship changes
      snowowlService.getRelationshipChanges($scope.classificationContainer.id, $scope.branch).then(function(relationshipChanges) {
        $scope.classificationContainer.relationshipChanges = relationshipChanges ? relationshipChanges : {};
      });


      // get equivalent concepts if detected
      if ($scope.classificationContainer.equivalentConceptsFound) {
        snowowlService.getEquivalentConcepts($scope.classificationContainer.id, $routeParams.projectKey,
          $routeParams.taskKey, $scope.branch).then(function (equivalentConcepts) {
            $scope.classificationContainer.equivalentConcepts = equivalentConcepts ? equivalentConcepts : {};
          });
      } else {
        $scope.classificationContainer.equivalentConcepts = [];
      }

    };

    // function to get the latest classification result
    $scope.getLatestClassification = function () {

      // console.debug('Getting latest classification');

      // TODO Update branch when branching is implemented
      snowowlService.getClassificationsForTask($routeParams.projectKey, $routeParams.taskKey, $scope.branch).then(function (response) {
        if (!response || response.length === 0) {
          $scope.classificationContainer = {status: 'No classification found'};
        } else {

          // assign results to the classification container
          $scope.classificationContainer = response[0];
          $scope.setClassificationComponents();


        }
      });
    };

    //////////////////////////////////////////
    // Latest Validation
    //////////////////////////////////////////

    // function to get the latest validation result
    $scope.getLatestValidation = function () {
  // TODO Update branch when branching is implemented
      scaService.getValidationForTask($routeParams.projectKey, $routeParams.taskKey, $scope.branch).then(function (response) {
        if (!response) {
          $scope.validationContainer = {executionStatus: 'No validation found'};
        } else {
          $scope.validationContainer = response;
        }
      });
    };

    //////////////////////////////////////////
    // Review and Feedback
    //////////////////////////////////////////

    // get latest review
    $scope.getLatestReview = function() {
      scaService.getReviewForTask($routeParams.projectKey, $routeParams.taskKey).then(function(response) {
        $scope.feedbackContainer.review = response ? response : {};
      });
    };

    // initialize the container objects
    $scope.classificationContainer = {
      id: null,
      status: 'Loading...',  // NOTE: Overwritten by validation field
      equivalentConcepts: [],
      relationshipChanges: []
    };
    $scope.validationContainer = {
      executionStatus: 'Loading...',  // NOTE: Overwritten by validation field
      report: null
    };
    $scope.feedbackContainer = {
      review: null,
      feedback: null
    };

    // populate the container objects
    $scope.getLatestClassification();
    $scope.getLatestValidation();
    $scope.getLatestReview();

  }
);