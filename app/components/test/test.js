'use strict';

angular.module('singleConceptAuthoringApp.test', [
  //insert dependencies here
  'ngRoute'
])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/test', {
        controller: 'TestCtrl',
        templateUrl: 'components/test/test.html'
      });
  })

  .controller('TestCtrl', function TestCtrl($scope, $rootScope, $interval, notificationService, languageService) {

    $rootScope.pageTitle = 'Test Management';

    $scope.getTestSpellingWords = languageService.getTestSpellings;
    $scope.errClass = 'redwiggle';
    $scope.testText = 'Fourty mispelled blackbirds baked in a whiskie pie.'

    console.log('Entered TestCtrl');

    // notification testing variables
    $scope.notificationType = 'Message';
    $scope.notificationText = 'Validation completed for task WRPSII-86';
    $scope.notificationUrl = '#/tasks/task/WRPSII/WRPSII-86/validate';
    $scope.notificationDuration = 0;

    $scope.sendNotification = function() {
      switch ($scope.notificationType) {
        case 'Message':
          notificationService.sendMessage($scope.notificationText, $scope.notificationDuration, $scope.notificationUrl);
          break;
        case 'Warning':
          notificationService.sendWarning($scope.notificationText, $scope.notificationDuration, $scope.notificationUrl);
          break;
        case 'Error':
          notificationService.sendError($scope.notificationText, $scope.notificationDuration, $scope.notificationUrl);
          break;
      }
    }


  });
