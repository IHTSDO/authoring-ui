'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles IMS authentication, user roles, and user settings
 */
  .factory('accountService', function ($http, $rootScope, $q, scaService) {

    var accountDetails = null;

    var userPreferences = null;

    function getAccount() {

      var deferred = $q.defer();

      if (accountDetails !== null) {
        deferred.resolve(accountDetails);
      }
      else {
        $http.get('/auth', {withCredentials: true}).
          success(function (data, status) {

            console.log('Account details retrieved');

            // leave rootscope assignment for header
            // TODO Refactor this at a later date, all account details
            // should be handled via this service
            $rootScope.accountDetails = data;
            $rootScope.loggedIn = true;
            accountDetails = data;

            deferred.resolve(accountDetails);
          }).
          error(function (data, status) {
            console.error('Could not retrieve account details');
            $rootScope.accountDetails = [];
            $rootScope.loggedIn = false;

            deferred.reject('Could not retrieve account details');
          });
      }

      return deferred.promise;
    }

    function getRoleForTask(task) {

      var deferred = $q.defer();

      getAccount().then(function(accountDetails) {

        // check reviewer first
        if (task.reviewer && accountDetails.login === task.reviewer.username) {
          deferred.resolve('REVIEWER');
        }

        // check assignee second
        else if (accountDetails.login === task.assignee.username) {
          deferred.resolve('AUTHOR');
        }

        else {
          deferred.reject('UNKNOWN');
        }
      });

      return deferred.promise;

    }

    function getRoleForProject(project) {
      return 'UNDEFINED';
    }
    
    function isReviewer() {
        if (accountDetails.roles.indexOf('ROLE_ihtsdo-sca-reviwer')) {
            return true;
        }
        else{return false;}
    }

    /**
     * Sets and returns application-wide user preferences
     * @param userPreferences The JSON object containing { settingName : settingValue } pairs. If any setting is not specified, default value will be assigned
     * @returns the user's preferences after checking for default values
     */
    function applyUserPreferences(preferences) {

      // create local copy for modification and return (don't modify original object)
      var localPreferences = JSON.parse(JSON.stringify(preferences));

      // handle as promise for now, in case later preferences require processing
      // (not currently needed, but meh)
      var deferred = $q.defer();

      // create blank JSON object if not supplied
      if (!localPreferences) {
        localPreferences = {};
      }
      var globalStyleClasses = [];

      /////////////////////////////////////////////////////
      // Color Scheme
      /////////////////////////////////////////////////////
      if (!localPreferences.colourScheme) {
        localPreferences.colourScheme = 'sca-colours';
      }
      globalStyleClasses.push(localPreferences.colourScheme);

      /////////////////////////////////////////////////////
      // Application View
      /////////////////////////////////////////////////////
      if (!localPreferences.appView) {
        localPreferences.appView = 'sca-default';
      }
      globalStyleClasses.push(localPreferences.appView);

      /////////////////////////////////////////////////////
      // Apply global styling
      /////////////////////////////////////////////////////
      $rootScope.globalStyleClasses = globalStyleClasses;

      /////////////////////////////////////////////////////
      // Resolve and Return
      /////////////////////////////////////////////////////

      // resolve the promise
      deferred.resolve(localPreferences);

      // return the (possibly modified) object
      return deferred.promise;
    }

    // wrapper functions for convenience
    function getUserPreferences() {
      return scaService.getUiStateForUser('user-preferences').then(function(response) {
        return response;
      }, function(error) {
        return null;
      });
    }
    function saveUserPreferences(preferences) {
      return scaService.saveUiStateForUser('user-preferences', preferences).then(function(response) {
        return response;
      });
    }

    return {
      getAccount: getAccount,
      getRoleForTask: getRoleForTask,
      getRoleForProject: getRoleForProject,
      isReviewer: isReviewer,
      applyUserPreferences : applyUserPreferences,
      getUserPreferences: getUserPreferences,
      saveUserPreferences: saveUserPreferences
    };

  })
;