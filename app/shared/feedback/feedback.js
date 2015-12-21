'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('feedback', ['$rootScope', 'ngTableParams', '$q', '$routeParams', '$filter', '$timeout', '$modal', '$compile', '$sce', 'snowowlService', 'scaService', 'accountService', 'notificationService', '$location',
    function ($rootScope, NgTableParams, $q, $routeParams, $filter, $timeout, $modal, $compile, $sce, snowowlService, scaService, accountService, notificationService, $location) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          // feedback container structure:
          // { conceptsToReview: [...], conceptsReviewed: [...] }

          feedbackContainer: '=',

          // flag for whether or not to allow editing controls
          editable: '&',

          // branch this report is good for
          branch: '='
        },
        templateUrl: 'shared/feedback/feedback.html',

        link: function (scope, element, attrs, linkCtrl) {

          ////////////////////////////////////////////////////
          // NOTE
          //
          // Both ng-table and dragndrop.js reserve the keyword
          // $data.  For this particular situation, where dragndrop
          // functionality is wrapped inside an ng-table, the
          // ng-table data is handled by explicit arrays.  This breaks
          // the binding between the displayed data and the original
          // feedbackContainer elements, necessitating some rather
          // cumbersome functions, which are marked accordingly
          ////////////////////////////////////////////////////

          scope.editable = attrs.editable === 'true';
          scope.showTitle = attrs.showTitle === 'true';
          scope.displayStatus = '';

          // the editor scope variables
          scope.htmlVariable = '';
          scope.requestFollowup = false;

          // select all booleans for each table
          scope.checkedToReview = false;
          scope.checkedReviewed = false;

          // get the user information to determine role
          // values: AUTHOR, REVIEWER

          scope.role = null;
          scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (task) {
            if (task) {
              scope.task = task;
              scope.reviewComplete = task.status === 'REVIEW_COMPLETED';
              console.debug('review complete', scope.reviewComplete);
                accountService.getRoleForTask(task).then(function(role){
                    scope.role = role;
                    console.debug('Role found: ', scope.role);
                });
                

              if (scope.role === 'UNDEFINED') {
                notificationService.sendError('Could not determine role for task ' + $routeParams.taskKey);
              }
            }
          });

          // declare viewed arrays for ng-table
          scope.conceptsToReviewViewed = [];
          scope.conceptsReviewedViewed = [];
          scope.allChecked = false;

          // Cumbersome function to set selected flag on actual element
          // May still be required in future to allow for filtering?
          // SEE NOTE AT START
