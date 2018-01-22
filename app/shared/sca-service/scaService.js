'use strict';

angular.module('singleConceptAuthoringApp')
  .service('scaService', ['$http', '$rootScope', '$location', '$q', '$interval', 'notificationService', 'snowowlService',
    function ($http, $rootScope, $location, $q, $interval, notificationService, snowowlService) {

      // TODO Wire this to endpoint service, endpoint config
      var apiEndpoint = '../authoring-services/';

      //
      // Modified concept list utility functions
      //

      function getModifiedList(projectKey, taskKey) {

        var deferred = $q.defer();

        // get the list
        $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/modified-list').then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          if (error.status === 404) {
            deferred.resolve([]);
          } else {
            deferred.reject('Error retrieving modified concept id list');
          }
        });
        return deferred.promise;
      }

      // Modified list functions
      function saveModifiedConceptId(projectKey, taskKey, conceptId) {
        var deferred = $q.defer();

        getModifiedList(projectKey, taskKey).then(function (modifiedList) {
          var index = modifiedList.indexOf(conceptId);

          // if not in list, update the list
          if (index === -1) {
            modifiedList.push(conceptId);
            $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/modified-list', modifiedList).then(function (revisedList) {
              deferred.resolve(revisedList);
            }, function (error) {
              deferred.reject('Unexpected error updating the list of modified concepts for this task');
            });
          }
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      function removeModifiedConceptId(projectKey, taskKey, conceptId) {
        var deferred = $q.defer();

        getModifiedList(projectKey, taskKey).then(function (modifiedList) {
          var index = modifiedList.indexOf(conceptId);

          // if not in list, update the list
          if (index !== -1) {
            modifiedList.splice(index, 1);
            $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/modified-list', modifiedList).then(function (revisedList) {
              deferred.resolve(revisedList);
            }, function (error) {
              deferred.reject('Unexpected error updating the list of modified concepts for this task');
            });
          }
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      //
      // Unread feedback utility functions
      //

      function getConceptsWithUnreadFeedback(projectKey, taskKey) {

        var deferred = $q.defer();

        // get the list
        $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/feedback-unread').then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          if (error.status === 404) {
            deferred.resolve([]);
          } else {
            deferred.reject('Error retrieving modified concept id list');
          }
        });
        return deferred.promise;
      }

      // Modified list functions
      function saveUnreadFeedbackConceptId(projectKey, taskKey, conceptId) {
        var deferred = $q.defer();

        getConceptsWithUnreadFeedback(projectKey, taskKey).then(function (feedbackUnread) {
          var index = feedbackUnread.indexOf(conceptId);

          // if not in list, update the list
          if (index === -1) {
            feedbackUnread.push(conceptId);
            $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/feedback-unread', feedbackUnread).then(function (revisedList) {
              deferred.resolve(revisedList);
            }, function (error) {
              deferred.reject('Unexpected error updating the list of modified concepts for this task');
            });
          }
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      function removeUnreadFeedbackConceptId(projectKey, taskKey, conceptId) {
        var deferred = $q.defer();

        getConceptsWithUnreadFeedback(projectKey, taskKey).then(function (feedbackUnread) {
          var index = feedbackUnread.indexOf(conceptId);

          // if not in list, update the list
          if (index !== -1) {
            feedbackUnread.splice(index, 1);
            $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/feedback-unread', feedbackUnread).then(function (revisedList) {
              deferred.resolve(revisedList);
            }, function (error) {
              deferred.reject('Unexpected error updating the list of concepts with unread feedback for this task');
            });
          }
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }
        
      function getDialectMatches(words) {
        var deferred = $q.defer();
        var wordsStr = '';
        for (var i = 0; i < words.length; i++) {
          wordsStr += words[i] + (i === words.length - 1 ? '' : '%2C');
        }
        $http.get(apiEndpoint + 'dialect/en-us/map/en-gb?words=' + wordsStr).then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          deferred.reject(error.message);
        });
        return deferred.promise;
      }

      function getSuggestionMatches(words) {
        var deferred = $q.defer();
        var wordsStr = '';
        for (var i = 0; i < words.length; i++) {
          wordsStr += words[i] + (i === words.length - 1 ? '' : '%2C');
        }
        $http.get(apiEndpoint + 'dialect/en-us/suggestions/en-gb?words=' + wordsStr).then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          deferred.reject(error.message);
        });
        return deferred.promise;
      }


      return {
          
        getDialectMatches: getDialectMatches,
        getSuggestionMatches: getSuggestionMatches,

        /////////////////////////////////////
        // authoring-projects calls
        /////////////////////////////////////

        // get a project by key
        getProjectForKey: function (projectKey) {
          if (!projectKey) {
            return null;
          }
          return $http.get(apiEndpoint + 'projects/' + projectKey).then(
            function (response) {
              return response.data;
            }, function (error) {
              // TODO Handle errors
            }
          );
        },

        // get all projects
        getProjects: function () {
          return $http.get(apiEndpoint + 'projects').then(
            function (response) {
              return response.data;
            }, function (error) {
              if (error.status === 403) {
                $location.path('/login');
              }
            }
          );
        },

        // get tasks for current user across all projects
        getTasks: function (excludePromoted) {
          return $http.get(apiEndpoint + 'projects/my-tasks?excludePromoted=' + (excludePromoted ? true : false)).then(
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

        getReviewTasks: function () {
          return $http.get(apiEndpoint + 'projects/review-tasks').then(
            function (response) {
              if ($rootScope.loggedIn === null) {
                $rootScope.loggedIn = true;
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
              deferred.resolve(response.data);
            }, function (error, data) {
              deferred.reject(error.message);
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
        getUiStateForUser: function (panelId) {
          if (!panelId) {
            console.error('Must specify panelId to get UI state');
            return null;
          }
          return $http.get(apiEndpoint + 'ui-state/' + panelId).then(
            function (response) {
              return response.data;
            }, function (error) {
              return null;
            }
          );
        },

        // save the UI state for a project, task, and panel triplet
        saveUiStateForUser: function (panelId, uiState) {
          if (!panelId) {
            console.error('Must specify panelId to save UI state');
            return null;
          }
          if (!uiState) {
            console.error('Must supply ui state in order to save it');
            return null;
          }
          return $http.post(apiEndpoint + 'ui-state/' + panelId, uiState).then(
            function (response) {
              return response;
            }, function (error) {
              return null;
            }
          );
        },

        deleteUiStateForUser: function (panelId) {
          if (!panelId) {
            console.error('Must specify panelId to delete UI state');
            return null;
          }

          return $http.delete(apiEndpoint + 'ui-state/' + panelId).then(
            function (response) {
              return response;
            }, function (error) {
              return null;
            }
          );
        },

        // get the UI state for a project, task, and panel triplet
        getUiStateForTask: function (projectKey, taskKey, panelId) {
          if (!projectKey) {
            console.error('Must specify projectKey to get UI state');
            return null;
          }
          if (!taskKey) {
            console.error('Must specify taskKey to get UI state');
            return null;
          }
          if (!panelId) {
            console.error('Must specify panelId to get UI state');
            return null;
          }
          return $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/' + panelId).then(
            function (response) {
              return response.data;
            }, function (error) {
              return null;
            }
          );
        },

        // save the UI state for a project, task, and panel triplet
        saveUiStateForTask: function (projectKey, taskKey, panelId, uiState) {
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
              return null;
            }
          );
        },

        // get the UI state for a project, task, and panel triplet
        getUiStateForReviewTask: function (projectKey, taskKey, panelId) {
          if (!projectKey) {
            console.error('Must specify projectKey to get UI state');
            return null;
          }
          if (!taskKey) {
            console.error('Must specify taskKey to get UI state');
            return null;
          }
          if (!panelId) {
            console.error('Must specify panelId to get UI state');
            return null;
          }
          return $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/shared-ui-state/' + panelId).then(
            function (response) {
              return response.data;
            }, function (error) {
              return null;
            }
          );
        },

        // save the UI state for a project, task, and panel triplet
        saveUiStateForReviewTask: function (projectKey, taskKey, panelId, uiState) {
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
          return $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/shared-ui-state/' + panelId, uiState).then(
            function (response) {
              return response;
            }, function (error) {
              return null;
            }
          );
        },

        // get the UI state for a project, task, and panel triplet
        deleteUiStateForTask: function (projectKey, taskKey, panelId) {
          return $http.delete(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/' + panelId).then(
            function (response) {
              return response.data;
            }, function (error) {
              return {};
            }
          );
        },

        // get the UI state for a project, task, and panel triplet
        getSharedUiStateForTask: function (projectKey, taskKey, panelId) {
          return $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/shared-ui-state/' + panelId).then(
            function (response) {
              return response.data;
            }, function (error) {
              return null;
            }
          );
        },

        // save the UI state for a project, task, and panel triplet
        saveSharedUiStateForTask: function (projectKey, taskKey, panelId, uiState) {
          return $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/shared-ui-state/' + panelId, uiState).then(
            function (response) {
              return response;
            }, function (error) {
              return null;
            }
          );
        },

        // get the UI state for a project, task, and panel triplet
        deleteSharedUiStateForTask: function (projectKey, taskKey, panelId) {
          if (!projectKey) {
            console.error('Must specify projectKey to delete UI state');
            return {};
          }
          if (!taskKey) {
            console.error('Must specify taskKey to delete UI state');
            return {};
          }
          if (!panelId) {
            console.error('Must specify panelId to delete UI state');
            return {};
          }
          return $http.delete(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/shared-ui-state/' + panelId).then(
            function (response) {
              return response.data;
            }, function (error) {
              return {};
            }
          );
        },

        ////////////////////////////////////////////////
        // ui-state calls (specific use wrappers)
        ////////////////////////////////////////////////

        getModifiedConceptForTask: function (projectKey, taskKey, conceptId) {
          if (!projectKey) {
            console.error('Must specify projectKey to get UI state');
            return null;
          }
          if (!taskKey) {
            console.error('Must specify taskKey to get UI state');
            return null;
          }
          if (!conceptId) {
            console.warn('No concept id specified for saving concept to UI state, using "unsaved"');
            conceptId = 'unsaved';
          }


          // TODO Refine this when support for multiple unsaved concepts goes in
          return $http({
            method: 'GET',
            headers: {'Accept-Charset': undefined},
            url: apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/concept-' + conceptId,
          }).then(
            function (response) {
              if (response.data.hasOwnProperty('current')) {
                return response.data.current === true ? null : response.data;
              } else {
                return response.data;
              }
            }, function (error) {
              // NOTE: if doesn't exist, 404s, return null
              return null;
            }
          );
        },

        saveModifiedConceptForTask: function (projectKey, taskKey, conceptId, concept) {
          if (!projectKey) {
            console.error('Must specify projectKey to save concept in UI state');
            return {};
          }
          if (!taskKey) {
            console.error('Must specify taskKey to save concept in UI state');
            return {};
          }
          if (!conceptId) {
            console.warn('No concept id specified for saving concept to UI state, using "unsaved"');
            conceptId = 'unsaved';
          }
          if (!concept) {
            console.warn('No concept specified for saving concept to UI state, using dummy JSON object');
            concept = {current: true};
          }

          $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/concept-' + conceptId,
            concept).then(
            function (response) {
              saveModifiedConceptId(projectKey, taskKey, conceptId);
            }, function (error) {

            }
          );
        },

        deleteModifiedConceptForTask: function (projectKey, taskKey, conceptId) {
          if (!projectKey) {
            console.error('Must specify projectKey to save concept in UI state');
            return {};
          }
          if (!taskKey) {
            console.error('Must specify taskKey to save concept in UI state');
            return {};
          }
          if (!conceptId) {
            console.warn('No concept id specified for saving concept to UI state, using "unsaved"');
            conceptId = 'unsaved';
          }

          // TODO Refine this when support for multiple unsaved concepts goes in
          $http.delete(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/concept-' + conceptId).then(
            function (response) {
              removeModifiedConceptId(projectKey, taskKey, conceptId);
            }, function (error) {
              notificationService.sendError('Unexpected error autosaving modified work; please ensure you save your work before leaving this page.', 0, null);
            }
          );
        },

        getModifiedConceptIdsForTask: function (projectKey, taskKey) {
          var deferred = $q.defer();
          // update the modified list
          $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/modified-list').then(function (response) {
            deferred.resolve(response.data);
          }, function (error) {
            // 404 indicates no ui state persisted, return empty array
            if (error.status === 404 || error.status === '404') {
              deferred.resolve([]);
            } else {
              deferred.reject('Unexpected error retrieving modified concept ids for task: ' + error.message);
            }
          });
          return deferred.promise;
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
          var deferred = $q.defer();
          $http.put(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey, object).then(function (response) {
            deferred.resolve(response);
          }, function (error) {
            deferred.reject(error.statusText);
          });
          return deferred.promise;
        },

