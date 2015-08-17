'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('review', ['$rootScope', '$filter', 'ngTableParams', '$routeParams', 'snowowlService', 'scaService', '$timeout',
    function ($rootScope, $filter, NgTableParams, $routeParams, snowowlService, scaService, $timeout) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          // review container structure:
          // { report: [review report], ...}
          reviewContainer: '=',

          // flag for whether or not to allow editing controls
          editable: '&',

          // branch this report is good for
          branch: '='
        },
        templateUrl: 'shared/review/review.html',

        link: function (scope, element, attrs, linkCtrl) {

          scope.editable = attrs.editable === 'true';
          scope.showTitle = attrs.showTitle === 'true';
          scope.viewTop = true;
          scope.displayStatus = '';

          // instantiate validation container if not supplied
          if (!scope.reviewContainer) {
            scope.reviewContainer = {executionStatus: '', report: ''};
          }
            
          //demo data
          var concepts = [
              {fsn : 'Concept 1 (demo)', conceptId : 1092837},
              {fsn : 'Concept 2 (demo)', conceptId : 1092837},
              {fsn : 'Concept 3 (demo)', conceptId : 1092837},
              {fsn : 'Concept 4 (demo)', conceptId : 1092837}
          ];

          // local variables for ng-table population
          var assertionsFailed = [];
          var failures = [];

          // Allow broadcasting of new review results
          // e.g. from server-side notification of work complete
          scope.$on('setReview', function (event, data) {
             scope.reviewContainer = data.review;
          });

          // declare table parameters
          scope.reviewList = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {fsn: 'desc'},
              orderBy: 'fsn'
            },
            {
              filterDelay: 50,
              total: concepts.length,
              getData: function ($defer, params) {

                if (!concepts || concepts.length === 0) {
                  $defer.resolve([]);
                } else {

                  var orderedData = concepts;

                  params.total(concepts.length);
                  orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;

                  $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
              }
            }
          );

          // declare table parameters
          scope.reviewedList = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {fsn: 'desc'},
              orderBy: 'fsn'
            },
            {
              filterDelay: 50,
              total: scope.reviewedList.length,
              getData: function ($defer, params) {

                if (!scope.reviewedList || scope.reviewedList.length === 0) {
                  $defer.resolve([]);
                } else {

                  var orderedData = scope.reviewedList;

                  params.total(orderedData.length);
                  orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;

                  $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }

              }
            }
          );

          // watch for changes in the validation in order to populate tables
          scope.$watch('reviewContainer', function () {

            if (!scope.reviewContainer) {
              return;
            }
            // reload the tables
            scope.reviewList.reload();
            scope.reviewedList.reload();

          }, true); // make sure to check object inequality, not reference!

          // TODO Make this respect paging
          scope.selectAll = function (selectAllActive) {
            angular.forEach(concepts, function (concept) {
              concept.selected = selectAllActive;
            });
          };

          // TODO Decide how to represent concepts and implement
          scope.editConcept = function (concept) {

          };

        }

      };

    }])
;