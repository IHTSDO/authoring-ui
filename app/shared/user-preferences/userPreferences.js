'use strict';
angular.module('singleConceptAuthoringApp.taskDetail', [])

  .controller('userPreferencesCtrl', ['$rootScope', '$scope', '$modalInstance', 'accountService', 'scaService', 'notificationService', function taskDetailCtrl($rootScope, $scope, $modalInstance, accountService, scaService, notificationService) {

    // retrieve the user preferences
    $scope.userPreferences = accountService.getUserPreferences();

    // revert settings to original
    $scope.revert = function() {
      $scope.userPreferences = accountService.getUserPreferences();
    };

    // close modal and apply settings
    $scope.save = function() {
      accountService.setUserPreferences($scope.userPreferences).then(function(userPreferences) {
        $modalInstance.close(userPreferences);
      }, function(error) {
        $scope.errorMsg = 'Unexpected error saving user preferences';
      })

    };

    $scope.cancel = function() {
      $modalInstance.cancel();
    }



  }]);