//////////////////////////////////////////
// Review & Feedback
//////////////////////////////////////////

        // mark as ready for review -- no return value
        assignReview: function (projectKey, taskKey, username) {
          var deferred = $q.defer();
          var updateObj = {'status': 'IN_REVIEW', 'reviewer': {'username': username}};

          $http.put(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey, updateObj).then(function (response) {
            deferred.resolve(response);
          }, function (error) {
            deferred.reject(error.data.message);
          });
          return deferred.promise;
        },

        unassignReview: function (projectKey, taskKey) {
          var deferred = $q.defer();
          var updateObj = {'status': 'IN_REVIEW', 'reviewer': {}};

          $http.put(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey, updateObj).then(function (response) {
            deferred.resolve(response);
          }, function (error) {
            deferred.reject(error.data.message);
          });
          return deferred.promise;
        },


        markTaskInProgress: function (projectKey, taskKey) {
          var deferred = $q.defer();
          var updateObj = {'status': 'IN_PROGRESS', 'reviewer': {}};
          $http.put(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey, updateObj).then(function (response) {
            deferred.resolve(response);
          }, function (error) {
            deferred.reject(error.data.message);
          });
          return deferred.promise;
        },


        markTaskReviewInProgress: function (projectKey, taskKey) {
          var deferred = $q.defer();
          var updateObj = {'status': 'IN_REVIEW'};

          $http.put(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey, updateObj).then(function (response) {
            deferred.resolve(response);
          }, function (error) {
            deferred.reject(error.data.message);
          });
          return deferred.promise;
        },

        markTaskReviewComplete: function (projectKey, taskKey) {
          var deferred = $q.defer();
          var updateObj = {'status': 'REVIEW_COMPLETED'};
          $http.put(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey, updateObj).then(function (response) {
            notificationService.sendMessage('Task ' + taskKey + ' marked as: ' + status, 3000);
            deferred.resolve(response);
          }, function (error) {
            deferred.reject(error.data.status);
          });
          return deferred.promise;
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

// add feedback to a review
        addFeedbackToTaskReview: function (projectKey, taskKey, messageHtml, subjectConceptIds, requestFollowup) {

          var feedbackContainer = {
            subjectConceptIds: subjectConceptIds,
            messageHtml: messageHtml,
            feedbackRequested: requestFollowup
          };

          return $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/review/message', feedbackContainer).then(function (response) {
            return response.data;

          }, function (error) {
            console.error('Error submitting feedback for task ' + taskKey + ' in project ' + projectKey, feedbackContainer, error);
            notificationService.sendError('Error submitting feedback', 10000);
          });
        },

