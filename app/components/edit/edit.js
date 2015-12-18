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
  })

//Directive to trigger a function on the rendering of an entire ng-repeat,
  // will make global once infinite scroll functionality is complete
  .directive('repeatComplete', ['$timeout', function ($timeout) {
    return {
      restrict: 'A',
      scope: {
        callback: '&'
      },
      link: function (scope, elm, attrs) {
        $timeout(scope.callback(), 0);
      }
    };
  }])

  .directive('fillHeight', function ($window, $rootScope) {
    return {
      restrict: 'A',
      link: function (scope, element) {
        scope.first = true;
        scope.initializeWindowSize = function () {
          var header = document.getElementsByClassName('navbar-fixed-top');
          var footer = document.getElementsByClassName('sca-footer');
          var editPanels = document.getElementsByClassName('panel-height');

          var panelHeight = 0;
          angular.forEach(editPanels, function (panel) {
            panelHeight += panel.clientHeight;
          });
          //console.log(header[0].clientHeight);
          //console.log(footer[0].clientHeight);
          var existingHeight = header[0].clientHeight + panelHeight;
          if (scope.first) {
            //existingHeight -= 84;
          }
          $(element).css('min-height', $window.innerHeight - existingHeight + 15);
        };
        scope.initializeWindowSize();
        angular.element($window).bind('resize', function () {
          scope.first = false;
          scope.initializeWindowSize();
        });
        scope.$on('repeatComplete', function (event, data) {
          console.log('here');
          scope.initializeWindowSize();
        });
      }
    };
  })

  .controller('EditCtrl', function EditCtrl($scope, $window, $rootScope, $location, layoutHandler, accountService, scaService, snowowlService, objectService, notificationService, $routeParams, $timeout, $interval, $q) {

    // clear task-related information
    $rootScope.validationRunning = false;
    $rootScope.classificationRunning = false;
    $rootScope.currentTask = null;

    $scope.projectKey = $routeParams.projectKey;
    $scope.taskKey = $routeParams.taskKey;

    $scope.branch = 'MAIN/' + $scope.projectKey + '/' + $scope.taskKey;
    $scope.parentBranch = 'MAIN/' + $scope.projectKey;

    //////////////////////////////
    // Infinite Scroll
    //////////////////////////////
    $scope.conceptsDisplayed = 5;
    $scope.conceptsRendering = false;
    $scope.addMoreItems = function () {
      if ($scope.conceptsDisplayed < $scope.concepts.length) {
        $scope.conceptsDisplayed += 2;
        $scope.conceptsRendering = true;
      }
    };
    $scope.renderingComplete = function () {
      console.log('broadcasting');
      $rootScope.$broadcast('repeatComplete');
      $scope.conceptsRendering = false;
    };

    /////////////////////////////////
    // View & Layout
    /////////////////////////////////

    /**
     * Helper function called by setView
     * NOTE: Currently only used to set layout for edit-default
     */
    function setLayout(useDefault) {

      var layout = {};

      // set the default layout
      switch ($scope.thisView) {

        case 'edit-default':

          accountService.getUserPreferences().then(function (preferences) {

            console.debug('preferences', preferences);

            if (preferences && preferences.layout && preferences.layout.editDefault) {
              layout = preferences.layout.editDefault;
            } else {


              // check if user preferences have
              layout = {

                'name': 'editDefault',
                'width': 12,
                'children': [
                  {
                    'name': 'sidebar',
                    'width': 3,
                  },
                  {
                    'name': 'modelsAndConcepts',
                    'width': 9,
                    'children': [
                      {
                        'name': 'models',
                        'width': 6,
                      },
                      {
                        'name': 'concepts',
                        'width': 6
                      }
                    ]
                  }
                ]
              };
            }

            console.debug('new layout object', layout);

            // set the widths for easy access
            layoutHandler.setLayout(layout);

          });
          break;
        default:
          layout = {};
          break;
      }

    }

    $scope.loadEditPanelConcepts = function () {

      console.debug('edit.js: task detected', $scope.taskKey);
      $scope.getEditPanel();

      // get saved list
      scaService.getUiStateForTask(
        $routeParams.projectKey, $routeParams.taskKey, 'saved-list')
        .then(function (uiState) {

          console.debug('saved-list:', uiState);

          if (!uiState) {
            $scope.savedList = {items: []};
          }
          else {
            $scope.savedList = uiState;
          }

        }
      );

      // get favorite list
      scaService.getUiStateForTask(
        $routeParams.projectKey, $routeParams.taskKey, 'my-favorites')
        .then(function (uiState) {

          console.debug('saved-list:', uiState);

          if (!uiState) {
            $scope.favorites = {items: []};
          }
          else {
            $scope.favorites = uiState;
          }

        }
      );
    };
    
   

    $scope.getEditPanel = function () {
      scaService.getUiStateForTask(
        $routeParams.projectKey, $routeParams.taskKey, 'edit-panel')
        .then(function (uiState) {
          $scope.concepts = [];
          if (!uiState || Object.getOwnPropertyNames(uiState).length === 0) {
            $scope.editList = [];
          }
          else {
            $scope.editList = uiState;
            for (var i = 0; i < $scope.editList.length; i++) {
              $scope.addConceptToListFromId($scope.editList[i]);
            }
          }

        }
      );
    };

    $scope.getClassificationEditPanel = function () {
      scaService.getUiStateForTask(
        $routeParams.projectKey, $routeParams.taskKey, 'classification-edit-panel')
        .then(function (uiState) {
          $scope.concepts = [];
          if (!uiState || Object.getOwnPropertyNames(uiState).length === 0) {
            $scope.classificationEditList = [];
          }
          else {
            $scope.classificationEditList = uiState;
            for (var i = 0; i < $scope.classificationEditList.length; i++) {
              $scope.addConceptToListFromId($scope.classificationEditList[i]);
            }
          }

        }
      );
    };

    $scope.getValidationEditPanel = function () {
      scaService.getUiStateForTask(
        $routeParams.projectKey, $routeParams.taskKey, 'validation-edit-panel')
        .then(function (uiState) {
          $scope.concepts = [];
          if (!uiState || Object.getOwnPropertyNames(uiState).length === 0) {
            $scope.validationEditList = [];
          }
          else {
            $scope.validationEditList = uiState;
            for (var i = 0; i < $scope.validationEditList.length; i++) {
              $scope.addConceptToListFromId($scope.validationEditList[i]);
            }
          }

        }
      );
    };

    $scope.setView = function (name) {

      // do nothing if no name supplied
      if (!name) {
        return;
      }
      // if same state requested, do nothing
      if (name === $scope.thisView) {
        return;
      }

      switch (name) {
        case 'validation':
          $rootScope.pageTitle = 'Validation/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          $routeParams.mode = 'validation';
          //  view starts with no concepts
          $scope.concepts = [];
          $scope.canCreateConcept = false;
          break;
        case 'feedback':
          $rootScope.pageTitle = 'Providing Feedback/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          $routeParams.mode = 'feedback';

          //  view starts with no concepts
          $scope.concepts = [];
          $scope.canCreateConcept = false;
          break;
        case 'classification':
          $rootScope.pageTitle = 'Classification/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          $routeParams.mode = 'classification';
          $scope.getClassificationEditPanel();
          $scope.canCreateConcept = false;
          break;
        case 'conflicts':
          $rootScope.pageTitle = 'Concept Merges/' + $routeParams.projectKey + ($routeParams.taskKey ? '/' + $routeParams.taskKey : '');
          $routeParams.mode = 'conflicts';
          $scope.canCreateConcept = false;

          //  view starts with no concepts
          $scope.concepts = [];
          break;
        case 'edit-default':
          $rootScope.pageTitle = 'Edit Concepts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          $routeParams.mode = 'edit';
          $scope.canCreateConcept = true;

          // if a task, load edit panel concepts
          if ($scope.taskKey) {
            $scope.loadEditPanelConcepts();
          }
          break;
        case 'edit-no-sidebar':
          $rootScope.pageTitle = 'Edit Concepts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          $routeParams.mode = 'edit';
          $scope.canCreateConcept = true;
          // if a task, load edit panel concepts
          if ($scope.taskKey) {
            $scope.loadEditPanelConcepts();
          }
          break;
        case 'edit-no-model':
          $rootScope.pageTitle = 'Edit Concepts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          $routeParams.mode = 'edit';
          $scope.canCreateConcept = true;
          // if a task, load edit panel concepts
          if ($scope.taskKey) {
            $scope.loadEditPanelConcepts();
          }
          break;
        default:
          $rootScope.pageTitle = 'Invalid View Requested';
          $scope.canCreateConcept = false;
          break;
      }

      /*       // if first view set, retrieve persisted layout state and apply
       if (!$rootScope.layout) {
       scaService.getUiStateForUser('page-layouts').then(function (response) {
       $rootScope.layout = response;
       setLayout();
       });
       }
       */
      // otherwise simply apply layout settings

      // set this and last views
      $scope.lastView = $scope.thisView;
      $scope.thisView = name;

      // set layout based on view
      setLayout();

    };

    //////////////////////////////
    // Initialization
    //////////////////////////////
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
    $scope.editList = null;
    $scope.savedList = null;
    $scope.classificationEditList = null;

    // view saving
    $scope.thisView = null;
    $scope.lastView = null;

    // control variables
    $scope.canRebase = false;
    $scope.canPromote = false;
    $scope.canConflict = false;
    $scope.canCreateConcept = false;

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

    /**
     * edit.js-specific helper function to return full boostrap col names
     * May need to change depending on responsive needs
     * @param name the unique column name
     * @returns (*) an array of col-(size)-(width) class names
     */
    $scope.getLayoutWidths = function (name) {

      if (!$rootScope.layoutWidths || !$rootScope.layoutWidths[name]) {
        return;
      }

      var width = $rootScope.layoutWidths[name];
      var colClasses = [
        'col-xs-12',
        'col-sm-12',
        'col-md-' + width,
        'col-lg-' + width,
        'col-xl-' + width
      ];
      return colClasses;
    };

    $scope.conceptUpdateFunction = function (project, task, concept) {
      console.log('functionCalled');
      var deferred = $q.defer();
      snowowlService.updateConcept(project, task, concept).then(function (response) {
        deferred.resolve(response);
      });
      return deferred.promise;
    };
    /**
     * Adds concept from this branch to the concepts array
     * @param conceptId the SCTID of the concept
     */
    $scope.addConceptToListFromId = function (conceptId) {

      if (!conceptId) {
        console.error('Could not add concept to edit list, id required');
        return;
      }

      console.debug('adding concept', conceptId);

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

      // if unsaved concept, push
      if (conceptId === 'unsaved') {
        $scope.concepts.push({conceptId: 'unsaved'});

        // send loading notification
        if ($scope.concepts.length === $scope.editList.length) {
          notificationService.sendMessage('All concepts loaded', 10000, null);
          $scope.updateEditListUiState();
        } else {
          // send loading notification for user display
          notificationService.sendMessage('Loading concepts...', 10000, null);
        }
      } else {

        // get the concept and add it to the stack
        snowowlService.getFullConcept(conceptId, $scope.targetBranch).then(function (response) {

          // console.debug('Response received for ' + conceptId, response);
          if (!response) {
            return;
          }

          $scope.concepts.push(response);
          console.log($routeParams);
          if ($routeParams.mode === 'classification') {
            if ($scope.classificationEditList.indexOf(conceptId) === -1) {
              $scope.updateClassificationEditListUiState();
            }
          } else if ($routeParams.mode === 'validation') {
            if ($scope.validationEditList.indexOf(conceptId) === -1) {
              $scope.updateValidationEditListUiState();
            }
          } else if ($scope.editList.indexOf(conceptId) === -1) {
            console.debug('updating');
            $scope.updateEditListUiState();
            // update edited item flagging
          }
        }, function (error) {

          // if an error, remove from edit list (if exists)
          if ($scope.editList.indexOf(conceptId) !== -1) {
            console.debug('updating');
            $scope.updateEditListUiState();      // force update the ui state

          }

        }).finally(function () {
          // send loading notification
          if ($routeParams.mode === 'classification') {
            if ($scope.concepts.length === $scope.classificationEditList.length) {
              notificationService.sendMessage('All concepts loaded', 10000, null);
              $scope.updateClassificationEditListUiState();
            } else {
              // send loading notification for user display
              notificationService.sendMessage('Loading concepts...', 10000, null);
            }
          }
          else if ($scope.concepts.length === $scope.editList.length) {
            notificationService.sendMessage('All concepts loaded', 10000, null);
            $scope.updateEditListUiState();
          } else {
            // send loading notification for user display
            notificationService.sendMessage('Loading concepts...', 10000, null);
          }

        });
      }

    };

    $scope.dropConcept = function (conceptIdNamePair) {

      var conceptId = conceptIdNamePair.id;
      var name = conceptIdNamePair.name;

      notificationService.sendMessage('Adding concept ' + (name ? name : conceptId) + ' to edit panel', 10000, null);

      for (var i = 0; i < $scope.concepts.length; i++) {
        if ($scope.concepts[i].conceptId === conceptId) {
          notificationService.sendWarning('Concept ' + $scope.concepts[i].fsn + ' already in list', 5000);

          // update the stale flags

          return;
        }
      }

      snowowlService.getFullConcept(conceptId, $scope.targetBranch).then(function (concept) {
        $scope.concepts.push(concept);
        notificationService.sendMessage('Concept ' + concept.fsn + ' successfully added to edit list', 5000, null);

        // update the edit list
        $scope.updateEditListUiState();
      }, function (error) {
        notificationService.sendError('Unexpected error loading concept ' + conceptId, 0);
      });

    };

    // helper function to save current edit list (task view only)
    $scope.updateEditListUiState = function () {
      if ($scope.taskKey) {
        console.log('Updating edit list');
        var conceptIds = [];
        angular.forEach($scope.concepts, function (concept) {
          if (concept.conceptId) {
            conceptIds.push(concept.conceptId);
          } else {
            conceptIds.push('unsaved');
          }
        });

        $scope.editList = conceptIds;

        scaService.saveUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'edit-panel', conceptIds);
      }
    };

    // helper function to save current edit list (classification view only)
    $scope.updateClassificationEditListUiState = function () {
      if ($scope.taskKey) {
        console.log('Updating classification edit list');
        var conceptIds = [];
        angular.forEach($scope.concepts, function (concept) {
          if (concept.conceptId) {
            conceptIds.push(concept.conceptId);
          }
        });

        scaService.saveUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'classification-edit-panel', conceptIds);
      }
    };

    // helper function to save current edit list (validation view only)
    $scope.updateValidationEditListUiState = function () {
      if ($scope.taskKey) {
        console.log('Updating validation edit list');
        var conceptIds = [];
        angular.forEach($scope.concepts, function (concept) {
          if (concept.conceptId) {
            conceptIds.push(concept.conceptId);
          }
        });

        scaService.saveUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'validation-edit-panel', conceptIds);
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

          return;
        }
      }

      $scope.addConceptToListFromId(data.conceptId);
      $scope.editList.push(data.conceptId);
      $scope.updateEditListUiState();

    });

    // watch for concept cloning from the edit sidebar
    $scope.$on('cloneConcept', function (event, data) {
      scaService.deleteModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, null);
      if (!data || !data.conceptId) {
        return;
      }

      var concept = {'id': null, 'branch': $scope.targetBranch};

      notificationService.sendMessage('Cloning concept...');

      console.debug('cloning concept with id ' + data.conceptId);

      // get the concept and add it to the stack
      snowowlService.getFullConcept(data.conceptId, $scope.targetBranch).then(function (response) {

        // check if original concept already exists, if not add it
        var conceptExists = false;
        for (var i = 0; i < $scope.concepts.length; i++) {

          console.debug('checking for duplicate concept, id: ', $scope.concepts[i].conceptId);

          // cancel if unsaved work exists (track-by id problems)
          if (!$scope.concepts[i].conceptId) {
            notificationService.sendWarning('A new, unsaved concept exists; please save before cloning', 10000);
            return;
          }

          if ($scope.concepts[i].conceptId === data.conceptId) {
            console.debug('duplicate concept found');
            conceptExists = true;
          }
        }
        if (!conceptExists) {
          console.debug('concept with id ' + concept.conceptId + ' not present in list, adding');
          $scope.concepts.push(response);

          $timeout(function () {
            $scope.updateEditListUiState();

          }, 1000);

        }

        // deep copy the object -- note: does not work in IE8, but screw
        // that!
        var clonedConcept = JSON.parse(JSON.stringify(response));

        // clear relevant fields to force creation of new components
        for (var k = clonedConcept.descriptions.length - 1; k >= 0; k--) {
          var description = clonedConcept.descriptions[k];
          description.effectiveTime = null;
          description.descriptionId = null;
          delete description.conceptId;
          if (description.active === false) {
            clonedConcept.descriptions.splice(k, 1);
          }
        }

        for (var j = clonedConcept.relationships.length - 1; j >= 0; j--) {
          var relationship = clonedConcept.relationships[j];
          relationship.sourceId = null;
          relationship.effectiveTime = null;
          delete relationship.relationshipId;
          delete relationship.target.effectiveTime;
          delete relationship.target.moduleId;
          delete relationship.target.active;
          delete relationship.target.definitionStatus;

          if (relationship.active === false || relationship.characteristicType === 'INFERRED_RELATIONSHIP') {
            clonedConcept.relationships.splice(j, 1);
          }
        }

        clonedConcept.conceptId = null;
        clonedConcept.fsn = null;

        var successMsg = 'Concept ' + clonedConcept.fsn + ' successfully cloned';

        // add a cloned tag to differentiate the clonedConcept

        delete clonedConcept.isLeafInferred;
        delete clonedConcept.effectiveTime;
        delete clonedConcept.preferredSynonym;

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

      if ($scope.thisView === 'classification') {
        // remove the concept
        var index = $scope.concepts.indexOf(data.concept);
        $scope.concepts.splice(index, 1);
        $scope.updateClassificationEditListUiState();

      }
      else {

        if (!data.concept.conceptId && data.concept !== objectService.getNewConcept()) {
          if (window.confirm('This concept is unsaved; removing it will destroy your work.  Continue?')) {
            scaService.deleteModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, null);
          } else {
            return;
          }
        }


        // remove the concept
        var editIndex = $scope.concepts.indexOf(data.concept);
        $scope.concepts.splice(editIndex, 1);
        $scope.updateEditListUiState();

      }
    });

    // creates a blank (unsaved) concept in the editing list
    $scope.createConcept = function () {
      scaService.deleteModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, null);
      // check if an unsaved concept already exists
      for (var i = 0; i < $scope.concepts.length; i++) {
        if (!$scope.concepts[i].conceptId) {
          notificationService.sendWarning('A new, unsaved concept already exists.', 5000);
          return;
        }
      }

      var concept = objectService.getNewConcept($scope.targetBranch);

      $scope.concepts.unshift(concept);
      $scope.updateEditListUiState();
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
        snowowlService.getEquivalentConcepts($scope.classificationContainer.id, $scope.targetBranch).then(function (equivalentConcepts) {
          equivalentConcepts = equivalentConcepts ? equivalentConcepts : {};
          $scope.classificationContainer.equivalentConcepts = [];
          angular.forEach(equivalentConcepts, function (item) {
            //console.log(item.equivalentConcepts);
            if (item.equivalentConcepts.length === 2) {
              $scope.classificationContainer.equivalentConcepts.push(item.equivalentConcepts);
            }
            else {
              var key = item.equivalentConcepts[0];
              angular.forEach(item.equivalentConcepts, function (equivalence) {
                // console.log(item);
                if (equivalence !== key) {
                  var newEq = [];
                  newEq.push(key);
                  newEq.push(equivalence);
                  $scope.classificationContainer.equivalentConcepts.push(newEq);
                }
              });
            }
          });
          //console.log($scope.classificationContainer.equivalentConcepts);
        });
      } else {
        $scope.classificationContainer.equivalentConcepts = [];
      }

    };

    // function to get the latest classification result
    $scope.getLatestClassification = function () {

      if ($scope.taskKey) {

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

    // on classification reload notification, reload latest classification
    $scope.$on('reloadClassification', function (event, data) {
      $scope.classificationContainer = null;

      // add a short time out to ensure don't retrieve previous classification
      $timeout(function () {
        $scope.getLatestClassification();
      }, 2000);
    });

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

    var feedbackStyles = {};

    $scope.getFeedbackStyles = function (concept) {

      if (feedbackStyles.hasOwnProperty(concept.conceptId)) {
        return feedbackStyles[concept.conceptId];
      } else {

        var styleObj = {};

        if (!concept.effectiveTime) {
          // do nothing
        } else {

          angular.forEach(concept.descriptions, function (description) {
            console.debug('checking description', description.effectiveTime);
            if (description.effectiveTime === undefined) {
              console.debug('--> modified');
              styleObj[description.descriptionId] = {
                message: null,
                style: 'tealhl'
              };
            }
          });
          angular.forEach(concept.relationships, function (relationship) {
            if (!relationship.effectiveTime) {
              styleObj[relationship.relationshipId] = {
                message: null,
                style: 'tealhl'
              };
            }
          });
        }

        feedbackStyles[concept.conceptId] = styleObj;
      }

    };

    //////////////////////////////////////////
    // Conflict Report & Controls
    //////////////////////////////////////////

    // Get latest conflict report
    $scope.mergeReviewCurrent = null;
    $scope.getLatestConflictsReport = function () {

      if (!$scope.taskKey) {
        // scaService.getConflictReportForProject($routeParams.projectKey).then(function
        // (response) { $scope.conflictsContainer.conflicts = response ?
        // response : {}; });
      } else {

        /* TODO Removed 11/19, would prefer to have merge-review status as part of task info

         snowowlService.getMergeReviewForBranches($scope.parentBranch, $scope.branch).then(function (response) {

         if (!response || response.status !== 'CURRENT') {
         console.debug('No current merge review');
         $scope.mergeReviewCurrent = false;
         }

         else if (response.status === 'CURRENT') {
         console.debug('Current merge review');
         $scope.mergeReviewCurrent = true;
         }
         })*/
      }
    };

    // Listen for Branch Divergence in order to trigger a conflicts rpoert
    // refresh,  triggered from taskDetail.js on either (a) initialization
    // where a task is in DIVERGED state, or (b) notification of task state
    // change to DIVERGED
//
    $rootScope.$on('branchDiverged', function (event) {

      $scope.getLatestConflictsReport();
    });

    /**
     * Set page functionality based on branch state
     */
    function setBranchFunctionality(branchState) {

      console.debug('setBranchFunctionality', branchState, $scope.task, $scope.isOwnTask);

      // as of 11/19/2015, new tasks are not being returned with UP_TO_DATE
      // status
      if (!branchState) {
        branchState = $scope.task.status === 'New' ? 'UP_TO_DATE' : $scope.task.status;
      }

      switch (branchState) {
        case 'FORWARD':
          $scope.canPromote = $scope.isOwnTask;
          $scope.canConflict = false;
          break;
        case 'UP_TO_DATE':
          $scope.canPromote = false;
          $scope.canConflict = false;
          break;
        case 'BEHIND':
          $scope.canPromote = false;
          $scope.canConflict = $scope.isOwnTask && $scope.task.status !== 'Promoted';
          break;
        case 'STALE':
          $scope.canPromote = false;
          $scope.canConflict = $scope.isOwnTask && $scope.task.status !== 'Promoted';
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
           * conflicts container must have been initialized in
           * conflicts.js,
           * and the conceptsToResolve list must be empty (i.e. all
           * conflicts moved to conceptsResolved)
           *
           */
          $scope.canPromote = false;
          $scope.canConflict = $scope.isOwnTask && $scope.task.status !== 'Promoted';
          break;
        default:
          notificationService.sendError('Error:  Cannot determine branch state. Conflict, rebase, and promote functions disabled');
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
    // Project Promotion
    /////////////////////////////////////

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

    // infinite scroll function -- TODO Relocate
    $scope.isLast = function (check) {
      var cssClass = check ? 'last' : null;
      return cssClass;
    };

//////////////////////////////////////////
    // Initialization
//////////////////////////////////////////

    // if a task, get the task for assigned user information
    if ($routeParams.taskKey) {
      scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
        $scope.task = response;
        $rootScope.currentTask = response;

        accountService.getRoleForTask(response).then(function (role) {
          console.debug(response, role);
          $scope.isOwnTask = role === 'AUTHOR';
          setBranchFunctionality($scope.task.branchState);
        });

      });
    }

    // start monitoring of task
    scaService.monitorTask($routeParams.projectKey, $routeParams.taskKey);

    // initialize the container objects
    $scope.classificationContainer = {
      id: null,
      status: 'Loading...',       // NOTE: Overwritten by validation field
      equivalentConcepts: [],
      relationshipChanges: []
    };
    $scope.validationContainer = {
      executionStatus: 'Loading...',       // NOTE: Overwritten by validation
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

    $scope.$on('reloadTask', function (event, data) {
      if ($routeParams.taskKey) {
        scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
          $scope.task = response;
          $rootScope.currentTask = response;

          $scope.getLatestClassification();
          $scope.getLatestValidation();

          setBranchFunctionality($scope.task.branchState);
        });
      }
    });

    // populate the container objects
    $scope.getLatestClassification();
    $scope.getLatestValidation();
    $scope.getLatestConflictsReport();

  });