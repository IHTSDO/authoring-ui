'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('taskCtrl', function ($scope, $rootScope, $timeout, $modalInstance, scaService, metadataService, task, canDelete, $location, accountService, modalService) {

    // scope variables
    $scope.projects = null;
    $scope.task = task;
    $scope.canDelete = canDelete;
    $scope.preferences = {};
    $scope.newAssignee = task && task.assignee ? task.assignee : null;
    $scope.mrcmValidation = {enable: false};
    $scope.numberOfTaskOptions = [1, 2, 3, 4, 5];

    // if no task passed in, create empty object
    if (!$scope.task) {
      $scope.task = {};
      $scope.task.numberOfTasks = 1;
    }

    ///////////////////////////////////////////

    // TODO Temporary function to retrieve projects for picklist, should be
    // cached values
    function initialize() {
      $scope.disabled = false;
      $scope.projects = metadataService.getProjects();

      accountService.getUserPreferences().then(function (preferences) {
        $scope.preferences = preferences;

        if(preferences.hasOwnProperty("lastProjectKey") && !$scope.task.key) {
          $scope.task.projectKey = $scope.preferences.lastProjectKey;
        }
      });

      if ($scope.task.key) {
        scaService.getUiStateForTask($scope.task.projectKey, $scope.task.key, 'task-mrcm-validation').then(function (response) {
          if (response !== null) {
            $scope.mrcmValidation.enable = response.enableMRCMValidation;
          }
        });
      }
    }

    // TODO Consider relaxing jshint to allow functions to be called pre
    // declaration

	   // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };

    initialize();

    // Creates a task from modal form
    $scope.createTask = function (openTask) {

      // check that all required fields are present
      if (!$scope.task.summary) {
        window.alert('You must specify a title');
        return;
      }
      if (!$scope.task.projectKey) {
        window.alert('You must specify a project');
        return;
      }
      $scope.msgError = null;
      $scope.msgSuccess = 'Creating task' + ($scope.task.numberOfTasks === 1 ? '' : 's') + '...';
      $scope.disabled = true;
      let count = 0;
      let firstCreatedTask = null;

      const createTask = function(task, summary, suffix) {
        task.summary = summary + suffix;
        scaService.createTaskForProject($scope.task.projectKey, task).then(
          function (response) {
            count++;
            if (openTask) {
              if (!firstCreatedTask) {
                firstCreatedTask = response;
              }
              if (count === $scope.task.numberOfTasks) {
                $modalInstance.dismiss();
                $location.url('tasks/task/' + firstCreatedTask.projectKey + '/' + firstCreatedTask.key + '/edit');
              }
            } else {
              if (count === $scope.task.numberOfTasks) {
                if ($scope.task.numberOfTasks === 1) {
                  // close modal
                  $modalInstance.close(response);
                } else {
                  $modalInstance.close();
                  $rootScope.$broadcast('reloadTasks');
                }
              }
            }
            if (count === 1) {
              $scope.preferences.lastProjectKey = $scope.task.projectKey;
              accountService.saveUserPreferences($scope.preferences);
            }
            if (count < $scope.task.numberOfTasks) {
              createTask(task, summary, ' #' + (count + 1));
            }
          }, function (error) {
            $scope.disabled = false;
            $scope.msgSuccess = '';
            $scope.msgError = 'Error occurred when trying to create task: ' + error;
          });
      };
      let task = {};
      task.projectKey = $scope.task.projectKey;
      task.description = $scope.task.description;
      createTask(task, $scope.task.summary, $scope.task.numberOfTasks === 1 ? '' : ' #1');
    };

    $scope.createAndOpenTask = function () {
      $scope.createTask(true);
    };

    $scope.updateAssignee = function(assignee) {
      $scope.newAssignee = assignee;
    }

    $scope.updateTask = function () {

      // check that all required fields are present
      if (!$scope.task.summary) {
        window.alert('You must specify a title');
        return;
      }

      if (!$scope.newAssignee || !$scope.newAssignee.username) {
        window.alert('You must specify an Author');
        return;
      }

      if ($scope.newAssignee.username !== $scope.task.assignee.username) {
        let msg;
        if ($scope.newAssignee.username === $rootScope.accountDetails.login) {
          msg = 'Do you really want to take over this task from ' + $scope.task.assignee.displayName + '?';
        } else {
          msg = 'Are you sure you want to assign this task to ' + $scope.newAssignee.displayName + '?';
        }
        modalService.confirm(msg).then(function () {
          updatingTask();
        });
      } else {
        updatingTask();
      }
    };

    $scope.deleteTask = function() {
      let msg = 'Are you sure you want to delete this task?';
      modalService.confirm(msg).then(function () {
        $scope.msgSuccess = 'Deleting task...';
        $scope.disabled = true;

        var taskUpdate = {};
        taskUpdate.status = 'DELETED';

        scaService.updateTask($scope.task.projectKey, $scope.task.key, taskUpdate).then(function () {
          $modalInstance.close('DELETED');
        }, function (error) {
          $scope.disabled = false;
          $scope.msgSuccess = '';
          $scope.msgError = 'Error occurred when trying to delete task: ' + error;
        });
      });
    };

    $scope.clearMessages = function () {
      $scope.msgError = '';
      $scope.msgSuccess = '';
    };

    $scope.searchUsers = function(username) {
      return scaService.searchUsers(username, $scope.task.projectKey, $scope.task.key, 50, 0).then(function (response) {
        var results = [];
        angular.forEach(response, function (item) {
          if (item.active && !isTaskAuthorOrReviewer(item.name)) {
            var user = {};
            user.avatarUrl = item.avatarUrls['16x16'];
            user.displayName = item.displayName;
            user.email = item.emailAddress;
            user.username = item.name;
            results.push(user);
          }
        });

        return results;
      });
    };

    function updatingTask() {
      var taskUpdate = {};
      taskUpdate.summary = $scope.task.summary;
      taskUpdate.description = $scope.task.description;
      taskUpdate.assignee = $scope.newAssignee;

      $scope.msgError = null;
      $scope.msgSuccess = 'Updating task...';
      $scope.disabled = true;
      scaService.saveUiStateForTask($scope.task.projectKey, $scope.task.key, 'task-mrcm-validation', {enableMRCMValidation: $scope.mrcmValidation.enable});
      scaService.updateTask($scope.task.projectKey, $scope.task.key, taskUpdate).then(function (response) {
        $modalInstance.close(response);
      }, function (error) {
        $scope.disabled = false;
        $scope.msgSuccess = '';
        $scope.msgError = 'Error occurred when trying to update task: ' + error;
      });
    }

    function isTaskAuthorOrReviewer(username) {
      var exceptList = [];
      if ($scope.task.assignee) {
        exceptList.push($scope.task.assignee.username);
      }
      if ($scope.task.reviewers) {
        $scope.task.reviewers.forEach(function (reviewer) {
          exceptList.push(reviewer.username);
        });
      }
      return exceptList.includes(username);
    };
  });