//POST
// /projects/{projectKey}/tasks/{taskKey}/review/concepts/{conceptId}/read
        markTaskFeedbackRead: function (projectKey, taskKey, conceptId) {
          var deferred = $q.defer();

          // delete any unread UI state status
          removeUnreadFeedbackConceptId(projectKey, taskKey, conceptId);

          // mark the feedback read server-side
          $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/review/concepts/' + conceptId + '/view', {}).then(function (response) {
            deferred.resolve(response);
          }, function (error) {
            console.error('Error marking feedback read ' + taskKey + ' in project ' + projectKey + ' for concept ' + conceptId);
            notificationService.sendError('Error marking feedback read', 10000);
            deferred.reject(error);
          });
          return deferred.promise;
        },

        markTaskFeedbackUnread: function (projectKey, taskKey, conceptId) {
          var deferred = $q.defer();
          saveUnreadFeedbackConceptId(projectKey, taskKey, conceptId).then(function (response) {
            deferred.resolve();
          }, function (error) {
            deferred.reject('Could not mark feedback unread');
          });
          return deferred.promise;
        },

        getConceptsWithUnreadFeedback: getConceptsWithUnreadFeedback,


// mark as ready for review -- no return value
        markProjectForReview: function (projectKey) {
          $http.post(apiEndpoint + 'projects/' + projectKey + '/review').then(function (response) {
            notificationService.sendMessage('Project ' + projectKey + ' marked for review');
          }, function (error) {
            console.error('Error marking project ready for review ' + projectKey);
            notificationService.sendError('Error marking project ready for review: ' + projectKey, 10000);
          });
        },

