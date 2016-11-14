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
          scope.initializeWindowSize();
        });
      }
    };
  })

  .controller('EditCtrl', function EditCtrl($scope, $window, $rootScope, $location, $modal, layoutHandler, metadataService, accountService, scaService, inactivationService, snowowlService, componentAuthoringUtil, notificationService, $routeParams, $timeout, $interval, $q, crsService, reviewService, ngTableParams, templateService, $filter, $compile) {



    //
    // Inactivation testing
    // TODO Remove when done
    //

    /*
     $timeout(function () {
     inactivationService.setParameters($scope.branch, $scope.concepts[0], 'AMBIGUOUS', {POSSIBLY_EQUIVALENT_TO: ['73761001']});
     $rootScope.$broadcast('conceptEdit.inactivateConcept');
     }, 4000);*/

    $scope.projectKey = $routeParams.projectKey;
    $scope.taskKey = $routeParams.taskKey;

    // clear task-related information
    $rootScope.validationRunning = false;
    $rootScope.classificationRunning = false;
    $rootScope.currentTask = null;


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

      $rootScope.$broadcast('repeatComplete');
      $scope.conceptsRendering = false;
    };
    $scope.goToConflicts = function () {
      snowowlService.getBranch(metadataService.getBranchRoot() + '/' + $scope.projectKey).then(function (response) {
        if (!response.metadata || response.metadata && !response.metadata.lock) {
          $location.url('tasks/task/' + $scope.projectKey + '/' + $scope.taskKey + '/conflicts');
        }
        else {
          notificationService.sendWarning('Unable to start rebase on task ' + $scope.taskKey + ' as the project branch is locked due to ongoing changes.', 7000);
        }
      });
    };
    $scope.gotoHome = function () {
      $location.url('home');
    };
    $scope.gotoReviews = function () {
      $location.url('review-tasks');
    };
    $scope.gotoHome = function () {
      $location.url('home');
    };
    $scope.gotoReviews = function () {
      $location.url('review-tasks');
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

      // function only relevant for tasks
      if (!$routeParams.taskKey) {
        return;
      }


      $scope.getEditPanel();

      // get saved list
      scaService.getUiStateForTask(
        $routeParams.projectKey, $routeParams.taskKey, 'saved-list')
        .then(function (uiState) {
            if (!uiState) {
              $scope.savedList = {items: []};
            }
            else {
              $scope.savedList = uiState;
            }

          }
        );

      // get favorite list
      scaService.getUiStateForUser(
        'my-favorites-' + $routeParams.projectKey)
        .then(function (uiState) {

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

    //
    // View functions
    //
    $scope.$on('conceptEdit.inactivateConcept', function (event, data) {
      $scope.setView('inactivation');
    });

    $scope.$on('inactivation.cancelInactivation', function (event, data) {
      $scope.setView('edit-default');
    });


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
        case 'inactivation':
          $rootScope.pageTitle = 'Inactivation/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          $routeParams.mode = 'inactivation';
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
        case 'batch':
          $rootScope.pageTitle = 'Batch Concepts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          $routeParams.mode = 'batch';
          $scope.canCreateConcept = false;
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


    // displayed concept array
    $scope.concepts = [];

    // the inactivation concept (if available)
    $scope.inactivationConcept = null;

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
    //
    // INACTIVATION FUNCTIONS
    //

    // watch for inactivation requests from elsewhere in the application
    $scope.$on('inactivateConcept', function (event, data) {
      $scope.setView('inactivation');
    });

    // pass inactivation service function to determine whether in active inactivation (heh)
    $scope.isInactivation = inactivationService.isInactivation;


    //
    // Review functions
    //

    $scope.getConceptsForReview = function (idList, review, feedbackList) {

      snowowlService.bulkGetConcept(idList, $scope.branch).then(function (response) {
        angular.forEach(response.items, function (concept) {
          angular.forEach(review.concepts, function (reviewConcept) {
            if (concept.id === reviewConcept.conceptId) {
              if (concept.fsn) {
                reviewConcept.term = concept.fsn.term;
              }
              angular.forEach(feedbackList, function (feedback) {
                if (reviewConcept.conceptId === feedback.id) {
                  reviewConcept.messages = feedback.messages;
                  reviewConcept.viewDate = feedback.viewDate;
                }
              });
            }
          });
          angular.forEach(review.conceptsClassified, function (reviewConcept) {
            if (concept.id === reviewConcept.conceptId) {
              reviewConcept.term = concept.fsn.term;
              angular.forEach(feedbackList, function (feedback) {
                if (reviewConcept.conceptId === feedback.id) {
                  reviewConcept.messages = feedback.messages;
                  reviewConcept.viewDate = feedback.viewDate;
                }
              });
            }
          });
        });
        $scope.feedbackContainer.review = review ? review : {};
      });
    };

    // on load, set the initial view based on classify/validate parameters
    $scope.setInitialView = function () {
      if ($routeParams.mode === 'classify') {
        $scope.setView('classification');
      } else if ($routeParams.mode === 'validate') {
        $scope.setView('validation');
      } else if ($routeParams.mode === 'inactivation') {
        // on load, check ui state for active inactivations (heh)
        scaService.getUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'inactivationConcept').then(function (response) {
          if (response) {
            inactivationService.setConceptToInactivate(response);
            $scope.setView('inactivation');
          }
        });

      } else if ($routeParams.mode === 'feedback') {
        snowowlService.getTraceabilityForBranch($scope.branch).then(function (traceability) {
          var review = {};

          review.traceability = traceability;
          review.concepts = [];
          review.conceptsClassified = [];
          var idList = [];
          angular.forEach(traceability.content, function (change) {
            if (change.activityType === 'CONTENT_CHANGE') {
              angular.forEach(change.conceptChanges, function (concept) {
                if (review.concepts.filter(function (obj) {
                    return obj.conceptId === concept.conceptId.toString();
                  }).length === 0 && concept.componentChanges.filter(function (obj) {
                    return obj.componentSubType !== 'INFERRED_RELATIONSHIP';
                  }).length !== 0) {

                  concept.conceptId = concept.conceptId.toString();
                  concept.lastUpdatedTime = change.commitDate;
                  review.concepts.push(concept);
                  idList.push(concept.conceptId);
                }
                else if (review.conceptsClassified.filter(function (obj) {
                    return obj.conceptId === concept.conceptId.toString();
                  }).length === 0 && concept.componentChanges.filter(function (obj) {
                    return obj.componentSubType === 'INFERRED_RELATIONSHIP';
                  }).length !== 0) {
                  concept.conceptId = concept.conceptId.toString();
                  concept.lastUpdatedTime = change.commitDate;
                  review.conceptsClassified.push(concept);
                  idList.push(concept.conceptId);
                }
                else if (concept.componentChanges.filter(function (obj) {
                    return obj.componentSubType !== 'INFERRED_RELATIONSHIP';
                  }).length !== 0) {
                  var updateConcept = review.concepts.filter(function (obj) {
                    return obj.conceptId === concept.conceptId.toString();
                  })[0];
                  angular.forEach(concept.componentChanges, function (componentChange) {
                    updateConcept.componentChanges.push(componentChange);
                  });
                  updateConcept.lastUpdatedTime = change.commitDate;
                }
              });
            }
            else if (change.activityType === 'CLASSIFICATION_SAVE') {
              angular.forEach(change.conceptChanges, function (concept) {
                if (review.conceptsClassified.filter(function (obj) {
                    return obj.conceptId === concept.conceptId.toString();
                  }).length === 0) {
                  concept.conceptId = concept.conceptId.toString();
                  review.conceptsClassified.push(concept);
                  idList.push(concept.conceptId);
                }
                else {
                  var updateConcept = review.conceptsClassified.filter(function (obj) {
                    return obj.conceptId === concept.conceptId.toString();
                  })[0];
                  angular.forEach(concept.componentChanges, function (componentChange) {
                    updateConcept.componentChanges.push(componentChange);
                  });
                  updateConcept.lastUpdatedTime = change.commitDate;
                }
              });
            }

          });
          scaService.getReviewForTask($routeParams.projectKey, $routeParams.taskKey).then(function (feedback) {
            var i, j, temparray, chunk = 50;
            for (i = 0, j = idList.length; i < j; i += chunk) {
              temparray = idList.slice(i, i + chunk);
              $scope.getConceptsForReview(temparray, review, feedback);
            }
          });

        }, function (error) {
          $scope.feedbackContainer.review = {errorMsg: error};
        });
        $scope.setView('feedback');
      } else if ($routeParams.mode === 'conflicts') {
        $scope.setView('conflicts');
      } else if ($routeParams.mode === 'edit') {
        $scope.setView('edit-default');
      } else if ($routeParams.mode === 'batch') {
        $scope.setView('batch');
      }

      // if improper route, send error and halt
      else {
        notificationService.sendError('Bad URL request for task view detected (' + $routeParams.mode + ').  Acceptable values are: edit, classify, conflicts, feedback, and validate');
        return;
      }
    };

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

      var deferred = $q.defer();
      snowowlService.updateConcept(project, task, concept).then(function (response) {
        deferred.resolve(response);
      });
      return deferred.promise;
    };

    /**
     * Function to load concept from termserver, manage edit list & user notifications
     * @param conceptId
     * @returns {Function}
     */
    function loadConceptFromTermServerHelper(conceptId) {
      var deferred = $q.defer();
      $scope.conceptLoading = true;

      // first, check UI state for task
      scaService.getModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, conceptId).then(function (response) {

        if (response) {
          $scope.concepts.push(response);
          $scope.updateEditListUiState();
          notificationService.sendMessage('Concept loaded', 3000);
        } else {

          // get the concept and add it to the stack
          snowowlService.getFullConcept(conceptId, $scope.targetBranch).then(function (response) {
            $scope.conceptLoading = false;
            if (!response) {
              return;
            }

            $scope.concepts.push(response);

            if ($scope.editList.indexOf(conceptId) === -1) {
              $scope.updateEditListUiState();
            }

            if ($scope.concepts.length === $scope.editList.length) {
              notificationService.sendMessage('All concepts loaded', 10000, null);
              // ensure loaded concepts match order of edit list
              $scope.concepts.sort(function (a, b) {
                return $scope.editList.indexOf(a.conceptId) > $scope.editList.indexOf(b.conceptId);
              });
              $scope.updateEditListUiState();
            } else {
              // send loading notification for user display
              notificationService.sendMessage('Loading concepts...', 10000, null);
            }

          }, function (error) {
            $scope.conceptLoading = false;
            console.log('Error retrieving concept', error);
            if (error.status === 404) {
              notificationService.sendWarning('Concept not found on this branch. If it exists on another branch, promote that branch and try again');
            } else {
              notificationService.sendError('Unexpected error retrieving concept');
            }
          });
        }
      });
      return deferred.promise;
    }


    /**
     * Adds concept from this branch to the concepts array
     * @param conceptId the SCTID of the concept
     */
    $scope.addConceptToListFromId = function (conceptId) {

      if (!conceptId) {
        console.error('Could not add concept to edit list, id required');
        return;
      }

      // verify that this SCTID does not exist in the edit list
      var conceptPresent = $scope.concepts.filter(function (c) {
          return c.conceptId === conceptId;
        }).length > 0;

      if (conceptPresent) {
        notificationService.sendWarning('Concept already added', 5000);
        $scope.conceptLoading = false;
        return;
      }

      // send loading notification for user display
      notificationService.sendMessage('Loading concepts...', 10000, null);


      // if a CRS concept for this task, retrieve from service
      if (crsService.isCrsConcept(conceptId)) {

        // get the CRS Concept
        var crsConcept = crsService.getCrsConcept(conceptId);

        // if concept exists and is unsaved, use JSON representation
        if (crsConcept && !crsConcept.saved) {

          // if the concept has been saved, retrieve from
          $scope.concepts.push(crsConcept.concept);
          notificationService.sendMessage('All concepts loaded', 5000, null);
          $scope.conceptLoading = false;
        }

        // otherwise, load from terserver
        else {
          loadConceptFromTermServerHelper(conceptId);
        }
      }

      // if unsaved concept, push
      else if (conceptId === 'unsaved' || !snowowlService.isSctid(conceptId)) {
        $scope.concepts.push({conceptId: conceptId});

        // send loading notification
        if ($scope.concepts.length === $scope.editList.length) {
          $scope.conceptLoading = false;
          notificationService.sendMessage('All concepts loaded', 10000, null);
          $scope.updateEditListUiState();
        } else {
          // send loading notification for user display
          notificationService.sendMessage('Loading concepts...', 10000, null);
        }
      } else {
        loadConceptFromTermServerHelper(conceptId);

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

        var conceptIds = [];
        angular.forEach($scope.concepts, function (concept) {
          if (concept.conceptId) {
            conceptIds.push(concept.conceptId);
          }
        });

        scaService.saveUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'validation-edit-panel', conceptIds);
      }
    };


