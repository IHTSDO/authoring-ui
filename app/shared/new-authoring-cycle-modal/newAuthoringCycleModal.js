'use strict';
/* global releaseScheduleUtil */

angular.module('singleConceptAuthoringApp')
  .controller('newAuthoringCycleModalCtrl', function ($scope, $modalInstance, codeSystemName, releaseScheduleCron, latestEffectiveDate, $filter) {

    $scope.codeSystemName = codeSystemName;
    $scope.selectedDate = new Date();
    $scope.datePickerOpened = false;

    if (releaseScheduleCron) {
      try {
        var nextDate = releaseScheduleUtil.nextEffectiveDate(releaseScheduleCron, latestEffectiveDate);
        if (nextDate) {
          $scope.selectedDate = nextDate;
        }
      } catch (e) {
        $scope.selectedDate = new Date();
      }
    }

    $scope.openDatePickerPopup = function ($event) {
      $event.preventDefault();
      $event.stopPropagation();
      $scope.datePickerOpened = true;
    };

    $scope.confirm = function () {
      $modalInstance.close({
        newEffectiveTime: $scope.selectedDate ? $filter('date')($scope.selectedDate, 'yyyy-MM-dd') : null
      });
    };

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };
  });
