'use strict';

angular.module('singleConceptAuthoringApp')
  .factory('accountService', function ($http, $rootScope) {

    var accountDetails = null;

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

    return {
      getAccount: getAccount,
      getRoleForTask: getRoleForTask,
      getRoleForProject: getRoleForProject,
      isReviewer: isReviewer
    };

  })
;