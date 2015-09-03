'use strict';

angular.module('singleConceptAuthoringApp.edit', [
  //insert dependencies here
  'ngRoute'
])

  // TODO Seriously (SERIOUSLY) need to rethink this approach
  .config(function config($routeProvider) {
    $routeProvider
      .when('/:mode/:projectKey/:taskKey', {
        controller: 'EditCtrl',
        templateUrl: 'components/edit/edit.html',
        resolve: {}
      });
  })

  .controller('EditCtrl', function EditCtrl($scope, $rootScope, $location, scaService, snowowlService, objectService, notificationService, $routeParams, $timeout, $interval, $q) {

    // TODO: Update this when $scope.branching is enabled
    $scope.branch = 'MAIN/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
    $scope.projectBranch = 'MAIN/' + $routeParams.projectKey;
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

    $scope.rebase = function(){
        scaService.rebaseTask($scope.projectKey, $scope.taskKey).then(function(response){});
    };
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
          $rootScope.pageTitle = 'Validation/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          break;
        case 'feedback':
          $rootScope.pageTitle = 'Providing Feedback/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          break;
        case 'classification':
          $rootScope.pageTitle = 'Classification/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          break;
        case 'conflicts':
          $rootScope.pageTitle = 'Resolve Conflicts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          break;
        case 'edit-default':
          $rootScope.pageTitle = 'Edit Concepts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          break;
        case 'edit-no-sidebar':
          $rootScope.pageTitle = 'Edit Concepts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          break;
        case 'edit-no-model':
          $rootScope.pageTitle = 'Edit Concepts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          break;
        default:
          $rootScope.pageTitle = 'Invalid View Requested';
          break;
      }

      $timeout(function () {
        $rootScope.$broadcast('editModelDraw');
      }, 500);
    };

    // on load, set the initial view based on classify/validate parameters
    if ($routeParams.mode === 'classify') {
      $scope.setView('classification');
    } else if ($routeParams.mode === 'validate') {
      $scope.setView('validation');
    } else if ($routeParams.mode === 'feedback') {
      $scope.setView('feedback');
    } else if ($routeParams.mode === 'conflicts') {
      $scope.setView('conflicts');
    } else if ($routeParams.mode === 'edit') {
      $scope.setView('edit-default');
    }

    // if improper route, send error and halt
    else {
      notificationService.sendError('Bad URL request for task view detected (' + $routeParams.mode + ').  Acceptable values are: edit, classify, conflicts, feedback, and validate');
      return;
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

      console.debug('Received stopEditing request', data);

      // if in conflicts view, remove from conflict lists
      if ($scope.thisView === 'conflicts') {
        for (var i = 0; i < $scope.conflictConceptsBase.length; i++) {
          if ($scope.conflictConceptsBase[i].conceptId === data.conceptId) {
            $scope.conflictConceptsBase.splice(i, 1);
            break;
          }
        }
        for (i = 0; i < $scope.conflictConceptsBranch.length; i++) {
          if ($scope.conflictConceptsBranch[i].conceptId === data.conceptId) {
            $scope.conflictConceptsBranch.splice(i, 1);
            break;
          }
        }
        $scope.setConflictConceptPairs();
      }

      // otherwise, editing view, remove from edit list
      else {

        // remove the concept
        var index = $scope.concepts.indexOf(data.concept);
        $scope.concepts.splice(index, 1);
        $scope.editPanelUiState.splice($scope.editPanelUiState.indexOf(data.concept.conceptId), 1);
        $scope.updateUiState();

        // set editing flags
        flagEditedItems();
      }
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
      snowowlService.getRelationshipChanges($scope.classificationContainer.id, $scope.branch).then(function (relationshipChanges) {
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

      snowowlService.getClassificationsForTask($routeParams.projectKey, $routeParams.taskKey, $scope.branch).then(function (response) {
        if (!response || response.length === 0) {
          $scope.classificationContainer = {status: 'No classification found'};
        } else {
          // assign results to the classification container (note,
          // chronological order, use last value)
          $scope.classificationContainer = response[response.length - 1];
          $scope.setClassificationComponents();
        }
      });
    };

    //////////////////////////////////////////
    // Latest Validation
    //////////////////////////////////////////

    // function to get the latest validation result
    $scope.getLatestValidation = function () {
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
    $scope.getLatestReview = function () {
      scaService.getReviewForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
        $scope.feedbackContainer.review = response ? response : {};
      });
    };

    //////////////////////////////////////////
    // Conflict Report & Controls
    //////////////////////////////////////////

    // initialize concept edit arrays
    $scope.conflictConceptsBase = [];
    $scope.conflictConceptsBranch = [];

    $scope.conflictsSourceBranch = null;
    $scope.conflictsTargetBranch = null;

    var conflictsPoll = null;

    $scope.pollForConflictsReview = function () {

      console.debug('polling for conflicts', $scope.conflictsContainer.conflicts.sourceReviewId);
      var deferred = $q.defer();

      // if the source review exists, begin polling
      if ($scope.conflictsContainer.conflicts.sourceReviewId) {
        snowowlService.getReview($scope.conflictsContainer.conflicts.sourceReviewId).then(function (response) {

          console.debug('review',  response);
          if (!response) {
            deferred.reject();
          } else {
            deferred.resolve(response);
          }
        });
      } else {
        notificationService.sendError('Unable to poll for conflicts data', 10000);
        deferred.reject();
      }

      return deferred.promise;

    };

    $scope.getLatestConflictsReport = function () {

      console.debug('getting latest conflicts report');

      scaService.getConflictReportForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
        $scope.conflictsContainer.conflicts = response ? response : {};

        // immediately poll once
        $scope.pollForConflictsReview().then(function (response) {

          // set the source and target branches
          $scope.conflictsSourceBranch = response.source.path;
          $scope.conflictsTargetBranch = response.target.path;

          // if poll successful, set up interval polling
          var conflictsPoll = $interval(function () {
            $scope.pollForConflictsReview().then(function (response) {

              // TODO Set date

              // TODO Check for stale state

            }, function () {
              console.debug('failed to retrieve review, cancelling polling');
              $interval.cancel(conflictsPoll);
            });
          }, 10000);
        });

      });
    };

    $scope.setConflictConceptPairs = function () {

      console.debug('getting conflict concept pairs', $scope.conflictConceptsBase, $scope.conflictConceptsBranch);
      var conflictConceptPairs = [];

      // cycle over base conflict concepts
      angular.forEach($scope.conflictConceptsBase, function (conflictConceptBase) {

        var conflictConceptPair = {baseConcept: conflictConceptBase};

        console.debug('Finding match for ', conflictConceptBase.conceptId);
        // cycle over the branch conflict concepts for a match
        angular.forEach($scope.conflictConceptsBranch, function (conflictConceptBranch) {
          if (conflictConceptBranch.conceptId === conflictConceptBase.conceptId) {
            console.debug('Found match for ', conflictConceptBase.conceptId);
            conflictConceptPair.branchConcept = conflictConceptBranch;
          }
        });
        conflictConceptPairs.push(conflictConceptPair);
      });

      console.debug('conflict concept pairs', conflictConceptPairs);
      $scope.conflictConceptPairs = conflictConceptPairs;
    };