//          scope.setSelected = function(concept) {
//
//            // cycle over concepts to review
//            angular.forEach(scope.feedbackContainer.review.conceptsToReview,
// function(c) { if (c.id === concept.id) {  // reverse the flag on both
// elements c.selected = !c.selected; concept.selected = !concept.selected;
// return; } });  // cycle over concepts reviewed
// angular.forEach(scope.feedbackContainer.review.conceptsReviewed, function(c)
// { if (c.id === concept.id) { c.selected = !c.selected; return; } }); };

          // declare table parameters
          scope.conceptsToReviewTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {term: 'asc'},
              orderBy: 'term'
            },
            {
              filterDelay: 50,
              total: scope.feedbackContainer && scope.feedbackContainer.review && scope.feedbackContainer.review.conceptsToReview ?
                scope.feedbackContainer.review.conceptsToReview.length : 0,

              getData: function ($defer, params) {

                console.debug('getdata');

                var myData = [];

                if (!scope.feedbackContainer || !scope.feedbackContainer.review || !scope.feedbackContainer.review.conceptsToReview || scope.feedbackContainer.review.conceptsToReview.length === 0) {
                  scope.conceptsToReviewViewed = [];
                } else {

                  var searchStr = scope.conceptsToReviewSearchStr;

                  if (searchStr) {
                    myData = scope.feedbackContainer.review.conceptsToReview.filter(function (item) {
                      return item.term.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 || item.id.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                    });
                  } else {
                    myData = scope.feedbackContainer.review.conceptsToReview;
                  }

                  // filter based on presence of feedback if requested
                  if (scope.viewOnlyConceptsWithFeedback) {
                    console.debug('Retrieving only concepts with messages');
                    //myData =  $filter('filter')(myData, { 'messages': '!'});

                    var newData = [];
                    angular.forEach(myData, function (item) {
                      if (item.messages && item.messages.length > 0) {
                        newData.push(item);
                      }
                      myData = newData;

                      // set viewed flag based on current viewed list
                      angular.forEach(scope.viewedConcepts, function (viewedConcept) {
                        if (viewedConcept.conceptId === item.id) {
                          item.viewed = true;
                        } else {
                          item.viewed = false;
                        }
                      });
                    });

                    //  $scope.filteredItems = $filter('filter')($scope.items,
                    // { 'colours': '!!' });
                  }

                  // hard set the new total

                  myData = params.sorting() ? $filter('orderBy')(myData, params.orderBy()) : myData;

                  params.total(myData.length);
                  // extract the paged results
                  scope.conceptsToReviewViewed = (myData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                  $defer.resolve(scope.conceptsToReviewViewed);
                }
              }
            }
          );

          // declare table parameters
          scope.conceptsReviewedTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {term: 'asc'},
              orderBy: 'term'
            },
            {
              filterDelay: 50,
              total: scope.feedbackContainer && scope.feedbackContainer.review && scope.feedbackContainer.review.conceptsReviewed ?
                scope.feedbackContainer.review.conceptsReviewed.length : 0,
              getData: function ($defer, params) {

                if (!scope.feedbackContainer || !scope.feedbackContainer.review || !scope.feedbackContainer.review.conceptsReviewed || scope.feedbackContainer.review.conceptsReviewed.length === 0) {
                  scope.conceptsReviewedViewed = [];
                } else {

                  var searchStr = scope.conceptsReviewedSearchStr;
                  var myData;

                  if (searchStr) {
                    myData = scope.feedbackContainer.review.conceptsReviewed.filter(function (item) {
                      return item.term.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 || item.id.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                    });
                  } else {
                    myData = scope.feedbackContainer.review.conceptsReviewed;
                  }

                  // hard set the new total
                  params.total(myData.length);

                  // sort -- note this doubletriggers $watch statement....
                  // but we want the actual order to be preserved in the
                  // original  array for reordering purposes
                  myData = params.sorting() ? $filter('orderBy')(myData, params.orderBy()) : myData;

                  // TODO Enable filtering

                  // extract the paged results -- SEE NOTE AT START
                  scope.conceptsReviewedViewed = (myData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                  $defer.resolve(scope.conceptsReviewedViewed);
                }
              }
            }
          );

          // functions to reload both tables
          scope.reloadConceptsToReview = function (searchStr) {
            scope.conceptsToReviewSearchStr = searchStr;
            scope.conceptsToReviewTableParams.reload();
          };
          scope.reloadConceptsReviewed = function (searchStr) {
            scope.conceptsReviewedSearchStr = searchStr;
            scope.conceptsReviewedTableParams.reload();
          };

          // cancel review
          scope.cancelReview = function () {
            var confirmation = window.confirm('Return this branch to In Progress?');

            console.debug('confirmation', confirmation);
            if (confirmation) {
              var taskObj = {
                'status': 'IN_PROGRESS',
                'reviewer': null
              };
              scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, taskObj).then(function (response) {
                $rootScope.$broadcast('reloadTask');
              });
            }
          };

          // controls to allow author to view only concepts with feedeback
          scope.viewOnlyConceptsWithFeedback = false;
          scope.toggleViewOnlyConceptsWithFeedback = function () {
            scope.viewOnlyConceptsWithFeedback = !scope.viewOnlyConceptsWithFeedback;
            scope.conceptsToReviewTableParams.reload();
          };

          function updateReviewedListUiState() {
            var conceptIds = [];
            angular.forEach(scope.feedbackContainer.review.conceptsReviewed, function (concept) {
              conceptIds.push(concept.id);
            });
            scaService.saveUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'reviewed-list', conceptIds);
          }

          // watch for notification of updated concepts from conceptEdit
          // directive
          scope.$on('conceptEdit.conceptChanged', function (event, data) {

            // ignore if concepts arrays are not declared (not initialized)
            if (!scope.feedbackContainer || !scope.feedbackContainer.review.conceptsResolved || !scope.feedbackContainer.review.conceptsToResolve) {
              return;
            }

            // cycle over resolved list
            for (var i = 0; i < scope.feedbackContainer.review.conceptsResolved.length; i++) {

              // declaration for convenience
              var concept = scope.feedbackContainer.review.conceptsResolved[i];

              // if this concept is present, move it from Resolved to To Resolve
              if (concept.id === data.conceptId) {
                scope.feedbackContainer.review.conceptsResolved.splice(i);
                scope.feedbackContainer.review.conceptsToResolve.push(concept);
              }

              // update the ui state
              updateReviewedListUiState();
            }
          });

          // move item from ToReview to Reviewed
          scope.addToReviewed = function (item, stopUiStateUpdate) {
            item.selected = false;
            scope.feedbackContainer.review.conceptsReviewed.push(item);
            var elementPos = scope.feedbackContainer.review.conceptsToReview.map(function (x) {
              return x.id;
            }).indexOf(item.id);
            scope.feedbackContainer.review.conceptsToReview.splice(elementPos, 1);
            scope.conceptsToReviewTableParams.reload();
            scope.conceptsReviewedTableParams.reload();

            // if stop request not indicated (or not supplied), update ui state
            if (!stopUiStateUpdate) {
              updateReviewedListUiState();
            }

          };

          // move item from Reviewed to ToReview
          scope.returnToReview = function (item, stopUiStateUpdate) {
            item.selected = false;
            scope.feedbackContainer.review.conceptsToReview.push(item);
            var elementPos = scope.feedbackContainer.review.conceptsReviewed.map(function (x) {
              return x.id;
            }).indexOf(item.id);
            scope.feedbackContainer.review.conceptsReviewed.splice(elementPos, 1);
            scope.conceptsReviewedTableParams.reload();
            scope.conceptsToReviewTableParams.reload();

            // if stop request not indicated (or not supplied), update ui state
            if (!stopUiStateUpdate) {
              updateReviewedListUiState();
            }
          };

          scope.selectAll = function (actionTab, isChecked) {
            console.debug('selectAll', actionTab, isChecked);
            if (actionTab === 1) {
              angular.forEach(scope.conceptsToReviewViewed, function (item) {
                item.selected = isChecked;
              });
            } else if (actionTab === 2) {
              angular.forEach(scope.conceptsReviewedViewed, function (item) {
                item.selected = isChecked;
              });
            }
          };

          scope.viewedConcepts = [];

          /**
           * On stop editing events, deselect viewed element (both lists)
           */
          scope.$on('stopEditing', function (event, data) {

            // remove from the styles list (if present)
            delete scope.styles[data.concept.conceptId];

            // remove from viewed concepts list
            for (var i = 0; i < scope.viewedConcepts.length; i++) {
              if (scope.viewedConcepts[i].conceptId === data.concept.conceptId) {
                scope.viewedConcepts.splice(i, 1);
                break;
              }
            }

            // mark as unviewed in ToReview list (if present)
            angular.forEach(scope.conceptsToReviewViewed, function (item) {
              if (item.id === data.concept.conceptId) {
                item.viewed = false;
              }
            });

            // mark as unviewed in Reviewed list (if present)
            angular.forEach(scope.conceptsReviewedViewed, function (item) {
              if (item.id === data.concept.conceptId) {
                scope.addToEdit(item.id);
                item.viewed = false;
              }
            });

          });

          // the scope variable containing the map of concept -> [style map]
          scope.styles = {};

          function addConceptStyles(concept) {
            var styledElements = {};
            angular.forEach(concept.descriptions, function(description) {
              if (!description.effectiveTime) {
                styledElements[description.descriptionId] = {message: null, style: 'tealhl'};
              }
            });
            angular.forEach(concept.relationships, function(relationship) {
              if (!relationship.effectiveTime) {
                styledElements[relationship.relationshipId] = {message: null, style: 'tealhl'};
              }
            });
            scope.styles[concept.conceptId] = styledElements;

          }

          function addToEditHelper(id) {

            // used for status update of addMultipleToEdit
            var deferred = $q.defer();

            // check if concept already exists in list
            for (var i = 0; i < scope.viewedConcepts.length; i++) {
              if (scope.viewedConcepts[i].conceptId === id) {
                notificationService.sendWarning('Concept already shown');
                return;
              }
            }

            // get the full concept for this branch (before version)
            snowowlService.getFullConcept(id, scope.branch).then(function (response) {

              scope.viewedConcepts.push(response);

              // apply styles
              addConceptStyles(response);

              deferred.resolve(response);

              console.debug('new viewed concepts', scope.viewedConcepts);

              // after a slight delay, broadcast a draw event
              $timeout(function () {
                $rootScope.$broadcast('comparativeModelDraw');
              }, 500);
            });
            return deferred.promise;
          }

          // function to add a concept to viewed list from tables
          scope.addToEdit = function (item) {
            // if viewed, ignore
            if (!item.viewed) {
              notificationService.sendMessage('Loading concept ' + item.id);
              item.viewed = true;
              addToEditHelper(item.id).then(function (response) {
                notificationService.sendMessage('Concept loaded', 5000);
              });
            }
          };

          // additional function to add based on concept id alone
          scope.addToEditFromConceptId = function(conceptId) {

            for (var i = 0; i < scope.viewedConcepts.length; i++) {
              if (scope.viewedConcepts[i].conceptId === conceptId) {
                return;
              }
            }

            notificationService.sendMessage('Loading concept...');
            addToEditHelper(conceptId).then(function (response) {
              notificationService.sendMessage('Concept loaded', 5000);

              // reload the table params to ensure viewed flag is set properly
              scope.conceptsToReviewTableParams.reload();
              scope.concetpsReviewedTableParams.reload();
            });
          };

          // add all selected objects to edit panel list
          // depending on current viewed tab
          scope.addMultipleToEdit = function (actionTab) {
            var conceptsToAdd = [];
            var conceptsAdded = 0;
            if (actionTab === 1) {
              angular.forEach(scope.conceptsToReviewViewed, function (item) {
                if (item.selected === true && !item.viewed) {
                  conceptsToAdd.push(item);
                  item.viewed = true;
                }
              });
            } else if (actionTab === 2) {
              angular.forEach(scope.conceptsReviewedViewed, function (item) {
                if (item.selected === true && !item.viewed) {
                  conceptsToAdd.push(item.id);
                  item.viewed = true;
                }
              });
            }
            if (conceptsToAdd.length === 0) {
              notificationService.sendWarning('No concepts selected', 5000);
            }

            if (conceptsToAdd.length === 1) {
              notificationService.sendMessage('Loading concept ' + conceptsToAdd[0].term);
            }

            if (conceptsToAdd.length > 1) {
              notificationService.sendMessage('Loading concepts (0/' + conceptsToAdd.length + ')');
            }

            for (var i = 0; i < conceptsToAdd.length; i++) {
              addToEditHelper(conceptsToAdd[i].id).then(function (response) {
                conceptsAdded++;
                if (conceptsAdded === conceptsToAdd.length) {
                  notificationService.sendMessage('All concepts loaded', 5000);
                } else {
                  notificationService.sendMessage('Loading concepts (' + conceptsAdded + '/' + conceptsToAdd.length + ')');
                }
              });
            }
          };

          // move all selected objects from one list to the other
          // depending on current viewed tab
          // NOTE:  Apply stopUiUpdate flag
          scope.moveMultipleToOtherList = function (actionTab) {
            if (actionTab === 1) {
              angular.forEach(scope.conceptsToReviewViewed, function (item) {
                if (item.selected === true) {
                  console.debug('adding to reviewed list', item);
                  scope.addToReviewed(item, true);
                }
              });
            } else if (actionTab === 2) {
              angular.forEach(scope.conceptsReviewedViewed, function (item) {
                console.debug('checking item', item);
                if (item.selected === true) {
                  console.debug('adding to to review list', item);
                  scope.returnToReview(item, true);
                }
              });
            }

            // update the ui state
            updateReviewedListUiState();
          };

          // function called when dropping concept
          // targetIndex: the point at which to insert the dropped concept
          // draggedConcept: {startIndex: N, concept: {...}}
          scope.dropConcept = function (droppedConcept, draggedConcept, actionTab) {

            console.debug('drop event', droppedConcept, draggedConcept, actionTab);

            if (droppedConcept === draggedConcept) {
              // do nothing if same target as source
            } else {

              // copy array (to avoid triggering watch statement below)
              // on drop, disable auto-sorting of table params  -- otherwise
              // drag/drop makes no sense, will only be auto-re-ordered
              var newConceptArray = [];
              switch (actionTab) {
                case 1:
                  newConceptArray = scope.feedbackContainer.review.conceptsToReview;
                  scope.conceptsToReviewTableParams.sorting('');
                  break;
                case 2:
                  newConceptArray = scope.feedbackContainer.review.conceptsReviewed;
                  scope.conceptsReviewedTableParams.sorting('');
                  break;
                default:
                  console.error('Invalid tab selected for grouping selected concepts');
                  return;
              }

              // find the index at which the target concept is located
              // NOTE: This cannot be passed in simply, due to filtering
              var droppedIndex = -1;
              var draggedIndex = -1;
              for (var i = 0; i < newConceptArray.length; i++) {

                // NOTE: Compare by id, as dragged/dropped concepts have
                // $hashkey which prevents true equality checking
                if (newConceptArray[i].id === droppedConcept.id) {
                  console.debug('found dropped');
                  droppedIndex = i;
                }
                if (newConceptArray[i].id === draggedConcept.id) {
                  draggedIndex = i;
                  console.debug('found dragged');
                }
              }

              // check that both indices were found
              if (droppedIndex === -1 || draggedIndex === -1) {
                console.error('Error determining indices for drag and drop');
                return;
              }

              // insert very slight timeout to allow dragndrop to check for
              // requested effects (deleting too fast causes undefined-access
              // errors)
              $timeout(function () {
                // remove the passed object
                newConceptArray.splice(draggedIndex, 1);

                // insert the dragged concept at the target index
                newConceptArray.splice(droppedIndex, 0, draggedConcept);

                // replace the appropriate array
                switch (actionTab) {
                  case 1:
                    scope.feedbackContainer.review.conceptsToReview = newConceptArray;
                    scope.conceptsToReviewTableParams.reload();
                    break;
                  case 2:
                    scope.feedbackContainer.review.conceptsReviewed = newConceptArray;
                    scope.conceptsReviewedTableParams.reload();
                    break;
                  default:
                    console.error('Invalid tab selected for grouping selected concepts');
                    return;
                }

              }, 25);

            }

          };

          // allow for grouped reordering
          scope.groupSelectedConcepts = function (actionTab) {
            console.debug('reordering based on selected items for tab', actionTab);

            // copy array (for convenience) and disable sorting
            // otherwise grouping will be overriden
            var newConceptArray = [];
            switch (actionTab) {
              case 1:
                newConceptArray = scope.feedbackContainer.review.conceptsToReview;
                scope.conceptsToReviewTableParams.sorting('');
                break;
              case 2:
                newConceptArray = scope.feedbackContainer.review.conceptsReviewed;
                scope.conceptsReviewedTableParams.sorting('');
                break;
              default:
                console.error('Invalid tab selected for grouping selected concepts');
                return;
            }

            // find the insertion point
            var selectedFound = false;
            var insertIndex = -1;
            for (var i = 0; i < newConceptArray.length; i++) {

              // if selected, mark entry into selected items
              if (newConceptArray[i].selected === true) {
                selectedFound = true;
              }

              // stop if not selected and a previously selected item was found
              // set the insert to index to after the last found selected
              else if (selectedFound === true) {
                insertIndex = i;
                break;
              }
            }

            console.debug('insert index', insertIndex);

            // check that a selected item was found and is not the last item
            if (insertIndex === -1 || insertIndex === newConceptArray.length - 1) {
              return;
            }

            // cycle over all concepts to review in reverse
            var conceptsToInsert = [];
            for (var j = newConceptArray.length - 1; j > insertIndex; j--) {

              // if selected, save (FILO) and remove
              if (newConceptArray[j].selected) {
                conceptsToInsert.unshift(newConceptArray[j]);
                newConceptArray.splice(j, 1);
              }
            }

            console.debug('elements to shift', conceptsToInsert);

            // splice in the array at the insert point
            Array.prototype.splice.apply(newConceptArray, [insertIndex, 0].concat(conceptsToInsert));

            // assign to feedback container to trigger watch statement
            switch (actionTab) {
              case 1:
                scope.feedbackContainer.review.conceptsToReview = newConceptArray;
                scope.conceptsToReviewTableParams.reload();
                break;
              case 2:
                scope.feedbackContainer.review.conceptsReviewed = newConceptArray;
                scope.conceptsReviewedTableParams.reload();
                break;
              default:
                return;
            }
          };

          scope.changeReviewStatus = function (reviewComplete) {
            if (reviewComplete !== null && reviewComplete !== undefined) {
              scaService.markTaskReviewComplete(
                $routeParams.projectKey, $routeParams.taskKey,
                {
                  'status': reviewComplete ? 'REVIEW_COMPLETED' : 'IN_REVIEW'
                });
            }
          };

          scope.getDateFromFeedback = function (feedback) {
            return new Date(feedback.creationDate);
          };

          ////////////////////////////////////////////////////////////////////
          // Watch freedback container -- used as Initialization Block
          ////////////////////////////////////////////////////////////////////
          scope.$watch('feedbackContainer', function (oldValue, newValue) {

            if (!scope.feedbackContainer) {
              return;
            }

            // pre-processing on initial load (conceptsToReview and
            // conceptsReviewed do not yet exist)
            if (scope.feedbackContainer.review && !scope.feedbackContainer.review.conceptsToReview && !scope.feedbackContainer.review.conceptsReviewed) {

              console.debug('Initial load detected, setting concepts to review & concepts reviewed', scope.feedbackContainer.review.concepts);

              // get the ui state
              var reviewedListIds = null;
              scaService.getUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'reviewed-list').then(function (response) {
                reviewedListIds = response;

                // ensure response is in form of array for indexOf checking
                // later
                if (!reviewedListIds || !Array.isArray(reviewedListIds)) {
                  reviewedListIds = [];
                }
                console.debug('reviewed list ids', reviewedListIds);

                // local arrays to avoid multiple watch triggers
                var conceptsToReview = [];
                var conceptsReviewed = [];

                // cycle over all concepts for pre-processing
                angular.forEach(scope.feedbackContainer.review.concepts, function (item) {

                  // set follow up request flag to false (overwritten below)
                  item.requestFollowup = false;

                  // if no feedback on this concept
                  if (!item.messages || item.messages.length === 0) {
                    item.read = 'absent'; // provide dummy value for sorting by
                                          // alphabetical value
                  }

                  // otherwise, process feedback
                  else {
                    // cycle over all concepts to check for follow up request
                    // condition met if another user has left feedback with the
                    // flag later than the last feedback left by current user
                    for (var i = 0; i < item.messages.length; i++) {
                      // if own feedback, break
                      if (item.messages[i].fromUsername === $rootScope.accountDetails.login) {
                        break;
                      }
                      // if another's feedback, check for flag
                      if (item.messages[i].feedbackRequested) {
                        item.requestFollowup = true;
                      }
                    }
                  }

                  // check if id is in reviewed list
                  if (reviewedListIds.indexOf(item.id) === -1) {
                    // apply check-all status
                    item.selected = scope.checkedToReview;
                    conceptsToReview.push(item);
                  }


                  // otherwise, on reviewed list
                  else {
                    item.selected = scope.checkedReviewed;
                    conceptsReviewed.push(item);
                  }
                });

                // set the scope variables
                scope.feedbackContainer.review.conceptsToReview = conceptsToReview;
                scope.feedbackContainer.review.conceptsReviewed = conceptsReviewed;

                //Loops through all items in the reviewed list. If they have
                // been changed since  the review was created they are moved
                // back to 'To Review'
                angular.forEach(scope.feedbackContainer.review.conceptsReviewed, function (item) {
                  if (item.modifiedSinceReview === true) {
                    scope.returnToReview(item);
                  }
                });

                // on load, initialize tables -- all subsequent reloads are
                // manual
                scope.conceptsToReviewTableParams.reload();
                scope.conceptsReviewedTableParams.reload();

                // load currently viewed feedback (on reload)
                getViewedFeedback();
              });
            }
          }, true)
          ;

          // check all request
          scope.checkAll = function () {
            scope.allChecked = !scope.allChecked;
            angular.forEach(scope.conceptsToReviewViewed, function (item) {
              item.selected = scope.allChecked;
            });
          };

          scope.subjectConcepts = [];
          scope.viewedFeedback = [];

          /*
           branch: {id: 1, project: "WRPAS", task: "WRPAS-22"}
           creationDate: "2015-08-20T18:43:25Z"
           fromUsername: "pgranvold"
           id: 8
           messageHtml: "test"
           subjectConceptIds: ["96885130000"]
           */
          function getViewedFeedback() {

            var viewedFeedback = [];

            // extract the concept ids for convenience
            var conceptIds = [];
            angular.forEach(scope.subjectConcepts, function (concept) {
              conceptIds.push(concept.id);
            });

            // cycle over all currently displayed concepts
            angular.forEach(scope.conceptsToReviewViewed, function (concept) {

              // if concept is in selected list and has messages, add them
              if (conceptIds.indexOf(concept.id) !== -1 && concept.messages && concept.messages.length > 0) {
                angular.forEach(concept.messages, function (message) {
                  // attach the concept name to the message for display when
                  // multiple concept feedbacks are viewed
                  message.conceptName = concept.term;
                  viewedFeedback.push(message);
                });

                // mark read if unread is indicated
                if (!concept.read) {
                  scaService.markTaskFeedbackRead($routeParams.projectKey, $routeParams.taskKey, concept.id).then(function (response) {
                    concept.read = true;

                  });
                }
              }
            });

            // sort by creation date
            viewedFeedback.sort(function (a, b) {
              return a.creationDate < b.creationDate;
            });

            // set the scope variable for display
            scope.viewedFeedback = viewedFeedback;
          }

          scope.toTrustedHtml = function (htmlCode) {
            return $compile(htmlCode);
          };

          scope.selectConceptForFeedback = function (concept) {
            scope.subjectConcepts = [concept];
            getViewedFeedback();
          };

          scope.selectConceptsForFeedback = function () {
            scope.subjectConcepts = [];
            angular.forEach(scope.conceptsToReviewViewed, function (item) {
              if (item.selected) {
                scope.subjectConcepts.push(item);
              }
            });
            getViewedFeedback();
          };

          scope.getConceptsForTypeahead = function (searchStr) {
            console.debug('entered getConceptsForTypeAhead', searchStr);
            return snowowlService.findConceptsForQuery($routeParams.projectKey, $routeParams.taskKey, searchStr, 0, 20, null).then(function (response) {

              // remove duplicates
              for (var i = 0; i < response.length; i++) {
                console.debug('checking for duplicates', i, response[i]);
                for (var j = response.length - 1; j > i; j--) {
                  if (response[j].concept.conceptId === response[i].concept.conceptId) {
                    console.debug(' duplicate ', j, response[j]);
                    response.splice(j, 1);
                    j--;
                  }
                }
              }

              return response;
            });
          };

          function createConceptPlaceholder(id, fsn) {

            console.debug('creating concept placeholder', id, fsn);

            return '<span style="color: #00a6e5" id="id">' + fsn + '</span>';
          }

          /**
           * Creates an image object with data source
           * @param id
           * @param fsn
           * @returns {string}
           */
          function createConceptImg(id, fsn) {

            console.debug('creating concept img', id, fsn);

            // testing creation of image
            var can = document.createElement('canvas');
            var ctx = can.getContext('2d');

            ctx.canvas.width = ctx.measureText(fsn + ' ' + String.fromCharCode(parseInt('\uf040', 16))).width;
            ctx.canvas.height = 10;

            ctx.font = 'FontAwesome';
            ctx.fillStyle = '#90CAF9';
            ctx.fillText(fsn + ' ' + String.fromCharCode(parseInt('\uf040', 16)), 0, 8);

            var img = new Image();
            img.src = ctx.canvas.toDataURL();

            return '<img src="' + img.src + '" id="' + id + '-' + fsn + '-endConceptLink" />';
          }

          /**
           * Function to add search result from typeahead to the feedback
           * message
           * @param concept the concept object
           */
          scope.addConceptToFeedback = function (concept) {

            var temp = scope.htmlVariable;

            //var img = createConceptPlaceholder(concept.concept.conceptId,
            // concept.concept.fsn);
            var img = createConceptImg(concept.concept.conceptId, concept.concept.fsn);

            temp = temp + img + '&nbsp';

            scope.htmlVariable = temp;
            console.debug(scope.htmlVariable);
          };

          /**
           * Function to unclaim a review by nulling the reviewer field and
           * returning the user to the home page
           */
          scope.unclaimReview = function () {
            var updateObj = {
              'reviewer': {
                'username': ''
              }
            };

            scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, updateObj).then(function () {
              $location.url('home');
            });
          };

          /**
           * Function to add a dragged concept from the review/resolved list to
           * the feedback message
           * @param concept the concept object
           */
          scope.dropConceptIntoEditor = function (concept) {
            console.debug('dropped concept into editor', concept);
            var img = createConceptImg(concept.id, concept.term);
            scope.htmlVariable += '&nbsp ' + img + ' ';

          };

          scope.submitFeedback = function (requestFollowup) {

            console.debug('sending feedback', requestFollowup, scope.htmlVariable, 'here');

            if (!scope.htmlVariable || scope.htmlVariable.length === 0) {
              window.alert('Cannot submit empty feedback');
              return;
            }
            if (!scope.subjectConcepts || scope.subjectConcepts.length === 0) {
              window.alert('Cannot submit feedback without specifying concepts');
              return;
            }

            /**
             * Strip the constructed conceptImg and replace with a normal link
             * NOTE: This is necessary for two reasons: (1) textAngular allows
             * tag
             * "bleeding", such that inserting a link and typing after it will
             * cause the new text to insert into the link
             * (2) it is desirable to keep the concept link formaqt exactly the
             * same.  Using the image in the editor, then replacing for the
             * non-editable feedback allows this.
             * @type {string}
             */
            var feedbackStr = scope.htmlVariable.replace(/<img [^>]* id="(\d+)-(.*?(?=-endConceptLink"))[^>]*>/g, '<a ng-click="addToEditFromConceptId($1)" style="cursor:pointer">$2</a>');
            console.debug(feedbackStr);

            notificationService.sendMessage('Submitting feedback...', 10000, null);

            // extract the subject concept ids
            var subjectConceptIds = [];
            angular.forEach(scope.subjectConcepts, function (subjectConcept) {
              console.debug('adding concept id', subjectConcept.conceptId, subjectConcept);
              subjectConceptIds.push(subjectConcept.id);
            });

            scaService.addFeedbackToTaskReview($routeParams.projectKey, $routeParams.taskKey, feedbackStr, subjectConceptIds, requestFollowup).then(function (response) {

              notificationService.sendMessage('Feedback submitted', 5000, null);
              // clear the htmlVariable and requestFolllowUp flag
              scope.htmlVariable = '';
              scope.requestFollowup = false;

              // re-retrieve the review
              // TODO For some reason getting duplicate entries on simple push
              // of feedback into list.... for now, just retrieving, though
              // this is inefficient
              scaService.getReviewForTask($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
                scope.feedbackContainer.review = response;
                scope.conceptsToReviewTableParams.reload();
              });
            }, function () {
              notificationService.sendError('Error submitting feedback', 5000, null);
            });
          };

        }

      }
        ;

    }])
;