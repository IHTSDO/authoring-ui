'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('feedback', ['$rootScope', 'ngTableParams', '$routeParams', '$filter', '$timeout', '$modal', '$compile', '$sce', 'scaService', 'accountService',
    function ($rootScope, NgTableParams, $routeParams, $filter, $timeout, $modal, $compile, $sce, scaService, accountService) {
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

          // get the user information to determine role
          // values: AUTHOR, REVIEWER
          scope.role = 'ROLE NOT AVAILABLE';
          scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (task) {
            if (task) {
              scope.role = accountService.getRoleForTask(task);
              console.debug('Role found: ', scope.role);
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

                if (!scope.feedbackContainer || !scope.feedbackContainer.review || !scope.feedbackContainer.review.conceptsToReview || scope.feedbackContainer.review.conceptsToReview.length === 0) {
                  scope.conceptsToReviewViewed = [];
                } else {

                  /*var searchStr = params.filter().search;
                  if (searchStr) {
                    myData = scope.feedbackContainer.review.conceptsToReview.filter(function (item) {
                      return item.term.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 || item.id.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                    });
                  } else {
                    myData = scope.feedbackContainer.review.conceptsToReview;
                  }*/

                  console.debug(params.filter());
                  var myData = params.filter() ?
                    $filter('filter')(scope.feedbackContainer.review.conceptsToReview, params.filter()) :
                    scope.feedbackContainer.review.conceptsToReview;

                  // filter based on presence of feedback if requested
                  if (scope.viewOnlyConceptsWithFeedback) {
                    console.debug('Retrieving only concepts with messages');
                    //myData =  $filter('filter')(myData, { 'messages': '!'});

                    // really ahckish solution because the above filter for swome bizarre reason isn't working
                    var newData = [];
                    angular.forEach(myData, function(item) {
                      if (item.messages && item.messages.length > 0) {
                        newData.push(item);
                      }
                      myData = newData;
                    })

                    //  $scope.filteredItems = $filter('filter')($scope.items, { 'colours': '!!' });
                  }
                  console.debug(myData);

                  // hard set the new total
                  params.total(myData.length);

                  myData = params.sorting() ? $filter('orderBy')(myData, params.orderBy()) : myData;

                  // extract the paged results
                  scope.conceptsToReviewViewed = (myData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
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
                  var myData = [];

                  var searchStr = params.filter().search;
                  if (searchStr) {
                    myData = scope.feedbackContainer.review.conceptsReviewed.filter(function (item) {
                      return item.term.indexOf(searchStr) > -1 || item.id.indexOf(searchStr) > -1;
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
                }
              }
            }
          );

          // controls to allow author to view only concepts with feedeback
          scope.viewOnlyConceptsWithFeedback = false;
          scope.toggleViewOnlyConceptsWithFeedback = function() {
            scope.viewOnlyConceptsWithFeedback = ! scope.viewOnlyConceptsWithFeedback;
            scope.conceptsToReviewTableParams.reload();
          }

          scope.addToReviewed = function (item) {
            scope.feedbackContainer.review.conceptsReviewed.push(item);
            var elementPos = scope.feedbackContainer.review.conceptsToReview.map(function (x) {
              return x.id;
            }).indexOf(item.id);
            scope.feedbackContainer.review.conceptsToReview.splice(elementPos, 1);
            scope.clearChecked();
            scope.conceptsToReviewTableParams.reload();
            scope.conceptsReviewedTableParams.reload();
          };

          scope.clearChecked = function () {
            angular.forEach(scope.feedbackContainer.review.conceptsReviewed, function (item) {
              if (item.selected === true) {
                item.selected = false;
              }
            });
          };

          scope.addToEdit = function (id) {
            $rootScope.$broadcast('editConcept', {conceptId: id});
          };

          scope.addMultipleToEdit = function () {
            angular.forEach(scope.conceptsToReviewViewed, function (item) {
              console.log(item);
              if (item.selected === true) {
                scope.addToEdit(item.id);
              }
            });
          };
          scope.addMultipleToReviewed = function () {
            angular.forEach(scope.conceptsToReviewViewed, function (item) {
              if (item.selected === true) {
                scope.addToReviewed(item);
              }
            });
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
            if (reviewComplete) {
              scaService.updateTask(
                $routeParams.projectKey, $routeParams.taskKey,
                {
                  'status': reviewComplete ? 'Ready For Promotion' : 'In Review'
                });
            }
          };

          scope.$watch('feedbackContainer', function (oldValue, newValue) {

            if (!scope.feedbackContainer) {
              return;
            }

            // on initial load or reload, process the concepts
            if (scope.feedbackContainer.review && !scope.feedbackContainer.review.conceptsToReview) {

              console.debug('Initial load detected, setting concepts to review & concepts reviewed', scope.feedbackContainer.review.concepts);

              // For now, simply put all concepts into conceptsToReview
              // TODO They SAY they don't want persistence via ui state
              // here.... :)
              scope.feedbackContainer.review.conceptsToReview = scope.feedbackContainer.review.concepts;

              angular.forEach(scope.feedbackContainer.review.conceptsToReview, function (item) {
                if (angular.isDefined(item)) {
                  item.selected = scope.allChecked;
                }
              });
              scope.feedbackContainer.review.conceptsReviewed = [];

              // on load, initialize tables -- all subsequent reloads are manual
              scope.conceptsToReviewTableParams.reload();

              // load currently viewed feedback (on reload)
              getViewedFeedback();
            }

            // TODO process feedback
          }, true);

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
                viewedFeedback = viewedFeedback.concat(concept.messages);
              }
            });

            // sort by creation date
            viewedFeedback.sort(function(a, b) {
              return a.creationDate < b.creationDate;
            });

            // set the scope variable for display
            scope.viewedFeedback = viewedFeedback;
          }

          scope.toTrustedHtml = function(htmlCode) {
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

          scope.openSearchModal = function (str) {
            var modalInstance = $modal.open({
              templateUrl: 'shared/search-modal/searchModal.html',
              controller: 'searchModalCtrl',
              resolve: {
                searchStr: function () {
                  return str;
                }
              }
            });

            modalInstance.result.then(function (result) {
              console.debug('selected:', result);

              scope.htmlVariable += ' ' +

                '<p><a ng-click="addToEdit(' + result.conceptId + ')">' + result.fsn + '<span class="md md-edit"></span></a></p>';
              //      + '<a style=\"color: teal\" ng-click=\"editConcept(' +
              // result.conceptId + '\">' + result.fsn + '<button class=\"btn
              // btn-round teal fa fa-edit\" ng-click=\"editConcept(' +
              // result.conceptId + ')\"</button>' + result.fsn + '</a>';

              console.debug(scope.htmlVariable);
            }, function () {
            });
          };

          scope.editConceptTest = function () {
            window.alert('OHAI THERE!');
          };

          scope.submitFeedback = function () {

            if (!scope.htmlVariable || scope.htmlVariable.length === 0) {
              window.alert('Cannot submit empty feedback');
            }
            if (!scope.subjectConcepts || scope.subjectConcepts.length === 0) {
              window.alert('Cannot submit feedback without specifying concepts');
            }

            // extract the subject concept ids
            var subjectConceptIds = [];
            angular.forEach(scope.subjectConcepts, function (subjectConcept) {
              console.debug('adding concept id', subjectConcept.conceptId, subjectConcept);
              subjectConceptIds.push(subjectConcept.id);
            });

            scaService.addFeedbackToReview($routeParams.projectKey, $routeParams.taskKey, scope.htmlVariable, subjectConceptIds).then(function (response) {

              // re-retrieve the review
              // TODO For some reason getting duplicate entries on simple push of feedback into list.... for now, just retrieving, though this is inefficient
              scaService.getReviewForTask($routeParams.projectKey, $routeParams.taskKey).then(function(response) {
                scope.feedbackContainer.review = response;
              });
            });
          };

        }

      };

    }])
;