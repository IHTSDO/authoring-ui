'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('inactivateComponentModalCtrl', function ($scope, $modalInstance, componentType, reasons, historicalReasons) {

    $scope.componentType = componentType;
    $scope.reasons = reasons;
    $scope.historicalReasons = historicalReasons;

    $scope.selectReason = function(reason, historicalReason) {

      if (!reason) {
        //alert('You must specify a reason');
      } else {
        $modalInstance.close(reason, historicalReason);
      }
    };

    $scope.cancel = function() {
      $modalInstance.dismiss();
    };

  });
