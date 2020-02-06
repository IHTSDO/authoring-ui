'use strict';
angular.module('singleConceptAuthoringApp')
  .controller('taskSearchCtrl', function ($scope, ngTableParams, $modalInstance, $location, scaService, notificationService) {
    $scope.criteria = '';
    $scope.message = '';
    $scope.searching = false;
    $scope.tasks = [];

    $scope.searchTasksTableParams = new ngTableParams({
        page: 1,
        count: 10
      },
      {
        total: $scope.tasks ? $scope.tasks.length : 0,
        getData: function ($defer, params) {
          if (!$scope.tasks || $scope.tasks.length === 0) {
              $defer.resolve([]);
          } else {
              var mydata = $scope.tasks;
              params.total(mydata.length);
              $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
        }
      }
    );

    $scope.search = function() {
      if ($scope.criteria.trim().length === 0 || $scope.searching) {
        return;
      }
      $scope.tasks = [];
      $scope.message = '';
      $scope.searching = true;
      scaService.searchTasks($scope.criteria).then(function(result) {
        if (result.length === 0) {
          $scope.message = 'No results';
        }
        else {
          $scope.tasks = result;
          $scope.searchTasksTableParams.page(1);
          $scope.searchTasksTableParams.reload();
        }
        $scope.searching = false;
      }, function(error) {
        $scope.searching = false;
        notificationService.sendError('Unexpected error searching for tasks', 10000);
        console.error(error);
      });
    };

    $scope.goToTask = function (task, newTab) {      
      if (!task || !task.branchPath) {
          notificationService.sendError('Unexpected error, cannot access task', 10000);
          return;
      }
      if(newTab) {
        window.open('#/tasks/task/' + task.projectKey + '/' + task.key + '/edit', '_blank');
      }
      else {
        $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/edit');
        $scope.close();
      }
    };

    $scope.clearMessages = function () {
      $scope.message = '';
    };

	  // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };

  }
);
