'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.reviewTasks', [
  //insert dependencies here
  'ngRoute',
  'ngTable'
])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/review-tasks', {
        controller: 'ReviewTasksCtrl',
        templateUrl: 'components/review-tasks/reviewTasks.html',
        resolve: ['terminologyServerService', 'metadataService', 'permissionService', '$q', function(terminologyServerService, metadataService, permissionService, $q) {
          var defer = $q.defer();
          permissionService.setRolesForBranch(null, []);
          $q.all([terminologyServerService.getEndpoint(), metadataService.isProjectsLoaded()]).then(function() {
              defer.resolve();
          });
          return defer.promise;
          }
        ]
      });
  })

  .controller('ReviewTasksCtrl', function MyReviewsCtrl($scope, $rootScope, $q, $timeout, ngTableParams, $filter, $modal, $location, scaService, terminologyServerService, notificationService, metadataService, hotkeys, localStorageService, accountService) {

      // clear task-related i nformation
      $rootScope.validationRunning = false;
      $rootScope.classificationRunning = false;
      $rootScope.codeSystemUpgradeRunning = false;

      // TODO Placeholder, as we only have the one tab at the moment
      $rootScope.pageTitle = 'Review Tasks';
      $scope.reviewTasks = null;
      $scope.projects = [];
      $scope.browserLink = '..';
      $scope.preferences = {};

      $scope.typeDropdown = ['All'];
      $scope.selectedType = {type:''};
      $scope.selectedType.type = $scope.typeDropdown[0];

      if (!$rootScope.reviewTaskFilter || Object.keys($rootScope.reviewTaskFilter).length === 0) {
        $rootScope.reviewTaskFilter = {};
      }

      hotkeys.bindTo($scope)
        .add({
          combo: 'alt+t',
          description: 'Create a New Task',
          callback: function() {$scope.openCreateTaskModal();}
        })
        .add({
      combo: 'alt+l',
        description: 'Go to notification link',
        callback: function() {
           $rootScope.$broadcast('gotoNotificationLink', {});
        }
      });

      // flags for displaying new edit tasks
      $scope.showNewEdits = false;

      // flags for displaying promoted tasks
      $scope.showPromotedReviews = false;
      // declare table parameters
      $scope.reviewTableParams = new ngTableParams({
          page: 1,
          count: localStorageService.get('table-display-number') ? localStorageService.get('table-display-number') : 10,
          sorting: $rootScope.reviewTaskFilter.sorting ? $rootScope.reviewTaskFilter.sorting : {updated: 'desc', name: 'asc'}
        },
        {
          filterDelay: 50,
          total: $scope.reviewTasks ? $scope.reviewTasks.length : 0, // length of
                                                                     // data
          getData: function ($defer, params) {

            // Store display number to local storage, then can be re-used later
            if (!localStorageService.get('table-display-number')
                || params.count() !== localStorageService.get('table-display-number')) {
                localStorageService.set('table-display-number', params.count());
            }
            $rootScope.reviewTaskFilter.searchStr = params.filter().search;
            $rootScope.reviewTaskFilter.sorting = params.sorting();

            if (!$scope.reviewTasks || $scope.reviewTasks.length === 0) {
              $defer.resolve([]);
            } else {

              var searchStr = params.filter().search;

              var mydata = [];

              if($scope.selectedType.type !== 'All'){
                   mydata = $scope.reviewTasks.filter(function (item) {
                    if ($scope.selectedType.type === 'International') {
                      return !item.codeSystem.maintainerType
                    }
                    else if(item.codeSystem){
                        return item.codeSystem.maintainerType === $scope.selectedType.type
                    }
                    else return -1
                  });
                }

              if (searchStr) {
                if($scope.selectedType.type === 'All'){
                    mydata = $scope.reviewTasks;
                }
                mydata = mydata.filter(function (item) {
                  return item.summary.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                    || item.projectKey.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                    || item.status.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                    || item.assignee.username.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                    || item.assignee.displayName.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                    || item.key.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                });
              } else if ($scope.selectedType.type === 'All' && !searchStr) {
                mydata = $scope.reviewTasks;
              }

              if (!$scope.showPromotedReviews) {
                mydata = mydata.filter(function (item) {
                  return item.status !== 'Promoted';
                });
              }

              if ($scope.showNewEdits) {
                mydata = mydata.filter(function (item) {
                  return item.status === 'In Review' && $scope.hasNewEdits(item);
                });
              }

              params.total(mydata.length);

              mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;

              if(params.sorting().feedbackMessageDate === 'asc' || params.sorting().feedbackMessageDate === 'desc'){
                mydata.sort(function (a, b) {
                    return sortFeedbackFn(a, b, params.sorting().feedbackMessageDate);
                });
              }

              if(params.sorting().status === 'asc' || params.sorting().status === 'desc'){
                mydata.sort(function (a, b) {
                    return sortStatusFn(a, b, params.sorting().status);
                });
              }

              if(params.sorting().reviewer === 'asc' || params.sorting().reviewer === 'desc'){
                mydata.sort(function (a, b) {
                    return sortReviewFn(a, b, params.sorting().reviewer);
                });
              }

              $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }

          }
        }
      );

      function sortStatusFn (a, b, direction) {
        a.tempStatus = (a.status == 'In Review' && (!a.reviewers || a.reviewers.length === 0)) ? 'Ready for Review' : a.status;
        b.tempStatus = (b.status == 'In Review' && (!b.reviewers || b.reviewers.length === 0)) ? 'Ready for Review' : b.status;
        if (direction === 'asc') {
            var result = a.tempStatus.localeCompare(b.tempStatus);
            delete a.tempStatus;
            delete b.tempStatus;
            return result;
        } else {
            var result = b.tempStatus.localeCompare(a.tempStatus);
            delete a.tempStatus;
            delete b.tempStatus;
            return result;
        }
      }

      function sortReviewFn (a, b, direction) {
        a.tempStatus = a.reviewers && a.reviewers.length !== 0 ? 'claimed' : 'availables';
        b.tempStatus = b.reviewers && b.reviewers.length !== 0 ? 'claimed' : 'availables';
        if (direction === 'asc') {
            var result = a.tempStatus.localeCompare(b.tempStatus);
            delete a.tempStatus;
            delete b.tempStatus;
            return result;
        } else {
            var result = b.tempStatus.localeCompare(a.tempStatus);
            delete a.tempStatus;
            delete b.tempStatus;
            return result;
        }
      }

      function sortFeedbackFn (a, b, direction) {
        if (a.feedbackMessageDate && b.feedbackMessageDate &&
            a.feedbackMessagesStatus === 'unread' && b.feedbackMessagesStatus === 'unread') {
            var dateA = new Date(a.feedbackMessageDate);
            var dateB = new Date(b.feedbackMessageDate);
            if (direction === 'asc') {
                return dateA - dateB;
            } else {
                return dateB - dateA;
            }
        } else if (a.feedbackMessageDate && a.feedbackMessagesStatus === 'unread') {
            return -1;
        } else if (b.feedbackMessageDate && b.feedbackMessagesStatus === 'unread') {
            return 1;
        } else if (a.feedbackMessagesStatus === 'read') {
            return -1;
        } else if (b.feedbackMessagesStatus === 'read') {
            return 1;
        } else {
            return 0;
        }
      }

      $scope.toggleShowPromotedReviews = function () {
        $scope.showPromotedReviews = !$scope.showPromotedReviews;
        $rootScope.reviewTaskFilter.showPromoted = $scope.showPromotedReviews;
        loadTasks();
      };

      $scope.toggleShowNewEdits = function () {
        $scope.showNewEdits = !$scope.showNewEdits;
        $rootScope.reviewTaskFilter.showNewEdits = $scope.showNewEdits;
        $scope.reviewTableParams.reload();
      };

      $scope.matchTasksToProjects = function() {
            angular.forEach($scope.reviewTasks, function (task) {
                angular.forEach($scope.projects, function (project) {
                    if(task.projectKey === project.key && project.codeSystem){
                        task.codeSystem = project.codeSystem;
                    }
                });
            });
            console.log($scope.reviewTasks);
        }

      // TODO Workaround to capture full review functionality
      // Replace with loadAllTasks when endpoints are complete
      function loadTasks() {

        notificationService.sendMessage('Loading tasks...', 0);
        $scope.reviewTasks = null;
        $scope.reviewTableParams.filter()['search'] = $rootScope.reviewTaskFilter.searchStr ? $rootScope.reviewTaskFilter.searchStr : '';
        if ($rootScope.reviewTaskFilter.showPromoted) {
            $scope.showPromotedReviews = $rootScope.reviewTaskFilter.showPromoted;
        }
        if ($rootScope.reviewTaskFilter.showNewEdits) {
            $scope.showNewEdits = $rootScope.reviewTaskFilter.showNewEdits;
        }
        scaService.getReviewTasks($scope.showPromotedReviews ? false : true).then(function (response) {
          $scope.reviewTasks = response;
          $scope.matchTasksToProjects();
          if ($scope.reviewTasks.length !== 0) {
            getAllAwaitingCompletionStates();
          }
          if ($scope.reviewTasks) {
            notificationService.sendMessage('All tasks loaded', 5000);
          }
        });

      };

      $scope.goToConflicts = function (task) {

        // set the branch for retrieval by other elements
        metadataService.setBranchMetadata(task);

        // check for project lock
        terminologyServerService.getBranch(metadataService.getBranchRoot() + '/' + task.projectKey).then(function (response) {
          if (!response.locked) {

            // check for task lock
            terminologyServerService.getBranch(metadataService.getBranchRoot() + '/' + task.projectKey + '/' + task.key).then(function (response) {
              if (!response.locked) {
                $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/conflicts');
              }
              else {
                notificationService.sendWarning('Unable to start rebase on task ' + task.key + ' as the project branch is locked due to ongoing changes.', 7000);
              }
            });
          }
          else {
            notificationService.sendWarning('Unable to start rebase on task ' + task.key + ' as the project branch is locked due to ongoing changes.', 7000);
          }
        });
      };

      // on successful set, reload table parameters
      $scope.$watch('reviewTasks', function () {
        $scope.reviewTableParams.reload();
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
          loadTasks();
        }, function () {
        });
      };

      $scope.$on('reloadTasks', function (event, data) {
        loadTasks();
      });

      $scope.viewReviewTask = function (task) {

        // if no reviewer or task in progress, attempt to assign
        if (task && (!task.reviewers || task.reviewers.length === 0)) {

          // re-retrieve task to doublecheck availability for assignment
          scaService.getTaskForProject(task.projectKey, task.key).then(function (response) {

            // if a reviewer specified, has been claimed since last task refresh
            // send warning and reload tasks
            if (response.reviewers && response.reviewers.length !== 0) {
              notificationService.sendWarning('Review task ' + task.key + ' has been claimed by another user', 1000);
              loadTasks();
            } else if (response.status === 'Promoted' || response.status === 'Completed') {
              $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/edit');
            }

            // otherwise assign the current user
            else {

              if ($rootScope.accountDetails && $rootScope.accountDetails.login) {
                scaService.assignReview(task.projectKey, task.key, $rootScope.accountDetails.login).then(function () {
                  $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/feedback');
                });
              } else {
                notificationService.sendError('Cannot claim review: could not get account details');
              }
            }
          });
          // otherwise, simply go to feedback view
        } else {
          $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/feedback');
        }
      };

      //
      // Multi-task selection/action functions
      //

      // Claimed tasks (right hand column)
      $scope.isClaimedTask = function (task) {
        if (task.reviewers && task.reviewers.length !== 0 && $rootScope.accountDetails) {
          for (var i = 0; i < task.reviewers.length; i++) {
            if (task.reviewers[i].username === $rootScope.accountDetails.login) {
              return true;
            }
          }
          return false;
        }
        return false;
      };

      $scope.hasClaimedTasks = function () {
        return $scope.reviewTasks && $scope.reviewTasks.filter($scope.isClaimedTask).length > 0;
      };

      $scope.getSelectedClaimedTasks = function () {
        return $scope.reviewTasks ? $scope.reviewTasks.filter(function (task) {
          return $scope.isClaimedTask(task) && task.selectedClaimed;
        }) : [];
      };

      $scope.hasSelectedClaimedTasks = function () {
        return $scope.getSelectedClaimedTasks().length > 0;
      };

      $scope.toggleSelectAllClaimedTasks = function (val) {
        angular.forEach($scope.reviewTasks, function (task) {
          if ($scope.isClaimedTask(task)) {
            task.selectedClaimed = val;
          }
        });
      };

      $scope.unassignSelectedClaimedTasks = function () {
        var promises = [];

        // update all tasks and push promises into array
        angular.forEach($scope.getSelectedClaimedTasks(), function (task) {
          task.reviewers = task.reviewers ? task.reviewers : [];
          var i = task.reviewers.length;
          while (i--) {
            if (task.reviewers[i].username === $rootScope.accountDetails.login) {
              task.reviewers.splice(i, 1);
            }
          }
          promises.push(scaService.updateTask(task.projectKey, task.key, {'reviewers': task.reviewers}));
        });

        // on resolution of all promises
        $q.all(promises).then(function () {
           loadTasks();
        }, function (error) {
           loadTasks();
          notificationService.sendError('Unexpected error unclaiming reviews: ' + error);
        })
      };



      //
      // Bulk claim of available (unclaimed) review tasks
      //


      // Unclaimed tasks (left hand column)
      $scope.isUnclaimedTask = function (task) {
        return task.status === 'In Review' && !task.reviewers;
      };

      $scope.hasUnclaimedTasks = function () {
        return $scope.reviewTasks && $scope.reviewTasks.filter($scope.isUnclaimedTask).length > 0;
      };

      $scope.getSelectedUnclaimedTasks = function () {
        return $scope.reviewTasks ? $scope.reviewTasks.filter(function (task) {
          return task.selectedUnclaimed;
        }) : [];
      };

      $scope.hasSelectedUnclaimedTasks = function () {
        return $scope.getSelectedUnclaimedTasks().length > 0;
      };

      $scope.toggleSelectAllUnclaimedTasks = function (val) {
        angular.forEach($scope.reviewTasks, function (task) {
          if ($scope.isUnclaimedTask(task)) {
            task.selectedUnclaimed = val;
          }
        });
      };


      $scope.assignSelectedUnclaimedTasks = function () {
        var promises = [];

        // update all tasks and push promises into array
        angular.forEach($scope.getSelectedUnclaimedTasks(), function (task) {
          var reviewers = task.reviewers ? task.reviewers : [];
          reviewers.push({'username' : $rootScope.accountDetails.login});
          promises.push(scaService.updateTask(task.projectKey, task.key, {'reviewers': reviewers}));
        });

        // on resolution of all promises
        $q.all(promises).then(function () {
          loadTasks();
        }, function (error) {
           loadTasks();
          notificationService.sendError('Unexpected error claiming reviews: ' + error);
        })
      };

      $scope.hasNewEdits = function (task) {
        if (task && task.branchHeadTimestamp && task.feedbackMessageDate) {
          var branchModifiedDate = new Date(task.branchHeadTimestamp);
          var feedbackMessageDate = new Date(task.feedbackMessageDate);
          var viewDate = null;
          if (task.viewDate) {
            viewDate = new Date(task.viewDate);
          }
          return task.feedbackMessageDate && branchModifiedDate > feedbackMessageDate && viewDate < branchModifiedDate;
        }
        return false;
      }

      $scope.refreshTable = function () {
            $scope.preferences.selectedType = $scope.selectedType.type;
            accountService.saveUserPreferences($scope.preferences).then(function (response) {
            });
            $scope.reviewTableParams.reload();
      }

      function getAllAwaitingCompletionStates() {
        var promises = [];

        angular.forEach($scope.reviewTasks, function (task) {
          if(task.status === 'In Review') {
            promises.push(scaService.getUiStateForReviewTask(task.projectKey, task.key, 'awating-completion-state'));
          }          
        });

        // on resolution of all promises
        $q.all(promises).then(function (responses) {
          const awaitingCompletionStates = responses.filter(function (response) {
            return response !== null;
          });
          angular.forEach($scope.reviewTasks, function (task) {
            const awaitingCompletionState = awaitingCompletionStates.find(function (response) {
              return response.taskKey === task.key && response.projectKey === task.projectKey;
            });
            if (awaitingCompletionState) {
              task.awaitingCompletion = awaitingCompletionState.status;
            }
          });
        }, function (error) {
          console.error('Unexpected error retrieving the awaiting completion state: ' + error);
        });
      }

// Initialization:  get tasks and classifications
      function initialize() {
        $scope.reviewTasks = [];

        // get all projects for task creation
        $scope.projects = metadataService.getProjects();
        var anyInternationalProjectPresent = false;
        angular.forEach($scope.projects, function(project) {
          if (!project.codeSystem.maintainerType) {
            anyInternationalProjectPresent = true;
          }
          if(project.codeSystem && project.codeSystem.maintainerType && project.codeSystem.maintainerType !== undefined  && !$scope.typeDropdown.includes(project.codeSystem.maintainerType)){
              $scope.typeDropdown.push(project.codeSystem.maintainerType);
          }
        });
        if (anyInternationalProjectPresent && !$scope.typeDropdown.includes('International')) {
          $scope.typeDropdown.splice(1, 0, 'International');
        }
        accountService.getUserPreferences().then(function (preferences) {
          $scope.preferences = preferences;

          if(preferences.hasOwnProperty("selectedType")) {
            $scope.selectedType.type = $scope.preferences.selectedType;
          }
        });
        loadTasks();
      }

      initialize();
    }
  )
;
