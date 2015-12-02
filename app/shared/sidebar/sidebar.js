'use strict';
angular.module('singleConceptAuthoringApp.sidebar', [])

  .controller('sidebarCtrl', ['$scope', '$rootScope', '$location', '$modal',
    function sidebarCtrl($scope, $rootScope, $location, $modal) {

      console.debug('entered sidebar ctrl');

      $scope.gotoBrowser = function() {
        window.open('..', '_blank');
      };

      $scope.gotoMyProjects = function() {
        $location.url('my-projects');
      };

      $scope.gotoAllProjects = function() {
        $location.url('projects');
      };

      $scope.gotoHome = function() {
        $location.url('home');
      };

      $scope.openCreateTaskModal = function () {
        var modalInstance = $modal.open({
          templateUrl: 'shared/task/task.html',
          controller: 'taskCtrl',
          resolve: {
            task: function() {
              return null;
            },
            canDelete: function() {
              return false;
            }
          }
        });

        modalInstance.result.then(function (response) {
          $rootScope.$broadcast('reloadTasks');
        }, function () {
        });
      };
    }
  ]);