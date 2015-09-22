'use strict';
angular.module('singleConceptAuthoringApp')
  .controller('userPreferencesCtrl', ['$rootScope', '$scope', '$modalInstance', 'accountService', 'scaService', 'notificationService',
    function userPreferencesCtrl($rootScope, $scope, $modalInstance, accountService, scaService, notificationService) {

    // retrieve the user preferences
    $scope.userPreferences = accountService.getUserPreferences();

    // revert settings to original
    $scope.revert = function () {
      $scope.userPreferences = accountService.getUserPreferences();
    };

    // close modal and apply settings
    $scope.save = function () {
      accountService.setUserPreferences($scope.userPreferences).then(function (userPreferences) {

        $modalInstance.close(userPreferences);


        // TODO Enable once UI States are available
       /* scaService.saveUIState('user-preferences').then(
          function (response) {
            notificationService.sendMessage('Application preferences updated');
        }, function (error) {
            notificationService.sendError('Unexpected error saving settings. Your changes may not persist across sessions');
        });*/

      }, function (error) {
        $scope.errorMsg = 'Unexpected error applying settings';
      });

    };

    $scope.cancel = function () {
      $modalInstance.cancel();
    };

  }]);
