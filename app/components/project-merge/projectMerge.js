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

  .controller('ProjectMergeCtrl', function ProjectMergeCtrl($scope, $window, $rootScope, $location, layoutHandler, metadataService, accountService, scaService, snowowlService, componentAuthoringUtil, notificationService, $routeParams, $timeout, $interval, $q) {

    scaService.getProjectForKey($routeParams.projectKey).then(function(project) {
      metadataService.setBranch(project.branchPath);
      $scope.sourceBranch = metadataService.getBranchRoot();
      $scope.targetBranch = project.branchPath;
    });
  });
