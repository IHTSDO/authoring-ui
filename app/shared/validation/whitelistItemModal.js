'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')
  .controller('whitelistItemModalCtrl', function ($scope, $modalInstance, $filter, failures, mode) {

    $scope.mode = mode;
    $scope.failures = failures;
    if ($scope.mode === 'add') {
      $scope.exceptionType = 'permanent';
      $scope.reason = '';

    } else {
      $scope.exceptionType = $scope.failures[0].temporary ? 'temporary' : 'permanent';
      $scope.reason = $scope.failures[0].reason;
    }

    $scope.dateOptions = {
      formatYear: 'yy',
      startingDay: 1
    };

    $scope.openDatePicker = function($event) {
      $event.preventDefault();
      $event.stopPropagation();
      $scope.datePickerOpened = true;
    };


    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

    $scope.confirm = function(){
      let isTemporaryException = $scope.exceptionType === 'temporary';
      let reason = $scope.reason && $scope.reason.length !== 0 ? $scope.reason.trim() : null;

      angular.forEach(failures, function(item) {
        item.temporary = isTemporaryException;
        item.reason = reason;
      });

      $modalInstance.close($scope.failures);
    }
  })
;
