'use strict';

angular.module('singleConceptAuthoringApp')
  .service('scaService', ['$http', '$rootScope', '$location', '$q', function ($http, $rootScope, $location, $q) {

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
            return response.data;
          }, function (error) {
            // TODO Handle errors
          }
        );
      },
      
      //get notifications from the messaging service
      getNotifications: function () {
        return $http.get(apiEndpoint + 'notifications').then(
          function (response) {
            return response;
          }, function (error) {
            // TODO Handle errors
          }
        );
      },
                          
      // get tasks for current user across all projects
      getTasks: function () {
        return $http.get(apiEndpoint + 'projects/my-tasks').then(
          function (response) {
            if ($rootScope.loggedIn === null) {
              $rootScope.loggedIn = true;

              // temporary check to verify authentication on Home component
              // will later be replaced by accountService call in app.js
              if (response.data.length > 0) {
                $rootScope.accountDetails = response.data[0].assignee;
              }
            }

            return response.data;
          }, function (error) {
            if (error.status === 403) {
              $location.path('/login');
            }
          }
        );
      },

      // get current user's tasks for a project
      getTasksForProject: function (projectKey) {
        if (!projectKey) {
          console.error('Must specify projectKey to get tasks for project');
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

        var deferred = $q.defer();

        if (!projectKey) {
          deferred.reject('Must specify projectKey to create a task');
        }
        if (!task) {
          deferred.reject('Must specify task parameters to create a task');
        }
         $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks', task).then(
          function (response) {
            deferred.resolve(response);
          }, function (error, data) {
            deferred.reject(error);
          }
        );

        return deferred.promise;
      },

      // get a specific task for a project
      getTaskForProject: function (projectKey, taskKey) {
        if (!projectKey) {
          console.error('Must specify projectKey to get a task for project');
          return {};
        }
        if (!taskKey) {
          console.error('Must specify taskKey to get a task for project');
        }
        return $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey).then(
          function (response) {

            // temporary check to verify authentication on Edit component
            // will later be replaced by accountService call in app.js
            $rootScope.accountDetails = response.data.assignee;

            return response.data;
          }, function (error) {
            if (error.status === 403) {
              $location.path('/login');
            }
          }
        );
      },

      /////////////////////////////////////
      // ui-state calls
      /////////////////////////////////////

      // get the UI state for a project, task, and panel triplet
      getUIState: function (projectKey, taskKey, panelId) {
        if (!projectKey) {
          console.error('Must specify projectKey to get UI state');
          return {};
        }
        if (!taskKey) {
          console.error('Must specify taskKey to get UI state');
          return {};
        }
        if (!panelId) {
          console.error('Must specify panelId to get UI state');
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
          console.error('Must specify projectKey to save UI state');
          return {};
        }
        if (!taskKey) {
          console.error('Must specify taskKey to save UI state');
          return {};
        }
        if (!panelId) {
          console.error('Must specify panelId to save UI state');
          return {};
        }
        if (!uiState) {
          console.error('Must supply ui state in order to save it');
          return {};
        }
        return $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/' + panelId, uiState).then(
          function (response) {
            return response;
          }, function (error) {
            // TODO Handle errors
          }
        );
      },

      ///////////////////////////////////////////////
      // Classification
      ///////////////////////////////////////////////
      //POST /projects/{projectKey}/tasks/{taskKey}/classifications

      startClassification: function (projectKey, taskKey) {
        if (!projectKey) {
          console.error('Must specify projectKey to start classification');
          return {};
        }
        if (!taskKey) {
          console.error('Must specify taskKey to start classification');
          return {};
        }

        // POST call takes no data
        return $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/classifications', {}).then(
          function (response) {
            return response;
          }, function (error) {
            // TODO Handle errors
          });
      },

      startClassificationForProject: function(projectKey) {
        if (!projectKey) {
          console.error('Must specify projectKey to start classification');
          return {};
        }

        // POST call takes no data
        return $http.post(apiEndpoint + 'projects/' + projectKey + '/classifications', {}).then(
          function (response) {
            return response;
          }, function (error) {
            // TODO Handle errors
          });
      },

      // TODO:  Add getClassificationForProject when/if implemented

      ///////////////////////////////////////////////
      // Validation
      ///////////////////////////////////////////////

      // Get latest classification for a task
      // GET /projects/{projectKey}/tasks/{taskKey}/validation
      getValidationForTask: function (projectKey, taskKey) {
        if (!projectKey) {
          console.error('Must specify projectKey to get latest validation results');
          return {};
        }
        if (!taskKey) {
          console.error('Must specify taskKey to get latest validation results');
          return {};
        }
        return $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/validation', {}).then(
          function (response) {
            return response;
          }, function (error) {
            console.error('Error getting latest validation for ' + projectKey + ', ' + taskKey);
            return null;
          });
      },

      // Initiate  classification for a task
      // POST /projects/{projectKey}/tasks/{taskKey}/validation
      startValidationForTask: function (projectKey, taskKey) {
        if (!projectKey) {
          console.error('Must specify projectKey to initiate validation');
          return {};
        }
        if (!taskKey) {
          console.error('Must specify taskKey to initiate validation');
          return {};
        }

        // POST call takes no data
        return $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/validation', {}).then(
          function (response) {
            return response;
          }, function (error) {
            console.error('Error starting validation for ' + projectKey + ', ' + taskKey);
            return null;
          });
      },


      getValidationForProject: function(projectKey) {
        if (!projectKey) {
          console.error('Must specify projectKey to get latest validation results');
          return {};
        }

        return $http.get(apiEndpoint + 'projects/' + projectKey + '/validation').then(function(response) {
          return response.data;
        }, function (error) {
          console.error('Error getting validation for project ' + projectKey);
          return null;
        });

      },

      startValidationForProject: function(projectKey) {
        if (!projectKey) {
          console.error('Must specify projectKey to start validation');
          return {};
        }

        // POST call takes no data
        return $http.post(apiEndpoint + 'projects/' + projectKey + '/validation', {}).then(function(response) {
          return response.data;
        }, function (error) {
          console.error('Error getting validation for project ' + projectKey);
          return null;
        });

      }

    };

  }])
;
