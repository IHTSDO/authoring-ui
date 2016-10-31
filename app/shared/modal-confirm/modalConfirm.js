'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')
  .controller('modalConfirmCtrl', function ($scope, $modalInstance, message) {

    $scope.message = message;

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

    $scope.confirm = function () {
      $modalInstance.close();
    };

  });
