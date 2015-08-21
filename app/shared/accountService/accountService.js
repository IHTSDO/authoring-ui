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

      // check assignee
      if (accountDetails.login === task.assignee.name) {
        return 'AUTHOR';
      }

      // check reviewer
      if (accountDetails.login === task.reviewer.name) {
        return 'REVIEWER';
      }
    }

    function getRoleForProject(project) {

    }

    return {
      getAccount: getAccount,
      getRoleForTask: getRoleForTask,
      getRoleForProject: getRoleForProject
    }

  })
;