// get latest review
        getReviewForProject: function (projectKey) {
          return $http.get(apiEndpoint + 'projects/' + projectKey + '/review').then(function (response) {
            return response.data;
          }, function (error) {

            // 404 errors indicate no review is available
            if (error.status !== 404) {
              console.error('Error retrieving review for project ' + projectKey, error);
              notificationService.sendError('Error retrieving review for project ' + projectKey, 10000);
            }
            return null;
          });
        },

// add feedback to a review
        addFeedbackToProjectReview: function (projectKey, messageHtml, subjectConceptIds, requestFollowup) {

          var feedbackContainer = {
            subjectConceptIds: subjectConceptIds,
            messageHtml: messageHtml,
            feedbackRequested: requestFollowup
          };

          return $http.post(apiEndpoint + 'projects/' + projectKey + '/review/message', feedbackContainer).then(function (response) {
            return response.data;

          }, function (error) {
            console.error('Error submitting feedback for project ' + projectKey, feedbackContainer, error);
            notificationService.sendError('Error submitting feedback', 10000);
          });
        },

//POST
// /projects/{projectKey}/tasks/{taskKey}/review/concepts/{conceptId}/read
        markProjectFeedbackRead: function (projectKey, conceptId) {

          return $http.post(apiEndpoint + 'projects/' + projectKey + '/review/concepts/' + conceptId + '/read', {}).then(function (response) {
            return response;
          }, function (error) {
            console.error('Error marking feedback read in project ' + projectKey + ' for concept ' + conceptId);
            notificationService.sendError('Error marking feedback read', 10000);
            return null;
          });
        },

