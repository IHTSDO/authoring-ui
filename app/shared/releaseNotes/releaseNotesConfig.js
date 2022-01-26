'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('releaseNotesConfigCtrl', function ($scope, $modalInstance, aagService, branch, lineItems) {

    // scope variables
    $scope.branch = branch;
    $scope.lineItems = lineItems;

    function initialize() {
      
    }

    // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };
    initialize();

    
  });
