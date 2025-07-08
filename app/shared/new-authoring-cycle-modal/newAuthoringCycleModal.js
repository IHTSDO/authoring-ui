'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('newAuthoringCycleModalCtrl', function ($scope, $modalInstance, codeSystemName) {

    $scope.codeSystemName = codeSystemName;

    $scope.selectedDate = new Date();

    $scope.datePickerOpened = false;

    $scope.openDatePickerPopup = function ($event) {
      $event.preventDefault();
      $event.stopPropagation();
      $scope.datePickerOpened = true;
    };

    /////////////////////////////////////////
    // Modal control buttons
    /////////////////////////////////////////

    $scope.confirm = function () {
      $modalInstance.close({ newEffectiveTime: $scope.selectedDate ? $scope.selectedDate.toISOString().substring(0, 10) : null });
    };

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };
  });