//////////////////////////////////////////
// Conflicts, Rebase, and Promotion
//////////////////////////////////////////

// POST /projects/{projectKey}/promote
// Promote the project to MAIN
        promoteProject: function (projectKey) {
          return $http.post(apiEndpoint + 'projects/' + projectKey + '/promote', {}).then(function (response) {
            notificationService.sendMessage('Project Promoted Successfully', 10000);
            return response.data;
          }, function (error) {
            if (error.status === 504) {
              notificationService.sendWarning('Your promotion is taking longer than expected, and is still running. You may work on other tasks while this runs and return to the dashboard to check the status in a few minutes.');
              return 1;
            }
            else if (error.status === 409) {
              notificationService.sendWarning('Another operation is in progress on this Project. Please try again in a few minutes.');
              return null;
            }
            else {
              console.error('Error promoting project ' + projectKey);
              notificationService.sendError('Error promoting project', 10000);
              return null;
            }

          });
        },

// GET /projects/{projectKey}/rebase
// Generate the conflicts report between the Project and MAIN
        getConflictReportForProject: function (projectKey) {
          return $http.post(apiEndpoint + 'projects/' + projectKey + '/rebase-conflicts', {}).then(function (response) {
            return response.data;
          }, function (error) {
            console.error('Error getting conflict report for project ' + projectKey);
            notificationService.sendError('Error getting conflict report for project', 10000);
            return null;
          });
        },

// POST /projects/{projectKey}/rebase
// Rebase the project from MAIN
        rebaseProject: function (projectKey) {
          return $http.post(apiEndpoint + 'projects/' + projectKey + '/rebase', {}).then(function (response) {
            notificationService.sendMessage('Project Rebased Successfully', 10000);
            return response.data;
          }, function (error) {
            if (error.status === 504) {
              notificationService.sendWarning('Your rebase operation is taking longer than expected, and is still running. You may work on other tasks while this runs and return to the dashboard to check the status in a few minutes.');
              return 1;
            }
            else if (error.status === 409) {
              notificationService.sendWarning('Another operation is in progress on this Project. Please try again in a few minutes.');
              return null;

            }
            else {
              notificationService.sendError('Error rebasing Task: ' + projectKey);
              return null;
            }
          });
        },
