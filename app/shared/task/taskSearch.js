'use strict';
angular.module('singleConceptAuthoringApp')
  .controller('taskSearchCtrl', function ($scope, ngTableParams, $modalInstance, $location, $filter, scaService, notificationService, terminologyServerService, modalService) {
    $scope.criteria = '';
    $scope.message = '';
    $scope.searching = false;
    $scope.processingTasksDeletion = false;
    $scope.isAdmin = false;
    $scope.tasks = [];

    $scope.selectAll = function (selectAll) {
      angular.forEach($scope.tasks, function (item) {
        if (!item.status || (item.status !== 'Promoted' && item.status !== 'Completed')) {
          item.selected = selectAll;
        }
      });
    };

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

            mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;
            $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
        }
      }
    );

    $scope.search = function () {
      if ($scope.criteria.trim().length === 0 || $scope.searching) {
        return;
      }
      $scope.tasks = [];
      $scope.message = '';
      $scope.searching = true;
      scaService.searchTasks($scope.criteria).then(function (result) {
        if (result.length === 0) {
          $scope.message = 'No results';
        }
        else {
          $scope.tasks = result;
          $scope.searchTasksTableParams.page(1);
          $scope.searchTasksTableParams.reload();
        }
        $scope.searching = false;
      }, function (error) {
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
      if (newTab) {
        window.open('#/tasks/task/' + task.projectKey + '/' + task.key + '/edit', '_blank');
      }
      else {
        $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/edit');
        $scope.close();
      }
    };

    $scope.getReviewersDisplayName = function (reviewers) {
      if (!reviewers) {
        return '';
      }
      return reviewers.map(function (reviewer) {
        return reviewer.displayName;
      }).join(', ');
    };

    $scope.clearMessages = function () {
      $scope.message = '';
    };

    // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };

    $scope.getSelectedRequestsCount = function () {
      return $scope.tasks.filter(function (task) {
        return task.selected && (!task.status || (task.status !== 'Promoted' && task.status !== 'Completed'));
      }).length;
    };

    $scope.deleteSelectedTasks = function () {
      if (!$scope.isAdmin) {
        notificationService.sendError('You do not have permission to delete tasks', 5000);
        return;
      }
      var selectedTasks = $scope.tasks.filter(function (task) {
        return task.selected;
      });
      if (selectedTasks.length === 0) {
        notificationService.sendError('No tasks selected for deletion');
        return;
      }
      let msg = 'Are you sure you want to delete the selected task(s)?';
      modalService.confirm(msg).then(function () {
        var selectedTaskKeys = selectedTasks.map(function (task) {
          return task.key;
        });
        $scope.processingTasksDeletion = true;
        scaService.deleteTasks(selectedTaskKeys).then(function () {
          notificationService.sendMessage('Selected tasks deleted successfully', 5000);
          $scope.tasks = $scope.tasks.filter(function (task) {
            return !task.selected;
          });
          $scope.searchTasksTableParams.reload();
          $scope.processingTasksDeletion = false;
        }, function (error) {
          notificationService.sendError('Error deleting selected tasks', 10000);
          console.error(error);
          $scope.processingTasksDeletion = false;
        });
      });
    }

    function initialize() {
      terminologyServerService.getBranch('MAIN').then(function (branch) {
        if (branch && branch.globalUserRoles && branch.globalUserRoles.length > 0 && branch.globalUserRoles.includes('ADMIN')) {
          $scope.isAdmin = true;
        }
      }, function (error) {
        console.error(error);
      });
    }

    // Initialize the controller
    initialize();
  }
  );
