'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('feedback', ['$rootScope', 'ngTableParams', '$routeParams', '$filter', '$timeout',
    function ($rootScope, NgTableParams, $routeParams, $filter, $timeout) {
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

          scope.editable = attrs.editable === 'true';
          scope.showTitle = attrs.showTitle === 'true';
          scope.displayStatus = '';

          // instantiate validation container if not supplied
          if (!scope.feedbackContainer) {
            scope.feedbackContainer = {
              conceptsToReview: [
                {
                  fsn: 'Concept 1 (demo)',
                  conceptId: 1092837,
                  feedback: 'Some sample feedback'
                },
                {
                  fsn: 'Concept 2 (demo)',
                  conceptId: 1092837,
                  feedback: 'Some sample feedback'
                },
                {
                  fsn: 'Concept 3 (demo)',
                  conceptId: 1092837,
                  feedback: 'Some sample feedback'
                },
                {
                  fsn: 'Concept 4 (demo)',
                  conceptId: 1092837,
                  feedback: 'Some sample feedback'
                },
                {
                  fsn: 'Concept 5 (demo)',
                  conceptId: 1092837,
                  feedback: 'Some sample feedback'
                },
                {
                  fsn: 'Concept 6 (demo)',
                  conceptId: 1092837,
                  feedback: 'Some sample feedback'
                },
                {
                  fsn: 'Concept 7 (demo)',
                  conceptId: 1092837,
                  feedback: 'Some sample feedback'
                },
                {
                  fsn: 'Concept 8 (demo)',
                  conceptId: 1092837,
                  feedback: 'Some sample feedback'
                }
              ],
              conceptsReviewed: [
                {
                  fsn: 'Concept 1 (demo)',
                  conceptId: 1092837,
                  feedback: 'Some sample feedback'
                },
                {
                  fsn: 'Concept 2 (demo)',
                  conceptId: 1092837,
                  feedback: 'Some sample feedback'
                },
                {
                  fsn: 'Concept 3 (demo)',
                  conceptId: 1092837,
                  feedback: 'Some sample feedback'
                },
                {
                  fsn: 'Concept 4 (demo)',
                  conceptId: 1092837,
                  feedback: 'Some sample feedback'
                }
              ]
            }
          };


          // arrays used for ng-table data
          scope.conceptsToReview = [];
          scope.conceptsReviewed = [];

          // declare table parameters
          scope.conceptsToReviewTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {fsn: 'asc'},
              orderBy: ''
            },
            {
              filterDelay: 50,
              total: scope.feedbackContainer && scope.feedbackContainer.conceptsToReview ?
                scope.feedbackContainer.conceptsToReview.length : 0,

              getData: function ($defer, params) {

                console.debug('getData for conceptsToReview from ', scope.feedbackContainer.conceptsToReview)

                if (!scope.feedbackContainer.conceptsToReview || scope.feedbackContainer.conceptsToReview.length === 0) {
                  $defer.resolve([]);
                } else {

                  var orderedData = scope.feedbackContainer.conceptsToReview;

                  params.total(scope.feedbackContainer.conceptsToReview.length);
                  orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;

                  scope.conceptsToReview = (orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
              }
            }
          );

          // declare table parameters
          scope.conceptsReviewedTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {fsn: 'desc'},
              orderBy: 'fsn'
            },
            {
              filterDelay: 50,
              total: scope.feedbackContainer && scope.feedbackContainer.conceptsReviewed ?
                scope.feedbackContainer.conceptsReviewed.length : 0,
              getData: function ($defer, params) {

                console.debug('getData for conceptsReviewed from ', scope.feedbackContainer.conceptsReviewed)

                if (!scope.feedbackContainer.conceptsReviewed || scope.feedbackContainer.conceptsReviewed.length === 0) {
                  $defer.resolve([]);
                } else {

                  var orderedData = scope.feedbackContainer.conceptsReviewed;

                  params.total(scope.feedbackContainer.conceptsReviewed.length);
                  orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;

                  scope.conceptsReviewed = (orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
              }
            }
          );

          // function called when dropping concept
          // targetIndex: the point at which to insert the dropped concept
          // conceptObj: {startIndex: N, concept: {...}}
          scope.dropConceptToReview = function (targetIndex, conceptObj) {
            console.debug('drop event', targetIndex, conceptObj);

            if (targetIndex === conceptObj.index) {
              // do nothing
            } else {



              // disable auto-sorting of table params  -- otherwise drag/drop
              // makes no sense!
              scope.conceptsToReviewTableParams.sorting('');

              // insert very slight timeout to allow dragndrop to check for requested
              // effects (deleting too fast causes undefined-access errors)
              $timeout(function () {
                // remove the passed object
                scope.feedbackContainer.conceptsToReview.splice(conceptObj.index, 1);

               // insert the dragged concept at the target index
                scope.feedbackContainer.conceptsToReview.splice(targetIndex, 0, conceptObj.concept);

                scope.conceptsToReviewTableParams.reload();

              }, 10);

            }

          };


          // on load, initialize tables
          scope.conceptsToReviewTableParams.reload();
          scope.conceptsReviewedTableParams.reload();

        }

      };

    }])
;