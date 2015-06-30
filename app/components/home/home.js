'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.home', [
  //insert dependencies here
  'ngRoute',
  'ngTable'
])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/home', {
        controller: 'HomeCtrl',
        templateUrl: 'components/home/home.html'
      });
  })

  .controller('HomeCtrl', function HomeCtrl($scope, ngTableParams, $filter, scaService, $timeout) {

    $scope.tasks = null;

    // TODO: Remove this after demo -- currently appended to "live" data
    var sampleData = [{
      summary: 'Open and Close Fractures of t1-t6',
      projectKey: 'A Sample Project Title',
      updated: '2015-06-12',
      classification: 'true',
      feedback: 'true',
      status: 'Not Started'
    },
      {
        summary: 'Open and Close Fractures of t1-t6',
        projectKey: 'A Nother Sample Project Title',
        updated: '2015-06-12',
        classification: 'true',
        feedback: 'true',
        status: 'Not Started'
      },
      {
        summary: 'A Really Really Long Task Title',
        projectKey: 'A Sample Project Title',
        updated: '2015-06-12',
        classification: 'true',
        feedback: 'true',
        status: 'Not Started'
      },
      {
        summary: 'A Task Title',
        projectKey: 'A Sample Project Title',
        updated: '2015-06-12',
        classification: 'true',
        feedback: 'true',
        status: 'Not Started'
      },
      {
        summary: 'Open and Close Fractures of t1-t6',
        projectKey: 'A Nother Sample Project Title',
        updated: '2015-06-12',
        classification: 'true',
        feedback: 'true',
        status: 'Not Started'
      },
      {
        summary: 'A Really Really Long Task Title',
        projectKey: 'A Sample Project Title',
        updated: '2015-06-12',
        classification: 'true',
        feedback: 'true',
        status: 'Not Started'
      },
      {
        summary: 'A Task Title',
        projectKey: 'A Sample Project Title',
        updated: '2015-06-12',
        classification: 'true',
        feedback: 'true',
        status: 'Not Started'
      },
      {
        summary: 'Open and Close Fractures of t1-t6',
        projectKey: 'A Nother Sample Project Title',
        updated: '2015-06-12',
        classification: 'true',
        feedback: 'true',
        status: 'Not Started'
      },
      {
        summary: 'A Really Really Long Task Title',
        projectKey: 'A Sample Project Title',
        updated: '2015-06-12',
        classification: 'true',
        feedback: 'true',
        status: 'Not Started'
      },
      {
        summary: 'A Task Title',
        projectKey: 'A Sample Project Title',
        updated: '2015-06-12',
        classification: 'true',
        feedback: 'true',
        status: 'Not Started'
      },
      {
        summary: 'Open and Close Fractures of t1-t6',
        projectKey: 'A Nother Sample Project Title',
        updated: '2015-06-12',
        classification: 'true',
        feedback: 'true',
        status: 'Not Started'
      },
      {
        summary: 'A Really Really Long Task Title',
        projectKey: 'A Sample Project Title',
        updated: '2015-06-12',
        classification: 'true',
        feedback: 'true',
        status: 'Not Started'
      },
      {
        summary: 'A Task Title',
        projectKey: 'A Sample Project Title',
        updated: '2015-06-12',
        classification: 'true',
        feedback: 'true',
        status: 'Not Started'
      }

    ];

    // assign keys for track by to sample data
    for (var i = 0; i < sampleData.length; i++) {
      sampleData[i].key = 'SDKEY' + i;
    }

    // declare table parameters
    $scope.tableParams = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {name: 'asc'}
      },
      {
        filterDelay: 50,
        total: $scope.tasks ? $scope.tasks.length : 0, // length of data
        getData: function ($defer, params) {
          console.debug('getData', params);

          if (!$scope.tasks || $scope.tasks.length == 0) {
            console.debug('  returning empty array');
            $defer.resolve(new Array());
          } else {

            var searchStr = params.filter().search;
            var mydata = [];

            if (searchStr) {
              mydata = $scope.tasks.filter(function (item) {
                return item.summary.toLowerCase().indexOf(searchStr) > -1 || item.projectKey.toLowerCase().indexOf(searchStr) > -1;
              });
            } else {
              mydata = $scope.tasks;
            }

            mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;
            $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
        }
      }
    );

    // watch for task creation events
    $scope.$on('taskCreated', function (event, task) {
      console.debug('HomeCtrl: Received task created event', event, task);
      if ($scope.tasks) {
        $scope.tasks.unshift(task);
      }
    });


    // on successful set, reload table parameters
    $scope.$watch('tasks', function () {
      console.debug('tasks changed', $scope.tasks);
      if (!$scope.tasks || $scope.tasks.length == 0) {
        console.debug('  doing nothing');
      } else {
        $timeout(function() {
          $scope.tableParams.reload();
        });

      }
    })


// Initialization:  get tasks
    function initialize() {

      console.debug('HomeCtrl initialization');

      // get tasks from all projects and append sample data
      scaService.getTasks().then(function (response) {
        console.debug('home.js, getTasks results:', response);
        if (!response || response.length == 0) {
          console.debug('  no tasks, returning');
          return;
        }

        $scope.tasks = response.concat(sampleData);

        console.debug('tasks: ', $scope.tasks);



      }, function (error) {
        // TODO Handle errors
      });

    }

    initialize();
  })
;
