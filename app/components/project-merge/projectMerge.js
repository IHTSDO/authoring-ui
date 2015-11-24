'use strict';

angular.module('singleConceptAuthoringApp.projectMerge', [
  //insert dependencies here
  'ngRoute'
])

  // configure route providerl
  .config(function config($routeProvider) {
    $routeProvider
      .when('/projects/project/:projectKey/conflicts', {
        controller: 'ProjectMergeCtrl',
        templateUrl: 'components/project-merge/projectMerge.html',
        resolve: {}
      });
  })

  .controller('ProjectMergeCtrl', function ProjectMergeCtrl($scope, $window, $rootScope, $location, layoutHandler, accountService, scaService, snowowlService, objectService, notificationService, $routeParams, $timeout, $interval, $q) {

    $scope.sourceBranch = 'MAIN';
    $scope.targetBranch = 'MAIN/' + $routeParams.projectKey;
  });