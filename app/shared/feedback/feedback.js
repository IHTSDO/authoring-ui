'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('feedback', ['$rootScope', 'ngTableParams', '$routeParams', '$timeout',
    function ($rootScope, NgTableParams, $routeParams) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          // feedback container structure:
          // { report: [feedback report], ...}
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
            scope.feedbackContainer = {concepts: []};
          }
            
          //demo data
          var concepts = [
              {fsn : 'Concept 1 (demo)', conceptId : 1092837},
              {fsn : 'Concept 2 (demo)', conceptId : 1092837},
              {fsn : 'Concept 3 (demo)', conceptId : 1092837},
              {fsn : 'Concept 4 (demo)', conceptId : 1092837}
          ];


          // declare table parameters
          scope.feedbackTableParams = new NgTableParams({
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

          // watch for changes in the validation in order to populate tables
          scope.$watch('feedbackContainer', function () {

            if (!scope.feedbackContainer) {
              return;
            }
            // reload the tables
            scope.feedbackTableParams.reload();

          }, true); // make sure to check object inequality, not reference!

          
        }

      };

    }])
;