'use strict';
angular.module('singleConceptAuthoringApp')
  .controller('branchMetadataConfigCtrl', function($scope, $modalInstance, terminologyServerService, notificationService, branch, title, isCodeSystem) {

      $scope.branch = branch;
      $scope.title = title;
      $scope.failureExportMax = null;
      $scope.annotationsEnabled = false;
      $scope.authoringFreeze = false;
      $scope.isCodeSystem = isCodeSystem;

      $scope.validate = function() {
        $scope.msgError = '';
        if ($scope.failureExportMax && parseInt($scope.failureExportMax) > 1000) {
          $scope.msgError = 'Maximum RVF failure export is 1000';
        }
      }

      //////////////////////////////////////////
      // Modal Controls
      //////////////////////////////////////////

      // close modal and apply settings
      $scope.save = function () {
        if (!$scope.failureExportMax) {
          $scope.failureExportMax = 100;
        }
        var metadata = {'failureExportMax': $scope.failureExportMax + ''};
        if ($scope.isCodeSystem) {
          metadata.annotationsEnabled = $scope.annotationsEnabled + '';
          metadata.authoringFreeze = $scope.authoringFreeze + '';
        }
        terminologyServerService.updateBranchMetadata($scope.branch, metadata).then(function (response) {
          $modalInstance.close();
          notificationService.sendMessage('Successfully updated ' + $scope.title + ' configurations');
        }, function (error) {
          $scope.msgError = error;
        });
      };

      $scope.close = function () {
        $modalInstance.dismiss();
      };

      function initialize() {
        terminologyServerService.getBranchMetadata($scope.branch, true).then(function(response) {
          if (response.failureExportMax) {
            $scope.failureExportMax = response.failureExportMax;
          }
        });
        if ($scope.isCodeSystem) {
          terminologyServerService.getBranchMetadata($scope.branch, false).then(function(response) {
            if (typeof response.annotationsEnabled !== 'undefined') {
              $scope.annotationsEnabled = response.annotationsEnabled === true || response.annotationsEnabled === 'true';
            }
            if (typeof response.authoringFreeze !== 'undefined') {
              $scope.authoringFreeze = response.authoringFreeze === true || response.authoringFreeze === 'true';
            }
          });
        }
      }

      initialize();
    }
  );
