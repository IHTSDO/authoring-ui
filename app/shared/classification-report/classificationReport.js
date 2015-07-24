'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('classificationReport', ['$rootScope', '$filter', 'ngTableParams', '$routeParams', 'snowowlService', function ($rootScope, $filter, NgTableParams, $routeParams, snowowlService) {
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

        scope.tableParams = new NgTableParams({
          page: 1,            // show first page
          count: 10,          // count per page
          sorting: {
            name: 'asc'     // initial sorting
          }
        }, {
          $scope: scope,
          total: scope.data ? scope.data.length : 0, // length of data
          getData: function ($defer, params) {

            if (!scope.data || scope.data.length === 0) {
              $defer.resolve([]);
            } else {
              var orderedData = params.sorting() ?
                $filter('orderBy')(scope.data, params.orderBy()) :
                scope.data;

              $defer.resolve(scope.data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }
          }
        });
        scope.viewComparativeModel = function(model){
            $rootScope.$broadcast('comparativeModelAdded', {id: model});
        };

        scope.$watch('data', function() {
          scope.tableParams.reload();
        });
      }
    };
  }]);