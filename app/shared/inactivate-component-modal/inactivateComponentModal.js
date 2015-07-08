'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('inactivateComponentModalCtrl', function ($scope, $modalInstance, componentType, reasons) {

    console.debug('inactivateComponentModalCtrl entered', componentType, reasons);

    $scope.componentType = componentType;
    $scope.reasons = reasons;

    $scope.selectReason = function(reason) {

      if (!reason) {
        alert("You must specify a reason");
      } else {
        $modalInstance.close(reason);
      }
    };

    $scope.cancel = function() {
      $modalInstance.dismiss();
    };

  });
