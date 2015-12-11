'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('promoteModalCtrl', function ($scope, $modalInstance, project, task, flags) {

    $scope.project = project;
    $scope.task = task;
    $scope.flags = flags;

    console.debug('promote modal', project, task, flags);

    $scope.falseFlagsFound = false;
    angular.forEach(flags, function(flag) {
      if (!flag.value) {
        $scope.falseFlagsFound = true;
      }
    });


    /////////////////////////////////////////
    // Modal control buttons
    /////////////////////////////////////////

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };
  });