//
// Editing Notifications
//

    $scope.conceptLoading = false;

// watch for concept selection from the edit sidebar
    $scope.$on('editConcept', function (event, data) {

      // do not modify if in view with own managed list
      if ($scope.thisView === 'classification' || $scope.thisView === 'validation' || $scope.thisView === 'feedback') {
        return;
      }

      // if load already in progress from editConcept or cloneConcept notification, stop
      if ($scope.conceptLoading) {
        return;
      }

      var conceptId = data.conceptId;
      $scope.conceptLoading = true;

      // verify that this SCTID does not exist in the edit list
      for (var i = 0; i < $scope.concepts.length; i++) {
        if ($scope.concepts[i].conceptId === conceptId) {

          notificationService.sendWarning('Concept already added', 5000);
          $scope.conceptLoading = false;
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

      $scope.conceptLoading = true;

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

            $scope.conceptLoading = false;

            return;
          }

          if ($scope.concepts[i].conceptId === data.conceptId) {
            conceptExists = true;
          }
        }
        if (!conceptExists) {
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
          description.released = false;
          description.moduleId = metadataService.getCurrentModuleId();

          delete description.conceptId;
          if (description.active === false) {
            clonedConcept.descriptions.splice(k, 1);
          }
        }

        for (var j = clonedConcept.relationships.length - 1; j >= 0; j--) {
          var relationship = clonedConcept.relationships[j];
          relationship.sourceId = null;
          relationship.effectiveTime = null;
          relationship.released = false;
          relationship.moduleId = metadataService.getCurrentModuleId();
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
        clonedConcept.moduleId = metadataService.getCurrentModuleId();
        clonedConcept.fsn = null;
        clonedConcept.released = false;

        var successMsg = 'Concept ' + clonedConcept.fsn + ' successfully cloned';

        // add a cloned tag to differentiate the clonedConcept

        delete clonedConcept.isLeafInferred;
        delete clonedConcept.effectiveTime;
        delete clonedConcept.preferredSynonym;

        // push the cloned clonedConcept
        $scope.concepts.push(clonedConcept);
        $scope.conceptLoading = false;
        notificationService.sendMessage(successMsg, 5000);

      }, function (error) {
        $scope.conceptLoading = false;
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

      } else if ($scope.thisView === 'conflicts') {
        // do nothing, concept management handled in conflicts.js
      }
      else {

        // remove the concept
        var editIndex = $scope.concepts.indexOf(data.concept);
        $scope.concepts.splice(editIndex, 1);

        // only update the edit list if actually in an edit view
        if ($scope.thisView === 'edit-default' || $scope.thisView === 'edit-no-sidebar' || $scope.thisView === 'edit-no-model') {
          $scope.updateEditListUiState();
        }

      }
    });

