'use strict';
angular.module('singleConceptAuthoringApp')
  .controller('userPreferencesCtrl', ['$rootScope', '$scope', '$modalInstance', 'accountService', 'scaService', 'notificationService',
    function userPreferencesCtrl($rootScope, $scope, $modalInstance, accountService, scaService, notificationService) {

    // retrieve the user preferences
    accountService.getUserPreferences().then(function(response) {
      $scope.userPreferences = response;
    });

    // revert settings to original
    $scope.revert = function () {
      accountService.getUserPreferences().then(function(response) {
        $scope.userPreferences = response;
      });
    };

    // close modal and apply settings
    $scope.save = function () {
      accountService.applyUserPreferences($scope.userPreferences).then(function (userPreferences) {

        accountService.saveUserPreferences(userPreferences).then(function(response) {
          if (!response) {
            notificationService.sendError('Unexpected error saving settings. Your changes may not persist across sessions', 0);
          } else {
            notificationService.sendMessage('Application preferences updated', 5000);
          }
        });
        $modalInstance.close(userPreferences);
      }, function (error) {
        $scope.errorMsg = 'Unexpected error applying settings';
      });
    };

    $scope.close = function () {
      $modalInstance.cancel();
    };

  }]);
