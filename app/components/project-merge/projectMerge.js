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
        resolve: ['terminologyServerService', 'metadataService', '$q', function(terminologyServerService, metadataService, $q) {
            var defer = $q.defer();
            $q.all([terminologyServerService.getEndpoint(), metadataService.isProjectsLoaded()]).then(function() {
                defer.resolve();
            });       
            return defer.promise;
          }
        ]
      });
  })

  .controller('ProjectMergeCtrl', function ProjectMergeCtrl($scope, $window, $rootScope, $location, layoutHandler, metadataService, accountService, scaService, terminologyServerService, componentAuthoringUtil, notificationService, $routeParams, $timeout, $interval, $q) {

    scaService.getProjectForKey($routeParams.projectKey).then(function(project) {
      metadataService.setBranchMetadata(project);
      $scope.sourceBranch = metadataService.getBranchRoot();
      $scope.targetBranch = metadataService.getBranch();
    });
  });
