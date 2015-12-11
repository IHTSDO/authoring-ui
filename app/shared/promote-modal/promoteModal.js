'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('promoteModalCtrl', function ($scope, $modalInstance, project, task, flags) {

    $scope.project = project;
    $scope.task = task;
    $scope.flags = flags;

    console.debug('promote modal', project, task, flags);


    /////////////////////////////////////////
    // Modal control buttons
    /////////////////////////////////////////

    $scope.promote = function() {
      $modalInstance.close(true);
    };

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };
  });
