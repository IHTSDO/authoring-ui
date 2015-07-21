'use strict';

angular.module( 'singleConceptAuthoringApp.classification', [
  //insert dependencies here
    'ngRoute'
])

.config(function config( $routeProvider ) {
  $routeProvider
    .when('/classification', {
        controller: 'ClassificationCtrl',
        templateUrl: 'components/classification/classification.html'
      });
})

.controller( 'ClassificationCtrl', function ClassificationCtrl($scope, $filter, ngTableParams) {
    var data = [{differences: "added", source: "Medication monitoring not indicated", type: "Is a", destination: "Procedure not indicated", group:0, charType:"Inferred"},
        {differences: "added", source: "Medication monitoring not indicated", type: "Is a", destination: "Associated procedure", group:0, charType:"Inferred"},
        {differences: "added", source: "Medication monitoring not indicated", type: "Is a", destination: "Subject relationship context", group:0, charType:"Inferred"},
		{differences: "added", source: "Medication monitoring not indicated", type: "Is a", destination: "Procedure not indicated", group:0, charType:"Inferred"},
        {differences: "added", source: "Medication monitoring not indicated", type: "Is a", destination: "Procedure not indicated", group:0, charType:"Inferred"},
        {differences: "added", source: "Medication monitoring not indicated", type: "Is a", destination: "Procedure not indicated", group:0, charType:"Inferred"},
		{differences: "added", source: "Medication monitoring not indicated", type: "Is a", destination: "Procedure not indicated", group:0, charType:"Inferred"},
        {differences: "added", source: "Medication monitoring not indicated", type: "Is a", destination: "Procedure not indicated", group:0, charType:"Inferred"},
        {differences: "inactivated", source: "Medication monitoring not indicated", type: "Is a", destination: "Procedure not indicated", group:0, charType:"Inferred"}];

    $scope.tableParams = new ngTableParams({
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

});