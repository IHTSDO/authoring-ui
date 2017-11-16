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
        templateUrl: 'components/review-tasks/reviewTasks.html'
      });
  })

  .controller('ReviewTasksCtrl', function MyReviewsCtrl($scope, $rootScope, $q, $timeout, ngTableParams, $filter, $modal, $location, scaService, snowowlService, notificationService, metadataService, hotkeys) {

      // clear task-related i nformation
      $rootScope.validationRunning = false;
      $rootScope.classificationRunning = false;

      // TODO Placeholder, as we only have the one tab at the moment
      $rootScope.pageTitle = 'Review Tasks';
      $scope.reviewTasks = null;
      $scope.projects = [];
      $scope.browserLink = '..';
    
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
      });

      // flags for displaying promoted tasks
      $scope.showPromotedReviews = false;
      // declare table parameters
      $scope.reviewTableParams = new ngTableParams({
          page: 1,
          count: 10,
          sorting: {updated: 'desc', name: 'asc'}
        },
        {
          filterDelay: 50,
          total: $scope.reviewTasks ? $scope.reviewTasks.length : 0, // length of
                                                                     // data
          getData: function ($defer, params) {

            if (!$scope.reviewTasks || $scope.reviewTasks.length === 0) {
              $defer.resolve([]);
            } else {

              var searchStr = params.filter().search;
              var mydata = [];

              if (searchStr) {
                mydata = $scope.reviewTasks.filter(function (item) {
                  return item.summary.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                    || item.projectKey.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                    || item.status.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                    || item.assignee.username.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                    || item.assignee.displayName.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                    || item.key.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                });
              } else {
                mydata = $scope.reviewTasks;
              }

              if (!$scope.showPromotedReviews) {
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

      $scope.toggleShowPromotedReviews = function () {
        $scope.showPromotedReviews = !$scope.showPromotedReviews;
        $scope.reviewTableParams.reload();
      };

      // TODO Workaround to capture full review functionality
      // Replace with loadAllTasks when endpoints are complete
      function loadTasks() {

        notificationService.sendMessage('Loading tasks...', 0);
        $scope.reviewTasks = null;

        scaService.getReviewTasks().then(function (response) {
          $scope.reviewTasks = response;
          if ($scope.reviewTasks) {
            notificationService.sendMessage('All tasks loaded', 5000);
          }
        });

      };

      $scope.goToConflicts = function (task) {

        // set the branch for retrieval by other elements
        metadataService.setBranchMetadata(task);

        // check for project lock
        snowowlService.getBranch(metadataService.getBranchRoot() + '/' + task.projectKey).then(function (response) {
          if (!response.metadata || response.metadata && !response.metadata.lock) {

            // check for task lock
            snowowlService.getBranch(metadataService.getBranchRoot() + '/' + task.projectKey + '/' + task.key).then(function (response) {
              if (!response.metadata || response.metadata && !response.metadata.lock) {
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
        if (task && !task.reviewer) {

          // re-retrieve task to doublecheck availability for assignment
          scaService.getTaskForProject(task.projectKey, task.key).then(function (response) {

            // if a reviewer specified, has been claimed since last task refresh
            // send warning and reload tasks
            if (response.reviewer) {
              notificationService.sendWarning('Review task ' + task.key + ' has been claimed by another user', 1000);
              loadTasks();
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
      $scope.isReviewer = function () {
        return accountService.isReviewer();
      };

      //
      // Multi-task selection/action functions
      //

      // Claimed tasks (right hand column)
      $scope.isClaimedTask = function (task) {
        return task.reviewer && $rootScope.accountDetails && task.reviewer.username === $rootScope.accountDetails.login;
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
        var updateObj = {
          'reviewer': {
            'username': ''
          }
        };

        // update all tasks and push promises into array
        angular.forEach($scope.getSelectedClaimedTasks(), function (task) {
          promises.push(scaService.updateTask(task.projectKey, task.key, updateObj));
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
        return task.status === 'In Review' && !task.reviewer;
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
        var updateObj = {
          'reviewer': {
            'username': $rootScope.accountDetails.login
          }
        };

        // update all tasks and push promises into array
        angular.forEach($scope.getSelectedUnclaimedTasks(), function (task) {
          promises.push(scaService.updateTask(task.projectKey, task.key, updateObj));
        });

        // on resolution of all promises
        $q.all(promises).then(function () {
          loadTasks();
        }, function (error) {
           loadTasks();
          notificationService.sendError('Unexpected error claiming reviews: ' + error);
        })
      };


// Initialization:  get tasks and classifications
      function initialize() {
        $scope.reviewTasks = [];

        // get all projects for task creation
//      scaService.getProjects().then(function (response) {
//        if (!response || response.length === 0) {
//          $scope.projects = [];
//          return;
//        } else {
//          $scope.projects = response;
//        }
//      });
        $scope.projects = metadataService.getProjects();

        // temporary workaround, restricting to WRPAS tasks
        // and getting
        loadTasks();

        /*
         // TODO Commented out until endpoints are fleshed out for review tasks
         // get tasks across all projects
         $scope.tasks = [];
         scaService.getTasks().then(function (response) {
         if (!response || response.length === 0) {
         $scope.tasks = [];
         return;
         }

         $scope.tasks = response;
         }, function (error) {
         });
         */
        /*
         // disable polling
         $timeout(function () {
         scaService.getTasks().then(function (response) {
         if (!response || response.length === 0) {
         $scope.tasks = [];
         return;
         }

         $scope.tasks = response;
         }, function (error) {
         });
         }, 30000);
         */

      }

      initialize();
    }
  )
;
