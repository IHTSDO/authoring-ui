'use strict';

angular.module('singleConceptAuthoringApp.project', [
  //insert dependencies here
  'ngRoute'
])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/project/:projectKey', {
        controller: 'ProjectCtrl',
        templateUrl: 'components/project/project.html'
      });
  })

  .controller('ProjectCtrl', ['$scope', '$rootScope', '$routeParams', '$modal', '$filter', 'scaService', 'snowowlService', 'notificationService', '$location', 'ngTableParams', 'accountService', '$q',
    function ProjectCtrl($scope, $rootScope, $routeParams, $modal, $filter, scaService, snowowlService, notificationService, $location, ngTableParams, accountService, $q) {

      $rootScope.pageTitle = 'Project/' + $routeParams.projectKey;

      $scope.project = null;

      // initialize the containers
      $scope.validationContainer = null;
      $scope.classificationContainer = null;
      $scope.conflictsContainer = null;

      // initialize the header notifications
      $rootScope.classificationRunning = false;
      $rootScope.validationRunning = false;
      $scope.browserLink = '..';

      // set the branch
      $scope.branch = 'MAIN/' + $routeParams.projectKey;

      $scope.getProject = function () {
        scaService.getProjectForKey($routeParams.projectKey).then(function (response) {

          $scope.project = response;

          $rootScope.classificationRunning = $scope.project.latestClassificationJson && $scope.project.latestClassificationJson.status !== 'COMPLETED';
          $rootScope.validationRunning = $scope.project.validationStatus && $scope.project.validationStatus !== 'COMPLETED' && $scope.project.validationStatus !== 'NOT_TRIGGERED' && $scope.project.validationStatus !== 'FAILED';

          // get the latest classification for this project (if exists)
          if ($scope.project.latestClassificationJson && $scope.project.latestClassificationJson.status === 'COMPLETED') {
            snowowlService.getClassificationForProject($scope.project.key, $scope.project.latestClassificationJson.id, 'MAIN').then(function (response) {
              console.log(response);
              $scope.classificationContainer = response;
            });
          }

          // get the latest validation for this project (if exists)
          if ($scope.project.validationStatus && $scope.project.validationStatus === 'COMPLETED') {
            scaService.getValidationForProject($scope.project.key).then(function (response) {
              $scope.validationContainer = response;
            });
          }

          // TODO Retrieve rebase/conflicts report

        });
      };

      $scope.getProject();

      $scope.$on('reloadProject', function(event, data) {
        $scope.getProject();
      });

      // task creation from projects page
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

        modalInstance.result.then(function () {
        }, function () {
        });
      };

      function reloadProject() {
        scaService.getProjectForKey($scope.project.key).then(function (response) {
          $scope.project = response;
        });
      }

      // classify the project
      $scope.classify = function () {
        notificationService.sendMessage('Starting classification for project...');
        scaService.startClassificationForProject($scope.project.key).then(function (response) {

          notificationService.sendMessage('Classification running', 10000);
          $scope.classificationContainer = response;
          $rootScope.classificationRunning = true;
          $timeout(function() {
            $scope.getProject();
          }, 2000)
        }, function (error) {
          notificationService.sendError('Error starting classification: ' + error);
        });
      };

      // on load, retrieve latest validation
      scaService.getValidationForProject($routeParams.projectKey).then(function (response) {
        console.debug('latest validation', response);
        $scope.validationContainer = response;

      });

      // validate the project
      $scope.validate = function () {
        notificationService.sendMessage('Starting validation for project...');
        scaService.startValidationForProject($scope.project.key).then(function (response) {
          notificationService.sendMessage('Validation running');
          $scope.validationContainer.status = response;
          $rootScope.validationRunning = true;
          $timeout(function() {
            $scope.getProject();
          }, 2000)
        }, function (error) {
          notificationService.sendError('Error starting validation: ' + error);
        });
      };

      // rebase the project -- simply route to merge/rebase view
      $scope.mergeAndRebase = function () {
       $location.url('projects/project/{{project.key}}/conflicts');
      };

      /**
       *
       * Function to check a project for any promotion requirements not
       * fulfilled
       * @returns {*|promise}
       */
      function checkPromotionRequirements() {

        console.log('Checking Promotion requirements');
        var deferred = $q.defer();

        // the set of warning flags returned after checking requirements
        var flags = [];

        ////////////////////////////
        // Items Blocking Promotion
        ////////////////////////////

        // if project not defined, cannot promote
        if (!$scope.project) {
          flags.push({
            key: 'Project Verified',
            message: 'ERROR: Could not retrieve project status.  You may promote, but exercise extreme caution.',
            value: false
          });
          deferred.resolve(flags);

        } else {

          if (!$scope.project.latestClassificationJson) {
            flags.push({
              key: 'Classification Run',
              message: 'Classification was not started for this project. Promote only if you are sure your changes will not affect future classifications.',
              value: false
            });

            deferred.resolve(flags);
          } else {

            // get the ui state for classiifcation saving timestamp and status
            // information
            scaService.getUiStateForUser('classification-' + $scope.project.latestClassificationJson.id).then(function (classificationStatus) {

              // get the branch details
              snowowlService.getBranch('MAIN/' + $routeParams.projectKey).then(function (branchStatus) {

                  /////////////////////////////////////////
                  // Perform Checks
                  /////////////////////////////////////////

                  // declare the flags relevant to promotion with their
                  // user-displayed messages
                  flags.push({
                    key: 'Classification Completed',
                    message: 'Classification run did not complete for this project. Promote only if you are sure your changes will not affect future classifications.',
                    value: $scope.project.latestClassificationJson.status === 'COMPLETED' || $scope.project.latestClassificationJson.status === 'SAVING_IN_PROGRESS' || $scope.project.latestClassificationJson.status === 'SAVED'
                  });

                  // check if classification saved
                  flags.push({
                    key: 'Classification Accepted',
                    message: 'Classification was run for this project, but was not accepted. Promoting may dramatically impact the experience of other users.',
                    value: $scope.project.latestClassificationJson.status === 'SAVED'
                  });
                  /*

                   // if classification results were accepted, check that the
                   // results are current relative to project modifications
                   if ($scope.project.latestClassificationJson.status === 'SAVED') {
                   */

                  // if no classification status saved or saved state was not
                  // captured by application
                  if (!classificationStatus || classificationStatus.status === 'SAVING_IN_PROGRESS') {
                    flags.push({
                      key: 'Classification Current',
                      message: 'Classification was run, but could not determine if modifications were made after saving classification.  Promote only if you are sure no modifications were made after saving classification results.',
                      value: false
                    });
                  }

                  // otherwise compare the head timestamp of the branch to the
                  // saved timestamp of classification results acceptance
                  else {
                    flags.push({
                      key: 'Classification Current',
                      message: 'Classification was run, but modifications were made to the project afterwards.  Promote only if you are sure those changes will not affect future classifications.',
                      value: classificationStatus.timestamp > branchStatus.headTimestamp
                    });
                  }
                  // }

                  deferred.resolve(flags);
                },
                function (error) {
                  deferred.reject('Could not determine branch state');
                });
            });
          }

        }
        return deferred.promise;
      }

      // promote the project
      $scope.promote = function () {
        notificationService.sendMessage('Preparing for project promotion....');

        // force refresh of project status to ensure proper handling
        scaService.getProjectForKey($routeParams.projectKey).then(function (response) {
          if (response) {
            $scope.project = response;

            if ($scope.project.branchState === 'BEHIND' || $scope.project.branchState === 'DIVERGED' || $scope.project.branchState === 'STALE') {
              notificationService.sendError('Error promoting project -- rebase required first');
              return;
            }

            if ($scope.project.branchState === 'UP_TO_DATE') {
              notificationService.sendWarning('Cannot promote project -- already up to date');
              return;
            }

            // check promotion requirements and proceed accordingly
            checkPromotionRequirements().then(function (response) {

              console.log('Promotion flags: ', response);

              var flags = response;

              // if no response at all, indicates serious error
              if (!flags) {
                flags = [{
                  key: 'Promotion Requirements Checked',
                  message: 'Unexpected errors checking promotion requirements. This may indicate severe problems with the application. You may promote, but exercise extreme caution',
                  value: false
                }];
              }

              var falseFlagsFound = false;
              angular.forEach(flags, function (flag) {
                if (!flag.value) {
                  falseFlagsFound = true;
                }
              });

              // if response contains no flags, simply promote
              if (!falseFlagsFound) {
                notificationService.sendMessage('Promoting project...');
                scaService.promoteProject($routeParams.projectKey, $routeParams.projectKey).then(function (response) {
                  notificationService.sendMessage('Project successfully promoted', 5000);
                });
              } else {

                // cloear the preparation notification

                var modalInstance = $modal.open({
                  templateUrl: 'shared/promote-modal/promoteModal.html',
                  controller: 'promoteModalCtrl',
                  resolve: {
                    project: function () {
                      return $scope.project;
                    },
                    task: function () {
                      return null;
                    },
                    flags: function () {
                      return flags;
                    }
                  }
                });

                modalInstance.result.then(function (proceed) {
                  if (proceed) {
                    notificationService.sendMessage('Promoting project... TODO ENABLE PROMOTION AFTER DEV WORK');
                    /* scaService.promoteProject($routeParams.projectKey, $routeParams.projectKey).then(function (response) {
                     notificationService.sendMessage('Project successfully promoted', 5000);
                     $rootScope.$broadcast('reloadProject');
                     });*/
                  } else {
                    notificationService.clear();
                  }
                }, function () {
                });
              }
            }, function (error) {
              notificationService.sendError('Unexpected error preparing for promotion');
            });
          } else {
            notificationService.sendError('Error promoting project: Could not verify project was eligible for promotion');
          }
        });
      };

      // tasks table params
      // declare table parameters
      $scope.taskTableParams = new ngTableParams({
          page: 1,
          count: 10,
          sorting: {updated: 'desc', name: 'asc'}
        },
        {
          filterDelay: 50,
          total: $scope.tasks ? $scope.tasks.length : 0, // length of
          // data
          getData: function ($defer, params) {

            if (!$scope.tasks || $scope.tasks.length === 0) {
              $defer.resolve([]);
            } else {

              var searchStr = params.filter().search;
              var mydata = [];

              if (searchStr) {
                mydata = $scope.tasks.filter(function (item) {
                  return item.summary.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.projectKey.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.status.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.assignee.username.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.assignee.displayName.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.reviewer.username.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.reviewer.displayName.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                });
              } else {
                mydata = $scope.tasks;
              }
              params.total(mydata.length);
              mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;

              $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }

          }
        }
      );

      // on load, retrieve tasks for project
      function initialize() {
        scaService.getTasksForProject($routeParams.projectKey).then(function (response) {
          $scope.tasks = response;
          angular.forEach($scope.tasks, function (task) {
            task.authorKey = task.assignee ? task.assignee.displayName : '';
            task.reviewerKey = task.reviewer ? task.reviewer.displayName : '';
          });
          $scope.taskTableParams.reload();
        });
      }

      // on reload task broadcast, re-initialize
      $scope.$on('reloadTasks', function (event, data) {
        initialize();
      });

      $scope.editTask = function (task) {
        var modalInstance = $modal.open({
          templateUrl: 'shared/task/task.html',
          controller: 'taskCtrl',
          resolve: {
            task: function () {
              return task;
            },
            canDelete: function () {
              return true;
            }
          }
        });

        modalInstance.result.then(function (response) {
          console.debug('modal closed with response', response);
          if (response) {
            if (response === 'DELETED') {
              initialize();
            } else {
              $scope.task = response.data;
            }
          } else {
            // do nothing
          }
        }, function () {
        });
      };

      $scope.viewTask = function (task) {

        // determine destination based on role
        switch (accountService.getRoleForTask(task)) {
          case 'REVIWER':
            $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/feedback');
            break;
          case 'AUTHOR':
            $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/edit');
            break;
          default:
            $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/edit');
            break;
        }
      };

      initialize();

    }]);