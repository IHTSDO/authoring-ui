'use strict';

angular.module('singleConceptAuthoringApp.edit', [
  //insert dependencies here
  'ngRoute'
])

  // all task editing functionality
  .config(function config($routeProvider) {
    $routeProvider
      .when('/tasks/task/:projectKey/:taskKey/:mode', {
        controller: 'EditCtrl',
        templateUrl: 'components/edit/edit.html',
        resolve: {}
      });

    $routeProvider
      .when('/projects/project/:projectKey/:mode', {
        controller: 'EditCtrl',
        templateUrl: 'components/edit/edit.html',
        resolve: {}
      });
  })

  //Directive to trigger a function on the rendering of an entire ng-repeat,
  // will make global once infinite scroll functionality is complete
  .directive('repeatComplete', function () {
    return function (scope, element, attrs) {
      if (scope.$last) {
        scope.$eval(attrs.repeatComplete);
      }
    };
  })

  .controller('EditCtrl', function EditCtrl($scope, $window, $rootScope, $location, scaService, snowowlService, objectService, notificationService, $routeParams, $timeout, $interval, $q) {

    $scope.projectKey = $routeParams.projectKey;
    $scope.taskKey = $routeParams.taskKey;
    $scope.conceptsDisplayed = 5;
    $scope.conceptsRendering = false;
    $scope.addMoreItems = function () {
      if ($scope.conceptsDisplayed < $scope.concepts.length) {
        $scope.conceptsDisplayed += 2;
        $scope.conceptsRendering = true;
      }
    };
    $scope.renderingComplete = function () {
      $scope.conceptsRendering = false;
    };
    // TODO: Update the MAIN branching when appropriate
    if ($routeParams.taskKey) {
      $scope.targetBranch = 'MAIN/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
      $scope.sourceBranch = 'MAIN/' + $routeParams.projectKey;
    } else {
      $scope.targetBranch = 'MAIN/' + $routeParams.projectKey;
      $scope.sourceBranch = 'MAIN/';
    }

    // displayed concept array
    $scope.concepts = [];

    // ui states
    $scope.editPanelUiState = null;
    $scope.savedList = null;

    // view saving
    $scope.thisView = null;
    $scope.lastView = null;

    // control variables
    $scope.canRebase = false;
    $scope.canPromote = false;
    $scope.canConflict = false;

    $scope.setView = function (name) {

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
          $rootScope.pageTitle = 'Resolve Conflicts/' + $routeParams.projectKey + ($routeParams.taskKey ? '/' + $routeParams.taskKey : '');
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
    };

    // on load, set the initial view based on classify/validate parameters
    if ($routeParams.mode === 'classify') {
      $scope.setView('classification');
    } else if ($routeParams.mode === 'validate') {
      $scope.setView('validation');
    } else if ($routeParams.mode === 'feedback') {
      if (!$scope.taskKey) {
        scaService.getReviewForProject($routeParams.projectKey).then(function (response) {
          $scope.feedbackContainer.review = response ? response : {};
        });
      } else {

        scaService.getReviewForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          $scope.feedbackContainer.review = response ? response : {};
        });
      }
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

    // get edit panel list (task view only)
    if ($scope.taskKey) {
      scaService.getUiStateForTask(
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
      scaService.getUiStateForTask(
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
    }

    $scope.addConceptToListFromId = function (conceptId) {

      // verify that this SCTID does not exist in the edit list
      angular.forEach($scope.concepts, function (concept) {
        console.debug('comparing', concept.conceptId, conceptId);
        if (concept.conceptId === conceptId) {

          notificationService.sendWarning('Concept already added', 5000);
          return;
        }
      });

      // send loading notification for user display
      notificationService.sendMessage('Loading concepts...', 10000, null);

      // console.debug('adding concept to edit list from id', conceptId);
      if (!conceptId) {
        return;
      }
      // get the concept and add it to the stack
      snowowlService.getFullConcept(conceptId, $scope.targetBranch).then(function (response) {

        // console.debug('Response received for ' + conceptId, response);
        if (!response) {
          return;
        }

        snowowlService.cleanConcept(response);

        $scope.concepts.push(response);

      }, function (error) {

        // console.debug('Error loading concept ' + conceptId, error);

        // if an error, remove from edit list
        var index = $scope.editPanelUiState.indexOf(conceptId);
        if (index !== -1) {
          $scope.editPanelUiState.splice(index, 1);
          $scope.updateEditListUiState(); // update the ui state
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

      console.debug('Dropping concept', conceptIdNamePair);

      var conceptId = conceptIdNamePair.id;
      var name= conceptIdNamePair.name;

      notificationService.sendMessage('Adding concept ' + (name? name: conceptId) + ' to edit panel', 10000, null);

      for (var i = 0; i < $scope.concepts.length; i++) {
        if ($scope.concepts[i].conceptId === conceptId) {
          notificationService.sendWarning('Concept ' + $scope.concepts[i].fsn + ' already in list', 5000);

          // update the stale flags
          flagEditedItems();
          return;
        }
      }

      snowowlService.getFullConcept(conceptId, $scope.targetBranch).then(function (concept) {
        $scope.concepts.push(concept);
        notificationService.sendMessage('Concept ' + concept.fsn + ' successfully added to edit list', 5000, null);
      }, function (error) {
        notificationService.sendError('Unexpected error loading concept ' + conceptId, 0);
      });

    };

// helper function to save current edit list (task view only)
    $scope.updateEditListUiState = function () {
      if ($scope.taskKey) {

        var conceptIds = [];
        angular.forEach($scope.concepts, function (concept) {
          if (concept.conceptId) {
            conceptIds.push(concept.conceptId);
          }
        });

        scaService.saveUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'edit-panel', conceptIds);
      }
    };

    // watch for concept selection from the edit sidebar
    $scope.$on('editConcept', function (event, data) {

      console.debug('editConcept', data);
      var conceptId = data.conceptId;

      // verify that this SCTID does not exist in the edit list
      for (var i = 0; i < $scope.concepts.length; i++) {
        console.debug('comparing', $scope.concepts[i].conceptId, conceptId, $scope.concepts[i].conceptId === conceptId);
        if ($scope.concepts[i].conceptId === conceptId) {

          notificationService.sendWarning('Concept already added', 5000);
          flagEditedItems();
          return;
        }
      }

      $scope.addConceptToListFromId(data.conceptId);
      $scope.editPanelUiState.push(data.conceptId);
      $scope.updateEditListUiState();

      // set editing flags
      flagEditedItems();

    });

// watch for concept cloning from the edit sidebar
    $scope.$on('cloneConcept', function (event, data) {

      if (!data || !data.conceptId) {
        return;
      }

      var concept = {'id': null, 'branch': $scope.targetBranch};

      notificationService.sendMessage('Cloning concept...');

      // get the concept and add it to the stack
      snowowlService.getFullConcept(data.conceptId, $scope.targetBranch).then(function (response) {

        // check if original concept already exists, if not add it
        var conceptExists = false;
        for (var i = 0; i < $scope.concepts.length; i++) {

          // cancel if unsaved work exists (track-by id problems)
          if (!$scope.concepts[i].conceptId) {
            notificationService.sendWarning('A new, unsaved concept exists; please save before cloning', 10000);
            return;
          }

          if (concept.conceptId === data.conceptId) {
            conceptExists = true;
          }
        }
        if (!conceptExists) {
          $scope.concepts.push(response);

          $timeout(function () {
            $scope.updateEditListUiState();

            // set editing flags
            flagEditedItems();
          }, 1000);


        }

        // deep copy the object -- note: does not work in IE8, but screw
        // that!
        var clonedConcept = JSON.parse(JSON.stringify(response));

        // clear relevant fields to force creation of new components
        angular.forEach(clonedConcept.descriptions, function (description) {
          description.effectiveTime = null;
          description.descriptionId = null;
          description.conceptId = null;
        });

        angular.forEach(clonedConcept.relationships, function (relationship) {
          relationship.sourceId = null;
          relationship.effectiveTime = null;
          relationship.relationshipId = null;
        });

        clonedConcept.conceptId = null;
        clonedConcept.effectiveTime = null;

        var successMsg = 'Concept ' + clonedConcept.fsn + ' successfully cloned';

        // add a cloned tag to differentiate the clonedConcept
        clonedConcept.fsn = '[CLONED] ' + clonedConcept.fsn;

        // push the cloned clonedConcept
        $scope.concepts.push(clonedConcept);

        notificationService.sendMessage(successMsg, 5000);

      }, function (error) {
        notificationService.sendError('Cloning failed; could not retrieve concept');
      });
    });

// watch for removal request from concept-edit
    $scope.$on('stopEditing', function (event, data) {
      if (!data || !data.concept) {
        console.error('Cannot remove concept: concept must be supplied');
        return;
      }

      // if in conflicts view, remove from conflict lists
      if ($scope.thisView === 'conflicts') {

        for (var i = 0; i < $scope.conflictConceptsBase.length; i++) {
          if ($scope.conflictConceptsBase[i].conceptId === data.concept.conceptId) {
            $scope.conflictConceptsBase.splice(i, 1);
            break;
          }
        }
        for (i = 0; i < $scope.conflictConceptsBranch.length; i++) {
          if ($scope.conflictConceptsBranch[i].conceptId === data.concept.conceptId) {
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
        $scope.updateEditListUiState();

        // set editing flags
        flagEditedItems();
      }
    });

// creates a blank (unsaved) concept in the editing list
    $scope.createConcept = function () {

      // check if an unsaved concept already exists
      for (var i = 0; i < $scope.concepts.length; i++) {
        if (!$scope.concepts[i].conceptId) {
          notificationService.sendWarning('A new, unsaved concept already exists.', 5000);
          return;
        }
      }

      var concept = objectService.getNewConcept($scope.targetBranch);

      $scope.concepts.unshift(concept);

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

    // get the various elements of a classification once it has been
    // retrieved
    $scope.setClassificationComponents = function () {

      if (!$scope.classificationContainer || !$scope.classificationContainer.id) {
        console.error('Cannot set classification components, classification or its id not set');
        return;
      }

      // get relationship changes
      snowowlService.getRelationshipChanges($scope.classificationContainer.id, $scope.targetBranch).then(function (relationshipChanges) {
        $scope.classificationContainer.relationshipChanges = relationshipChanges ? relationshipChanges : {};
      });

      // get equivalent concepts if detected
      if ($scope.classificationContainer.equivalentConceptsFound) {
        snowowlService.getEquivalentConcepts($scope.classificationContainer.id, $routeParams.projectKey,
          $routeParams.taskKey, $scope.targetBranch).then(function (equivalentConcepts) {
            $scope.classificationContainer.equivalentConcepts = equivalentConcepts ? equivalentConcepts : {};
          });
      } else {
        $scope.classificationContainer.equivalentConcepts = [];
      }

    };

    // function to get the latest classification result
    $scope.getLatestClassification = function () {

      if (!$scope.taskKey) {
        snowowlService.getClassificationsForProject($routeParams.projectKey, $scope.targetBranch).then(function (response) {
          if (!response || response.length === 0) {
            $scope.classificationContainer = {status: 'No classification found'};
          } else {
            // assign results to the classification container (note,
            // chronological order, use last value)
            $scope.classificationContainer = response[response.length - 1];
            $scope.setClassificationComponents();
          }
        });

      } else {
        snowowlService.getClassificationsForTask($routeParams.projectKey, $routeParams.taskKey, $scope.targetBranch).then(function (response) {
          if (!response || response.length === 0) {
            $scope.classificationContainer = {status: 'No classification found'};
          } else {
            // assign results to the classification container (note,
            // chronological order, use last value)
            $scope.classificationContainer = response[response.length - 1];
            $scope.setClassificationComponents();
          }
        });
      }
    };

    //////////////////////////////////////////
    // Latest Validation
    //////////////////////////////////////////

    // function to get the latest validation result
    $scope.getLatestValidation = function () {

      // if no task specified, retrieve for project
      if (!$scope.taskKey) {
        scaService.getValidationForProject($routeParams.projectKey).then(function (response) {
          if (!response) {
            $scope.validationContainer = {executionStatus: 'No validation found'};
          } else {
            $scope.validationContainer = response;
          }
        });
      } else {

        scaService.getValidationForTask($routeParams.projectKey, $routeParams.taskKey, $scope.targetBranch).then(function (response) {
          if (!response) {
            $scope.validationContainer = {executionStatus: 'No validation found'};
          } else {
            $scope.validationContainer = response;
          }
        });
      }
    };

    //////////////////////////////////////////
    // Review and Feedback
    //////////////////////////////////////////

    // get latest review
    $scope.getLatestReview = function () {
      // if no task specified, retrieve for project
      if (!$scope.taskKey) {
        scaService.getReviewForProject($routeParams.projectKey).then(function (response) {
          $scope.feedbackContainer.review = response ? response : {};
        });
      } else {

        scaService.getReviewForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          $scope.feedbackContainer.review = response ? response : {};
        });
      }
    };

    //////////////////////////////////////////
    // Conflict Report & Controls
    //////////////////////////////////////////

    // Initialize concept edit arrays, one for each branch
    // These are used for the side-by-side concept-edit panels
    $scope.conflictConceptsBase = [];
    $scope.conflictConceptsBranch = [];

    // Listen for Branch Divergence in order to trigger a conflicts rpoert
    // refresh,  triggered from taskDetail.js on either (a) initialization
    // where a task is in DIVERGED state, or (b) notification of task state
    // change to DIVERGED
    //
    // NOTE:  This happens in parallel with notification.branchState, may
    // want to revisit/fold together in future
    $rootScope.$on('branchDiverged', function (event) {

      if ($routeParams.taskKey) {
        scaService.getConflictReportForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          $scope.conflictsContainer.conflicts = response ? response : {};
        });
      } else {
        scaService.getConflictReportForProject($routeParams.projectKey).then(function (response) {
          $scope.conflictsContainer.conflicts = response ? response : {};
        });
      }
    });

    // Get latest conflict report -- retrieve for project only
    // Tasks are retrieved on detection of diverged state only
    // using the rootScope.branchDiverged notification
    $scope.getLatestConflictsReport = function () {

      if (!$scope.taskKey) {
        scaService.getConflictReportForProject($routeParams.projectKey).then(function (response) {
          $scope.conflictsContainer.conflicts = response ? response : {};
        });
      }
    };

    /**
     * Create conflict concept pairs to display for side-by-side conflict view
     */
    $scope.setConflictConceptPairs = function () {
      var conflictConceptPairs = [];

      // cycle over base conflict concepts
      angular.forEach($scope.conflictConceptsBase, function (conflictConceptBase) {

        var conflictConceptPair = {sourceConcept: conflictConceptBase};

        // cycle over the branch conflict concepts for a match
        angular.forEach($scope.conflictConceptsBranch, function (conflictConceptBranch) {
          if (conflictConceptBranch.conceptId === conflictConceptBase.conceptId) {
            conflictConceptPair.targetConcept = conflictConceptBranch;
          }
        });
        conflictConceptPairs.push(conflictConceptPair);
      });

      $scope.conflictConceptPairs = conflictConceptPairs;
    };

    // watch for concept conflict selection from the conflicts view
    $scope.$on('editConflictConcepts', function (event, data) {

      if (!data) {
        return;
      }

      var conceptIds = data.conceptIds;

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
      notificationService.sendMessage('Loading concepts for conflict review...', 5000, null);

      var finalLength = $scope.conflictConceptsBase + conceptIds.length;

      // cycle over requested ids
      angular.forEach(conceptIds, function (conceptId) {

        // get the task branch concept
        snowowlService.getFullConcept(conceptId, $scope.targetBranch).then(function (response) {

            // push to branch list
            $scope.conflictConceptsBranch.push(response);

            // check if all requested concepts loaded
            if (parseInt($scope.conflictConceptsBranch.length) === parseInt(finalLength) && parseInt($scope.conflictConceptsBase.length) === parseInt(finalLength)) {
              notificationService.sendMessage('Successfully loaded concepts in conflict', 5000);
            }

            // set the pairs
            $scope.setConflictConceptPairs();

          },
          function (error) {
            notificationService.sendError('Could not load concept ' + conceptId + ' on branch ' + $scope.targetBranch, 0);
          }
        );

        // get the project base concept
        snowowlService.getFullConcept(conceptId, $scope.sourceBranch).then(function (response) {

            // push to base list
            $scope.conflictConceptsBase.push(response);

            // check if all requested concepts loaded
            if (parseInt($scope.conflictConceptsBranch.length) === parseInt(finalLength) && parseInt($scope.conflictConceptsBase.length) === parseInt(finalLength)) {
              notificationService.sendMessage('Successfully loaded concepts in conflict', 5000);
            }

            // set the pairs
            $scope.setConflictConceptPairs();
          },
          function (error) {
            notificationService.sendError('Could not load concept ' + conceptId + ' on branch ' + $scope.sourceBranch, 0);
          }
        );
      });
    });

    /**
     * Set page functionality based on branch state
     * @param branchState
     */
    function setBranchFunctionality(branchState) {

      switch (branchState) {
        case 'FORWARD':
          $scope.canRebase = false;
          $scope.canPromote = true;
          $scope.canConflict = true;
          break;
        case 'UP_TO_DATE':
          $scope.canRebase = false;
          $scope.canPromote = false;
          $scope.canConflict = true;
          break;
        case 'BEHIND':
          $scope.canRebase = true;
          $scope.canPromote = false;
          $scope.canConflict = false;
          break;
        case 'STALE':
          // TODO
          $scope.canRebase = true;
          $scope.canPromote = false;
          $scope.canConflict = true;
          break;
        case 'DIVERGED':
          /**
           * Notes on DIVERGED special handling
           *
           * Conflicts are re-generated through branchDiverged
           * notification sent from taskDetail.js
           *
           * Ability to rebase is dependent on state of resolved conflicts,
           * test is made in ng-disabled attribute of rebase button.  The
           * conflicts container must have been initialized in conflicts.js,
           * and the conceptsToResolve list must be empty (i.e. all conflicts
           * moved to conceptsResolved)
           *
           */
          $scope.canRebase = true;
          $scope.canPromote = false;
          $scope.canConflict = true;
          break;
        default:
          notificationService.sendError('Error:  Cannot determine branch state. Conflict, rebase, and promote functions disabled');
          $scope.canRebase = false;
          $scope.canPromote = false;
          $scope.canConflict = false;
      }
    }

// watch for task updates
// NOTE This is duplicated in taskDetail.js, propagate any changes
// TODO: Chris Swires -- no changes should be needed here, but this is
// the trigger for branch state changes, data is the entirely of the
// notification object processed in scaService.js
    $scope.$on('notification.branchState', function (event, data) {

      // check if notification matches this branch
      if (data.project === $routeParams.projectKey && data.task === $routeParams.taskKey) {
        setBranchFunctionality(data ? data.event : null);
      }
    });

    ////////////////////////////////////
    // Rebase & Promote
    /////////////////////////////////////

    /**
     * Rebase the current project or task
     */
    $scope.rebase = function () {

      console.debug($scope.conflictsContainer);

      // if unresolved conflicts exist, confirm with user before continuing
      if ($scope.conflictsContainer && $scope.conflictsContainer.conflicts && $scope.conflictsContainer.conflicts.conflictsToResolve && $scope.conflictsContainer.conflictsToResolve.length > 0) {
        var response = window.confirm('Unresolved conflicts detected.  Rebasing may cause your changes to be lost.  Continue?');

        if (!response) {
          return;
        }
      }

      // rebase the project or task, and reload the page on success
      // to trigger all necessary state updates
      if (!$scope.taskKey) {

        notificationService.sendMessage('Rebasing project...', 0);
        scaService.rebaseProject($scope.projectKey).then(function (response) {
          console.debug('rebase project completed', response);
          if (response !== null) {
            notificationService.sendMessage('Project successfully rebased', 5000);

            // TODO This is clunky, short-term fix
            // should regenerate conflicts, update task state, etc. manually
            $window.location.reload();
          }
        });
      } else {

        notificationService.sendMessage('Rebasing task...', 0);
        scaService.rebaseTask($scope.projectKey, $scope.taskKey).then(function (response) {
          console.debug('rebase task completed', response);
          if (response !== null) {
            notificationService.sendMessage('Task successfully rebased', 5000);

            // should regenerate conflicts, update task state, etc. manually
            $window.location.reload();
          }
        });
      }
    };

    $scope.promoteProject = function () {
      notificationService.sendMessage('Promoting project....', 0);
      scaService.promoteProject($routeParams.projectKey).then(function (response) {
        if (response !== null) {
          notificationService.sendMessage('Project successfully promoted', 10000);
        } else {
          notificationService.sendError('Error promoting project', 10000);
        }
      });
    };
    $scope.isLast = function(check) {
        var cssClass = check ? 'last' : null;
        return cssClass;
    };

    //////////////////////////////////////////
    // Initialization
    //////////////////////////////////////////

    // start monitoring of task
    scaService.monitorTask($routeParams.projectKey, $routeParams.taskKey);

// TODO: Chris Swires -- delete this once the monitorTask functionality
// complete INAPPROPRIATE CALL TO GET BRANCH INFORMATION
    snowowlService.getBranch($scope.targetBranch).then(function (response) {
      setBranchFunctionality(response ? response.state : null);
    });

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

// initialize with empty concepts list
// but do not initialize conflictsToResolve, conflictsResolved
    $scope.conflictsContainer = {
      conflicts: null
    };

    $scope.viewReview = function () {
      $scope.getLatestReview();
      $scope.setView('feedback');
    };

// populate the container objects
    $scope.getLatestClassification();
    $scope.getLatestValidation();
    //$scope.getLatestReview();
    $scope.getLatestConflictsReport();

  }
)
;
