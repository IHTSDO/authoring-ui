'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('classificationReport', function ($rootScope, $filter, ngTableParams, $routeParams, snowowlService) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        // the table params
        data: '=data'

      },
      templateUrl: 'shared/classification-report/classificationReport.html',

      link: function (scope, element, attrs, linkCtrl) {

        //////////////////////////
        // Paging Controls
        //////////////////////////

        scope.tableParams = new ngTableParams({
          page: 1,            // show first page
          count: 10,          // count per page
          sorting: {
            name: 'asc'     // initial sorting
          }
        }, {
          $scope: scope,
          total: scope.data ? scope.data.length : 0, // length of data
          getData: function ($defer, params) {

            console.debug('getdata');
$
            if (!scope.data || scope.data.length == 0) {
              $defer.resolve([]);
            } else {
              var orderedData = params.sorting() ?
                $filter('orderBy')(scope.data, params.orderBy()) :
                scope.data;

              $defer.resolve(scope.data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }
          }
        });

        scope.$watch('data', function() {
          console.debug('data changed', scope.data);
          scope.tableParams.reload();
        });
      }
    }
  });