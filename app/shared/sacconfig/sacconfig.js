'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('sacconfigCtrl', function ($scope, $rootScope, $modalInstance, scaService, metadataService, aagService, branch, criteria, $location, accountService, modalService) {

    // scope variables
    $scope.projects = null;
    $scope.branch = branch;
    $scope.criteria = criteria;
    $scope.criteriaConfig = [];

    function initialize() {
      aagService.getSAC().then(function (response) {
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
    
    $scope.toggleSac = function (id) {
        angular.forEach($scope.criteriaConfig, function (item) {
              if(item.id === id){
                  if(!item.selected){
                      item.selected = true;
                  }
                  else{
                      item.selected = false;
                  }
              }
          });
    };
    
    $scope.saveSac = function() {
        let sac = {
          "branchPath": $scope.branch,
          "projectIteration": 0,
          "selectedProjectCriteriaIds": [],
          "selectedTaskCriteriaIds": []
        }
        angular.forEach($scope.criteriaConfig, function (selectedItem) {
              if(selectedItem.selected){
                  if(selectedItem.authoringLevel === 'PROJECT'){
                      sac.selectedProjectCriteriaIds.push(selectedItem.id);
                  }
                  else{
                      sac.selectedTaskCriteriaIds.push(selectedItem.id);
                  }
              }
          });
        if($scope.criteria.length === 0){
            aagService.createBranchSAC($scope.branch, sac).then(function (response) {
                $modalInstance.close();
            });
        }
        else{
            aagService.updateBranchSAC($scope.branch, sac).then(function (response) {
                $modalInstance.close();
            });
        }
    };


    // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };
    initialize();

    
  });
