'use strict';

angular.module('singleConceptAuthoringApp')
  .service('scaService', ['$http', '$rootScope', function ($http, $rootScope) {

    // TODO Wire this to endpoint service, endpoint config
    var apiEndpoint = '../snowowl/ihtsdo-sca/';

    return {

      /////////////////////////////////////
      // authoring-projects calls
      /////////////////////////////////////

      // get all projects
      getProjects: function () {        
        return $http.get(apiEndpoint + 'projects').then(
          function (response) {
            console.debug('scaService getProjects', response, response.data);
            return response.data;
          }, function (error) {
            // TODO Handle errors
          }
        );
      },

      // get tasks for current user across all projects
      getTasks: function () {
        return $http.get(apiEndpoint + 'projects/my-tasks').then(
          function (response) {

            // temporary check to verify authentication
            // will later be replaced by accountService call in app.js
            if ($rootScope.loggedIn === null) {

              console.debug('Setting authentication', response);
              $rootScope.loggedIn = true;

              if (response.data.length > 0) {
                console.debug('LoggedIn as:', response.data[0].assignee);
                $rootScope.accountDetails = response.data[0].assignee;
              }
            }

            return response.data;
          }, function (error) {

          }
        );
      },

      // get current user's tasks for a project
      getTasksForProject: function (projectKey) {
        if (!projectKey) {
          console.error("Must specify projectKey to get tasks for project");
          return {};
        }
        return $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks').then(
          function (response) {
            return response.data;
          }, function (error) {
            // TODO Handle errors
          }
        );
      },

      // create a task for a project, assigned to current user
      createTaskForProject: function (projectKey, task) {
        if (!projectKey) {
          console.error("Must specify projectKey to create a task");
          return {};
        }
        if (!task) {
          console.error("Must specify task parameters to create a task");
        }
        return $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks', task).then(
          function (response) {
            return response;
          }, function (error) {
            // TODO Handle errors
          }
        );
      },

      // get a specific task for a project
      getTaskForProject: function (projectKey, taskKey) {
        if (!projectKey) {
          console.error("Must specify projectKey to get a task for project");
          return {};
        }
        if (!taskKey) {
          console.error("Must specify taskKey to get a task for project");
        }
        return $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey).then(
          function (response) {
            return response.data;
          }, function (error) {
            return {};
          }
        );
      },

      /////////////////////////////////////
      // ui-state calls
      /////////////////////////////////////

      // get the UI state for a project, task, and panel triplet
      getUIState: function (projectKey, taskKey, panelId) {
        if (!projectKey) {
          console.error("Must specify projectKey to get UI state");
          return {};
        }
        if (!taskKey) {
          console.error("Must specify taskKey to get UI state");
          return {};
        }
        if (!panelId) {
          console.error("Must specify panelId to get UI state");
          return {};
        }
        return $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/' + panelId).then(
          function (response) {
            return response.data;
          }, function (error) {
            return {};
          }
        );
      },

      // save the UI state for a project, task, and panel triplet
      saveUIState: function (projectKey, taskKey, panelId, uiState) {
        if (!projectKey) {
          console.error("Must specify projectKey to save UI state");
          return {};
        }
        if (!taskKey) {
          console.error("Must specify taskKey to save UI state");
          return {};
        }
        if (!panelId) {
          console.error("Must specify panelId to save UI state");
          return {};
        }
        if (!uiState) {
          console.error("Must supply ui state in order to save it");
          return {};
        }
        return $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/' + panelId, uiState).then(
          function (response) {
            return response;
          }, function (error) {
            // TODO Handle errors
          }
        );
      }


    };

  }]);
