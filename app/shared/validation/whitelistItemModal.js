'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')
  .controller('whitelistItemModalCtrl', function ($scope, $modalInstance, failure) {

    $scope.exceptionType = 'permanent';
    $scope.reason = '';
    $scope.failure = failure;
    
    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

    $scope.confirm = function(){
      $scope.failure.temporary = $scope.exceptionType === 'temporary';
      if ($scope.reason.length !== 0) {
        $scope.failure.reason = $scope.reason.trim();
      }

      $modalInstance.close($scope.failure);
    }
  })
;
