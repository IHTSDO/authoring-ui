'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('releaseNotesConfigCtrl', function ($scope, $modalInstance, aagService, branch) {

    // scope variables
    $scope.branch = branch;

    function initialize() {
      
    }

    // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };
    initialize();

    
  });
