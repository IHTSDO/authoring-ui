'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')
  .controller('ticketGenerationSummaryModalCtrl', function ($scope, $modalInstance, data) {
    $scope.newFailureJiraAssociations = data.newFailureJiraAssociations ? data.newFailureJiraAssociations : [];
    $scope.duplicatedFailureJiraAssociations = data.duplicatedFailureJiraAssociations ? data.duplicatedFailureJiraAssociations : [];
    $scope.errors = data.errors ? data.errors : [];

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };
  })
;
