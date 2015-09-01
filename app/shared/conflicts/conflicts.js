'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('conflicts', ['$rootScope', 'ngTableParams', '$routeParams', '$filter', '$timeout', '$modal', '$compile', '$sce', 'scaService', 'accountService', 'notificationService',
    function ($rootScope, NgTableParams, $routeParams, $filter, $timeout, $modal, $compile, $sce, scaService, accountService, notificationService) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          // feedback container structure:
          // { conceptsToReview: [...], conceptsReviewed: [...] }

          conflictsContainer: '=',

          // branch this conflict report was generated against
          sourceBranch: '=',

          // branch this conflict report was generated for
          targetBranch: '='

        },
        templateUrl: 'shared/conflict-report/conflictReport.html',

        link: function (scope, element, attrs, linkCtrl) {

          // dummy data for now
          scope.conflictsContainer.concepts = [
            { taskKey: '1', taskName: 'Some Task', projectName: 'Some Project', author: 'Some Author', term: 'Concept One', conceptId: '1' },
            { taskKey: '2', taskName: 'Some Task', projectName: 'Some Project', author: 'Some Author', term: 'Concept Two', conceptId: '2' },
            { taskKey: '3', taskName: 'Some Task', projectName: 'Some Project', author: 'Some Author', term: 'Concept Three', conceptId: '3' },
            { taskKey: '4', taskName: 'Some Task', projectName: 'Some Project', author: 'Some Author', term: 'Concept Four', conceptId: '4' },
            { taskKey: '5', taskName: 'Some Task', projectName: 'Some Project', author: 'Some Author', term: 'Concept Five', conceptId: '5' },
            { taskKey: '6', taskName: 'Some Task', projectName: 'Some Project', author: 'Some Author', term: 'Concept Six', conceptId: '6' },
          ];

          scope.conflictsContainer.conflictsResolved = [];

          scope.conflictsContainer.conflictsToResolve = [];

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

                    // really ahckish solution because the above filter for
                    // swome bizarre reason isn't working
                    var newData = [];
                    angular.forEach(myData, function (item) {
                      if (item.messages && item.messages.length > 0) {
                        newData.push(item);
                      }
                      myData = newData;
                    });

                    //  $scope.filteredItems = $filter('filter')($scope.items,
                    // { 'colours': '!!' });
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

                  var myData = params.filter() ?
                    $filter('filter')(scope.feedbackContainer.review.conceptsReviewed, params.filter()) :
                    scope.feedbackContainer.review.conceptsReviewed;

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
        }
      }
    }])
;