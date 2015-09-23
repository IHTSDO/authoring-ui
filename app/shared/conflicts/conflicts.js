'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('conflicts', ['$rootScope', 'ngTableParams', '$routeParams', '$filter', '$timeout', '$modal', '$compile', '$sce', 'scaService',
    function ($rootScope, NgTableParams, $routeParams, $filter, $timeout, $modal, $compile, $sce, scaService) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          // conflicts container structure:
          // { conceptsToResolve: [...], conceptsResolved: [...] }

          conflictsContainer: '=',

          // branch this conflict report was generated against
          sourceBranch: '=',

          // branch this conflict report was generated for
          targetBranch: '=',

          editable: '&'

        },
        templateUrl: 'shared/conflicts/conflicts.html',

        link: function (scope) {

          // declare To Resolve table parameters
          scope.conceptsToResolveTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {fsn: 'asc'},
              orderBy: 'fsn'
            },
            {
              filterDelay: 50,
              total: scope.conflictsContainer && scope.conflictsContainer.conflicts && scope.conflictsContainer.conflicts.conceptsToResolve ?
                scope.conflictsContainer.conflicts.conceptsToResolve.length : 0,
              getData: function ($defer, params) {

                if (!scope.conflictsContainer || !scope.conflictsContainer.conflicts || !scope.conflictsContainer.conflicts.conceptsToResolve || scope.conflictsContainer.conflicts.conceptsToResolve.length === 0) {
                  $defer.resolve([]);
                } else {

                  var orderedData = scope.conflictsContainer.conflicts.conceptsToResolve;

                  params.total(orderedData.length);
                  orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;

                  $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
              }
            }
          );

          // declare Resolved table parameters
          scope.conceptsResolvedTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {fsn: 'asc'},
              orderBy: 'fsn'
            },
            {
              filterDelay: 50,
              total: scope.conflictsContainer && scope.conflictsContainer.conflicts && scope.conflictsContainer.conflicts.conceptsResolved ?
                scope.conflictsContainer.conflicts.conceptsResolved.length : 0,
              getData: function ($defer, params) {

                if (!scope.conflictsContainer || !scope.conflictsContainer.conflicts || !scope.conflictsContainer.conflicts.conceptsResolved || scope.conflictsContainer.conflicts.conceptsResolved.length === 0) {
                  $defer.resolve([]);
                } else {

                  var orderedData = scope.conflictsContainer.conflicts.conceptsResolved;

                  params.total(orderedData.length);
                  orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;

                  $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
              }
            }
          );

          //////////////////////////////////////////////
          // Resolved List Functions
          //////////////////////////////////////////////

          // update the resolved list
          function updateResolvedListUiState() {
            console.debug('updateReswolvedListUiState');
            var ids = [];
            angular.forEach(scope.conflictsContainer.conflicts.conceptsResolved, function (concept) {
              ids.push(concept.id);
            });
            scaService.saveUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'conflicts-resolved',
              {
                resolvedIds: ids
              });
          }

          // move item from ToResolve to Resolved
          scope.addToResolved = function (item, stopUiStateUpdate) {

            // deselect the item and push it to resolved list
            item.selected = false;
            scope.conflictsContainer.conflicts.conceptsResolved.push(item);

            // find the index of the element by its id
            var elementPos = scope.conflictsContainer.conflicts.conceptsToResolve.map(function (x) {
              return x.id;
            }).indexOf(item.id);

            // remove from ToResolve
            scope.conflictsContainer.conflicts.conceptsToResolve.splice(elementPos, 1);

            // reload tables
            scope.conceptsToResolveTableParams.reload();
            scope.conceptsResolvedTableParams.reload();

            // if stop request not indicated (or not supplied), update ui state
            if (!stopUiStateUpdate) {
              updateResolvedListUiState();
            }

          };

          // move item from Resolved to ToResolve
          scope.returnToResolve = function (item, stopUiStateUpdate) {

            // deselect item and move it to ToResolve list
            item.selected = false;
            scope.conflictsContainer.conflicts.conceptsToResolve.push(item);

            // find element position by its id
            var elementPos = scope.conflictsContainer.conflicts.conceptsResolved.map(function (x) {
              return x.id;
            }).indexOf(item.id);

            // remove from Resolved
            scope.conflictsContainer.conflicts.conceptsResolved.splice(elementPos, 1);

            // reload tables
            scope.conceptsResolvedTableParams.reload();
            scope.conceptsToResolveTableParams.reload();

            // if stop request not indicated (or not supplied), update ui state
            if (!stopUiStateUpdate) {
              updateResolvedListUiState();
            }
          };

          scope.selectAll = function (actionTab, isChecked) {
            console.debug('selectAll', actionTab, isChecked);
            if (actionTab === 1) {
              angular.forEach(scope.conceptsToResolveViewed, function (item) {
                item.selected = isChecked;
              });
            } else if (actionTab === 2) {
              angular.forEach(scope.conceptsResolvedViewed, function (item) {
                item.selected = isChecked;
              });
            }
          };

          // move all selected objects from one list to the other
          // depending on current viewed tab
          // NOTE:  Apply stopUiUpdate flag
          scope.moveMultipleToOtherList = function (actionTab) {
            if (actionTab === 1) {
              angular.forEach(scope.conceptsToResolveViewed, function (item) {
                if (item.selected === true) {
                  console.debug('adding to resolved list', item);
                  scope.addToResolved(item, true);
                }
              });
            } else if (actionTab === 2) {
              angular.forEach(scope.conceptsResolvedViewed, function (item) {
                console.debug('checking item', item);
                if (item.selected === true) {
                  console.debug('adding to to resolve list', item);
                  scope.returnToResolve(item, true);
                }
              });
            }

            // update the ui state
            updateResolvedListUiState();
          };

          // watch for notification of updated concepts from conceptEdit directive
          scope.$on('conceptEdit.conceptChanged', function (event, data) {

            // ignore if concepts arrays are not declared (not initialized)
            if (!scope.conflictsContainer || !scope.conflictsContainer.conceptsResolved || !scope.conflictsContainer.conceptsToResolve) {
              return;
            }

            // cycle over resolved list
            for (var i = 0; i < scope.conflictsContainer.conflicts.conceptsResolved.length; i++) {
              var concept = scope.conflictsContainer.conflicts.conceptsResolved[i];

              // if this concept is present, move it from Resolved to To Resolve
              if (concept.id === data.conceptId) {
                scope.conflictsContainer.conflicts.conceptsResolved.splice(i);
                scope.conflictsContainer.conflicts.conceptsToResolve.push(concept);
              }

              // update the ui state
              updateResolvedListUiState;
            }
          });

          //////////////////////////////////
          // Add To Edit List functions
          //////////////////////////////////

          scope.addToEdit = function (concept) {
            console.debug('adding to edit', concept);
            // note that edit list notification expects array of concept ids
            $rootScope.$broadcast('editConflictConcepts', {conceptIds: [concept.id]});
          };

          // add all selected objects to edit panel list
          // depending on current viewed tab
          scope.addMultipleToEdit = function (actionTab) {
            var conceptIds = [];
            if (actionTab === 1) {
              angular.forEach(scope.conceptsToResolveViewed, function (item) {
                if (item.selected === true) {
                  conceptIds.push(item.id);
                }
              });
            } else if (actionTab === 2) {
              angular.forEach(scope.conceptsResolvedViewed, function (item) {
                if (item.selected === true) {
                  conceptIds.push(item.id);
                }
              });
            }

            if (conceptIds.length > 0) {
              $rootScope.$broadcast('editConflictConcepts', {conceptIds: conceptIds});
            }
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
                  newConceptArray = scope.conflictsContainer.conflicts.conceptsToResolve;
                  scope.conceptsToResolveTableParams.sorting('');
                  break;
                case 2:
                  newConceptArray = scope.conflictsContainer.conflicts.conceptsResolved;
                  scope.conceptsResolvedTableParams.sorting('');
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

                console.debug('checking concept', newConceptArray[i]);

                // NOTE: Compare by.id, as dragged/dropped concepts have
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
                    scope.conflictsContainer.conflicts.conceptsToResolve = newConceptArray;
                    scope.conceptsToResolveTableParams.reload();
                    break;
                  case 2:
                    scope.conflictsContainer.conflicts.conceptsResolved = newConceptArray;
                    scope.conceptsResolvedTableParams.reload();
                    break;
                  default:
                    console.error('Invalid tab selected dropping conflict concept');
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
                newConceptArray = scope.conflictsContainer.conflicts.conceptsToResolve;
                scope.conceptsToResolveTableParams.sorting('');
                break;
              case 2:
                newConceptArray = scope.conflictsContainer.conflicts.conceptsResolved;
                scope.conceptsResolvedTableParams.sorting('');
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

            // cycle over all concepts to.conflicts in reverse
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

            // assign to conflicts container to trigger watch statement
            switch (actionTab) {
              case 1:
                scope.conflictsContainer.conflicts.conceptsToResolve = newConceptArray;
                scope.conceptsToResolveTableParams.reload();
                break;
              case 2:
                scope.conflictsContainer.conflicts.conceptsResolved = newConceptArray;
                scope.conceptsResolvedTableParams.reload();
                break;
              default:
                return;
            }
          };

          ////////////////////////////////////////////////////////////////////
          // Watch freedback container -- used as Initialization Block
          ////////////////////////////////////////////////////////////////////

          // flag for information displayed to user on load
          scope.conflictsInitialized = false;
          scope.conflictsReportStatus = 'Initializing...';

          scope.$watch('conflictsContainer', function () {

            console.debug('conflictsContainer changed', scope.conflictsContainer);

            if (!scope.conflictsContainer || !scope.conflictsContainer.conflicts) {
              scope.conflictsReportStatus = 'Conflicts report not available';
              return;
            }

            // pre-processing on initial load, detected by the following
            // conditions: * conflicts object exists * conflicts object has a
            // sourceReviewId * conceptsToResolve and conceptsResolved do not
            // yet exist
            if (scope.conflictsContainer.conflicts && scope.conflictsContainer.conflicts.sourceReviewId && !scope.conflictsContainer.conflicts.conceptsToResolve && !scope.conflictsContainer.conflicts.conceptsResolved) {


              // initialize the lists
              scope.conflictsContainer.conflicts.conceptsToResolve = [];
              scope.conflictsContainer.conflicts.conceptsResolved = [];

              // if no concepts (indicating no conflict), add empty array
              if (!scope.conflictsContainer.conflicts.concepts) {
                scope.conflictsReportStatus = 'No conflicts';
                scope.conflictsContainer.conflicts.concepts = [];
                return;
              }

              scope.conflictsReportStatus = scope.conflictsContainer.conflicts.concepts.length + ' conflict' + (scope.conflictsContainer.conflicts.concepts.length === 0 ? '' : 's') + ' detected';

              // PROJECT VIEW: no ui state retrieval yet
              if (!$routeParams.taskKey) {

                console.debug('initializing for project');

                // sort the concepts into Resolved and ToResolve
                // TODO No ui-state support, put all into ToResolve
                angular.forEach(scope.conflictsContainer.conflicts.concepts, function (concept) {
                  scope.conflictsContainer.conflicts.conceptsToResolve.push(concept);
                });

                scope.conflictsInitialized = true;

                // on load, initialize tables -- all subsequent reloads manual
                scope.conceptsToResolveTableParams.reload();
                scope.conceptsResolvedTableParams.reload();

              }

              // TASK VIEW: ui state retrieval
              else {

                console.debug('initializing for task');

                // get ui state
                scaService.getUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'conflicts-resolved').then(function (response) {

                  console.debug('uistate', response);
                  var conceptIdsResolved = response.hasOwnProperty('resolvedIds') ? response.resolvedIds : [];

                  // sort the concepts into Resolved and ToResolve based on ui
                  // state
                  angular.forEach(scope.conflictsContainer.conflicts.concepts, function (concept) {
                    console.debug(concept.id, conceptIdsResolved);

                    if (conceptIdsResolved.indexOf(concept.id) !== -1) {
                      scope.conflictsContainer.conflicts.conceptsResolved.push(concept);
                    } else {
                      scope.conflictsContainer.conflicts.conceptsToResolve.push(concept);
                    }
                  });

                  scope.conflictsInitialized = true;

                  // on load, initialize tables -- all subsequent reloads manual
                  scope.conceptsToResolveTableParams.reload();
                  scope.conceptsResolvedTableParams.reload();

                });
              }
            }
          }, true);
        }
      };
    }])
;