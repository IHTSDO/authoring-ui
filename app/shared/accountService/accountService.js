'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles IMS authentication, user roles, and user settings
 */
  .factory('accountService', function ($http, $rootScope, $q, scaService) {

    var accountDetails = null;

    var userPreferences = null;

    function getAccount(imsUrl) {

      if (accountDetails !== null) {
        return accountDetails;
      }
      else {
        return $http.get('/ims-api/account', {withCredentials: true}).
          success(function (data, status) {

            // leave rootscope assignment for header
            // TODO Refactor this at a later date, all account details
            // should be handled via this service
            $rootScope.accountDetails = data;
            $rootScope.loggedIn = true;
            accountDetails = data;
          }).
          error(function (data, status) {
            $rootScope.accountDetails = [];
            $rootScope.loggedIn = false;
          });
      }
    }

    function getRoleForTask(task) {

      // check reviewer first
      if (task.reviewer && accountDetails.login === task.reviewer.username) {
        return 'REVIEWER';
      }

      // check assignee second
      if (accountDetails.login === task.assignee.username) {
        return 'AUTHOR';
      }

      return null;


    }

    function getRoleForProject(project) {

    }
    
    function isReviewer() {
        if (accountDetails.roles.indexOf('ROLE_ihtsdo-sca-reviwer')) {
            return true;
        }
        else{return false;}
    }

    function getUserPreferences() {
      if (!userPreferences) {
        console.error('User preferences are not set, check for initialization and retrieval');
      }

      return userPreferences;
    }

    /**
     * Sets and returns application-wide user preferences
     * @param userPreferences The JSON object containing { settingName : settingValue } pairs. If any setting is not specified, default value will be assigned
     * @returns the user's preferences after checking for default values
     */
    function setUserPreferences(preferences) {
      
      console.debug('setting user preferences', preferences);

      // handle as promise for now, in case later preferences require processing
      // (not currently needed, but meh)
      var deferred = $q.defer();

      // create blank JSON object if not supplied
      if (!preferences) {
        preferences = {};
      }
      var globalStyleClasses = [];

      /////////////////////////////////////////////////////
      // Color Scheme
      /////////////////////////////////////////////////////
      if (!preferences.colourScheme) {
        preferences.colourScheme = 'sca-colours';
      }
      globalStyleClasses.push(preferences.colourScheme);

      /////////////////////////////////////////////////////
      // Application View
      /////////////////////////////////////////////////////
      if (!preferences.appView) {
        preferences.appView = 'sca-default'
      }
      globalStyleClasses.push(preferences.appView);

      /////////////////////////////////////////////////////
      // Apply global styling
      /////////////////////////////////////////////////////
      $rootScope.globalStyleClasses = globalStyleClasses;

      /////////////////////////////////////////////////////
      // Resolve and Return
      /////////////////////////////////////////////////////
      console.debug('preferences (new)', preferences);

      // set the service variable
      userPreferences = preferences;

      // resolve the promise
      deferred.resolve(preferences);

      // return the (possibly modified) object
      return deferred.promise;
    }

    return {
      getAccount: getAccount,
      getRoleForTask: getRoleForTask,
      getRoleForProject: getRoleForProject,
      isReviewer: isReviewer,
      getUserPreferences : getUserPreferences,
      setUserPreferences : setUserPreferences
    };

  })
;