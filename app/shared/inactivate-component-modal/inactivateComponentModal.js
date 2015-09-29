'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('inactivateComponentModalCtrl', function ($scope, $modalInstance, componentType, reasons, associationTargets) {

    $scope.componentType = componentType;
    $scope.reasons = reasons;
    $scope.associationTargets = associationTargets;

    $scope.selectReason = function(reason, associationTarget) {

      if (!reason) {
        window.alert('You must specify a reason for inactivation');
      } else {
        $modalInstance.close(reason, associationTarget);
      }
    };

    $scope.cancel = function() {
      $modalInstance.dismiss();
    };

  });
