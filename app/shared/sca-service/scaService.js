'use strict';

angular.module('singleConceptAuthoringApp')
  .service('scaService', ['$http', '$rootScope','$routeParams', '$location', '$q', '$interval', 'notificationService', 'terminologyServerService', '$timeout', '$window', 'metadataService',
    function ($http, $rootScope, $routeParams, $location, $q, $interval, notificationService, terminologyServerService, $timeout, $window, metadataService) {

      var apiEndpoint = null;

      function setEndpoint(url) {
        apiEndpoint = url;
      }

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

      function getCRSRequests(projectKey, taskKey) {

        var deferred = $q.defer();

        // get the list
        $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/crs-request-list').then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          if (error.status === 404) {
            deferred.resolve([]);
          } else {
            deferred.reject('Error retrieving CRS request list');
          }
        });
        return deferred.promise;
      }
     
      function saveCRSRequest(projectKey, taskKey, requestId, requestUrl) {
        var deferred = $q.defer();

        getCRSRequests(projectKey, taskKey).then(function (list) {
          if (list.filter(function(item) { return item.crsId === requestId; }).length === 0) {
            list.push({crsId : requestId, requestUrl: requestUrl});
            $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/ui-state/crs-request-list', list).then(function (revisedList) {
              deferred.resolve(revisedList);
            }, function (error) {
              deferred.reject('Unexpected error updating the list of CRS requests for this task');
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

      function pollForGetTaskPromotionStatus(projectKey, taskKey, intervalTime) {
        var deferred = $q.defer();
        if (!intervalTime) {
          intervalTime = 1000;
        }

        $timeout(function () {
          $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/promote/status').then(function (response) {
            // if review is ready, get the details
            if (response && response.data && (response.data.status === 'Promotion Complete' || response.data.status === 'CONFLICTS')) {
              deferred.resolve(response.data);
            } else if (response && response.data && response.data.status === 'Promotion Error') {
              deferred.reject(response.data.message);
            } else {
              pollForGetTaskPromotionStatus(projectKey, taskKey, 3000).then(function (pollResults) {
                deferred.resolve(pollResults);
              }, function (error) {
                deferred.reject(error);
              });
            }
          }, function (error) {
            deferred.reject();
          });
        }, intervalTime);

        return deferred.promise;
      }

      function pollForGetProjectPromotionStatus(projectKey, taskKey, intervalTime) {
        var deferred = $q.defer();
        if (!intervalTime) {
          intervalTime = 1000;
        }

        $timeout(function () {
          $http.get(apiEndpoint + 'projects/' + projectKey + '/promote/status').then(function (response) {
            // if review is ready, get the details
            if (response && response.data && (response.data.status === 'Promotion Complete' || response.data.status === 'CONFLICTS')) {
              deferred.resolve(response.data);
            } else if (response && response.data && response.data.status === 'Promotion Error') {
              deferred.reject(response.data.message);
            } else {
              pollForGetProjectPromotionStatus(projectKey, taskKey, 3000).then(function (pollResults) {
                deferred.resolve(pollResults);
              }, function (error) {
                deferred.reject(error);
              });
            }
          }, function (error) {
            deferred.reject();
          });
        }, intervalTime);

        return deferred.promise;
      }

      function pollForGetTaskRebaseStatus(projectKey, taskKey, intervalTime) {
        var deferred = $q.defer();
        if (!intervalTime) {
          intervalTime = 1000;
        }

        $timeout(function () {
          $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/rebase/status').then(function (response) {
            // if review is ready, get the details
            if (response && response.data && (response.data.status === 'Rebase Complete' || response.data.status === 'CONFLICTS')) {
              deferred.resolve(response.data);
            } else if (response && response.data && response.data.status === 'Rebase Error') {
              deferred.reject(response.data.message);
            } else {
              pollForGetTaskRebaseStatus(projectKey, taskKey, 3000).then(function (pollResults) {
                deferred.resolve(pollResults);
              }, function (error) {
                deferred.reject(error);
              });
            }
          }, function (error) {
            deferred.reject();
          });
        }, intervalTime);

        return deferred.promise;
      }

      function pollForGetProjectRebaseStatus(projectKey, intervalTime) {
        var deferred = $q.defer();
        if (!intervalTime) {
          intervalTime = 1000;
        }

        $timeout(function () {
          $http.get(apiEndpoint + 'projects/' + projectKey + '/rebase/status').then(function (response) {
            // if review is ready, get the details
            if (response && response.data && (response.data.status === 'Rebase Complete' || response.data.status === 'CONFLICTS')) {
              deferred.resolve(response.data);
            } else if (response && response.data && response.data.status === 'Rebase Error') {
              deferred.reject(response.data.message);
            } else {
              pollForGetProjectRebaseStatus(projectKey, 3000).then(function (pollResults) {
                deferred.resolve(pollResults);
              }, function (error) {
                deferred.reject(error);
              });
            }
          }, function (error) {
            deferred.reject();
          });
        }, intervalTime);

        return deferred.promise;
      }

      var stompClient;

      var stompFailureCallback = function () {
          stompClient.disconnect();
          setTimeout(function() {
            stompConnect();
          }, 5000);
          console.log('STOMP: Reconecting in 5 seconds');
      };

      var subscriptionHandler = function(message) {

          var newNotification = JSON.parse(message.body)
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

              /*
                Promotion completion object structure
                {
                project: "WRPAS",
                task: "WRPAS-76",
                entityType: "Promotion",
                event: "Task successfully promoted"}
                */
              case 'Promotion':
                msg = newNotification.event;
                if (newNotification.task) {
                  msg += ' for ' + newNotification.task;
                  if(!$routeParams.taskKey || newNotification.task !== $routeParams.taskKey) {
                    url = '#/tasks/task/' + newNotification.project + '/' + newNotification.task + '/edit';
                    notificationService.sendMessage(msg, 0, url);
                  } else {
                    notificationService.sendMessage(msg, 0);
                  }
                } else {
                  msg += ' for ' + newNotification.project;
                  if(!$routeParams.projectKey || newNotification.project !== $routeParams.projectKey) {
                    url = '#/project/' + newNotification.project;
                    notificationService.sendMessage(msg, 0, url);
                  } else {
                    notificationService.sendMessage(msg, 0);
                  }
                }
                $rootScope.$broadcast('promotion.completed', {project: newNotification.project, task: newNotification.task});
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
                notificationService.sendMessage(msg, 0, url);
                break;

              /*
                Classification completion object structure
                entityType: "Classification"
                event: "Classification completed successfully"
                project: "WRPAS"
                task: "WRPAS-98" (omitted for project)
                */
              case 'Classification':
                msg = newNotification.event + ' for ' + (newNotification.task ? 'task ' + newNotification.task : newNotification.project ? 'project ' + newNotification.project : 'code system ' + metadataService.getCodeSystenForGivenBranch(newNotification.branchPath).shortName);

                // retrieve the latest classification
                // set url and broadcast classification complete to taskDetail.js or project.js
                if (!newNotification.task && newNotification.project) {
                  $rootScope.$broadcast('reloadProject', {project: newNotification.project});
                } else if (!newNotification.task && !newNotification.project) {
                  $rootScope.$broadcast('reloadCodeSystem', {branchPath: newNotification.branchPath});
                }
                terminologyServerService.getClassificationsForBranchRoot(newNotification.branchPath).then(function (classifications) {
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
                    } else {
                      msg += ' - No changes found';
                    }

                    if (newNotification.task) {
                      url = '#/tasks/task/' + newNotification.project + '/' + newNotification.task + '/classify';
                      notificationService.sendMessage(msg, 0, url);
                      $rootScope.$broadcast('reloadTask', {project: newNotification.project, task: newNotification.task});
                    } else if (newNotification.project) {
                      url = '#/project/' + newNotification.project;
                      notificationService.sendMessage(msg, 0, url);
                    } else {
                      url = '#/codesystem/' + metadataService.getCodeSystenForGivenBranch(newNotification.branchPath).shortName;
                      notificationService.sendMessage(msg, 0, url);
                    }
                  }
                });

                break;

              /*
                Branch status change completion object structure
                entityType: "BranchState"
                event: "New Status" (listening for DIVERGED to handle the list refresh on the concepts page)
                */
              case 'BranchState':
                if (newNotification.event === 'DIVERGED') {
                  //$rootScope.$broadcast('branchDiverged');
                  $rootScope.$broadcast('notification.branchState', {project: newNotification.project, task: newNotification.task});
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
                  $rootScope.$broadcast('reloadTask', {project: newNotification.project, task: newNotification.task});
                } else {
                  url = '#/project/' + newNotification.project;
                  $rootScope.$broadcast('reloadProject', {project: newNotification.project});
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
                msg = 'Validation ' + event + ' for ' + (newNotification.task ? 'task ' + newNotification.task :  newNotification.project ? 'project ' + newNotification.project : 'code system ' + metadataService.getCodeSystenForGivenBranch(newNotification.branchPath).shortName);

                // do not supply a url (button link) for FAILED status
                if (event !== 'FAILED') {
                  if (newNotification.task) {
                    url = '#/tasks/task/' + newNotification.project + '/' + newNotification.task + '/validate';
                  } else if (newNotification.project) {
                    url = '#/project/' + newNotification.project;
                  } else {
                    url = '#/codesystem/' + metadataService.getCodeSystenForGivenBranch(newNotification.branchPath).shortName;
                  }
                }

                if (newNotification.task) {
                  $rootScope.$broadcast('reloadTask', {project: newNotification.project, task: newNotification.task});
                } else if (newNotification.project) {
                  $rootScope.$broadcast('reloadProject', {project: newNotification.project});
                } else {
                  $rootScope.$broadcast('reloadCodeSystem', {branchPath: newNotification.branchPath});
                }
                notificationService.sendMessage(msg, 0, url);
                break;

              /*
                BranchHead object structure
                entityType: "BranchHead"
                event: ""
                project: "WRPAS"
                task: "WRPAS-98" (omitted for project)
                */
              case 'BranchHead':
                  $rootScope.$broadcast('reloadSAC', {project: newNotification.project,  task: newNotification.task});
                  break;

              case 'AuthorChange':
                var msg = newNotification.event;
                if (newNotification.task) {
                  url = '#/tasks/task/' + newNotification.project + '/' + newNotification.task + '/edit';
                } else {
                  url = '#/project/' + newNotification.project;
                }

                notificationService.sendMessage(msg, 0, url);
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

      var stompSuccessCallback = function(frame) {
        var username = frame.headers['user-name'];
        if (!username) {
          $http.get(apiEndpoint + 'main').then(function() {
            stompFailureCallback();
          });
        } else {
          stompClient.subscribe('/topic/user/' + $rootScope.accountDetails.login + '/notifications', subscriptionHandler, {id : 'sca-subscription-id-' + $rootScope.accountDetails.login});
        }
      }

      function stompConnect() {
        let sockJsProtocols = ["websocket"]
        if (stompClient && stompClient !== null) {
            stompClient.disconnect();
            stompClient = null;
        }
        var socketProvider =  new SockJS(apiEndpoint + 'authoring-services-websocket', null, {transports: sockJsProtocols});
        stompClient = Stomp.over(socketProvider);
        stompClient.connect({}, stompSuccessCallback, stompFailureCallback);
      }

      return {
        setEndpoint: setEndpoint,
        getDialectMatches: getDialectMatches,
        getSuggestionMatches: getSuggestionMatches,
        saveCRSRequest: saveCRSRequest,
        getCRSRequests: getCRSRequests,

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
        getProjects: function (lightweight) {
          var params;
          if (lightweight) {
            params = 'lightweight=' + lightweight;
          } else {
            params = 'lightweight=false';
          }
          return $http.get(apiEndpoint + 'projects?' + params).then(
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
              }

              return response.data;
            }, function (error) {
              if (error.status === 403) {
                $location.path('/login');
              }
            }
          );
        },

        searchTasks: function (criteria) {
          return $http.get(apiEndpoint + 'projects/tasks/search?lightweight=true&criteria=' + decodeURIComponent(criteria)).then(
            function (response) {
              return response.data;
            }, function (error) {
              if (error.status === 403) {
                $location.path('/login');
              }
              else {
                console.error(error);
              }
            }
          );
        },

        getReviewTasks: function (excludePromoted) {
          return $http.get(apiEndpoint + 'projects/review-tasks?excludePromoted=' + (excludePromoted ? true : false)).then(
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
          var deferred = $q.defer();
          if (!projectKey) {
            console.error('Must specify projectKey to get a task for project');
            deferred.resolve({});
          }
          if (!taskKey) {
            console.error('Must specify taskKey to get a task for project');
          }
          $http.get(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey).then(
            function (response) {

              // temporary check to verify authentication on Edit component
              // will later be replaced by accountService call in app.js
//            $rootScope.accountDetails = response.data.assignee;

              deferred.resolve(response.data);
            }, function (error) {
              if (error.status === 403) {
                $location.path('/login');
              }
            }
          );
          return deferred.promise;
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
            console.log(uiState);
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
              deferred.reject('Unexpected error retrieving modified concept ids for task' + (typeof error.data.message !== 'undefined' ?': ' + error.data.message : ''));
            }
          });
          return deferred.promise;
        },

        ///////////////////////////////////////////////
        // Classification
        ///////////////////////////////////////////////

        // NOTE:  Task and project classification retrieval is done through
        // terminologyServerService

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

        // Start classification for a branch
        // POST /branches/{branch}/classification
        startClassificationForBranch: function (branch) {
          if (!branch) {
            console.error('Must specify branch to start classification');
            return {};
          }

          // POST call takes no data
          return $http.post(apiEndpoint + 'branches/' + branch + '/classifications', {}).then(function (response) {
            return response.data;
          }, function (error) {
            console.error('Error getting classification for branch ' + branch);
            return null;
          });

        },

        // Clear classification status cache for task
        // POST /projects/{projectKey}/tasks/{taskKey}/classification/status/cache-evict
        clearClassificationStatusCacheForTask: function (projectKey, taskKey) {
          var deferred = $q.defer();
          if (!projectKey) {
            deferred.reject('Must specify projectKey');
          }
          if (!taskKey) {
            deferred.reject('Must specify taskKe');
          }

          // POST call takes no data
          $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/classifications/status/cache-evict', {}).then(
            function () {
              deferred.resolve();
            }, function (error) {
              deferred.reject(error.statusText);
            }
          );

          return deferred.promise;
        },

        // Clear classification status cache for project
        // POST /projects/{projectKey}/classification/status/cache-evict
        clearClassificationStatusCacheForProject: function (projectKey) {
          var deferred = $q.defer();
          if (!projectKey) {
            deferred.reject('Must specify projectKey');
          }

          // POST call takes no data
          $http.post(apiEndpoint + 'projects/' + projectKey + '/classifications/status/cache-evict', {}).then(
            function () {
              deferred.resolve();
            }, function (error) {
              deferred.reject(error.statusText);
            }
          );

          return deferred.promise;
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
        startValidationForTask: function (projectKey, taskKey, enableMRCMValidation) {
          if (!projectKey) {
            console.error('Must specify projectKey to initiate validation');
            return {};
          }
          if (!taskKey) {
            console.error('Must specify taskKey to initiate validation');
            return {};
          }
          var param = '';
          if (typeof(enableMRCMValidation) !== 'undefined') {
            param += '?enableMRCMValidation=' + enableMRCMValidation;
          }

          // POST call takes no data
          return $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/validation' + param, {}).then(
            function (response) {
              return response;
            }, function (error) {
              console.error('Error starting validation for ' + projectKey + ', ' + taskKey);
              throw error.data.statusMessage;
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
            throw error.data.statusMessage;
          });

        },

