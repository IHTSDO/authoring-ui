'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('sacconfigCtrl', function ($scope, $rootScope, $modalInstance, scaService, metadataService, terminologyServerService, task, criteria, $location, accountService, modalService) {

    // scope variables
    $scope.projects = null;
    $scope.task = task;
    $scope.criteria = criteria;
    $scope.criteriaConfig = [];

    function initialize() {
      terminologyServerService.getSAC().then(function (response) {
          angular.forEach(response.content, function (configItem) {
              angular.forEach($scope.criteria, function (selectedItem) {
                  if(configItem.id === selectedItem.id){
                      configItem.selected = true;
                  }
              });
          });
          $scope.criteriaConfig = response.content;
      });
      
    }


    // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };
    initialize();

    
  });
