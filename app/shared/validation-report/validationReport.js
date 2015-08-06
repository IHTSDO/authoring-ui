'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('validationReport', ['$rootScope', '$filter', 'ngTableParams', '$routeParams', 'scaService', function ($rootScope, $filter, NgTableParams, $routeParams, scaService) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        // the table params
        items: '=items'

      },
      templateUrl: 'shared/validation-report/validationReport.html',

      link: function (scope, element, attrs, linkCtrl) {


        // declare table parameters
        scope.tableParams = new ngTableParams({
            page: 1,
            count: 10,
            sorting: {failureCount: 'desc'},
            orderBy: 'failureCount'
          },
          {
            filterDelay: 50,
            total: assertionsFailed.length,
            getData: function ($defer, params) {

              console.debug('get data');

              if (!assertionsFailed || assertionsFailed.length == 0) {
                $defer.resolve([]);
              } else {

                var orderedData = assertionsFailed;

                params.total(orderedData.length);
                orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;

                $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
              }

            }
          }
        );

        scope.$watch('assertionsFailed', function () {
          scope.tableParams.reload();
        })
      }
    }
  }])
;