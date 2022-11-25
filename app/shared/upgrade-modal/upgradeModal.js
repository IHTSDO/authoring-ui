'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('upgradeModalCtrl', function ($scope, $modalInstance, terminologyServerService, codeSystem) {

    $scope.codeSystem = codeSystem;

    $scope.versions = [];

    $scope.selectedVersion = null;


    /////////////////////////////////////////
    // Modal control buttons
    /////////////////////////////////////////

    $scope.upgrade = function() {
      $modalInstance.close();
    };

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

    /////////////////////////////////////////
    // Intialization
    /////////////////////////////////////////

    function initialize() {
      var dependantVersionEffectiveTime = parseInt($scope.codeSystem.dependantVersionEffectiveTime.split('-').join(''));
      terminologyServerService.getAllCodeSystemVersionsByShortName('SNOMEDCT').then(function (response) {
        if (response.data.items && response.data.items.length > 0) {
          $scope.versions = response.data.items.filter(function (item) {
            return item.effectiveDate > dependantVersionEffectiveTime;
          });
        }
      });
    }

    initialize();
  });
