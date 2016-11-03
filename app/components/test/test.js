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

  .controller('TestCtrl', function TestCtrl($scope, $rootScope, templateService, notificationService) {

      $rootScope.pageTitle = 'Test Management';
      $scope.name = 'Guided CT of X';
      $scope.templateMode = 'Get';
      $scope.templateJson = null;

      console.log('Entered TestCtrl');

    function prettyPrint() {
      var ugly = $scope.templateJson;
      var obj = JSON.parse(ugly);
      var pretty = JSON.stringify(obj, undefined, 4);
      document.getElementById('prettyJson').value = pretty;
    }

      $scope.performAction = function () {
        console.debug('perform action', $scope.name, $scope.templateMode, $scope.templateJson);
        switch ($scope.templateMode) {
          case 'Get':
            templateService.getTemplateForName($scope.name).then(function (response) {
              $scope.templateJson = JSON.stringify(response);
              prettyPrint();
            }, function (error) {
              notificationService.sendError('Error: ' + error);
            });
            break;
          case 'Create':
            templateService.createTemplate($scope.templateJson, $scope.name).then(function (response) {
              $scope.templateJson = JSON.stringify(response);
              prettyPrint();
            }, function (error) {
              notificationService.sendError('Error: ' + error);
            });
            break;
          case 'Update':
            templateService.updateTemplate($scope.templateJson, $scope.name).then(function (response) {
              $scope.templateJson = JSON.stringify(response);
              prettyPrint();
            }, function (error) {
              notificationService.sendError('Error: ' + error);
            });
            break;
        }
      }


    }
  )
;