// Initiate validation for a branch
// POST /branches/{branch}/validation
        startValidationForBranch: function (branch) {
          console.log(branch);
          if (!branch) {
            console.error('Must specify branch to start validation');
            return {};
          }

          // POST call takes no data
          return $http.post(apiEndpoint + 'branches/' + branch + '/validation', {}).then(function (response) {
            return response.data;
          }, function (error) {
            console.error('Error getting validation for branch ' + branch);
            throw error.data.statusMessage;
          });
        },

// Get validation for a branch
// GET /branches/{branch}/validation
        getValidationForBranch: function (branch) {
          if (!branch) {
            console.error('Must specify branch to get latest validation results');
            return {};
          }

          return $http.get(apiEndpoint + 'branches/' + branch + '/validation').then(function (response) {
            return response.data;
          }, function (error) {
            console.error('Error getting validation for branch ' + branch);
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

        updateProject: function (projectKey, object) {
          var deferred = $q.defer();
          $http.put(apiEndpoint + 'projects/' + projectKey, object).then(function (response) {
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
          var updateObj = {'status': 'IN_REVIEW', 'reviewers': [{'username': username}]};

          $http.put(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey, updateObj).then(function (response) {
            deferred.resolve(response);
          }, function (error) {
            deferred.reject(error.data.message);
          });
          return deferred.promise;
        },

        unassignReview: function (projectKey, taskKey, reviewers) {
          var deferred = $q.defer();
          var updateObj = {'status': 'IN_REVIEW', 'reviewers': reviewers};

          $http.put(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey, updateObj).then(function (response) {
            deferred.resolve(response);
          }, function (error) {
            deferred.reject(error.data.message);
          });
          return deferred.promise;
        },


        markTaskInProgress: function (projectKey, taskKey) {
          var deferred = $q.defer();
          var updateObj = {'status': 'IN_PROGRESS', 'reviewers': []};
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
            event: 'new',
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
          var deferred = $q.defer();
          $http.post(apiEndpoint + 'projects/' + projectKey + '/promote', {}).then(function (response) {
            pollForGetProjectPromotionStatus(projectKey, 1000).then(function (result) {
              deferred.resolve(result);
            }, function (error) {
              notificationService.sendError('Error promoting project : ' + error, 10000);
              deferred.reject(error);
            });
          }, function (error) {
            console.error('Error promoting project ' + projectKey);
            notificationService.sendError('Error promoting project', 10000);
            deferred.reject(error.message);
          });
          return deferred.promise;
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
          var deferred = $q.defer();
          $http.post(apiEndpoint + 'projects/' + projectKey + '/rebase', {}).then(function (response) {
            pollForGetProjectRebaseStatus(projectKey, 1000).then(function (result) {
              deferred.resolve(result);
            }, function (error) {
              notificationService.sendError('Error rebasing Project: ' + projectKey);
              deferred.reject(error);
            });
          }, function (error) {
            notificationService.sendError('Error rebasing Project: ' + projectKey);
            deferred.reject(error);
          });
          return deferred.promise;
        },
// POST /projects/{projectKey}/tasks/{taskKey}/promote
// Promote the task to the Project
        promoteTask: function (projectKey, taskKey) {
          var deferred = $q.defer();
          $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/promote', {}).then(function (response) {
            pollForGetTaskPromotionStatus(projectKey, taskKey, 1000).then(function (result) {
              deferred.resolve(result);
            }, function (error) {
               notificationService.sendError('Error promoting task : ' + error, 10000);
              deferred.reject(error);
            });
          }, function (error) {
            console.error('Error promoting task ' + projectKey);
            notificationService.sendError('Error promoting task', 10000);
            deferred.reject(error.message);
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
          if (!projectKey || !taskKey) return null;
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
          var deferred = $q.defer();
          $http.post(apiEndpoint + 'projects/' + projectKey + '/tasks/' + taskKey + '/rebase', {}).then(function (response) {
            pollForGetTaskRebaseStatus(projectKey, taskKey, 1000).then(function (result) {
              if(result.status === 'CONFLICTS'){
                  var message = result.message.substring(1, result.message.length -1);
                  message = "{" + message + "}";
                  message = JSON.parse(message);
                  var displayMessage = '';
                  if(message.apiError.additionalInfo.conflicts){
                      angular.forEach(message.apiError.additionalInfo.conflicts, function(conflict){
                          displayMessage = displayMessage + conflict.message + "; ";
                      })
                  }
                  else{
                      displayMessage = message.apiError.message;
                  }
                  notificationService.sendError('Error rebasing Task: ' + displayMessage);
              }
              deferred.resolve(result);
            }, function (error) {
              notificationService.sendError('Error rebasing Task: ' + projectKey + ', task ' + taskKey);
              deferred.reject(error);
            });
          }, function (error) {
            notificationService.sendError('Error rebasing Task: ' + projectKey + ', task ' + taskKey);
            deferred.reject(error);
          });
          return deferred.promise;
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

        connectWebsocket: function () {
          stompConnect();
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
                organization: attachment.organization,
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
        },

        getUsers : function (offset) {
          var deferred = $q.defer();

          // get the list
          $http.get(apiEndpoint + 'users?offset=' + offset).then(function (response) {
            deferred.resolve(response.data);
          }, function (error) {
            if (error.status === 404) {
              deferred.resolve({});
            } else {
              deferred.reject('Error retrieving users');
            }
          });
          return deferred.promise;
        },

        searchUsers : function (username, projectKeys, issueKey, maxResults, startAt) {
          var deferred = $q.defer();
          var params = 'username=' + username;
          params += '&projectKeys=' + projectKeys;
          params += '&issueKey=' + issueKey;
          params += '&maxResults=' + maxResults;
          params += '&startAt=' + startAt;

          // get the list
          $http.get(apiEndpoint + 'users/search?' + params).then(function (response) {
            deferred.resolve(response.data);
          }, function (error) {
            if (error.status === 404) {
              deferred.resolve([]);
            } else {
              deferred.reject('Error retrieving users');
            }
          });
          return deferred.promise;
        },

        removeIssueLink: function (issueKey, linkId) {
          if (!issueKey || !linkId) {
            console.error('Must specify task key or link issue key');
            return null;
          }

          return $http.delete(apiEndpoint + 'issue-key/' + issueKey +'/issue-link/'+ linkId).then(
            function (response) {
              return response;
            }, function (error) {
              return error;
            }
          );
        },

        getTechnicalIssueItems: function () {
          var deferred = $q.defer();

          // get the list
          $http.get(apiEndpoint + 'technical-issue-items').then(function (response) {
            deferred.resolve(response.data);
          }, function (error) {
            deferred.reject('Error retrieving technical issue items');
          });
          return deferred.promise;
        },

        requestConceptPromotion: function(conceptId, includeDependecies, projectKey, taskKey) {
          var deferred = $q.defer();
          var requestBody = {};
          requestBody.projectKey = projectKey;
          requestBody.taskKey = taskKey;
          requestBody.conceptId = conceptId;
          requestBody.includeDependencies = includeDependecies;
  
          $http.post(apiEndpoint + "request-concept-promotion", requestBody).then(function (response) {            
            var locHeader = response.headers('Location');
            deferred.resolve(locHeader);
          }, function (error) {              
              if (error && error.data && error.data.message) {
                var message = JSON.parse(error.data.message);
                if (typeof message === 'object') {
                  deferred.reject(message.message);
                } else {
                  deferred.reject(message);
                }
              }
              deferred.reject(error.statusText);
          });
  
          return deferred.promise;
        },

        getRVFFailureTicketAssociations: function(reportRunId) {
          var deferred = $q.defer();

          // get the list
          $http.get(apiEndpoint + 'validation-reports/' + reportRunId + '/failure-jira-associations').then(function (response) {
            deferred.resolve(response.data);
          }, function (error) {
            deferred.reject('Error retrieving Jira ticket');
          });
          return deferred.promise;
        },

        raiseRVFJiraTickets: function(branch, reportRunId, assertionIds) {
          var deferred = $q.defer();

          $http.post(apiEndpoint + "branches/" + branch + '/validation-reports/' + reportRunId + '/failure-jira-associations', assertionIds).then(function (response) {            
            deferred.resolve(response);
          }, function (error) {
            console.log(error);
              if (error && error.data && error.data.message) {
                deferred.reject(error.data.message);
              }
              deferred.reject(error.statusText);
          });
  
          return deferred.promise;
        },

        upgradeCodeSystem: function(codeSystem, newDependantVersion, selectedProjectKey) {
          var deferred = $q.defer();
          var queryParam = '';
          if (selectedProjectKey) {
            queryParam = '?generateEn_GbLanguageRefsetDelta=true&projectKey=' + selectedProjectKey;
          }          
          $http.post(apiEndpoint + 'codesystems/' + codeSystem + '/upgrade/' + newDependantVersion + queryParam).then(function (response) {
            var locHeader = response.headers('Location');            
            deferred.resolve(locHeader);
          }, function (error) {
            deferred.reject(error);
          });
  
          return deferred.promise;
        },

        getCodeSystemUpgradeJob: function(jobId) {
          var deferred = $q.defer();
          $http.get(apiEndpoint + 'codesystems/upgrade/' + jobId).then(function (response) {
            deferred.resolve(response.data);
          }, function (error) {
            deferred.reject(error);
          });
          return deferred.promise;
        }

      };

    }])
;
