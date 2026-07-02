'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('newAuthoringCycleModalCtrl', function ($scope, $modalInstance, codeSystemName, $filter) {

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
      $modalInstance.close({
        newEffectiveTime: $scope.selectedDate ? $filter('date')($scope.selectedDate, 'yyyy-MM-dd') : null
      });
    };

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };
  });
