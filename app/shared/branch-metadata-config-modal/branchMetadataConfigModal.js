'use strict';
angular.module('singleConceptAuthoringApp')
  .controller('branchMetadataConfigCtrl', function($scope, $modalInstance, terminologyServerService, notificationService, branch, title) {

      $scope.branch = branch;
      $scope.title = title;
      $scope.failureExportMax = null;
      
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
        var metadata = {'failureExportMax': $scope.failureExportMax + ''}
        terminologyServerService.updateBranchMetadata($scope.branch, metadata).then(function (response) {
          $modalInstance.close();
          notificationService.sendMessage('Successfully updated ' + $scope.title + ' configurations');
        }, function (error) {
          $scope.msgError = error;
        });
      };

      $scope.close = function () {
        $modalInstance.close();
      };

      function initialize() {
        terminologyServerService.getBranchMetadata($scope.branch).then(function(response) {
          if (response.failureExportMax) {
            $scope.failureExportMax = response.failureExportMax;
          }
        });        
      }

      initialize();
    }
  );
