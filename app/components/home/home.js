'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.home', [
        //insert dependencies here
        'ngRoute',
        'ngTable'
    ])

    .config(function config($routeProvider) {
        $routeProvider
            .when('/home', {
                controller: 'HomeCtrl',
                templateUrl: 'components/home/home.html'
            });
    })

    .controller('HomeCtrl', function HomeCtrl($scope, $rootScope, $timeout, ngTableParams, $filter, $modal, $location, scaService, snowowlService, notificationService, metadataService, hotkeys, $q, modalService) {

        // clear task-related i nformation
        $rootScope.validationRunning = false;
        $rootScope.classificationRunning = false;
        $rootScope.automatedPromotionInQueued = false;

        // TODO Placeholder, as we only have the one tab at the moment
        $rootScope.pageTitle = "My Tasks";
        $scope.tasks = null;
        $scope.browserLink = '..';

        // flags for displaying promoted tasks
        $scope.showPromotedTasks = false;
        $scope.showPromotedReviews = false;
    
        hotkeys.bindTo($scope)
            .add({
              combo: 'alt+n',
              description: 'Create a New Task',
              callback: function() {$scope.openCreateTaskModal();}
            })
            .add({
              combo: 'alt+l',
              description: 'Go to notification link',
              callback: function() {
                 $rootScope.$broadcast('gotoNotificationLink', {});
              }
            })
            .add({
              combo: 'alt+q',
              description: 'Close all concepts',
              callback: function() {$rootScope.$broadcast('closeAllOpenningConcepts', {});}
            });

        // declare table parameters
        $scope.tableParams = new ngTableParams({
                page: 1,
                count: 10,
                sorting: {updated: 'desc', name: 'asc'}
            },
            {
                filterDelay: 50,
                total: $scope.tasks ? $scope.tasks.length : 0, // length of data
                getData: function ($defer, params) {

                    if (!$scope.tasks || $scope.tasks.length === 0) {
                        $defer.resolve([]);
                    } else {

                        var searchStr = params.filter().search;
                        var mydata = [];


                        if (searchStr) {
                            mydata = $scope.tasks.filter(function (item) {
                                return item.summary.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                                    || item.projectKey.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                                    || item.status.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                                    || item.key.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                            });
                        } else {
                            mydata = $scope.tasks;
                        }

                        if (!$scope.showPromotedTasks) {
                            mydata = mydata.filter(function (item) {
                                return item.status !== 'Promoted';
                            });
                        }

                        params.total(mydata.length);
                        mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;

                        $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                    }

                }
            }
        );

        $scope.toggleShowPromotedTasks = function () {
            $scope.showPromotedTasks = !$scope.showPromotedTasks;
            loadTasks();
        };

        // TODO Workaround to capture full review functionality
        // Replace with loadAllTasks when endpoints are complete
        function loadTasks() {

            notificationService.sendMessage('Loading tasks...', 0);

            $scope.tasks = null;
            $scope.reviewTasks = null;
            scaService.getTasks($scope.showPromotedTasks ? false : true).then(function (response) {
                $scope.tasks = response;
                if ($scope.tasks) {
                    notificationService.sendMessage('All tasks loaded', 5000);
                }
            });
        }

        $scope.goToTask = function (task) {

            if (!task || !task.branchPath) {
                notificationService.sendError('Unexpected error, cannot access task');
            }
            $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/edit');
        };

        $scope.goToConflicts = function (task) {

            if (!task || !task.branchPath) {
                notificationService.sendError('Unexpected error, cannot access task');
            }
            var projectBranch = task.branchPath.substring(0, task.branchPath.lastIndexOf('/'));

            // check for project lock before continuing
            snowowlService.getBranch(projectBranch).then(function (response) {
                if (!response.metadata || response.metadata && !response.metadata.lock) {
                    scaService.getUiStateForTask(task.projectKey, task.key, 'edit-panel')
                        .then(function (uiState) {            
                            if (!uiState || Object.getOwnPropertyNames(uiState).length === 0) {
                              redirectToConflicts(task.branchPath,task.projectKey,task.key);
                            }
                            else {
                              var promises = [];                    
                              for (var i = 0; i < uiState.length; i++) {               
                                promises.push(scaService.getModifiedConceptForTask(task.projectKey, task.key, uiState[i]));
                              }
                              // on resolution of all promises
                              $q.all(promises).then(function (responses) {
                                var hasUnsavedConcept = responses.filter(function(concept){return concept !== null}).length > 0;
                                if (hasUnsavedConcept) {                                 
                                  modalService.message('There are some unsaved concepts. Please go to task editing and save them before rebasing.');
                                } else {
                                  redirectToConflicts(task.branchPath,task.projectKey,task.key);
                                }
                              });
                            }
                          }
                        );                  
                }
                else {
                    notificationService.sendWarning('Unable to open conflicts view for ' + task.key + ' as the project branch is locked due to ongoing changes.', 7000);
                }
            });
        };

        function redirectToConflicts(branchRoot, projectKey, taskKey) {
          // check for branch lock before continuing
          snowowlService.getBranch(branchRoot + '/' + projectKey).then(function (response) {
            if (!response.metadata || response.metadata && !response.metadata.lock) {
              $location.url('tasks/task/' + projectKey + '/' + taskKey + '/conflicts');
            }
            else {
              notificationService.sendWarning('Unable to open conflicts view on task ' + taskKey + ' as the project branch is locked due to ongoing changes.', 7000);
            }
          });
        }

        $scope.$watch('rebaseComplete', function () {
            $scope.tableParams.reload();
        }, true);

        // on successful set, reload table parameters
        $scope.$watch('tasks', function () {
            $scope.tableParams.reload();

        }, true);

        $scope.openCreateTaskModal = function () {
            var modalInstance = $modal.open({
                templateUrl: 'shared/task/task.html',
                controller: 'taskCtrl',
                resolve: {
                    task: function () {
                        return null;
                    },
                    canDelete: function () {
                        return false;
                    }
                }
            });

            modalInstance.result.then(function (response) {
                if (response) {
                    $scope.tasks.push(response);
                }
            }, function () {
            });
        };

        $scope.isProjectsLoaded = function() {
            var projects = metadataService.getProjects();
            return projects && projects.length > 0;
        };

        $scope.$on('reloadTasks', function (event, data) {
            loadTasks();
        });

// Initialization:  get tasks and classifications
        function initialize() {
            $scope.tasks = [];


            loadTasks();

        }

        initialize();
    })
;
