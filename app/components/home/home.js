'use strict';

angular.module( 'angularAppTemplateApp.home', [
  //insert dependencies here
    'ngRoute',
	'ngTable'
])

.config(function config( $routeProvider ) {
  $routeProvider
    .when('/home', {
        controller: 'HomeCtrl',
        templateUrl: 'components/home/home.html'
      });
})

.controller( 'HomeCtrl', function HomeCtrl( $scope, ngTableParams, $filter ) {
    
 var data = [{name: 'Open and Close Fractures of t1-t6', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'}, 
                        {name: 'Open and Close Fractures of t1-t6', project: 'A Nother Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
                        {name: 'A Really Really Long Task Title', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
                        {name: 'A Task Title', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
						{name: 'Open and Close Fractures of t1-t6', project: 'A Nother Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
                        {name: 'A Really Really Long Task Title', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
                        {name: 'A Task Title', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
						 {name: 'Open and Close Fractures of t1-t6', project: 'A Nother Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
                        {name: 'A Really Really Long Task Title', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
                        {name: 'A Task Title', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
						{name: 'Open and Close Fractures of t1-t6', project: 'A Nother Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
                        {name: 'A Really Really Long Task Title', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
                        {name: 'A Task Title', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'}
						
						];
            $scope.data = data;
			$scope.tableParams = new ngTableParams({
    page: 1,            // show first page
    count: 10,
    sorting: {
      name: 'asc'     // initial sorting
    }
  }, {
    filterDelay: 50,
    total: data.length, // length of data
    getData: function($defer, params) {
      var searchStr = params.filter().search;
      var mydata = [];

      if(searchStr){
        mydata = data.filter(function(item){
          return item.name.toLowerCase().indexOf(searchStr) > -1 || item.project.toLowerCase().indexOf(searchStr) > -1;
        });
      } else {
        mydata = data;
      }

      mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;
      $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
    }
  });
			
        });