// POST /projects/{projectKey}/tasks/{taskKey}/promote
// Promote the task to the Project
        promoteTask: function (projectKey, taskKey) {
          var deferred = $q.defer();
          $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/promote', {}).then(function (response) {
            notificationService.sendMessage('Task successfully promoted', 5000);
            deferred.resolve(response.data);
          }, function (error) {
            if (error.status === 504) {
              notificationService.sendWarning('Your promotion is taking longer than expected, and is still running. You may work on other tasks while this runs and return to the dashboard to check the status in a few minutes. If you view the task it will show as promoted when the promotion completes.');
              deferred.reject(error.message);
            }
            else if (error.status === 409) {
              notificationService.sendWarning('Another operation is in progress on this Project. Please try again in a few minutes.');
              deferred.reject(error.message);
            }
            else {
              console.error('Error promoting project ' + projectKey);
              notificationService.sendError('Error promoting project', 10000);
              deferred.reject(error.message);
            }
          });
          return deferred.promise;
        },
// POST /projects/{projectKey}/tasks/{taskKey}/auto-promote
// Proceed Automation Promotion the task to the Project
        proceedAutomatePromotion: function (projectKey, taskKey) {
          var deferred = $q.defer();
          $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/auto-promote', {}).then(function (response) {           
            deferred.resolve();
          }, function (error) {
            if (error.status === 504) {
              notificationService.sendWarning('Your Automation promotion is taking longer than expected, and is still running. You may work on other tasks while this runs and return to the dashboard to check the status in a few minutes. If you view the task it will show as promoted when the promotion completes.');
              deferred.reject(error.message);
            }
            else if (error.status === 409) {
              notificationService.sendError(error.data.message);
              deferred.reject(error.message);
            }
            else {
              console.error('Error promoting project ' + projectKey);
              notificationService.sendError('Error promoting project', 10000);
              deferred.reject(error.data.message);
            }
          });
          return deferred.promise;
        },
// GET /projects/{projectKey}/tasks/{taskKey}/auto-promote/status
        getAutomatePromotionStatus: function (projectKey, taskKey) {
          return $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/auto-promote/status').then(function (response) {
            return response.data;
          }, function (error) {
            console.error('Error retrieving Automate Promotion stutus for project ' + projectKey + ', task ' + taskKey);
            notificationService.sendError('Error retrieving Automate Promotion stutus', 10000);
            return null;
          });
        },
// GET /projects/{projectKey}/tasks/{taskKey}/rebase
// Generate the conflicts report between the Task and the Project
        getConflictReportForTask: function (projectKey, taskKey) {
          return $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/rebase-conflicts', {}).then(function (response) {
            return response.data;
          }, function (error) {
            console.error('Error retrieving conflict report for project ' + projectKey + ', task ' + taskKey);
            notificationService.sendError('Error retrieving conflict report', 10000);
            return null;
          });
        },

// POST /projects/{projectKey}/tasks/{taskKey}/rebase
// Rebase the task from the project
        rebaseTask: function (projectKey, taskKey) {
          return $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/rebase', {}).then(function (response) {
            return response;
          }, function (error) {
            if (error.status === 504) {
              notificationService.sendWarning('Your rebase operation is taking longer than expected, and is still running. You may work on other tasks while this runs and return to the dashboard to check the status in a few minutes. If you view the task it will unlock when the rebase completes.');
              return 1;
            }
            else if (error.status === 409) {
              notificationService.sendWarning('Another operation is in progress on this Project. Please try again in a few minutes.');
              return null;
            }
            else {
              notificationService.sendError('Error rebasing Task: ' + projectKey + ', task ' + taskKey);
              return null;
            }
          });
        },

//////////////////////////////////////////
// Notification Polling
//////////////////////////////////////////

        monitorTask: function (projectKey, taskKey) {
          return $http.post(apiEndpoint + 'monitor', {
            'projectId': projectKey,
            'taskId': taskKey
          }).then(function (response) {
            return response.data;
          }, function (error) {
            console.error('Error monitoring project/task ' + projectKey + '/' + taskKey);
            notificationService.sendError('Error monitoring project ' + projectKey + ', task ' + taskKey);
            return null;
          });
        },

        monitorProject: function (projectKey) {
          return $http.post(apiEndpoint + 'monitor', {'projectId': projectKey}).then(function (response) {
            return response.data;
          }, function (error) {
            console.error('Error monitoring project' + projectKey);
            notificationService.sendError('Error monitoring project ' + projectKey);
            return null;
          });
        },

// directly retrieve notification
// TODO Decide if we want to instantiate this, will duplicate
// notification handling which should be moved to a non-exposed function
        getNotifications: function () {
          return null;
        },

