'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('feedback', ['$rootScope', 'ngTableParams', '$q', '$routeParams', '$filter', '$timeout', '$modal', '$compile', '$sce', 'snowowlService', 'scaService', 'accountService', 'notificationService', '$location', '$interval',
    function ($rootScope, NgTableParams, $q, $routeParams, $filter, $timeout, $modal, $compile, $sce, snowowlService, scaService, accountService, notificationService, $location, $interval) {
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
              scope.reviewComplete = task.status !== 'In Review';
              accountService.getRoleForTask(task).then(function (role) {
                scope.role = role;
              });


              if (scope.role === 'UNDEFINED') {
                notificationService.sendError('Could not determine role for task ' + $routeParams.taskKey);
              }
            }
          });

          //Function to poll for the review status to check if the author cancels the review and subsequently lock down the review functions for the reviewer.

          var poll = null;

          scope.startTaskPoll = function () {
            poll = $interval(function () {
              var oldStatus = scope.task.status;
              scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (task) {
                if (task) {
                  scope.task = task;
                  scope.reviewComplete = task.status !== 'In Review';
                  accountService.getRoleForTask(task).then(function (role) {
                    scope.role = role;
                  });
                  console.log(oldStatus);
                  if (oldStatus === 'In Review' && task.status === 'In Progress') {
                    scope.reloadConceptsToReview('');
                    scope.reloadConceptsReviewed('');
                    scope.reloadConceptsClassified('');
                  }
                }
              });
            }, 10000);
          };

          scope.startTaskPoll();
          // declare viewed arrays for ng-table
          scope.conceptsToReviewViewed = [];
          scope.conceptsReviewedViewed = [];
          scope.allChecked = false;

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

                var myData = [];

                if (!scope.feedbackContainer || !scope.feedbackContainer.review || !scope.feedbackContainer.review.conceptsToReview || scope.feedbackContainer.review.conceptsToReview.length === 0) {
                  scope.conceptsToReviewViewed = [];
                } else {

                  var searchStr = scope.conceptsToReviewSearchStr;

                  if (searchStr) {
                    myData = scope.feedbackContainer.review.conceptsToReview.filter(function (item) {
                      return item.term.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                    });
                  } else {
                    myData = scope.feedbackContainer.review.conceptsToReview;
                  }

                  // filter based on presence of feedback if requested
                  if (scope.viewOnlyConceptsWithFeedback) {

                    var newData = [];
                    angular.forEach(myData, function (item) {
                      if (item.messages && item.messages.length > 0) {
                        newData.push(item);
                      }
                      myData = newData;

                      // set viewed flag based on current viewed list
                      angular.forEach(scope.viewedConcepts, function (viewedConcept) {
                        if (viewedConcept.conceptId === item.conceptId) {
                          item.viewed = true;
                        } else {
                          item.viewed = false;
                        }
                      });
                    });
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

          scope.conceptsClassifiedTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {term: 'asc'},
              orderBy: 'term'
            },
            {
              filterDelay: 50,
              total: scope.feedbackContainer && scope.feedbackContainer.review && scope.feedbackContainer.review.conceptsClassified ?
                scope.feedbackContainer.review.conceptsClassified.length : 0,

              getData: function ($defer, params) {

                var myData = [];

                if (!scope.feedbackContainer || !scope.feedbackContainer.review || !scope.feedbackContainer.review.conceptsClassified || scope.feedbackContainer.review.conceptsClassified.length === 0) {
                  scope.conceptsClassified = [];
                } else {

                  var searchStr = scope.conceptsClassifiedSearchStr;

                  if (searchStr) {
                    myData = scope.feedbackContainer.review.conceptsClassified.filter(function (item) {
                      return item.term.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                    });
                  } else {
                    myData = scope.feedbackContainer.review.conceptsClassified;
                  }
                  // hard set the new total

                  myData = params.sorting() ? $filter('orderBy')(myData, params.orderBy()) : myData;

                  params.total(myData.length);
                  // extract the paged results
                  scope.conceptsClassified = (myData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                  $defer.resolve(scope.conceptsClassified);
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
                      return item.term.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
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
          scope.reloadConceptsClassified = function (searchStr) {
            scope.conceptsClassifiedSearchStr = searchStr;
            scope.conceptsClassifiedTableParams.reload();
          };

          // cancel review
          scope.cancelReview = function () {
            var taskObj = {
              'status': 'IN_PROGRESS',
              'reviewer': {
                'username': ''
              }
            };
            scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, taskObj).then(function (response) {
              notificationService.sendMessage('Review Cancelled', 2000);
              $rootScope.$broadcast('reloadTask');
              scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (task) {
                if (task) {
                  scope.task = task;
                  scope.reviewComplete = task.status !== 'In Review';
                  accountService.getRoleForTask(task).then(function (role) {
                    scope.role = role;
                  });


                  if (scope.role === 'UNDEFINED') {
                    notificationService.sendError('Could not determine role for task ' + $routeParams.taskKey);
                  }
                }
              });
            });

          };

          // controls to allow author to view only concepts with feedeback
          scope.viewOnlyConceptsWithFeedback = true;
          scope.toggleViewOnlyConceptsWithFeedback = function () {
            scope.viewOnlyConceptsWithFeedback = !scope.viewOnlyConceptsWithFeedback;
            scope.conceptsToReviewTableParams.reload();
          };
          // controls to allow author to view only concepts with feedeback
          scope.viewOnlyConceptsWithFeedback = false;
          scope.toggleOnlyConceptsWithFeedback = function () {
            scope.viewOnlyConceptsWithFeedback = !scope.viewOnlyConceptsWithFeedback;
            scope.conceptsToReviewTableParams.reload();
          };
          function updateReviewedListUiState() {
            var conceptIds = [];
            angular.forEach(scope.feedbackContainer.review.conceptsReviewed, function (concept) {
              conceptIds.push(concept.conceptId);
            });
            scaService.saveUiStateForReviewTask($routeParams.projectKey, $routeParams.taskKey, 'reviewed-list', conceptIds);
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
              if (concept.conceptId === data.conceptId) {
                scope.feedbackContainer.review.conceptsResolved.splice(i);
                scope.feedbackContainer.review.conceptsToResolve.push(concept);
              }

              // update the ui state
              updateReviewedListUiState();
            }
          });

          scope.moveItemToReviewed = function (item) {
            item.selected = false;
            scope.feedbackContainer.review.conceptsReviewed.push(item);
            var elementPos = scope.feedbackContainer.review.conceptsToReview.map(function (x) {
              return x.conceptId;
            }).indexOf(item.conceptId);
            scope.feedbackContainer.review.conceptsToReview.splice(elementPos, 1);
          };

          // move item from ToReview to Reviewed
          scope.addToReviewed = function (item, stopUiStateUpdate, itemList) {
            console.log(itemList);
            var idList = [];
            var feedbackStr = '<p>Approved by: ' + $rootScope.accountDetails.firstName + ' ' + $rootScope.accountDetails.lastName + '</p>';
            if (itemList) {
              angular.forEach(itemList, function (item) {
                idList.push(item.conceptId);
              });
              scaService.addFeedbackToTaskReview($routeParams.projectKey, $routeParams.taskKey, feedbackStr, idList, false).then(function (response) {
                notificationService.sendMessage('Multiple concepts marked as approved.', 5000, null);
              }, function () {
                notificationService.sendError('Error submitting feedback', 5000, null);
              });
              angular.forEach(itemList, function (item) {
                scope.moveItemToReviewed(item);
              });

            }
            else {
              idList.push(item.conceptId);
              scaService.addFeedbackToTaskReview($routeParams.projectKey, $routeParams.taskKey, feedbackStr, idList, false).then(function (response) {
                notificationService.sendMessage('Concept: ' + item.term + ' marked as approved.', 5000, null);
              }, function () {
                notificationService.sendError('Error submitting feedback', 5000, null);
              });
              scope.moveItemToReviewed(item);
            }


            scope.conceptsToReviewTableParams.reload();
            scope.conceptsReviewedTableParams.reload();
            scope.conceptsClassifiedTableParams.reload();


            // if stop request not indicated (or not supplied), update ui state
            if (!stopUiStateUpdate) {
              updateReviewedListUiState();
            }

          };

          // move item from Reviewed to ToReview
          scope.returnToReview = function (item, stopUiStateUpdate) {

            scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (task) {
              scope.task = task;
              if (scope.task.status === 'Review Completed') {
                scope.reviewComplete = false;
                scope.changeReviewStatus(scope.reviewComplete);
                scope.reviewComplete = false;
              }
              item.selected = false;
              scope.feedbackContainer.review.conceptsToReview.push(item);
              var elementPos = scope.feedbackContainer.review.conceptsReviewed.map(function (x) {
                return x.conceptId;
              }).indexOf(item.conceptId);
              scope.feedbackContainer.review.conceptsReviewed.splice(elementPos, 1);
              scope.conceptsReviewedTableParams.reload();
              scope.conceptsToReviewTableParams.reload();
              scope.conceptsClassifiedTableParams.reload();

              // if stop request not indicated (or not supplied), update ui state
              if (!stopUiStateUpdate) {
                updateReviewedListUiState();
              }
            });
          };

          scope.selectAll = function (actionTab, isChecked) {
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
          // if not already in saved list

          /**
           * Determine if an item is in the saved list
           * @param id the SCTID of the concept checked
           * @returns {boolean} true: exists, false: does not exist
           */


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
              if (item.conceptId === data.concept.conceptId) {
                item.viewed = false;
              }
            });

            // mark as unviewed in Reviewed list (if present)
            angular.forEach(scope.conceptsReviewedViewed, function (item) {
              if (item.conceptId === data.concept.conceptId) {
                item.viewed = false;
              }
            });
            angular.forEach(scope.conceptsClassified, function (item) {
              if (item.conceptId === data.concept.conceptId) {
                item.viewed = false;
              }
            });

          });

          // the scope variable containing the map of concept -> [style map]
          scope.styles = {};

          function addConceptStyles(concept) {
            var styledElements = {};
            angular.forEach(concept.descriptions, function (description) {
              if (!description.effectiveTime) {
                styledElements[description.descriptionId] = {message: null, style: 'tealhl'};
              }
            });
            angular.forEach(concept.relationships, function (relationship) {
              if (!relationship.effectiveTime) {
                styledElements[relationship.relationshipId] = {message: null, style: 'tealhl'};
              }
            });
            scope.styles[concept.conceptId] = styledElements;

          }

          function highlightComponent(conceptId, componentId) {
           // TODO Revisit traceability and styling in general
            // scope.styles[conceptId][componentId] = {message: null, style: 'tealhl'};
          }


          function addToEditHelper(conceptId) {

            // used for status update of addMultipleToEdit
            var deferred = $q.defer();

            // check if concept already exists in list
            for (var i = 0; i < scope.viewedConcepts.length; i++) {
              if (scope.viewedConcepts[i].conceptId === conceptId) {
                notificationService.sendWarning('Concept already shown');
                return;
              }
            }

            // get the full concept for this branch (before version)
            snowowlService.getFullConcept(conceptId, scope.branch).then(function (response) {

              scope.viewedConcepts.push(response);

              // apply styles
              addConceptStyles(response);

              deferred.resolve(response);

              // after a slight delay, broadcast a draw event
              $timeout(function () {
                $rootScope.$broadcast('comparativeModelDraw');
              }, 500);
            });
            return deferred.promise;
          }

          scope.getSNF = function (id) {
            var deferred = $q.defer();
            snowowlService.getConceptSNF(id, scope.branch).then(function (response) {
              deferred.resolve(response);
            });
            return deferred.promise;
          };

          // function to add a concept to viewed list from tables
          scope.addToEdit = function (item) {
            // if viewed, ignore
            if (!item.viewed) {
              notificationService.sendMessage('Loading concept ' + item.conceptId);
              item.viewed = true;
              scaService.markTaskFeedbackRead($routeParams.projectKey, $routeParams.taskKey, item.conceptId).then(function (response) {
                item.read = true;
                item.modifiedSinceReview = false;
              });
              addToEditHelper(item.conceptId).then(function (response) {
                notificationService.sendMessage('Concept loaded', 5000);
              });
            }
          };
          scope.viewConceptInTaxonomy = function (concept) {
            console.log(concept);
            $rootScope.$broadcast('viewTaxonomy', {
              concept: {
                conceptId: concept.conceptId,
                fsn: concept.term
              }
            });
          };

          // additional function to add based on concept id alone
          scope.addToEditFromConceptId = function (conceptId) {

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
                  conceptsToAdd.push(item.conceptId);
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
              addToEditHelper(conceptsToAdd[i].conceptId).then(function (response) {
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
              var itemList = [];
              angular.forEach(scope.conceptsToReviewViewed, function (item) {
                if (item.selected === true) {
                  itemList.push(item);
                }
              });
              scope.addToReviewed({}, true, itemList);
            } else if (actionTab === 2) {
              angular.forEach(scope.conceptsReviewedViewed, function (item) {
                if (item.selected === true) {

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
                if (newConceptArray[i].conceptId === droppedConcept.conceptId) {
                  droppedIndex = i;
                }
                if (newConceptArray[i].conceptId === draggedConcept.conceptId) {
                  draggedIndex = i;
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
              var status = '';
              if (scope.task.status === 'In Review') {
                status = 'Complete.';
                if (scope.conceptsToReviewViewed.length === 0) {
                  scaService.markTaskReviewComplete($routeParams.projectKey, $routeParams.taskKey, status, {'status': reviewComplete ? 'REVIEW_COMPLETED' : 'IN_REVIEW'}).then(function (response) {
                    scope.task.status = response.data.status;
                  });
                }
              }
              else {
                status = 'In Review.';
                scaService.markTaskReviewComplete($routeParams.projectKey, $routeParams.taskKey, status, {'status': reviewComplete ? 'REVIEW_COMPLETED' : 'IN_REVIEW'}).then(function (response) {
                  scope.task.status = response.data.status;
                  var updateObj = {
                    'reviewer': {
                      'email': $rootScope.accountDetails.email,
                      'avatarUrl': '',
                      'username': $rootScope.accountDetails.login,
                      'displayName': $rootScope.accountDetails.firstName + ' ' + $rootScope.accountDetails.lastName
                    }
                  };

                  scaService.updateTask($routeParams.projectKey, $routeParams.taskKey, updateObj).then(function () {
                  });
                });
              }

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
            if (scope.feedbackContainer.review && !scope.feedbackContainer.errorMsg && !scope.feedbackContainer.review.conceptsToReview && !scope.feedbackContainer.review.conceptsReviewed) {

              console.debug('feedback container', scope.feedbackContainer);

              // get the ui state
              var reviewedListIds = null;
              scaService.getUiStateForReviewTask($routeParams.projectKey, $routeParams.taskKey, 'reviewed-list').then(function (response) {
                reviewedListIds = response;

                // ensure response is in form of array for indexOf checking
                // later
                if (!reviewedListIds || !Array.isArray(reviewedListIds)) {
                  reviewedListIds = [];
                }

                // local arrays to avoid multiple watch triggers
                var conceptsToReview = [];
                var conceptsReviewed = [];


                // cycle over all concepts for pre-processing
                angular.forEach(scope.feedbackContainer.review.concepts, function (item) {
                  var lastViewed = new Date(item.viewDate);
                  var lastUpdated = new Date(item.lastUpdatedTime);

                  // set follow up request flag to false (overwritten below)
                  item.requestFollowup = false;
                  if (lastUpdated > lastViewed) {
                    item.modifiedSinceReview = true;
                  }
                  // if no feedback on this concept
                  if (!item.messages || item.messages.length === 0) {
                    item.read = 'absent'; // provide dummy value for sorting by
                                          // alphabetical value
                  }
                  // otherwise, process feedback
                  else {
                    var lastFeedback = new Date(item.messages[item.messages.length - 1].creationDate);
                    // cycle over all concepts to check for follow up request
                    // condition met if another user has left feedback with the
                    // flag later than the last feedback left by current user
                    if (lastFeedback > lastViewed) {
                      item.read = false;
                    }

                    else if (isNaN(lastViewed.getTime())) {
                      item.read = false;
                    }
                    else {
                      item.read = true;
                    }
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
                  if (reviewedListIds.indexOf(item.conceptId) === -1) {
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
                if (scope.role === 'REVIEWER') {
                  angular.forEach(scope.feedbackContainer.review.conceptsReviewed, function (item) {
                    if (item.modifiedSinceReview === true) {
                      scope.returnToReview(item);
                    }
                  });
                }

                // on load, initialize tables -- all subsequent reloads are
                // manual
                scope.conceptsToReviewTableParams.reload();
                scope.conceptsReviewedTableParams.reload();
                scope.conceptsClassifiedTableParams.reload();

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
              conceptIds.push(concept.conceptId);
            });

            // cycle over all currently displayed concepts
            angular.forEach(scope.conceptsToReviewViewed, function (concept) {

              // if concept is in selected list and has messages, add them
              if (conceptIds.indexOf(concept.conceptId) !== -1 && concept.messages && concept.messages.length > 0) {
                angular.forEach(concept.messages, function (message) {
                  // attach the concept name to the message for display when
                  // multiple concept feedbacks are viewed
                  message.conceptName = concept.term;
                  viewedFeedback.push(message);
                });

                // mark read if unread is indicated
                if (!concept.read) {
                  scaService.markTaskFeedbackRead($routeParams.projectKey, $routeParams.taskKey, concept.conceptId).then(function (response) {
                    concept.read = true;
                  });
                }
              }
            });
            angular.forEach(scope.conceptsReviewedViewed, function (concept) {

              // if concept is in selected list and has messages, add them
              if (conceptIds.indexOf(concept.conceptId) !== -1 && concept.messages && concept.messages.length > 0) {
                angular.forEach(concept.messages, function (message) {
                  // attach the concept name to the message for display when
                  // multiple concept feedbacks are viewed
                  message.conceptName = concept.term;
                  viewedFeedback.push(message);
                  console.log(viewedFeedback);
                });

                // mark read if unread is indicated
                if (!concept.read) {
                  scaService.markTaskFeedbackRead($routeParams.projectKey, $routeParams.taskKey, concept.conceptId).then(function (response) {
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

          function createConceptPlaceholder(conceptId, fsn) {

            return '<span style="color: #00a6e5" id="id">' + fsn + '</span>';
          }

          /**
           * Creates an image object with data source
           * @param id
           * @param fsn
           * @returns {string}
           */
          function createConceptImg(conceptId, fsn) {

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

            return '<img src="' + img.src + '" id="' + conceptId + '-' + fsn + '-endConceptLink" />';
          }

          /**
           * Function to add search result from typeahead to the feedback
           * message
           * @param concept the concept object
           */
          scope.addConceptToFeedback = function (concept) {

            var temp = scope.htmlVariable;

            var img = createConceptImg(concept.concept.conceptId, concept.concept.fsn);

            temp = temp + img + '&nbsp';

            scope.htmlVariable = temp;
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
            var img = createConceptImg(concept.conceptId, concept.term);
            scope.htmlVariable += '&nbsp ' + img + ' ';

          };

          scope.getConceptsForReview = function (idList, review, feedbackList) {
            snowowlService.bulkGetConcept(idList, scope.branch).then(function (response) {
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
              scope.feedbackContainer.review = review ? review : {};
            });
          };

          scope.submitFeedback = function (requestFollowup) {

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

            notificationService.sendMessage('Submitting feedback...', null);

            // extract the subject concept ids
            var subjectConceptIds = [];
            angular.forEach(scope.subjectConcepts, function (subjectConcept) {
              subjectConceptIds.push(subjectConcept.conceptId);
            });

            scaService.addFeedbackToTaskReview($routeParams.projectKey, $routeParams.taskKey, feedbackStr, subjectConceptIds, requestFollowup).then(function (response) {


              // clear the htmlVariable and requestFolllowUp flag
              scope.htmlVariable = '';
              scope.requestFollowup = false;

              // re-retrieve the review
              // TODO For some reason getting duplicate entries on simple push
              // of feedback into list.... for now, just retrieving, though
              // this is inefficient
              snowowlService.getTraceabilityForBranch(scope.task.branchPath).then(function (traceability) {
                var review = {};
                if (traceability) {
                  console.log(traceability);
                  review.concepts = [];
                  review.conceptsClassified = [];
                  var idList = [];
                  angular.forEach(traceability.content, function (change) {
                    if (change.activityType === 'CONTENT_CHANGE') {

                      angular.forEach(change.conceptChanges, function (concept) {

                        // cycle over component changes and apply highlighting
                        angular.forEach(concept.componentChanges, function (componentChange) {
                          switch (componentChange.componentType) {
                            case 'DESCRIPTION':
                              highlightComponent(concept.conceptId, componentChange.componentId);
                              break;
                            case 'STATED_RELATIONSHIP':
                              highlightComponent(concept.conceptId, componentChange.componentId);
                              break;
                            default:
                            // do nothing
                          }
                        });


                        if (review.concepts.filter(function (obj) {
                            return obj.conceptId === concept.conceptId.toString();
                          }).length === 0 && concept.componentChanges.filter(function (obj) {
                            return obj.componentSubType !== 'INFERRED_RELATIONSHIP';
                          }).length !== 0) {
                          concept.conceptId = concept.conceptId.toString();
                          concept.lastUpdatedTime = change.commitDate;
                          review.concepts.push(concept);
                          console.log(concept.conceptId);
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
                      scope.getConceptsForReview(temparray, review, feedback);
                    }
                  });
                  notificationService.sendMessage('Feedback Submitted', 5000, null);
                }
                else if (!traceability) {
                  review = response;
                  scope.feedbackContainer.review = review ? review : {};
                  notificationService.sendMessage('Feedback Submitted', 5000, null);
                }
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