// creates a blank (unsaved) concept in the editing list
    $scope.createConcept = function () {

      var selectedTemplate = templateService.getSelectedTemplate();

      if (!selectedTemplate) {
        var concept = componentAuthoringUtil.getNewConcept();
        $scope.concepts.unshift(concept);
        $scope.updateEditListUiState();
      } else {
        templateService.createTemplateConcept(selectedTemplate).then(function (concept) {
          $scope.concepts.unshift(concept);
          $scope.updateEditListUiState();

        });
      }

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

            if (item.equivalentConcepts.length === 2) {
              $scope.classificationContainer.equivalentConcepts.push(item.equivalentConcepts);
            }
            else {
              var key = item.equivalentConcepts[0];
              angular.forEach(item.equivalentConcepts, function (equivalence) {

                if (equivalence !== key) {
                  var newEq = [];
                  newEq.push(key);
                  newEq.push(equivalence);
                  $scope.classificationContainer.equivalentConcepts.push(newEq);
                }
              });
            }
          });

        });
      } else {
        $scope.classificationContainer.equivalentConcepts = [];
      }
    };

// function to get the latest classification result
    $scope.getLatestClassification = function () {

      snowowlService.getClassificationsForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
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
      snowowlService.getTraceabilityForBranch($scope.branch).then(function (traceability) {
        var review = {};

        review.traceability = traceability;
        review.concepts = [];
        review.conceptsClassified = [];
        var idList = [];
        angular.forEach(traceability.content, function (change) {
          if (change.activityType === 'CONTENT_CHANGE') {
            angular.forEach(change.conceptChanges, function (concept) {
              if (review.concepts.filter(function (obj) {
                  return obj.conceptId === concept.conceptId.toString();
                }).length === 0 && concept.componentChanges.filter(function (obj) {
                  return obj.componentSubType !== 'INFERRED_RELATIONSHIP';
                }).length !== 0) {

                concept.conceptId = concept.conceptId.toString();
                concept.lastUpdatedTime = change.commitDate;
                review.concepts.push(concept);
                idList.push(concept.conceptId);
              }
              else if (review.conceptsClassified.filter(function (obj) {
                  return obj.conceptId === concept.conceptId.toString();
                }).length === 0 && concept.componentChanges.filter(function (obj) {
                  return obj.componentSubType === 'INFERRED_RELATIONSHIP';
                }).length !== 0) {
                concept.conceptId = concept.conceptId.toString();
                concept.lastUpdatedTime = change.commitDate;
                review.conceptsClassified.push(concept);
                idList.push(concept.conceptId);
              }
              else if (concept.componentChanges.filter(function (obj) {
                  return obj.componentSubType !== 'INFERRED_RELATIONSHIP';
                }).length !== 0) {
                var updateConcept = review.concepts.filter(function (obj) {
                  return obj.conceptId === concept.conceptId.toString();
                })[0];
                angular.forEach(concept.componentChanges, function (componentChange) {
                  updateConcept.componentChanges.push(componentChange);
                });
                updateConcept.lastUpdatedTime = change.commitDate;
              }
            });
          }
          else if (change.activityType === 'CLASSIFICATION_SAVE') {
            angular.forEach(change.conceptChanges, function (concept) {
              if (review.conceptsClassified.filter(function (obj) {
                  return obj.conceptId === concept.conceptId.toString();
                }).length === 0) {
                concept.conceptId = concept.conceptId.toString();
                review.conceptsClassified.push(concept);
                idList.push(concept.conceptId);
              }
              else {
                var updateConcept = review.conceptsClassified.filter(function (obj) {
                  return obj.conceptId === concept.conceptId.toString();
                })[0];
                angular.forEach(concept.componentChanges, function (componentChange) {
                  updateConcept.componentChanges.push(componentChange);
                });
                updateConcept.lastUpdatedTime = change.commitDate;
              }
            });
          }

        });
        scaService.getReviewForTask($routeParams.projectKey, $routeParams.taskKey).then(function (feedback) {
          var i, j, temparray, chunk = 50;
          for (i = 0, j = idList.length; i < j; i += chunk) {
            temparray = idList.slice(i, i + chunk);
            $scope.getConceptsForReview(temparray, review, feedback);
          }
        });

      }, function (error) {
        $scope.feedbackContainer.review = {errorMsg: error};
      });
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
            if (description.effectiveTime === undefined) {
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

    $scope.getSNF = function (id) {
      var deferred = $q.defer();
      snowowlService.getConceptSNF(id, $scope.branch).then(function (response) {
        deferred.resolve(response);
      });
      return deferred.promise;
    };

//////////////////////////////////////////
// Conflict Report & Controls
//////////////////////////////////////////

// Get latest conflict report
    $scope.mergeReviewCurrent = null;
    $scope.getLatestConflictsReport = function () {

      if (!$scope.taskKey) {
      } else {

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
    $scope.$watch(function () {
      return $rootScope.branchLocked;
    }, function () {
      if ($scope.task) {
        setBranchFunctionality($scope.task.branchState);
      }
    }, true);


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

    function loadProject() {

      var deferred = $q.defer();

      // get the project
      scaService.getProjectForKey($routeParams.projectKey).then(function (project) {
        $scope.project = project;
        deferred.resolve(project);
      }, function (error) {
        deferred.reject('Project retrieval failed');
      });

      return deferred.promise;


    }

    function loadTask() {

      var deferred = $q.defer();

      // get the task if appropriate
      if ($routeParams.taskKey) {
        scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {

          if (!response) {
            deferred.reject('Task could not be retrieved');
          }

          if (angular.isUndefined(response.linkedIssues)) {
            response.linkedIssues = [];
          }

          $scope.task = response;
          $rootScope.currentTask = response;

          // set the classification and validation flags
          $rootScope.classificationRunning = $scope.task.latestClassificationJson && ($scope.task.latestClassificationJson.status === 'RUNNING' || $scope.task.latestClassificationJson.status === 'BUILDING');
          $rootScope.validationRunning = $scope.task.latestValidationStatus === 'SCHEDULED' || $scope.task.latestValidationStatus === 'RUNNING' || $scope.task.latestValidationStatus === 'BUILDING';


          deferred.resolve(response);
        }, function (error) {
          deferred.reject('Task load failed');
        });

      } else {
        deferred.reject('No task to load');
      }
      return deferred.promise;


    }

    $scope.$on('reloadTask', function (event, data) {
      loadTask();
    });


    function loadBranch(branchPath) {

      var deferred = $q.defer();

      snowowlService.getBranch(branchPath).then(function (response) {

        console.log(response);
        console.log('here');
        // if not found, create branch
        if (response.status === 404) {
          console.log('Creating branch for new task');
          notificationService.sendWarning('Task initializing');
          snowowlService.createBranch(metadataService.getBranchRoot() + '/' + $routeParams.projectKey, $routeParams.taskKey).then(function (response) {
            notificationService.sendWarning('Task initialization complete', 3000);
            $rootScope.$broadcast('reloadTaxonomy');
            $scope.branch = response.path;

            // add slight timeout to allow propagation of branch information
            // TODO Added because crsService was receiving 404 on branch initially, but succeeding on reload
            $timeout(function () {
              deferred.resolve(response);
            }, 1000);
          }, function (error) {
            deferred.reject('Could not create branch');
          });
        } else {
          $scope.branch = response.path;
          deferred.resolve();
        }
      });
      return deferred.promise;
    }

    // template ng-table
    // declare table parameters
    $scope.templateTableParams = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {name: 'asc'}
      },
      {
        filterDelay: 50,
        total: $scope.templates ? $scope.templates.length : 0, // length of data
        getData: function ($defer, params) {
          // TODO support paging and filtering
          var data = params.sorting() ? $filter('orderBy')($scope.templates, params.orderBy()) : $scope.templates;
          $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
      }
    );

    $scope.getSelectedTemplate = templateService.getSelectedTemplate;
    $scope.selectTemplate = function (template) {
      templateService.selectTemplate(template).then(function () {
        document.getElementById('templateCreateBtn').click();
        $scope.createConcept();
      });
    };
    $scope.clearTemplate = function () {
      templateService.selectTemplate(null);
    };

    /////////////////////////////
    // Sidebar Menu Controls
    /////////////////////////////
    $scope.viewClassificationFromSidebar = function () {
      $scope.setView('classification');
    };

    $scope.viewValidationFromSidebar = function () {
      $scope.setView('validation');
    };

    $scope.viewReviewFromSidebar = function () {
      $scope.setView('feedback');
    };

    //
    // Sidebar menu actions -- duplicative of taskDetail
    //

    $scope.classify = function () {

      notificationService.sendMessage('Starting classification for task ' + $routeParams.taskKey, 5000);

      // start the classification
      scaService.startClassificationForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {

        if (!response || !response.data || !response.data.id) {
          notificationService.sendError('Error starting classification');
          return;
        }

        if (response.data.status) {
          notificationService.sendMessage('Classification is ' + response.data.status, 10000);
        } else {
          notificationService.sendMessage('Task submitted for classification', 10000);
        }

        $rootScope.$broadcast('reloadTask');
      }, function () {
        // do nothing on error
      });
    };

    $scope.validate = function () {
      notificationService.sendMessage('Submitting task for validation...');

      // NOTE: Validation does not lock task

      scaService.startValidationForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
        $rootScope.$broadcast('reloadTask');
        notificationService.sendMessage('Task successfully submitted for validation', 5000, null);
      }, function () {
        notificationService.sendMessage('Error submitting task for validation', 10000, null);
        $rootScope.$broadcast('reloadTask');
      });
    };

    //
    // Sidebar Review Functionality
    //

    // list of tracked unsaved concepts
    $scope.reviewChecks = null;

    $scope.cancelSubmitForReview = function () {
      $scope.reviewChecks = null;
    };

    function openReviewChecksModal(reviewChecks) {

      // check if unsaved concepts are already in edit panel
      angular.forEach(reviewChecks.unsavedConcepts, function (uc) {
        angular.forEach($scope.editList, function (ec) {
          if (ec === uc.conceptId) {
            uc.editing = true;
          }
        });
      });

      var deferred = $q.defer();
      var modalInstance = $modal.open({
        templateUrl: 'shared/review-check-modal/reviewCheckModal.html',
        controller: 'reviewCheckModalCtrl',
        resolve: {
          reviewChecks: reviewChecks
        }
      });

      modalInstance.result.then(function (results) {
        deferred.resolve(results);
      }, function () {
        deferred.reject();
      });
      return deferred.promise;

    }

    $scope.toggleReview = function (ignoreWarnings) {
      $scope.reviewChecks = null;
      switch ($scope.task.status) {
        case 'New':
        case 'In Progress':

          notificationService.sendMessage('Submit for review requested: checking content changes...');

          reviewService.checkReviewPrerequisites($scope.task).then(function (reviewChecks) {

            if (reviewChecks.hasChangedContent && reviewChecks.unsavedConcepts && reviewChecks.unsavedConcepts.length === 0) {
              reviewService.submitForReview($scope.task).then(function () {
                loadTask();
                notificationService.sendMessage('Submitted for review', 3000);
              }, function (error) {
                notificationService.sendError('Error submitting for review: ' + error);
              });
            } else {
              openReviewChecksModal(reviewChecks).then(function () {
                reviewService.submitForReview($scope.task).then(function () {
                  loadTask();
                  notificationService.sendMessage('Submitted for review', 3000);
                }, function (error) {
                  notificationService.sendError('Error submitting for review: ' + error);
                });
              }, function () {
                notificationService.sendMessage('Cancelled submit for review', 3000);
              });
            }
          }, function (error) {
            notificationService.sendWarning('Task submitted for review, but could not verify content changes: ' + error);
          });


          break;
        case 'In Review':
        case 'Review Complete':
          accountService.getRoleForTask($scope.task).then(function (role) {
            if (role === 'AUTHOR') {
              reviewService.cancelReview($scope.task).then(function () {
                loadTask();
                notificationService.sendMessage('Review cancelled', 3000);
              }, function (error) {
                notificationService.sendError('Error cancelling review: ' + error);
              });
            } else {
              reviewService.unclaimReview($scope.task).then(function () {
                $location.url('review-tasks');
                notificationService.sendMessage('Review unclaimed', 3000);
              }, function (error) {
                notificationService.sendError('Error unclaiming review: ' + error);
              });
            }
          });
          break;
        default:
          notificationService.sendError('Unexpected task status: ' + $scope.task.status);
      }
    };


