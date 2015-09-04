'use strict';

angular.module('singleConceptAuthoringApp.edit', [
  //insert dependencies here
  'ngRoute'
])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/projects/project/:projectKey/conflicts', {
        controller: 'ProjectConflictsCtrl',
        templateUrl: 'components/project-detail/projectDetail.html',
        resolve: {}
      });
  })

  .controller('EditCtrl', function EditCtrl($scope, $rootScope, $location, scaService, snowowlService, objectService, notificationService, $routeParams, $timeout, $interval, $q) {

  });