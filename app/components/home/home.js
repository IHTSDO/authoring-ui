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

  .controller('HomeCtrl', function HomeCtrl($scope, $rootScope, $timeout, ngTableParams, $filter, $modal, scaService, snowowlService) {

    // TODO Placeholder, as we only have the one tab at the moment
    $rootScope.pageTitle = "My Tasks";
    $scope.tasks = null;
    $scope.classifications = null;

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

          if (!$scope.tasks || $scope.tasks.length == 0) {
            $defer.resolve([]);
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
            params.total(mydata.length);
            mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;

            $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }

        }
      }
    );

    // watch for task creation events
    $scope.$on('taskCreated', function (event, task) {
      if ($scope.tasks) {
        $scope.tasks.unshift(task);
      }
    });

    // on successful set, reload table parameters
    $scope.$watch('tasks', function () {
      if (!$scope.tasks || $scope.tasks.length == 0) {
      }
      else {
        $scope.tableParams.reload();
      }

    }, true);

    $scope.openCreateTaskModal = function () {
      var modalInstance = $modal.open({
        templateUrl: 'shared/task/task.html',
        controller: 'taskCtrl',
        resolve: {}
      });

      modalInstance.result.then(function () {
      }, function () {
      });
    };


    // function to poll for the result of a task with running classification
    function pollForResult (task) {

      console.debug('Polling for classification updates to task', task);

      // check prerequisites
      if (!task.latestClassification) {
        console.error('Cannot poll results for null classification')
      }
      else if (!task.latestClassification.id) {
        console.error('Cannot poll results for classification without id');
      }
      else if (task.latestClassification.status != 'RUNNING') {
        console.error('Cannot poll results for classification without status RUNNING');
      }

      // otherwise, update the result
      else {
        $timeout(function () {
          snowowlService.getClassificationResult(task.projectKey, task.key, task.latestClassification.id, 'MAIN').then(function (data) {

            // if completed, set flag and return
            if (data.data.status === 'COMPLETED') {
              task.latestClassificationJson = data.data;
            } else {
              // otherwise, continue polling
              pollForResult(task);
            }
          });
        }, 5000);
      }
    };

//    function appendClassificationResults(task) {
//
////      task.classifications = [];
////      task.latestClassification = null;
////
////      // TODO Update branch when branching is implemented
////      snowowlService.getClassificationResultsForTask(task.projectKey, task.key, 'MAIN').then(function (response) {
////
////
////        if (!response) {
////          // do nothing
////        } else {
////
////          // append the first result
////          task.classifications = response;
////          task.latestClassification = response[response.length-1];
////
////          console.debug('Revised task', task);
////          
//          // if the result is still running, start polling
//          console.log(task);
//          if (task.latestClassificationJson != undefined) {
//              if(task.latestClassificationJson.status === 'RUNNING'){
//                  pollForResult(task);
//              }
//            
//          }
////        }
////      })
//    }


// Initialization:  get tasks and classifications
    function initialize() {

      $scope.tasks = [];

      // get tasks from all projects and append sample data
      scaService.getTasks().then(function (response) {
        if (!response || response.length == 0) {
          $scope.tasks = [];
          return;
        }

        $scope.tasks = response;

        // once tasks are loaded get classifications
        // TODO Remove this once tasks are returned with this data
//        angular.forEach($scope.tasks, function (task) {
//          appendClassificationResults(task);
//        })

      }, function (error) {
        // TODO Handle errors
      });

    }

    initialize();
  })
;
