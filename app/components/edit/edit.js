'use strict';
// jshint ignore: start
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

  .controller('EditCtrl', function EditCtrl($scope, $window, $rootScope, $location, $modal, layoutHandler, metadataService, accountService, scaService, inactivationService, snowowlService, componentAuthoringUtil, notificationService, $routeParams, $timeout, $interval, $q, crsService, reviewService, ngTableParams, templateService, $filter, $compile, hotkeys, modalService) {

    // Close all concepts listener
    $scope.$on('closeAllOpenningConcepts', function (event, data) {
      $scope.closeAllConcepts();
    });

    //Keyboard Shortcuts
    $scope.selectedConcept = null;
    $scope.$on('conceptFocused', function (event, data) {
          $scope.selectedConcept = data.id;
        });
    
    hotkeys.bindTo($scope)
    .add({
      combo: 'alt+1',
      description: 'Go to Taxonomy',
      callback: function() {$rootScope.$broadcast('viewTaxonomy', {})}
    })
    .add({
      combo: 'alt+2',
      description: 'Go to Search',
      callback: function() {$rootScope.$broadcast('viewSearch', {})}
    })
    .add({
      combo: 'alt+3',
      description: 'Go to Saved List',
      callback: function() {$rootScope.$broadcast('viewList', {})}
    })
    .add({
      combo: 'alt+4',
      description: 'Go to Review',
      callback: function() {$scope.setView('feedback'); $rootScope.$broadcast('viewReview', {})}
    })
    .add({
      combo: 'alt+i',
      description: 'Go to Info',
      callback: function() {$rootScope.$broadcast('viewInfo', {})}
    })
    .add({
      combo: 'alt+y',
      description: 'Start classification',
      callback: function() {if($scope.role !== 'REVIEWER'){$scope.classify();}}
    })
    .add({
      combo: 'alt+v',
      description: 'Start validation ',
      callback: function() {if($scope.role !== 'REVIEWER'){$scope.validate();}}
    })
    .add({
      combo: 'alt+n',
      description: 'Create a new concept',
      callback: function() {if($scope.role !== 'REVIEWER'){$scope.createConcept(true);}}
    })
    .add({
      combo: 'alt+e',
      description: 'Go to Editing',
      callback: function() {$scope.setView('edit-default');}
    })
    .add({
      combo: 'alt+right',
      description: 'Select next concept',
      callback: function() {
          var index = null;
          var conceptId = null;
          angular.forEach($scope.concepts, function(concept){
              if(concept.conceptId === $scope.selectedConcept){
                  index = $scope.concepts.indexOf(concept);
              }
          });
          if(index != null){
              if($scope.concepts[index + 1]){
                  conceptId = $scope.concepts[index + 1].conceptId;
              }
              else{conceptId = $scope.concepts[0].conceptId;}
          }
          $rootScope.$broadcast('conceptFocusedFromKey', {id : conceptId});         
      }
    })
    .add({
      combo: 'alt+left',
      description: 'Select previous concept',
      callback: function() {
          var index = null;
          var conceptId = null;
          angular.forEach($scope.concepts, function(concept){
              if(concept.conceptId === $scope.selectedConcept){
                  index = $scope.concepts.indexOf(concept);
              }
          });
          if(index != null){
              if($scope.concepts[index -1]){
                  conceptId = $scope.concepts[index - 1].conceptId;
              }
              else{conceptId = $scope.concepts[$scope.concepts.length -1].conceptId;}
          }
          $rootScope.$broadcast('conceptFocusedFromKey', {id : conceptId});         
      }
    })
    .add({
      combo: 'alt+q',
      description: 'Close all concepts',
      callback: function() {
        if ($scope.thisView !== 'conflicts') {
          $scope.closeAllConcepts();
        }
      }
    })
    .add({
      combo: 'alt+l',
      description: 'Go to notification link',
      callback: function() {
         $rootScope.$broadcast('gotoNotificationLink', {});
      }
    })

    $scope.projectKey = $routeParams.projectKey;
    $scope.taskKey = $routeParams.taskKey;

    // clear task-related information
    $rootScope.validationRunning = false;
    $rootScope.classificationRunning = false;
    $rootScope.automatedPromotionInQueued = false;
    $rootScope.currentTask = null;

    // reset flag before checking in getting branch detail
    $rootScope.hasViewExclusionsPermission = false;

    /////////////////////////////////////////////////////////////////////////////////////////////
    // Note : This flag is used for indicating where sitebar comes from "be loaded from begining"  
    // or "be loading from Feedback view". Currently, we have 2 diffenent sitebars.
    // DO NOT USE FOR OTHER PURPOSES
    /////////////////////////////////////////////////////////////////////////////////////////////
    $rootScope.displayMainSidebar = true;
  
    //////////////////////////////
    // Infinite Scroll
    //////////////////////////////
    $scope.conceptsDisplayed = 6;
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
      scaService.getUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'edit-panel')
        .then(function (uiState) {            
            if (!uiState || Object.getOwnPropertyNames(uiState).length === 0) {
              redirectToConflicts();
            }
            else {
              var promises = [];                    
              for (var i = 0; i < uiState.length; i++) {               
                promises.push(scaService.getModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, uiState[i]));
              }
              // on resolution of all promises
              $q.all(promises).then(function (responses) {
                var hasUnsavedConcept = responses.filter(function(concept){return concept !== null}).length > 0;
                if (hasUnsavedConcept) {
                  var msg = '';
                  if ($scope.thisView === 'edit-default' || $scope.thisView === 'edit-no-sidebar' || $scope.thisView === 'edit-no-model') {
                    msg = 'There are some unsaved concepts. Please save them before rebasing.';
                  } else {
                    msg = 'There are some unsaved concepts. Please go back to task editing and save them before rebasing.';
                  }
                  modalService.message(msg);
                } else {
                  redirectToConflicts();
                }
              });
            }
          }
        );      
    };

    function redirectToConflicts() {
      snowowlService.getBranch(metadataService.getBranchRoot() + '/' + $scope.projectKey).then(function (response) {
        if (!response.metadata || response.metadata && !response.metadata.lock) {
          $location.url('tasks/task/' + $scope.projectKey + '/' + $scope.taskKey + '/conflicts');
        }
        else {
          notificationService.sendWarning('Unable to start rebase on task ' + $scope.taskKey + ' as the project branch is locked due to ongoing changes.', 7000);
        }
      });
    }
    
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

      var layout = {
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

      // set the default layout
      if($scope.thisView === 'edit-default'
        || $scope.thisView === 'batch'
        || $scope.thisView === 'feedback') {
        setDefaultLayout(layout);
      } else {
        layout = {};
      }      
    }

    function setDefaultLayout(layout){
      accountService.getUserPreferences().then(function (preferences) {
        if (preferences && preferences.layout && preferences.layout.editDefault) {
          layout = preferences.layout.editDefault;
        } 
        // set the widths for easy access
        layoutHandler.setLayout(layout);
      });
    }

    $scope.loadEditPanelConcepts = function () {

      // function only relevant for tasks
      if (!$routeParams.taskKey) {
        return;
      }


      $scope.getEditPanel();      
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
          $rootScope.displayMainSidebar = false;
          break;
        case 'inactivation':
          $rootScope.pageTitle = 'Inactivation/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          $routeParams.mode = 'inactivation';
          $scope.concepts = [];
          $scope.canCreateConcept = false;
          $rootScope.displayMainSidebar = true;
          break;
        case 'feedback':
          $scope.feedbackContainer = {};
          $scope.getLatestReview();
          $rootScope.pageTitle = 'Providing Feedback/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          $routeParams.mode = 'feedback';
          $rootScope.displayMainSidebar = false; // Feedback page has its own sitebar

          //  view starts with no concepts
          //$scope.concepts = [];
          $scope.canCreateConcept = false;
          break;
        case 'classification':
          $rootScope.pageTitle = 'Classification/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          $routeParams.mode = 'classification';
          $scope.getClassificationEditPanel();
          $scope.canCreateConcept = false;
          $rootScope.displayMainSidebar = false;
          break;
        case 'conflicts':
          $rootScope.pageTitle = 'Concept Merges/' + $routeParams.projectKey + ($routeParams.taskKey ? '/' + $routeParams.taskKey : '');
          $routeParams.mode = 'conflicts';
          $scope.canCreateConcept = false;
          $rootScope.displayMainSidebar = false;

          //  view starts with no concepts
          $scope.concepts = [];
          break;
        case 'edit-default':
          $rootScope.pageTitle = 'Edit Concepts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          $routeParams.mode = 'edit';
          $scope.canCreateConcept = true;
          $rootScope.displayMainSidebar = true;

          // if a task, load edit panel concepts
          if ($scope.taskKey) {
            $scope.loadEditPanelConcepts();
          }
          break;
        case 'edit-no-sidebar':
          $rootScope.pageTitle = 'Edit Concepts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          $routeParams.mode = 'edit';
          $scope.canCreateConcept = true;
          $rootScope.displayMainSidebar = false;

          // if a task, load edit panel concepts
          if ($scope.taskKey) {
            $scope.loadEditPanelConcepts();
          }
          break;
        case 'edit-no-model':
          $rootScope.pageTitle = 'Edit Concepts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          $routeParams.mode = 'edit';
          $scope.canCreateConcept = true;
          $rootScope.displayMainSidebar = true;
          // if a task, load edit panel concepts
          if ($scope.taskKey) {
            $scope.loadEditPanelConcepts();
          }
          break;
        case 'batch':
          $rootScope.pageTitle = 'Batch Concepts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          $routeParams.mode = 'batch';
          $scope.canCreateConcept = false;
          $rootScope.displayMainSidebar = true;
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

    $scope.$on('viewClassification', function (event, data) {
      $scope.setView('classification');
    });    

    // pass inactivation service function to determine whether in active inactivation (heh)
    $scope.isInactivation = inactivationService.isInactivation;


    //
    // Review functions
    //

    $scope.getConceptsForReview = function (idList, review, feedbackList) {
      var deferred = $q.defer();
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
        deferred.resolve();        
      });

      return deferred.promise;
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
        'col-sm-' + width,
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
    function loadConceptFromTermServerHelper(conceptId,external) {
      var deferred = $q.defer();
      $scope.conceptLoading = true;

      // first, check UI state for task
      scaService.getModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, conceptId).then(function (response) {

        if (response) {
          $scope.concepts.push(response);
          $scope.conceptLoading = false;
          $scope.updateEditListUiState();
          notificationService.sendMessage('Concept loaded', 3000);
          $scope.$broadcast('editingConcepts', {concepts :  $scope.concepts});
        } else {

          // get the concept and add it to the stack
          snowowlService.getFullConcept(conceptId, $scope.targetBranch).then(function (response) {
            $scope.conceptLoading = false;
            if (!response) {
              return;
            }

            $scope.concepts.push(response);
            $scope.$broadcast('editingConcepts', {concepts :  $scope.concepts});

            if ($scope.editList.indexOf(conceptId) === -1) {
              $scope.updateEditListUiState();
            }

            if ($scope.concepts.length === $scope.editList.length) {
              if($scope.concepts.length > $scope.conceptsDisplayed 
                && external
                && ($scope.thisView === 'edit-no-sidebar'
                || $scope.thisView === 'edit-no-model'
                || $scope.thisView === 'edit-default')) {
                notificationService.sendMessage('The max. number of concepts that can be loaded in the editing panel has been reached', 5000, null);
              } else {
                notificationService.sendMessage('All concepts loaded', 10000, null);
              }
              
              // ensure loaded concepts match order of edit list
              $scope.concepts.sort(function (a, b) {
                return $scope.editList.indexOf(a.conceptId) > $scope.editList.indexOf(b.conceptId);
              });
              $scope.updateEditListUiState();
            } else {
              // send loading notification for user display
              notificationService.sendMessage('Loading concepts...', 10000, null);
            }

            deferred.resolve();

          }, function (error) {
            $scope.conceptLoading = false;
            console.log('Error retrieving concept', error);
            if (error.status === 404) {
              notificationService.sendWarning('Concept not found on this branch. If it exists on another branch, promote that branch and try again');
            } else {
              notificationService.sendError('Unexpected error retrieving concept');
            }
            deferred.reject();
          });
        }
      });
      return deferred.promise;
    }


    /**
     * Adds concept from this branch to the concepts array
     * @param conceptId the SCTID of the concept
     */
    $scope.addConceptToListFromId = function (conceptId, external) {

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
          if($scope.concepts.length > $scope.conceptsDisplayed 
            && external
            && ($scope.thisView === 'edit-no-sidebar'
            || $scope.thisView === 'edit-no-model'
            || $scope.thisView === 'edit-default')) {
            notificationService.sendMessage('The max. number of concepts that can be loaded in the editing panel has been reached', 5000, null);
          } else {
            notificationService.sendMessage('All concepts loaded', 5000, null);
          }
          
          $scope.conceptLoading = false;
        }

        // otherwise, load from terserver
        else {
          loadConceptFromTermServerHelper(conceptId,external);
        }
      }

      // if unsaved concept, push
      else if (conceptId === 'unsaved' || !snowowlService.isSctid(conceptId)) {
        $scope.concepts.push({conceptId: conceptId});
        $scope.$broadcast('editingConcepts', {concepts :  $scope.concepts});

        // send loading notification
        if ($scope.concepts.length === $scope.editList.length) {
          $scope.conceptLoading = false;
          if($scope.concepts.length > $scope.conceptsDisplayed 
            && external
            && ($scope.thisView === 'edit-no-sidebar'
            || $scope.thisView === 'edit-no-model'
            || $scope.thisView === 'edit-default')) {
            notificationService.sendMessage('The max. number of concepts that can be loaded in the editing panel has been reached', 5000, null);
          } else {
            notificationService.sendMessage('All concepts loaded', 10000, null);
          }
          
          $scope.updateEditListUiState();
        } else {
          // send loading notification for user display
          notificationService.sendMessage('Loading concepts...', 10000, null);
        }
      } else {
        loadConceptFromTermServerHelper(conceptId,external);

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
      if ($scope.thisView === 'classification' || $scope.thisView === 'validation') {
        return;
      }

      // if load already in progress from editConcept or cloneConcept notification, stop
      if ($scope.conceptLoading) {
        return;
      }
     
      if($scope.thisView === 'feedback' 
        || $scope.thisView === 'batch'
        || $scope.thisView === 'inactivation') {
        $scope.setView('edit-default');                 
      } 
      processUiStateUpdate(data.conceptId);
      
    });

    function processUiStateUpdate(conceptId) {      
      $scope.conceptLoading = true;

      // verify that this SCTID does not exist in the edit list
      for (var i = 0; i < $scope.concepts.length; i++) {
        if ($scope.concepts[i].conceptId === conceptId) {

          notificationService.sendWarning('Concept already added', 5000);
          $scope.conceptLoading = false;
          $rootScope.$broadcast('enableAutoFocus', {conceptId: conceptId});
          return;
        }
      }
  
      $scope.addConceptToListFromId(conceptId,true);
      $scope.editList.push(conceptId);      
      $scope.updateEditListUiState();
      // set focus on the selected concept
      setTimeout(function waitForConceptRender() {
        var elm = document.getElementById('height-' + conceptId);
        if (document.body.contains(elm)) {
          $rootScope.$broadcast('enableAutoFocus', {conceptId: conceptId});
        } else {
          setTimeout(waitForConceptRender, 500);
        }
      }, 500);      
    }

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
            if ($scope.thisView !== 'edit-default') {
              $rootScope.pageTitle = 'Edit Concepts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
              $routeParams.mode = 'edit';
              $scope.canCreateConcept = true;
              $rootScope.displayMainSidebar = true;
              // set this and last views
              $scope.lastView = $scope.thisView;
              $scope.thisView = 'edit-default';
              // set layout based on view
              setLayout();
            }

            return;
          }

          if ($scope.concepts[i].conceptId === data.conceptId) {
            conceptExists = true;
          }
        }
        if (!conceptExists) {
          $scope.concepts.push(response);
        }        

        // deep copy the object -- note: does not work in IE8, but screw
        // that!
        var clonedConcept = JSON.parse(JSON.stringify(response));

        var isExtension = metadataService.isExtensionSet();

        var internationalMetadata = metadataService.getInternationalMetadata();

        // clear relevant fields to force creation of new components
        for (var k = clonedConcept.descriptions.length - 1; k >= 0; k--) {
          var description = clonedConcept.descriptions[k];
          description.effectiveTime = null;
          description.descriptionId = null;
          description.released = false;

          if (isExtension
              || (description.moduleId !== internationalMetadata.modules[1].id  && description.moduleId !==internationalMetadata.modules[2].id)) {
            description.moduleId = metadataService.getCurrentModuleId();
          } 

          delete description.conceptId;
          
          if(!description.$$hashKey) {
            description.$$hashKey = 'object:' + Math.floor(Math.random()*10000);
          }
          if (description.active === false) {
            clonedConcept.descriptions.splice(k, 1);
          }

          // Remove en-gb description if Extension is enable
          if (isExtension && 
            description.acceptabilityMap.hasOwnProperty("900000000000508004")) {
            if(Object.keys(description.acceptabilityMap).length === 1) {
              clonedConcept.descriptions.splice(k, 1);
            } else {
              delete description.acceptabilityMap['900000000000508004'];
            }            
          }
        }

        for (var j = clonedConcept.relationships.length - 1; j >= 0; j--) {
          var relationship = clonedConcept.relationships[j];
          relationship.sourceId = null;
          relationship.effectiveTime = null;
          relationship.released = false;
          if (isExtension
              || (relationship.moduleId !== internationalMetadata.modules[1].id  && relationship.moduleId !==internationalMetadata.modules[2].id)) {
            relationship.moduleId = metadataService.getCurrentModuleId();
          }
          delete relationship.relationshipId;
          delete relationship.target.effectiveTime;
          delete relationship.target.moduleId;
          delete relationship.target.active;
          delete relationship.target.definitionStatus;

          if(!relationship.$$hashKey) {
            relationship.$$hashKey = 'object:' + Math.floor(Math.random()*10000);
          }

          if (relationship.active === false || relationship.characteristicType === 'INFERRED_RELATIONSHIP') {
            clonedConcept.relationships.splice(j, 1);
          }
        }

        clonedConcept.conceptId = null;
        if (isExtension
            || (clonedConcept.moduleId !== internationalMetadata.modules[1].id  && clonedConcept.moduleId !==internationalMetadata.modules[2].id)) {
          clonedConcept.moduleId = metadataService.getCurrentModuleId();
        }
        
        clonedConcept.fsn = null;
        clonedConcept.released = false;

        var successMsg = 'Concept ' + response.fsn + ' successfully cloned';

        // add a cloned tag to differentiate the clonedConcept

        delete clonedConcept.isLeafInferred;
        delete clonedConcept.effectiveTime;
        delete clonedConcept.preferredSynonym;

        if(!clonedConcept.$$hashKey) {
          clonedConcept.$$hashKey = 'object:' + Math.floor(Math.random()*10000);
        }

        // push the cloned clonedConcept
        $scope.concepts.push(clonedConcept);
        $scope.conceptLoading = false;
        notificationService.sendMessage(successMsg, 5000);

       if ($scope.thisView !== 'edit-default') {
          $rootScope.pageTitle = 'Edit Concepts/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
          $routeParams.mode = 'edit';
          $scope.canCreateConcept = true;
          $rootScope.displayMainSidebar = true;
          // set this and last views
          $scope.lastView = $scope.thisView;
          $scope.thisView = 'edit-default';
          // set layout based on view
          setLayout();
        }

        $scope.updateEditListUiState();
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
        
        // Look for next concept to be focus
        var nextConceptIdToBeFocus = null;
        if ($scope.concepts.length > 1) {
          if (editIndex === $scope.concepts.length - 1) {
            nextConceptIdToBeFocus = $scope.concepts[editIndex - 1].conceptId;
          } else {
            nextConceptIdToBeFocus = $scope.concepts[editIndex + 1].conceptId;
          }
        }
      
        $scope.concepts.splice(editIndex, 1);

        // only update the edit list if actually in an edit view
        if ($scope.thisView === 'edit-default' || $scope.thisView === 'edit-no-sidebar' || $scope.thisView === 'edit-no-model') {
          $scope.updateEditListUiState();
          if(nextConceptIdToBeFocus) {
            $rootScope.$broadcast('conceptFocused', {id: nextConceptIdToBeFocus});
          }          
        }
      }
    });

