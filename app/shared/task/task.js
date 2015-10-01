'use strict';

angular.module('singleConceptAuthoringApp')
  .directive('ngAutoExpand', function() {
        return {
            restrict: 'A',
            link: function( $scope, elem, attrs) {
                elem.bind('keyup', function($event) {
                    var element = $event.target;

                    $(element).height(0);
                    var height = $(element)[0].scrollHeight;

                    // 8 is for the padding
                    if (height < 40) {
                        height = 48;
                    }
                    $(element).attr('style', 'height: ' + height +'px !important');
                });

                // Expand the textarea as soon as it is added to the DOM
                setTimeout( function() {
                    var element = elem;

                    $(element).height(0);
                    var height = $(element)[0].scrollHeight;

                    // 8 is for the padding
                    if (height < 40) {
                        height = 48;
                    }
                    $(element).attr('style', 'height: ' + height +'px !important');
                }, 0);
            }
        };
    })
  .controller('taskCtrl', function ($scope, $rootScope, $modalInstance, scaService, task) {

    console.debug('task.js with task', task)
    // scope variables
    $scope.projects = null;
    $scope.task = task;

    // if no task passed in, create empty object
    if (!$scope.task) {
      $scope.task = {};
    }

    ///////////////////////////////////////////

    // TODO Temporary function to retrieve projects for picklist, should be
    // cached values
    function initialize() {
      $scope.disabled = false;
      scaService.getProjects().then(function (response) {
        $scope.projects = response;

        // set default project to first project (if it exists)
        if ($scope.projects && $scope.projects.length > 0) {
          $scope.taskProject = $scope.projects[0];
        }
      }, function (error) {
        // TODO Handle error
      });
    }

    // TODO Consider relaxing jshint to allow functions to be called pre
    // declaration
    initialize();

    // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };

    // Creates a task from modal form
    $scope.createTask = function () {

      // check that all required fields are present
      if (!$scope.task.summary) {
        window.alert('You must specify a title');
        return;
      }
      if (!$scope.task.projectKey) {
        window.alert('You must specify a project');
        return;
      }

      $scope.msgSuccess = 'Creating task...';
      $scope.disabled = true;
      scaService.createTaskForProject($scope.task.projectKey, $scope.task).then(
        function (response) {

          // close modal
          $modalInstance.close(response);
        }, function (error) {
          $scope.disabled = false;
          $scope.msgSuccess = '';
          $scope.msgError = 'Error occurred when trying to create task: ' + error;
        });

    };

    $scope.updateTask = function () {

      console.debug('updateTask', $scope.task);

      // check that all required fields are present
      if (!$scope.task.summary) {
        window.alert('You must specify a title');
        return;
      }
      if (!$scope.task.assignee) {
        window.alert('You must specify an assigned user');
      }

      $scope.msgSuccess = 'Updating task...';
      $scope.disabled = true;
      scaService.updateTask($scope.task.projectKey, $scope.task.key, $scope.task).then(function (response) {
        $modalInstance.close(response);
      }, function (error) {
        $scope.disabled = false;
        $scope.msgSuccess = '';
        $scope.msgError = 'Error occurred when trying to update task: ' + error;
      });
    };

    $scope.clearMessages = function () {
      $scope.msgError = '';
      $scope.msgSuccess = '';
    };
  });
