'use strict';

angular.module('singleConceptAuthoringApp')
  .factory('scaService', ['$http', function ($http) {

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
            return response.data;
          }, function (error) {
            // TODO Handle errors
          }
        );
      },

      // get current user's tasks for a project
      getTasksForProject: function (projectKey) {
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
        return $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey).then(
          function (response) {
            return response;
          }, function (error) {
            // TODO Handle errors
          }
        );
      },

      /////////////////////////////////////
      // ui-state calls
      /////////////////////////////////////

      // get the UI state for a project, task, and panel triplet
      getUIState: function (projectKey, taskKey, panelId) {
        return $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/panel' + panelId).then(
          function (response) {
            return response;
          }, function (error) {
            // TODO Handle errors
          }
        );
      },

      // save the UI state for a project, task, and panel triplet
      saveUIState: function (projectKey, taskKey, panelId, uiState) {
        return $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/panel' + panelId, uiState).then(
          function (response) {
            return response;
          }, function (error) {
            // TODO Handle errors
          }
        );
      }
    };

  }]);
