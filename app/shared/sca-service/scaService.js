'use strict';

angular.module('singleConceptAuthoringApp')
  .service('scaService', ['$http', '$rootScope', '$location', '$q', '$interval', 'notificationService', function ($http, $rootScope, $location, $q, $interval, notificationService) {

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

      // get tasks for current user across all projects
      getTasks: function () {
        return $http.get(apiEndpoint + 'projects/my-tasks').then(
          function (response) {
            if ($rootScope.loggedIn === null) {
              $rootScope.loggedIn = true;

              // temporary check to verify authentication on Home component
              // will later be replaced by accountService call in app.js
//              if (response.data.length > 0) {
//                $rootScope.accountDetails = response.data[0].assignee;
//              }
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
//            $rootScope.accountDetails = response.data.assignee;

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

      // NOTE:  Task and project classification retrieval is done through
      // snowowlService

      // Initiate classification for a task
      // POST /projects/{projectKey}/tasks/{taskKey}/classification
      startClassificationForTask: function (projectKey, taskKey) {
        if (!projectKey) {
          console.error('Must specify projectKey to initiate classification');
          return {};
        }
        if (!taskKey) {
          console.error('Must specify taskKey to initiate classification');
          return {};
        }

        // POST call takes no data
        return $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/classifications', {}).then(
          function (response) {
            return response;
          }, function (error) {
            console.error('Error starting classification for ' + projectKey + ', ' + taskKey);
            return null;
          });
      },

      // Start classification for a project
      // GET /projects/{projectKey}/classification
      startClassificationForProject: function (projectKey) {
        if (!projectKey) {
          console.error('Must specify projectKey to start classification');
          return {};
        }

        // POST call takes no data
        return $http.post(apiEndpoint + 'projects/' + projectKey + '/classifications', {}).then(function (response) {
          return response.data;
        }, function (error) {
          console.error('Error getting classification for project ' + projectKey);
          return null;
        });

      },

      ///////////////////////////////////////////////
      // Validation
      ///////////////////////////////////////////////

      // Get latest validation for a task
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
            return response.data;
          }, function (error) {
            console.error('Error getting latest validation for ' + projectKey + ', ' + taskKey);
            return null;
          });
      },

      // Initiate validation for a task
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

      // Initiate validation for a project
      // GET /projects/{projectKey}/validation
      getValidationForProject: function (projectKey) {
        if (!projectKey) {
          console.error('Must specify projectKey to get latest validation results');
          return {};
        }

        return $http.get(apiEndpoint + 'projects/' + projectKey + '/validation').then(function (response) {
          return response.data;
        }, function (error) {
          console.error('Error getting validation for project ' + projectKey);
          return null;
        });

      },

      // Get latest validation for a task
      // GET /projects/{projectKey}/tasks/{taskKey}/validation
      startValidationForProject: function (projectKey) {
        if (!projectKey) {
          console.error('Must specify projectKey to start validation');
          return {};
        }

        // POST call takes no data
        return $http.post(apiEndpoint + 'projects/' + projectKey + '/validation', {}).then(function (response) {
          return response.data;
        }, function (error) {
          console.error('Error getting validation for project ' + projectKey);
          return null;
        });

      },
        
      //////////////////////////////////////////
      // Update Status
      //////////////////////////////////////////
        
      updateTask: function (projectKey, taskKey, object) {
        $http.put(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey, object).then(function (response) {
          notificationService.sendMessage('Task ' + taskKey + ' marked for review');
        }, function (error) {
          console.error('Error marking task ready for review: ' + taskKey + ' in project ' + projectKey);
          notificationService.sendError('Error marking task ready for review: ' + taskKey + ' in project ' + projectKey, 10000);
        });
      },

      //////////////////////////////////////////
      // Review
      //////////////////////////////////////////

      // mark as ready for review -- no return value
      markTaskForReview: function (projectKey, taskKey) {
        $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/review').then(function (response) {
          notificationService.sendMessage('Task ' + taskKey + ' marked for review');
        }, function (error) {
          console.error('Error marking task ready for review: ' + taskKey + ' in project ' + projectKey);
          notificationService.sendError('Error marking task ready for review: ' + taskKey + ' in project ' + projectKey, 10000);
        });
      },

      // get latest review
      getReviewForTask: function (projectKey, taskKey) {
        return $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/review').then(function (response) {
          return response.data;
        }, function (error) {

          // 404 errors indicate no review is available
          if (error.status !== 404) {
            console.error('Error retrieving review for task ' + taskKey + ' in project ' + projectKey, error);
            notificationService.sendError('Error retrieving review for task ' + taskKey + ' in project ' + projectKey, 10000);
          }
          return null;
        });
      },

      //////////////////////////////////////////
      // Notification Polling
      //////////////////////////////////////////

      // start polling
      startPolling: function (intervalInMs) {
        console.debug('Starting notification polling with interval ' + intervalInMs + 'ms');

        // instantiate poll (every 10s)
        var scaPoll = $interval(function () {

          $http.get(apiEndpoint + 'notifications').then(function (response) {
            if (response && response.data && response.data[0]) {

              console.debug('NEW NOTIFICATION', response);

              // getNotifications returns an array, get the latest
              // TODO Fold all results into a drop-down list in top right corner
              var newNotification = response.data[0];

              var msg = null;
              var url = null;

              if (newNotification.entityType) {

                // construct message and url based on entity type
                switch (newNotification.entityType) {

                  /*
                   Classification completion object structure
                   entityType: "Classification"
                   event: "Classification completed successfully"
                   project: "WRPAS"
                   task: "WRPAS-98" (omitted for project)
                   */
                  case 'Classification':
                    msg = newNotification.event + ' for project ' + newNotification.project + (newNotification.task ? ' and task ' + newNotification.task : '');
                    if (newNotification.task) {
                      url = '#/classify/' + newNotification.project + '/' + newNotification.task;
                    } else {
                      url = '#/project/' + newNotification.project;
                    }
                    break;

                  /*
                   Validation completion object structure
                   entityType: "Validation"
                   event: "COMPLETED"
                   project: "WRPAS"
                   task: "WRPAS-98" (omitted for project)
                   */
                  case 'Validation':

                    // conver
                    var event = newNotification.event.toLowerCase().replace(/\w\S*/g, function (txt) {
                      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                    });
                    msg = 'Validation ' + event + ' for project ' + newNotification.project + (newNotification.task ? ' and task ' + newNotification.task : '');
                    if (newNotification.task) {
                      url = '#/validate/' + newNotification.project + '/' + newNotification.task;
                    } else {
                      url = '#/project/' + newNotification.project;
                    }
                    break;
                }
              } else {
                console.error('Unknown notification type received', newNotification);
                notificationService.sendError('Unknown notification received', 10000, null);
              }

              notificationService.sendMessage(msg, 0, url);
            }
          });
        }, intervalInMs);
      }

    };

  }])
;
