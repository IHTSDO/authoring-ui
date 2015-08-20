'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('feedback', ['$rootScope', 'ngTableParams', '$routeParams', '$filter', '$timeout', '$modal', '$compile', 'scaService',
    function ($rootScope, NgTableParams, $routeParams, $filter, $timeout, $modal, $compile, scaService) {
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

          // the feedback contents
          scope.htmlVariable = '';

/*
          // TEST DATA FOR SORTING WORK/DEMO

          scope.feedbackContainer = {
            conceptsToReview: [
              {
                term: 'Concept 1 (demo)',
                id: 1,
                feedback: 'Some sample feedback'
              },
              {
                term: 'Concept 2 (demo)',
                id: 2,
                feedback: 'Some sample feedback'
              },
              {
                term: 'Concept 3 (demo)',
                id: 3,
                feedback: 'Some sample feedback'
              },
              {
                term: 'Concept 4 (demo)',
                id: 4,
                feedback: 'Some sample feedback'
              },
              {
                term: 'Concept 5 (demo)',
                id: 5,
                feedback: 'Some sample feedback'
              },
              {
                term: 'Concept 6 (demo)',
                id: 6,
                feedback: 'Some sample feedback'
              },
              {
                term: 'Concept 7 (demo)',
                id: 7,
                feedback: 'Some sample feedback'
              },
              {
                term: 'Concept 8 (demo)',
                id: 8,
                feedback: 'Some sample feedback'
              }
            ],
            conceptsReviewed: [
              {
                term: 'Concept 9 (demo)',
                id: 9,
                feedback: 'Some sample feedback'
              },
              {
                term: 'Concept 10 (demo)',
                id: 10,
                feedback: 'Some sample feedback'
              },
              {
                term: 'Concept 11 (demo)',
                id: 11,
                feedback: 'Some sample feedback'
              },
              {
                term: 'Concept 12 (demo)',
                id: 12,
                feedback: 'Some sample feedback'
              }
            ]
          };
*/

          // declare viewed arrays for ng-table
          scope.conceptsToReviewViewed = [];
          scope.conceptsReviewedViewed = [];

          // Cumbersome function to set selected flag on actual element
          // SEE NOTE AT START
          scope.setSelected = function(concept) {

            // cycle over concepts to review
            angular.forEach(scope.feedbackContainer.review.conceptsToReview, function(c) {
              if (c.id === concept.id) {

                // reverse the flag on both elements
                c.selected = !c.selected;
                concept.selected = !concept.selected;
                return;
              }
            });

            // cycle over concepts reviewed
            angular.forEach(scope.feedbackContainer.review.conceptsReviewed, function(c) {
              if (c.id === concept.id) {
                c.selected = !c.selected;
                return;
              }
            });
          };

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

                if (!scope.feedbackContainer || !scope.feedbackContainer.review || !scope.feedbackContainer.review.conceptsToReview || scope.feedbackContainer.review.conceptsToReview.length === 0) {
                  scope.conceptsToReviewViewed = [];
                } else {

                  console.debug('getData', scope.feedbackContainer.review.conceptsToReview);

                  // hard set the new total
                  params.total(scope.feedbackContainer.review.conceptsToReview.length);

                  // sort -- note this doubletriggers $watch statement....
                  // but we want the actual order to be preserved in the
                  // original  array for reordering purposes
                  scope.feedbackContainer.review.conceptsToReview = params.sorting() ? $filter('orderBy')(scope.feedbackContainer.review.conceptsToReview, params.orderBy()) : scope.feedbackContainer.review.conceptsToReview;

                  // TODO Enable filtering

                  // extract the paged results -- SEE NOTE AT START
                  scope.conceptsToReviewViewed = (scope.feedbackContainer.review.conceptsToReview.slice((params.page() - 1) * params.count(), params.page() * params.count()));
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

                  // hard set the new total
                  params.total(scope.feedbackContainer.review.conceptsReviewed.length);

                  // sort -- note this doubletriggers $watch statement....
                  // but we want the actual order to be preserved in the
                  // original  array for reordering purposes
                  scope.feedbackContainer.review.conceptsReviewed = params.sorting() ? $filter('orderBy')(scope.feedbackContainer.review.conceptsReviewed, params.orderBy()) : scope.feedbackContainer.review.conceptsReviewed;

                  // TODO Enable filtering

                  // extract the paged results -- SEE NOTE AT START
                  scope.conceptsReviewedViewed = (scope.feedbackContainer.review.conceptsReviewed.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
              }
            }
          );
            
          scope.addToReviewed = function(item){
              scope.feedbackContainer.review.conceptsReviewed.push(item);
              var elementPos = scope.feedbackContainer.review.conceptsToReview.map(function(x) {return x.id; }).indexOf(item.id);
              scope.feedbackContainer.review.conceptsToReview.splice(elementPos, 1);
          };
            
          scope.addToEdit = function(item){
              $rootScope.$broadcast('editConcept', {conceptId: item.id});
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

          scope.changeReviewStatus = function(reviewComplete) {
            if (reviewComplete) {
              scaService.updateTask(
                $routeParams.projectKey, $routeParams.taskKey,
                {
                  'status': reviewComplete ? 'Review Complete' : 'In Review',
                  'reviewer': {
                    'email': $rootScope.accountDetails.email,
                    'name': $rootScope.accountDetails.login,
                    'avatarUrl': '',
                    'displayName': $rootScope.accountDetails.firstName + $rootScope.accountDetails.lastName
                  },
                });
            }
          }


          scope.$watch('feedbackContainer', function (oldValue, newValue) {


            if (!scope.feedbackContainer) {
              return;
            }

            // on initial load, split concepts
            if (scope.feedbackContainer.review && !scope.feedbackContainer.review.conceptsToReview) {

              console.debug('Initial load detected, setting concepts to review & concepts reviewed');

              // For now, simply put all concepts into conceptsToReview
              // TODO They SAY they don't want persistence via ui state here.... :)
              scope.feedbackContainer.review.conceptsToReview = scope.feedbackContainer.review.concepts;
              scope.feedbackContainer.review.conceptsReviewed = [];

              // on load, initialize tables -- all subsequent reloads are manual
              scope.conceptsToReviewTableParams.reload();
              scope.conceptsReviewedTableParams.reload();
            }

            // TODO process feedback
          }, true);

          scope.openSearchModal = function (str) {
            var modalInstance = $modal.open({
              templateUrl: 'shared/search-modal/searchModal.html',
              controller: 'searchModalCtrl',
              resolve: {
                searchStr: function() {
                  return str
                }
              }
            });

            modalInstance.result.then(function (result) {
              console.debug('selected:', result);

              scope.htmlVariable += ' ' +

                '<p><a ng-click="editConceptTest()">' + result.fsn + '</a></p>';
          //      + '<a style=\"color: teal\" ng-click=\"editConcept(' + result.conceptId + '\">' + result.fsn + '<button class=\"btn btn-round teal fa fa-edit\" ng-click=\"editConcept(' + result.conceptId + ')\"</button>' + result.fsn + '</a>';

              console.debug(scope.htmlVariable);
            }, function () {
            });
          };

          scope.editConceptTest = function() {
            window.alert('OHAI THERE!');
          }


        }

      };

    }])
;