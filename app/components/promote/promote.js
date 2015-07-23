'use strict';

angular.module( 'singleConceptAuthoringApp.promote', [
  //insert dependencies here
    'ngRoute'
])

.config(function config( $routeProvider ) {
  $routeProvider
    .when('/promote', {
        controller: 'PromoteCtrl',
        templateUrl: 'components/promote/promote.html'
      });
})

.controller( 'PromoteCtrl', ['$scope', '$filter', 'ngTableParams', function PromoteCtrl($scope, $filter, NgTableParams) {


  
	
    var data = [{differences: 'added', source: 'Medication monitoring not indicated', type: 'Is a', destination: 'Procedure not indicated', group:0, charType:'Inferred'},
        {differences: 'added', source: 'Medication monitoring not indicated', type: 'Is a', destination: 'Associated procedure', group:0, charType:'Inferred'},
        {differences: 'added', source: 'Medication monitoring not indicated', type: 'Is a', destination: 'Subject relationship context', group:0, charType:'Inferred'},
		{differences: 'added', source: 'Medication monitoring not indicated', type: 'Is a', destination: 'Procedure not indicated', group:0, charType:'Inferred'},
        {differences: 'added', source: 'Medication monitoring not indicated', type: 'Is a', destination: 'Procedure not indicated', group:0, charType:'Inferred'},
        {differences: 'added', source: 'Medication monitoring not indicated', type: 'Is a', destination: 'Procedure not indicated', group:0, charType:'Inferred'},
		{differences: 'added', source: 'Medication monitoring not indicated', type: 'Is a', destination: 'Procedure not indicated', group:0, charType:'Inferred'},
        {differences: 'added', source: 'Medication monitoring not indicated', type: 'Is a', destination: 'Procedure not indicated', group:0, charType:'Inferred'},
        {differences: 'inactivated', source: 'Medication monitoring not indicated', type: 'Is a', destination: 'Procedure not indicated', group:0, charType:'Inferred'}];

    $scope.tableParams = new NgTableParams({
        page: 1,            // show first page
        count: 10,          // count per page
        sorting: {
            name: 'asc'     // initial sorting
        }
    }, {
        total: data.length, // length of data
        getData: function($defer, params) {
            // use build-in angular filter
            var orderedData = params.sorting() ?
                    $filter('orderBy')(data, params.orderBy()) :
                    data;

            $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
    });

}]);