// creates a blank (unsaved) concept in the editing list
    $scope.createConcept = function (isBlank) {

      var selectedTemplate = templateService.getSelectedTemplate();
        console.log(selectedTemplate);

      if (!selectedTemplate || isBlank) {
        var concept = componentAuthoringUtil.getNewConcept();
        $scope.concepts.unshift(concept);
        $scope.updateEditListUiState();
        $scope.clearTemplate();
        
        // Binding mouse scroll event
        $timeout(function () {
          $rootScope.$broadcast('registerMouseScrollEvent', {id: concept.conceptId});
        }, 1500);
      } else {
        templateService.createTemplateConcept(templateService.getSelectedTemplate(), null).then(function (concept) {
          $scope.concepts.unshift(concept);
          $scope.updateEditListUiState();
          
          // Binding mouse scroll event
          $timeout(function () {
            $rootScope.$broadcast('registerMouseScrollEvent', {id: concept.conceptId});
          }, 1500);
        });
      }

    };

 //Remove all concepts from editing   
    $scope.closeAllConcepts = function() {
      if ($scope.concepts.length === 0) {
        notificationService.sendMessage('No concept is removed from editing', 5000);
        return;
      }
      notificationService.sendMessage('Removing all concepts from editing', 10000);
      scaService.getUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'edit-panel')
        .then(function (uiState) {            
          if (uiState && Object.getOwnPropertyNames(uiState).length > 0) {
            var promises = [];                    
            for (var i = 0; i < uiState.length; i++) {               
              promises.push(scaService.getModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, uiState[i]));
            }
            // on resolution of all promises
            $q.all(promises).then(function (responses) {
              var hasUnsavedConcept = responses.filter(function(concept){return concept !== null}).length > 0;
              if (hasUnsavedConcept) {
                var msg = 'There are some unsaved concepts. Please save them before removing.';                 
                modalService.message(msg);               
              } else {
                $rootScope.$broadcast('removeConceptFromEditing', {});
              }
              notificationService.clear();
            });
          } else {
             notificationService.clear();
          }
        }
      );
    };

