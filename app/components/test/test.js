'use strict';

angular.module( 'singleConceptAuthoringApp.test', [
  //insert dependencies here
    'ngRoute'
])

.config(function config( $routeProvider ) {
  $routeProvider
    .when('/test', {
        controller: 'TestCtrl',
        templateUrl: 'components/test/test.html'
      });
})

.controller( 'TestCtrl', function TestCtrl( $scope, $rootScope, $interval, QaTestPackage, scaService) {

    $rootScope.pageTitle = 'Test Management';

    $scope.results = {};

    $scope.projectKey = null;
    $scope.taskKey = null;

    scaService.getTaskForProject('WRPTEST', 'WRPTEST-2').then(function(response) {
      $scope.projectKey = response.projectKey;
      $scope.taskKey = response.key;
      $scope.branch = 'MAIN/' + $scope.projectKey + '/' + $scope.taskKey;
    });

    $scope.testPackages = [
      QaTestPackage
    ];

    // initialize the available tests
    angular.forEach($scope.testPackages, function (testPackage) {
      var results = testPackage.getResults();
      testPackage.results = results;
      console.debug('testpackage w/results', testPackage);
    });


    $scope.runTest = function(testPackage) {
      testPackage.runTests($scope.projectKey, $scope.taskKey);

      var resultsPolling = $interval(function() {

        var results = testPackage.getResults();
        //console.debug('polling for results', results);
        testPackage.results = results;
        //console.debug('polling result', $scope.results);
      }, 2000);
    };

    $scope.runSingleTest = function (testPackage, testGroupName, test) {
      console.debug('running single test', test);
      testPackage.runSingleTest(testGroupName, test.name, $scope.projectKey, $scope.taskKey).then(function(response) {
        console.debug('single test complete & response', test, response);
        test = response;
      });
    };

});