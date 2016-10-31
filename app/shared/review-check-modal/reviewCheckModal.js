'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')
  .controller('reviewCheckModalCtrl', function ($rootScope, $scope, $modalInstance, reviewChecks) {

    $scope.cancelSubmitForReview = function() {
      $modalInstance.dismiss();
    };

    $scope.submitAnyway = function() {
      $modalInstance.close();
    };
  });