// removes concept from editing list (unused currently)
    $scope.closeConcept = function (index) {
      if ($scope.concepts) {
        $scope.concepts.splice(index, 1);
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
          var promises = [];
          for (i = 0, j = idList.length; i < j; i += chunk) {
            temparray = idList.slice(i, i + chunk);
            promises.push($scope.getConceptsForReview(temparray, review, feedback));            ;
          }

          // on resolution of all promises
          $q.all(promises).then(function () {
            $scope.feedbackContainer.review = review ? review : {};
          }, function (error) {             
          });
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
      if($scope.thisView === 'feedback'){         
        $rootScope.$broadcast('viewReview', {});
       } else {
        $rootScope.displayMainSidebar = false;
        $scope.setView('feedback');
       }
    };
    
    $scope.viewBatch = function () {
       $scope.setView('batch');
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
            $scope.gotoHome();
            return;
            //deferred.reject('Task could not be retrieved');
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

    $scope.$on('swapToTaxonomy', function (event, data) {      
      $rootScope.$broadcast('viewTaxonomy', {});
    });

    $scope.$on('swapToSearch', function (event, data) {
      $rootScope.$broadcast('viewSearch', {});
    });

    $scope.$on('swapToSavedList', function (event, data) {           
      $rootScope.$broadcast('viewList', {});
    });
    
    $scope.$on('swapToBatch', function (event, data) {      
      $rootScope.$broadcast('viewBatch', {});  
      $scope.viewBatch();
    });

    $scope.$on('swapToTaskDetails', function (event, data) {    
      $rootScope.$broadcast('viewInfo', {});
    });    

    function loadBranch(branchPath) {

      var deferred = $q.defer();

      snowowlService.getBranch(branchPath).then(function (response) {
        // if not found, create branch
        if (response.status === 404) {
          console.log('Creating branch for new task');
          notificationService.sendWarning('Task initializing');
          snowowlService.createBranch(metadataService.getBranchRoot() + '/' + $routeParams.projectKey, $routeParams.taskKey).then(function (response) {
            notificationService.sendWarning('Task initialization complete', 3000);
            $rootScope.$broadcast('reloadTaxonomy');
            $scope.branch = metadataService.getBranchRoot() + '/' + $routeParams.projectKey + '/' + $routeParams.taskKey; 

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
        count: 200       
      },
      {
        filterDelay: 50,
        total: $scope.innerTemplates ? $scope.innerTemplates.length : 0, // length of data
        getData: function ($defer, params) {
                var searchStr = params.filter().search;
                var mydata = [];
                if (!$scope.innerTemplates || $scope.innerTemplates.length === 0) {
                  $defer.resolve([]);
                } else {
                    if (searchStr) {
                      mydata = $scope.innerTemplates.filter(function (item) {
                        return item.name.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                      });
                    }
                    else {
                      mydata = $scope.innerTemplates;
                    }
              // TODO support paging and filtering
              var data = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;
              $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }
          }
      }
    );

    $scope.getSelectedTemplate = templateService.getSelectedTemplate;
    $scope.selectTemplate = function (template) {
      templateService.selectTemplate(template).then(function () {
        $timeout(function(){
                document.getElementById('templateCreateBtn').click();
            });
        $scope.createConcept(false);
      });
    };
    
    $scope.selectFocusForTemplate = function(concept){
        var initialTemplates = $scope.innerTemplates;
        templateService.getTemplates(true, [concept.concept.conceptId], $scope.branch).then(function (templates) {
              for(var i = templates.length -1; i >= 0; i--){
                  if(templates[i].additionalSlots.length > 0)
                      {
                          templates.splice(i, 1);
                      }
              };
              $scope.innerTemplates = templates;
              $scope.templateTableParams.reload();
              $scope.innerTemplates = initialTemplates;
            });
        }
    
    $scope.clearTemplate = function () {
      templateService.selectTemplate(null);
    };
    
    $scope.getConceptsForTypeahead = function (searchStr) {
            return snowowlService.findConceptsForQuery($routeParams.projectKey, $routeParams.taskKey, searchStr, 0, 20, null).then(function (response) {

              // remove duplicates
              for (var i = 0; i < response.length; i++) {
                for (var j = response.length - 1; j > i; j--) {
                  if (response[j].concept.conceptId === response[i].concept.conceptId) {
                    response.splice(j, 1);
                    j--;
                  }
                }
              }

              return response;
            });
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
      if($scope.thisView === 'feedback') {
        $rootScope.$broadcast('viewReview', {});
      } else {
        $scope.setView('feedback');
        $rootScope.displayMainSidebar=false;
      }      
    };

    //
    // Sidebar menu actions -- duplicative of taskDetail
    //
    
    $scope.classify = function () {

      notificationService.sendMessage('Starting classification for task ' + $routeParams.taskKey, 5000);

      if ($scope.task.status === 'New') {
        scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, {'status': 'IN_PROGRESS'}).then(function (response) {
          doClassify();
        });
      } else {
        doClassify();
      }     
    };

    function doClassify() {
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
    }

    $scope.validate = function () {
      notificationService.sendMessage('Submitting task for validation...');

      if ($scope.task.status === 'New') {
        scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, {'status': 'IN_PROGRESS'}).then(function (response) {
          doValidate();
        });
      } else {
        doValidate();
      }      
    };

    function doValidate() {
      // NOTE: Validation does not lock task

      scaService.startValidationForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
        $rootScope.$broadcast('reloadTask');
        notificationService.sendMessage('Task successfully submitted for validation', 5000, null);
      }, function () {
        notificationService.sendMessage('Error submitting task for validation', 10000, null);
        $rootScope.$broadcast('reloadTask');
      });
    }

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
        
      $('body').on('mouseup', function(e) {
            if(!$(e.target).closest('.popover').length) {
                $('.popover').each(function(){
                    if($(this).find('.edit-template-selector').length != 0){
                        document.getElementById('templateCreateBtn').click();
                    }
                    else if($(this).find('.batch-template-selector').length != 0){
                        document.getElementById('batchTemplateSelectBtn').click();
                    }
                    else if(($(this).find('.description-more').length != 0 || $(this).find('.concept-more').length != 0)
                           && !$(e.target).hasClass('more-button-width')
                           && $(this).hasClass("in")) {
                      var elm = $(this).find("[component-id]");
                      var componentId = $(elm[0]).attr("component-id");
                      if(componentId) {
                        document.getElementById('component-' + componentId).click();
                      }
                    }
                });
            }
        });

      notificationService.sendMessage('Loading task details...');
        
      // start monitoring of task
      scaService.monitorTask($routeParams.projectKey, $routeParams.taskKey);

      // initialize the task and project
      $q.all([loadTask(), loadProject()]).then(function () {

        // set the task for the template service
        templateService.setTask($scope.task);

        // set the metadata for use by other elements
        metadataService.setBranchMetadata($scope.task);

        // set any project-level metadata flags
        metadataService.setMrcmEnabled(!$scope.project.projectMrcmDisabled);
        metadataService.setTemplatesEnabled($scope.project.projectTemplatesDisabled);
        metadataService.setSpellcheckDisabled($scope.project.projectSpellCheckDisabled);
          
        // retrieve available templates
        if(!metadataService.isTemplatesEnabled()){
          templateService.getTemplates().then(function (templates) {
            for(var i = templates.length -1; i >= 0; i--){
                  if(templates[i].additionalSlots.length > 0)
                      {
                          templates.splice(i, 1);
                      }
              };
            $scope.templates = templates;
            $scope.innerTemplates = $scope.templates
            angular.forEach($scope.templates, function (template) {
              template.name = template.name;
              template.version = template.version;
            });
            if($scope.templates !== undefined && $scope.templates !== null && $scope.templates.length > 0)
                {
                    hotkeys.bindTo($scope)
                        .add({
                          combo: 'alt+5',
                          description: 'Go to Batch',
                          callback: function() {$scope.viewBatch();$rootScope.$broadcast('viewBatch', {})}
                        })
                }
            $scope.templateTableParams.reload();
          });
        }
          
        else{$scope.templates = null}

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

                // This check would be used in validation report where to show/hide whitelist for task
                metadataService.checkViewExclusionPermission($routeParams.projectKey);
              }, function (error) {
                notificationService.sendError('Fatal error: Could not load extension module concept');
              });
            } else {
              // Always show whitelist for all users for International
              $rootScope.hasViewExclusionsPermission = true;
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
