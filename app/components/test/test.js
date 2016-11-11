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
      $scope.templateRaw = null;

      function getTemplates() {
        templateService.getTemplates().then(function (response) {
          $scope.templates = response;
        });
      }

      getTemplates();

      console.log('Entered TestCtrl');

      function prettyPrint() {
        if ($scope.templateRaw) {
          var ugly = $scope.templateRaw;
          var obj = JSON.parse(ugly);
          var pretty = JSON.stringify(obj, undefined, 4);
          if (pretty && pretty !== 'null') {
            document.getElementById('prettyJson').value = pretty;
          }
        }
      }

      $scope.$watch('templateRaw', function () {
        prettyPrint();
      });


      $scope.performAction = function () {
        switch ($scope.templateMode) {
          case 'Get':
            templateService.getTemplateForName($scope.name).then(function (response) {
              $scope.templateRaw = JSON.stringify(response);
              getTemplates();
            }, function (error) {
              notificationService.sendError('Error: ' + error);
            });
            break;
          case 'Create':
            templateService.createTemplate(JSON.parse($scope.templateRaw)).then(function (response) {
              $scope.templateRaw = JSON.stringify(response);
              getTemplates();
            }, function (error) {
              notificationService.sendError('Error: ' + error);
            });
            break;
          case 'Update':
            templateService.updateTemplate(JSON.parse($scope.templateRaw)).then(function (response) {
              $scope.templateRaw = JSON.stringify(response);
              getTemplates();
            }, function (error) {
              notificationService.sendError('Error: ' + error);
            });
            break;
        }
      };


    }
  )
;
