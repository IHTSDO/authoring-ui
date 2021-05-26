'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('sacconfigCtrl', function ($scope, $rootScope, $modalInstance, scaService, metadataService, terminologyServerService, task, $location, accountService, modalService) {

    // scope variables
    $scope.projects = null;
    $scope.task = task;
    $scope.criteriaConfig = [];

    function initialize() {
      terminologyServerService.getSAC().then(function (response) {
          $scope.criteriaConfig = response;
      });
      
    }


    // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };
    initialize();

    
  });