// watch for concept conflict selection from the conflicts view
    $scope.$on('editConflictConcepts', function (event, data) {

      if (!data) {
        return;
      }
      console.debug('Received request to load conflict concepts', data);

      var conceptIds = data.conceptIds;

      console.debug('adding concept to edit list for ids', conceptIds);
      if (!conceptIds || !Array.isArray(conceptIds)) {
        return;
      }

      // remove any concept ids that already exist
      angular.forEach($scope.conflictConceptsBranch, function (concept) {
        if (conceptIds.indexOf(concept.id) !== -1) {
          conceptIds.splice(conceptIds.indexOf(concept.id), 1);
        }
      });

      // send loading notification for user display
      notificationService.sendMessage('Loading ' + conceptIds.length + ' concepts for conflict review...', 10000, null);

      var finalLength = $scope.conflictConceptsBase + conceptIds.length;
      console.debug('final length expected', finalLength);

      // cycle over requested ids
      angular.forEach(conceptIds, function (conceptId) {

        // get the task branch concept
        snowowlService.getFullConcept(conceptId, $scope.branch).then(function (response) {

            console.debug('branch concept', response);
            $scope.conflictConceptsBranch.push(response);

            // TODO Figure out why the hell this isn't working
            console.debug(finalLength, $scope.conflictConceptsBranch.length, $scope.conflictConceptsBase.length, $scope.conflictConceptsBranch.length === finalLength, $scope.conflictConceptsBase.length === finalLength);
            if ($scope.conflictConceptsBranch.length === finalLength && $scope.conflictConceptsBase.length === finalLength) {
              notificationService.sendMessage('Successfully loaded concepts in conflict', 5000);
            }

            $scope.setConflictConceptPairs();

          },
          function (error) {

            // TODO Replace with error, but for now ignore created conccpets
            // that do not exist on the base branch
          }
        )
        ;

        // get the project base concept
        snowowlService.getFullConcept(conceptId, $scope.projectBranch).then(function (response) {

            console.debug('base concept', response);
            $scope.conflictConceptsBase.push(response);

            console.debug(finalLength, $scope.conflictConceptsBranch.length, $scope.conflictConceptsBase.length, $scope.conflictConceptsBranch.length === finalLength, $scope.conflictConceptsBase.length === finalLength);
            if ($scope.conflictConceptsBranch.length === finalLength && $scope.conflictConceptsBase.length === finalLength) {
              notificationService.sendMessage('Successfully loaded concepts in conflict', 5000);
            }

            $scope.setConflictConceptPairs();
          },
          function (error) {
            notificationService.sendError('Could not load concept ' + conceptId + ' on branch ' + $scope.projectBranch, 0);
          }
        );
      });
    });

//////////////////////////////////////////
// Initialization
//////////////////////////////////////////

// initialize the container objects
    $scope.classificationContainer = {
      id: null,
      status: 'Loading...',  // NOTE: Overwritten by validation field
      equivalentConcepts: [],
      relationshipChanges: []
    };
    $scope.validationContainer = {
      executionStatus: 'Loading...',  // NOTE: Overwritten by validation
                                      // field
      report: null
    };
    $scope.feedbackContainer = {
      review: null,
      feedback: null
    };
    $scope.conflictsContainer = {
      conflicts: {concepts: []}
    };

// populate the container objects
    $scope.getLatestClassification();
    $scope.getLatestValidation();
    $scope.getLatestReview();
    $scope.getLatestConflictsReport();

  }
)
;