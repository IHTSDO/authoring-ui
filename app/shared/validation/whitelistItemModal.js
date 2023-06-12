'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')
  .controller('whitelistItemModalCtrl', function ($scope, $modalInstance, $filter, failures, mode) {

    $scope.mode = mode;
    $scope.failures = failures;
    if ($scope.mode === 'add') {
      $scope.exceptionType = 'permanent';
      $scope.reason = '';
      $scope.expirationDate = new Date();
    } else {
      $scope.exceptionType = $scope.failures[0].temporary ? 'temporary' : 'permanent';
      $scope.reason = $scope.failures[0].reason;
      if ($scope.failures[0].temporary) {
        $scope.expirationDate = $scope.failures[0].expirationDate;
      }     
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

    $scope.selectExceptionType = function(type) {
      if (type === 'temporary' && !$scope.expirationDate) {
        $scope.expirationDate = new Date();
      } else if (type === 'permanent') {
        $scope.expirationDate = null;
      }
    };

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

    $scope.confirm = function(){
      let isTemporaryException = $scope.exceptionType === 'temporary';
      let reason = $scope.reason && $scope.reason.length !== 0 ? $scope.reason.trim() : null;
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
