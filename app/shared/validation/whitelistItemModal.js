'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')
  .controller('whitelistItemModalCtrl', function ($scope, $modalInstance, $filter, failures) {

    $scope.exceptionType = 'permanent';
    $scope.reason = '';
    $scope.failures = failures;
    $scope.expirationDate = new Date();

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
      let reason = $scope.reason.length !== 0 ? $scope.reason.trim() : null;
      let expirationDate = null;
      if (isTemporaryException) {
        expirationDate =  $filter('date')($scope.expirationDate, "yyyy-MM-dd");
      }

      angular.forEach(failures, function(item) {
        item.temporary = isTemporaryException;
        item.reason = reason;
        item.expirationDate = expirationDate;
      });

      $modalInstance.close($scope.failures);
    }
  })
;
