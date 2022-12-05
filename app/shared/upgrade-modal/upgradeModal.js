'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('upgradeModalCtrl', function ($scope, $modalInstance, $location, terminologyServerService, codeSystem, modalService) {

    $scope.codeSystem = codeSystem;

    $scope.versions = [];

    $scope.selectedVersion = null;


    /////////////////////////////////////////
    // Modal control buttons
    /////////////////////////////////////////

    $scope.upgrade = function() {
      modalService.confirm('Do you really want to upgrade the ' + $scope.codeSystem.name + ' to the new ' + $scope.selectedVersion.version + ' International Edition?').then(function () {
        $location.url('codesystem/' + $scope.codeSystem.shortName + '/upgrade/' + $scope.selectedVersion.version);
        $modalInstance.close();
      }, function () {
        // do nothing
      });
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
