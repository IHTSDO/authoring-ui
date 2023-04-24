'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.codesystem', [
    //insert dependencies here
    'ngRoute'
  ])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/codesystem/:codeSystem', {
        controller: 'CodesystemCtrl',
        templateUrl: 'components/codesystem/codesystem.html',
        resolve: ['terminologyServerService', 'metadataService', 'permissionService', '$q', function(terminologyServerService, metadataService, permissionService, $q) {
            var defer = $q.defer();
            permissionService.setRolesForBranch(null, []);
            $q.all([terminologyServerService.getEndpoint(), metadataService.isProjectsLoaded()]).then(function() {
                defer.resolve();
            });
            return defer.promise;
          }
        ]
      })
      .when('/codesystem/:codeSystem/upgrade/:newDependantVersion', {
        controller: 'UpgradeCtrl',
        templateUrl: 'shared/upgrade/upgrade.html',
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

  .controller('CodesystemCtrl', ['$scope', '$rootScope', '$routeParams', '$modal', '$filter', 'metadataService', 'scaService', 'terminologyServerService', 'aagService', 'rnmService', 'notificationService', '$location', 'ngTableParams', 'accountService', 'promotionService', 'templateService', '$q', '$timeout','hotkeys','$interval', 'permissionService','modalService',
    function ProjectCtrl($scope, $rootScope, $routeParams, $modal, $filter, metadataService, scaService, terminologyServerService, aagService, rnmService, notificationService, $location, ngTableParams, accountService, promotionService, templateService, $q, $timeout,hotkeys,$interval, permissionService, modalService) {

      $rootScope.pageTitle = 'Code System/' + $routeParams.codeSystem;

      $scope.codeSystem = null;
      $scope.branch = null;
      $scope.projects = [];

      // initialize the containers
      $scope.validationContainer = null;
      $scope.dailyBuildValidationContainer = null;
      $scope.classificationContainer = null;

      // initialize the header notification
      $rootScope.classificationRunning = false;
      $rootScope.codeSystemUpgradeRunning = false;
      $rootScope.validationRunning = false;
      $rootScope.rebaseRunning = false;

      $scope.validationCollapsed = $location.search().expandValidation ? !$location.search().expandValidation : true;
      $scope.dailyBuildValidationCollapsed = true;
      $scope.exceptionListCollapsed = true;
      $scope.classificationCollapsed = $location.search().expandClassification ? !$location.search().expandClassification : true;
      $scope.lockOrUnlockProjectsInProgress = false;

      hotkeys.bindTo($scope)
      .add({
        combo: 'alt+y',
        description: 'Start classification',
        callback: function() {$scope.classify();}
      })
      .add({
        combo: 'alt+v',
        description: 'Start validation ',
        callback: function() {$scope.validate();}
      })
      .add({
        combo: 'alt+l',
        description: 'Go to notification link',
        callback: function() {
           $rootScope.$broadcast('gotoNotificationLink', {});
        }
      });

      $scope.getCodeSystem = function () {
          terminologyServerService.getCodeSystem($routeParams.codeSystem).then(function (codeSystem) {
              terminologyServerService.getBranch(codeSystem.branchPath).then(function (response) {
                  $scope.branch = codeSystem.branchPath;
                  if(codeSystem.dependantVersionEffectiveTime && codeSystem.dependantVersionEffectiveTime != ''){
                    let date = codeSystem.dependantVersionEffectiveTime.toString();
                    codeSystem.dependantVersionEffectiveTime = [date.slice(0, 4), date.slice(4,6), date.slice(6,8)].join('-');
                  }
                  $scope.codeSystem = codeSystem;

                  // set the extension metadata for use by other elements
                  metadataService.setExtensionMetadata(response.metadata);

                  // check wheter or not the latest dependant version was upgraded
                  terminologyServerService.getAllCodeSystemVersionsByShortName('SNOMEDCT').then(function (response) {
                    if (response.data.items && response.data.items.length > 0) {
                      var versions = response.data.items.sort(function (a, b) {
                        return b.effectiveDate - a.effectiveDate;
                      });
                      if (versions[0].version === codeSystem.dependantVersionEffectiveTime) {
                        $scope.upgradedToLastestDependantVersion = true;
                      }
                    }
                  });

                  // get the project list
                  reloadProjects();

                  // check if the EN-GB language refset presents
                  if (response.metadata && response.metadata.requiredLanguageRefsets) {
                    for (let i = 0; i < response.metadata.requiredLanguageRefsets.length; i++) {
                      if (response.metadata.requiredLanguageRefsets[i]['en'] === '900000000000508004') {
                        $scope.enGbLanguageRefsetPresent = true;
                        break;
                      }
                    }
                  }

                  response.branchPath = response.path;
                  response.codeSystem = codeSystem;
                  metadataService.setBranchMetadata(response);

                  if (response.hasOwnProperty('userRoles')) {
                    permissionService.setRolesForBranch($scope.branch, response.userRoles);
                    $scope.userRoles = response.userRoles;
                  } else {
                    permissionService.setRolesForBranch($scope.branch, []);
                  }

                  scaService.getValidationForBranch($scope.codeSystem.branchPath).then(function (response) {
                    if (response.dailyBuildReport) {
                      $scope.dailyBuildValidationContainer = {
                        'executionStatus': response.dailyBuildReport.status && response.dailyBuildReport.status === 'COMPLETE' ? 'COMPLETED' : response.dailyBuildReport.status,
                        'report': response.dailyBuildReport
                      };
                      if (response.dailyBuildRvfUrl) {
                        $scope.dailyBuildValidationContainer.rvfUrl = response.dailyBuildRvfUrl;
                      }
                      delete response.dailyBuildReport;
                      delete response.dailyBuildRvfUrl;
                    } else {
                      $scope.dailyBuildValidationContainer = {
                        'executionStatus': 'NOT_TRIGGERED'
                      };
                    }
                    $scope.validationContainer = response;
                    $rootScope.validationRunning = response && (response.executionStatus === 'SCHEDULED' || response.executionStatus === 'QUEUED' || response.executionStatus === 'RUNNING');
                  });
                  terminologyServerService.getClassificationsForBranchRoot(codeSystem.branchPath).then(function (classifications) {
                    if (classifications && classifications.length !== 0) {
                      $scope.classificationContainer = classifications[classifications.length - 1];
                      $rootScope.classificationRunning = $scope.classificationContainer.status === 'RUNNING' || $scope.classificationContainer.status === 'SCHEDULED' || $scope.classificationContainer.status === 'BUILDING';
                    }
                  });
              });
          });

      };

      $scope.isProjectLocked = function() {
        for(let i = 0; i < $scope.projects.length; i++) {
          if ($scope.projects[i].projectLocked) {
            return true;
          }
        }

        return false;
      };

      $scope.toggleLockProject = function() {
        if ($scope.isProjectLocked()) {
          modalService.confirm('Do you really want to unlock all projects against '+ $scope.codeSystem.name +'?').then(function () {
            notificationService.sendMessage('Unlocking projects...');
            $scope.lockOrUnlockProjectsInProgress = true;
            scaService.unlockProjects($scope.codeSystem.shortName).then(function() {
              reloadProjects().then(function() {
                $scope.lockOrUnlockProjectsInProgress = false;
                notificationService.sendMessage('Successfully unlocked projects');
              });
            }, function(error) {
              $scope.lockOrUnlockProjectsInProgress = false;
              notificationService.sendError('Error unlocking projects. Message : ' + (error.data ? error.data.message : error.message));
            });
          }, function () {
            // do nothing
          });
        } else {
          modalService.confirm('Do you really want to lock all projects against '+ $scope.codeSystem.name +'?').then(function () {
            notificationService.sendMessage('Locking projects...');
            $scope.lockOrUnlockProjectsInProgress = true;
            scaService.lockProjects($scope.codeSystem.shortName).then(function() {
              reloadProjects().then(function() {
                $scope.lockOrUnlockProjectsInProgress = false;
                notificationService.sendMessage('Successfully locked projects');
              });
            }, function(error) {
              $scope.lockOrUnlockProjectsInProgress = false;
              notificationService.sendError('Error locking projects. Message : ' + (error.data ? error.data.message : error.message));
            });
          }, function () {
            // do nothing
          });
        }
      };

      function reloadProjects() {
        var deferred = $q.defer();
        // get the project task list
        scaService.getProjects().then(function (projects) {
          $scope.projects = [];
          angular.forEach(projects, function (project) {
            let path = project.branchPath.substr(0, project.branchPath.lastIndexOf("/"));
            if(path === $scope.codeSystem.branchPath){
                $scope.projects.push(project);
            }
          });
          $scope.projectTableParams.reload();
          deferred.resolve();
        });

        return deferred.promise;
      }

      $scope.$on('reloadCodeSystem', function (event, data) {
        if (!data || data.branchPath === $scope.codeSystem.branchPath) {
          $scope.getCodeSystem();
        }
      });

      // task creation from codesystem page
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

      $scope.startNewAuthoringCycle = function() {
        notificationService.clear();
        modalService.confirm('Do you really want to start a new Authoring cycle for '+ $scope.codeSystem.name +'?').then(function () {
          notificationService.sendMessage('Starting new Authoring cycle...');
          terminologyServerService.startNewAuthoringCycle($scope.codeSystem.shortName).then(function() {
            notificationService.clear();
            terminologyServerService.getEndpoint().then(function(endpoint) {
              modalService.message('Success', 'Metadata for this codesystem have been updated. Click <a href="' + endpoint + 'branches/' + $scope.codeSystem.branchPath + '/metadata?includeInheritedMetadata=true" target="_blank">here</a> to review.');
            });
          }, function(error) {
            notificationService.sendError('Error starting new Authoring cycle: ' + error);
          })
        }, function () {
          // do nothing
        });
      };

      $scope.upgrade = function() {
        var modalInstance = $modal.open({
          templateUrl: 'shared/upgrade-modal/upgradeModal.html',
          controller: 'upgradeModalCtrl',
          resolve: {
            codeSystem: function () {
              return $scope.codeSystem;
            },
            enGbLanguageRefsetPresent: function() {
              return $scope.enGbLanguageRefsetPresent;
            }
          }
        });

        modalInstance.result.then(function () {
        }, function () {
        });
      }

      // classify the codesystem
      $scope.classify = function () {
        notificationService.sendMessage('Starting classification for codesystem...');
        scaService.startClassificationForBranch($scope.codeSystem.branchPath).then(function (response) {

          notificationService.sendMessage('Classification running', 10000);
          $scope.classificationContainer = response;
          $rootScope.classificationRunning = true;
          $timeout(function () {
            $scope.getCodeSystem();
          }, 2000);
        }, function (error) {
          notificationService.sendError('Error starting classification: ' + error);
        });
      };

      // validate the project
      $scope.validate = function () {
            doValidate();
      };

      function doValidate() {
        notificationService.sendMessage('Starting validation for codesystem...');
        scaService.startValidationForBranch($scope.codeSystem.branchPath).then(function (response) {
          notificationService.sendMessage('Validation running');
          $scope.validationContainer = { status : response };
          $rootScope.validationRunning = true;
          $timeout(function () {
            $scope.getCodeSystem();
          }, 2000);
        }, function (error) {
          notificationService.sendError('Error starting validation: ' + error);
        });
      }

      // tasks table params
      // declare table parameters
      $scope.projectTableParams = new ngTableParams({
          page: 1,
          count: 10,
          sorting: {updated: 'desc', name: 'asc'}
        },
        {
          filterDelay: 50,
          total: $scope.projects ? $scope.projects.length : 0, // length of
          // data
          getData: function ($defer, params) {

            if (!$scope.projects || $scope.projects.length === 0) {
              $defer.resolve([]);
            } else {

              var searchStr = params.filter().search;
              var mydata = [];

              if (searchStr) {
                mydata = $scope.projects.filter(function (item) {
                  return item.title.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.projectKey.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.status.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.assignee.username.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    item.assignee.displayName.toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    $scope.convertReviewersToText(item.reviewers,'username').toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    $scope.convertReviewersToText(item.reviewers,'displayName').toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                });
              } else {
                mydata = $scope.projects;
              }
              params.total(mydata.length);
              mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;

              $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }

          }
        }
      );

      $scope.getBranchStateText = function (project) {
          if (!project) {
            return null;
          }

          switch (project.branchState) {

            case 'UP_TO_DATE':
              return 'Up To Date';
            case 'FORWARD' :
              return 'Forward';
            case 'BEHIND':
              return 'Behind';
            case 'DIVERGED':
              return 'Diverged';
            case 'STALE':
              return 'Stale';
            default:
              return '??';
          }
        };

      $scope.viewProject = function (project) {
        $location.url('project/' + project.key);
      };

      $scope.viewCodeSystemMetadata = function () {
        return terminologyServerService.getEndpoint().then(function(endpoint) {
          window.open(endpoint + 'branches/' + $scope.codeSystem.branchPath + '/metadata?includeInheritedMetadata=true', '_blank');
        });
      };

      function waitForCodeSystemUpgradeToComplete(jobId) {
        var deferred = $q.defer();
        $timeout(function () {
          scaService.getCodeSystemUpgradeJob(jobId).then(function (data) {
            // if review is ready, get the details
            if (data && (data.status === 'COMPLETED' || data.status === 'FAILED')) {
              deferred.resolve(data);
            } else {
              waitForCodeSystemUpgradeToComplete(jobId).then(function (pollResults) {
                deferred.resolve(pollResults);
              }, function (error) {
                deferred.reject(error);
              });
            }
          }, function (error) {
            deferred.reject(error);
          });
        }, 5000);
        return deferred.promise;
      }

      // on load, retrieve tasks for project
      function initialize() {
        // initialize the project
        $scope.getCodeSystem();

        // Get uiState for project
        scaService.getUiStateForUser($routeParams.codeSystem + '-merge-review-id').then(function (mergeReviewId) {
          if (mergeReviewId) {
            var viewedMergePoll = null;

            viewedMergePoll = $interval(function () {
              terminologyServerService.getMergeReview(mergeReviewId).then(function (response) {
                if (response.status === 'PENDING' || response.status === 'CURRENT') {
                  $rootScope.rebaseRunning = true;
                } else {
                  $rootScope.rebaseRunning = false;
                  scaService.deleteUiStateForUser($routeParams.codeSystem + '-merge-review-id');
                  viewedMergePoll = $interval.cancel(viewedMergePoll);
                }
              });
            }, 2000);
          }
        });

        // check if any upgrade is running
        scaService.getSharedUiStateForTask($routeParams.codeSystem, $routeParams.codeSystem, 'code-system-upgrade-job').then(function(response){
          if (response && response.jobId) {
            scaService.getCodeSystemUpgradeJob(response.jobId).then(function (upgradeJob) {
              if (upgradeJob.status === 'RUNNING') {
                $rootScope.codeSystemUpgradeRunning = true;
                waitForCodeSystemUpgradeToComplete(response.jobId).then(function() {
                  $rootScope.codeSystemUpgradeRunning = false;
                });
              }
            });
          }
        });
      }

      //
      // Initialize on load
      //
      initialize();
    }]);