// start polling
        startPolling: function (intervalInMs) {

          console.log('Starting application notification polling with interval ' + intervalInMs + 'ms');

          // instantiate poll (every 10s)
          var scaPoll = $interval(function () {

            $http.get(apiEndpoint + 'notifications').then(function (response) {
              if (response && response.data && response.data[0]) {

                console.log('Server notification:', response.data);

                // getNotifications returns an array, get the latest
                var newNotification = response.data[0];
                var msg = null;
                var url = null;

                /**
                 * Current supported notification entity types:
                 *  Validation, Feedback, Classification, Rebase, Promotion,
                 * ConflictReport, BranchState
                 */

                if (newNotification.entityType) {

                  // construct message and url based on entity type
                  switch (newNotification.entityType) {

                    case 'Rebase':
                      // TODO Handle rebase notifications
                      break;

                    case 'ConflictReport':
                      // TODO Handle conflict report notifications
                      break;

                    case 'Promotion':
                      // TODO Handle promotion notifications
                      break;

                    /*
                     Feedback completion object structure
                     {
                     project: "WRPAS",
                     task: "WRPAS-76",
                     entityType: "Feedback",
                     event: "new"}
                     */

                    case 'Feedback':
                      if (newNotification.event) {
                        // convert to first-character capitalized for all words
                        newNotification.event = newNotification.event.toLowerCase().replace(/\w\S*/g, function (txt) {
                          return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                        });
                      }
                      msg = newNotification.event + ' feedback for task ' + newNotification.task;
                      url = '#/tasks/task/' + newNotification.project + '/' + newNotification.task + '/feedback';
                      break;

                    /*
                     Classification completion object structure
                     entityType: "Classification"
                     event: "Classification completed successfully"
                     project: "WRPAS"
                     task: "WRPAS-98" (omitted for project)
                     */
                    case 'Classification':
                      msg = newNotification.event + ' for ' + (newNotification.task ? 'task ' + newNotification.task : 'project ' + newNotification.project);


                      // retrieve the latest classification

                      // set url and broadcast classification complete to taskDetail.js or project.js
                      if (newNotification.task) {
                        snowowlService.getClassificationsForTask(newNotification.project, newNotification.task).then(function (classifications) {
                          if (!classifications || classifications.length === 0) {
                            msg += ' but no classifications could be retrieved';
                            notificationService.sendError(msg);
                            return;
                          } else {
                            // assign results to the classification container (note,
                            // chronological order, use last value)
                            var classification = classifications[classifications.length - 1];
                            if (classification.status === 'COMPLETED' && (classification.equivalentConceptsFound || classification.inferredRelationshipChangesFound || classification.redundantStatedRelationshipsFound)) {
                              msg += ' - Changes found';
                              url = '#/tasks/task/' + newNotification.project + '/' + newNotification.task + '/classify';
                            } else {
                              msg += ' - No changes found';
                              url = '#/tasks/task/' + newNotification.project + '/' + newNotification.task + '/edit';
                            }

                            notificationService.sendMessage(msg, 0, url);

                          }
                        });

                        $rootScope.$broadcast('reloadTask');
                        $rootScope.$broadcast('reloadClassification');
                      } else if (newNotification.project) {
                        snowowlService.getClassificationsForProject(newNotification.project).then(function (classifications) {
                          if (!classifications || classifications.length === 0) {
                            msg += ' but no classifications could be retrieved';
                            notificationService.sendError(msg);
                            return;
                          } else {
                            // assign results to the classification container (note,
                            // chronological order, use last value)
                            var classification = classifications[classifications.length - 1];
                            if (classification.status === 'COMPLETED' && (classification.equivalentConceptsFound || classification.inferredRelationshipChangesFound || classification.redundantStatedRelationshipsFound)) {
                              msg += ': Changes found';
                              url = '#/project/' + newNotification.project;
                            } else {
                              msg += ': No changes found';
                              url = '#/project/' + newNotification.project;
                            }

                            notificationService.sendMessage(msg, 0, url);

                          }
                        });

                        $rootScope.$broadcast('reloadProject');
                      } else {
                        console.error('Classification notification could not be processed', newNotification);
                      }


                      break;

                    /*
                     Branch status change completion object structure
                     entityType: "BranchState"
                     event: "New Status" (listening for DIVERGED to handle the list refresh on the concepts page)
                     */
                    case 'BranchState':
                      if (newNotification.event === 'DIVERGED') {
                        //$rootScope.$broadcast('branchDiverged');
                        $rootScope.$broadcast('notification.branchState', newNotification);
                      }
                      break;

                    /*
                     Rebase Complete object structure
                     project: "WRPAS"
                     task: "WRPAS-98" (omitted for project)
                     entityType: "Rebase"
                     event: "Rebase from MAIN to ORPHANET completed without conflicts in 0:15:11.882"
                     */
                    case 'Rebase':
                      msg = newNotification.event;

                      // set url and broadcast classification complete to taskDetail.js or project.js
                      if (newNotification.task) {
                        url = '#/tasks/task/' + newNotification.project + '/' + newNotification.task + '/edit';
                        $rootScope.$broadcast('reloadTask');
                        $rootScope.$broadcast('rebaseComplete');
                      } else {
                        url = '#/project/' + newNotification.project;
                        $rootScope.$broadcast('reloadProject');
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

                      // convert to first-character capitalized for all words
                      var event = newNotification.event.toLowerCase().replace(/\w\S*/g, function (txt) {
                        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                      });
                      msg = 'Validation ' + event + ' for ' + (newNotification.task ? 'task ' + newNotification.task :  'project ' + newNotification.project);

                      // do not supply a url (button link) for FAILED status
                      if (event !== 'FAILED') {
                        if (newNotification.task) {
                          url = '#/tasks/task/' + newNotification.project + '/' + newNotification.task + '/validate';
                        } else {
                          url = '#/project/' + newNotification.project;
                        }
                      }
                      // broadcast validation complete to taskDetail
                      $rootScope.$broadcast('reloadTask');
                      break;
                    default:
                      console.error('Unknown entity type for notification, stopping', +newNotification);
                      return;
                  }

                  // Special handling for classification -- also this whole structure is suboptimal...
                  if (newNotification.entityType !== 'Classification') {

                    // send the notification (if message supplied) with optional url
                    if (msg) {

                      notificationService.sendMessage(msg, 0, url);
                    }
                  }
                } else {
                  console.error('Unknown notification type received', newNotification);
                  notificationService.sendError('Unknown notification received', 10000, null);
                }

              }
            }, function (error) {
              if (error.status === 403) {
                $location.path('/login');
              }
            });
          }, intervalInMs);
        },


        getTaskAttachments: function (projectKey, taskKey) {
          var deferred = $q.defer();
          $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/attachments').then(function (response) {

            var attachments = [];

            // content is returned from the server as raw string, convert
            angular.forEach(response.data, function (attachment) {
              var obj = {
                content: null,
                issueKey: attachment.issueKey,
                ticketKey: attachment.ticketKey,
                emptyContent: false,
                error: null
              };
              // attempt to parse content if it exists
              if (attachment.content) {
                try {
                  obj.content = JSON.parse(attachment.content);
                } catch (err) {
                  obj.error = err;
                }
              } else {
                obj.emptyContent = true;
              }
              attachments.push(obj);
            });
            deferred.resolve(attachments);
          }, function (error) {
            deferred.reject('Could not retrieve attachments: ' + error.data.message + ' -- ' + error.data.developerMessage);
          });
          return deferred.promise;
        },

        leaveCommentForTask: function (projectKey, taskKey, comment) {
          var deferred = $q.defer();
          $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/comment', comment).then(function (response) {
            deferred.resolve();
          }, function (error) {
            deferred.reject('Error leaving task comment: ' + error.data.message);
          });
          return deferred.promise;
        },

        saveSelectedLanguegeForUser : function (seletedLanguage) {
          var deferred = $q.defer();          
          $http.post(apiEndpoint + 'ui-state/' + $rootScope.accountDetails.login + '-' + '-default-language', seletedLanguage).then(function (response) {
            deferred.resolve();
          }, function (error) {
            deferred.reject('Error saving default language: ' + error.data.message);
          });
          return deferred.promise;
        },

        getSelectedLanguegeForUser : function () {
          var deferred = $q.defer();

          // get the list
          $http.get(apiEndpoint + 'ui-state/' + $rootScope.accountDetails.login + '-' + '-default-language').then(function (response) {
            deferred.resolve(response.data);
          }, function (error) {
            if (error.status === 404) {
              deferred.resolve({});
            } else {
              deferred.reject('Error retrieving default language for user');
            }
          });
          return deferred.promise;
        }


      };

    }])
;
