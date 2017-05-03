'use strict';
angular.module('singleConceptAuthoringApp')
  .controller('userPreferencesCtrl', ['$rootScope', '$scope', '$modalInstance', 'accountService', 'scaService', 'notificationService', 'layoutHandler', 'configService', 'metadataService',
    function userPreferencesCtrl($rootScope, $scope, $modalInstance, accountService, scaService, notificationService, layoutHandler, configService, metadataService) {


      /////////////////////////////////////////
      // Basic User Preferences
      /////////////////////////////////////////

      // on load, retrieve the user preferences
      accountService.getUserPreferences().then(function (response) {
        $scope.userPreferences = response;
        configService.getVersions().then(function(versions){
            $scope.versions = versions;
        });
      });
        
      $scope.projects = metadataService.getProjects();

      // revert settings to original
      $scope.revert = function () {
        accountService.getUserPreferences().then(function (response) {
          $scope.userPreferences = response;
        });

        layoutHandler.setLayout(JSON.parse(JSON.stringify($scope.layoutOriginal)));
      };

      /////////////////////////////////////////
      // Layout Handling
      /////////////////////////////////////////

      // save the original layout for cancel events
      $scope.layoutOriginal = JSON.parse(JSON.stringify($rootScope.layout));

      // resize a layout element
      $scope.resizeLayoutElement = function(name, increment) {
        layoutHandler.resizeLayoutElement(name, increment);
      };

      /**
       * edit.js-specific helper function to return full boostrap col names
       * May need to change depending on responsive needs
       * @param name the unique column name
       * @returns (*) an array of col-(size)-(width) class names
       */
      $scope.getLayoutWidths = function (name) {

        if (!$rootScope.layoutWidths || !$rootScope.layoutWidths[name]) {
          return;
        }

        var width = $rootScope.layoutWidths[name];
        var colClasses = [
          'col-xs-12',
          'col-sm-12',
          'col-md-' + width,
          'col-lg-' + width,
          'col-xl-' + width
        ];
        return colClasses;
      };
        
      $scope.updatePath = function(project){
          for(var i = 0; i < $scope.projects.length; i++){
              if($scope.projects[i].key === $scope.userPreferences.browserView){
                  $scope.userPreferences.branchPath = $scope.projects[i].branchPath;
              }
          }
      }



      //////////////////////////////////////////
      // Modal Controls
      //////////////////////////////////////////

      // close modal and apply settings
      $scope.save = function () {
        accountService.applyUserPreferences($scope.userPreferences).then(function (userPreferences) {

          // if layout specified, attach/replace it in user preferences
          if ($rootScope.layout && $rootScope.layout.name) {
            if (!userPreferences.layout) {
              userPreferences.layout = {};
            }
            userPreferences.layout[$rootScope.layout.name] = $rootScope.layout;
          }

          accountService.saveUserPreferences(userPreferences).then(function (response) {
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
        $rootScope.layout = $scope.layoutOriginal;
        $modalInstance.close();
      };


    }]);
