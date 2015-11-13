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

    var projectKey, taskKey;
    scaService.getTaskForProject('WRPTEST', 'WRPTEST-2').then(function(response) {
      projectKey = response.projectKey;
      taskKey = response.key;
      $scope.branch = 'MAIN/' + projectKey + '/' + taskKey;
    });

    $scope.testPackages = [
      QaTestPackage
    ];


    $scope.runTest = function(testPackage) {
      testPackage.runTests(projectKey, taskKey);

      var resultsPolling = $interval(function() {

        var results = testPackage.getResults();
        //console.debug('polling for results', results);
        testPackage.results = results;
        //console.debug('polling result', $scope.results);
      }, 2000);
    };
});