//////////////////////////////////////////
// Initialization
//////////////////////////////////////////

    function initialize() {

      notificationService.sendMessage('Loading task details...');

      // retrieve available templates
      templateService.getTemplates().then(function (templates) {
        $scope.templates = templates;
        angular.forEach($scope.templates, function (template) {
          template.name = template.name;
          template.version = template.version;
        });
        $scope.templateTableParams.reload();
      });

      // start monitoring of task
      scaService.monitorTask($routeParams.projectKey, $routeParams.taskKey);

      // initialize the task and project
      $q.all([loadTask(), loadProject()]).then(function () {

        // set the metadata for use by other elements
        metadataService.setBranchMetadata($scope.task);

        // set any project-level metadata flags
        metadataService.setMrcmEnabled(!$scope.project.projectMrcmDisabled);

        // initialize the CRS service
        // NOTE: Must be done before loading initial view
        crsService.setTask($scope.task).then(function (response) {

          // load the branch from task branch path
          loadBranch($scope.task.branchPath).then(function (branch) {
            console.log('Branch loaded');
            // check for extension metadata
            if ($scope.project.metadata && $scope.project.metadata.defaultModuleId) {

              // get the extension default module concept
              snowowlService.getFullConcept($scope.project.metadata.defaultModuleId, $scope.task.branchPath).then(function (extConcept) {

                // set the name for display
                $scope.project.metadata.defaultModuleName = extConcept.fsn;

                // set the extension metadata for use by other elements
                metadataService.setExtensionMetadata($scope.project.metadata);
              }, function (error) {
                notificationService.sendError('Fatal error: Could not load extension module concept');
              });
            }

            // retrieve user role
            accountService.getRoleForTask($scope.task).then(function (role) {

                notificationService.sendMessage('Task details loaded', 3000);

                // set role functionality and initial view
                $scope.isOwnTask = role === 'AUTHOR';
                $scope.role = role;
                setBranchFunctionality($scope.task.branchState);
                $scope.setInitialView();
              },
              // if no role, send error and return to dashboard after slight delay
              function () {
                /*  TODO Reenable this later
                 notificationService.sendError('You do not have permissions to view this task, and will be returned to the dashboard');
                 $timeout(function () {
                 $location.url('/');
                 }, 4000);*/

                notificationService.sendMessage('Task details loaded', 3000);

                // set role functionality and initial view
                $scope.role = 'UNDEFINED';
                $scope.isOwnTask = $scope.role === 'AUTHOR';
                setBranchFunctionality($scope.task.branchState);
                $scope.setInitialView();
              });

            // populate the container objects
            $scope.getLatestClassification();
            $scope.getLatestValidation();
            $scope.getLatestConflictsReport();

            // initialize the branch variables (TODO some may be unused) (requires metadata service branches set)
            $scope.parentBranch = metadataService.getBranchRoot() + '/' + $scope.projectKey;

            if ($routeParams.taskKey) {
              $scope.targetBranch = metadataService.getBranchRoot() + '/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
              $scope.sourceBranch = metadataService.getBranchRoot() + '/' + $routeParams.projectKey;
            } else {
              $scope.targetBranch = metadataService.getBranchRoot() + '/' + $routeParams.projectKey;
              $scope.sourceBranch = metadataService.getBranchRoot() + '/';
            }

          });
        }, function (error) {
          console.error('Unexpected error checking CRS status');
        });


      }, function (error) {
        notificationService.sendError('Unexpected error: ' + error);
      });
    }

    initialize();



  })
;
