'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.project', [
    //insert dependencies here
    'ngRoute'
  ])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/project/:projectKey', {
        controller: 'ProjectCtrl',
        templateUrl: 'components/project/project.html',
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

  .controller('ProjectCtrl', ['$scope', '$rootScope', '$routeParams', '$modal', '$filter', 'metadataService', 'scaService', 'terminologyServerService', 'aagService', 'rnmService', 'notificationService', '$location', 'ngTableParams', 'accountService', 'promotionService', 'templateService', '$q', '$timeout','hotkeys','$interval', 'permissionService','modalService',
    function ProjectCtrl($scope, $rootScope, $routeParams, $modal, $filter, metadataService, scaService, terminologyServerService, aagService, rnmService, notificationService, $location, ngTableParams, accountService, promotionService, templateService, $q, $timeout,hotkeys,$interval, permissionService, modalService) {

      // project and project branch
      $scope.projectBranch = null;
      $scope.project = null;

      // initialize the containers
      $scope.validationContainer = null;
      $scope.classificationContainer = null;
      $scope.conflictsContainer = null;
      $scope.sac = null;
      $scope.creationDate = null;
      $scope.fullSac = [];
      $scope.firstHalfManualSac = [];
      $scope.secondHalfManualSac = [];
      $scope.lineItems = [];
      $scope.globalLineItems = [];
      $scope.releaseNotesDisabled = true;
      $scope.lockOrUnlockProjectInProgress = false;
      $scope.lockOrUnlockTaskInProgress = false;
      $scope.permanentExceptionListCollapsed = true;
      $scope.temporaryExceptionListCollapsed = true;

      // initialize the header notification
      $rootScope.classificationRunning = false;
      $rootScope.validationRunning = false;
      $rootScope.codeSystemUpgradeRunning = false;
      $scope.browserLink = '..';
      $rootScope.rebaseRunning = false;

      $scope.userRoles = [];

      var expandValidation = $location.search().expandValidation;
      var expandClassification = $location.search().expandClassification;
      $scope.validationCollapsed = expandValidation ? !expandValidation : true;
      $scope.classificationCollapsed = expandClassification ? !expandClassification : true;

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

      $scope.sacSignedOff = function () {
          let value = true;
          angular.forEach($scope.sac, function (criteria) {
              if (criteria.complete === false) {
                value = false;
              }
            });
          return value;
      }

      $scope.getProject = function (reloadValidationReport, validationNotificationOff) {
        scaService.getProjectForKey($routeParams.projectKey).then(function (response) {

          // detect code system for given branch
          const allCodeSystems = metadataService.getCodeSystems();
          if (allCodeSystems && allCodeSystems.length !== 0) {
            for (let i = 0; i < allCodeSystems.length; i++) {
              if (response.branchPath.startsWith('MAIN/SNOMEDCT-')
                  && allCodeSystems[i].branchPath.startsWith('MAIN/SNOMEDCT-')
                  && response.branchPath.startsWith(allCodeSystems[i].branchPath)) {
                $scope.codeSystemShortname = allCodeSystems[i].shortName;
                break;
              }
            }
            if (!$scope.codeSystemShortname) {
              for (let i = 0; i < allCodeSystems.length; i++) {
                if (allCodeSystems[i].branchPath === 'MAIN') {
                  $scope.codeSystemShortname = allCodeSystems[i].shortName;
                  break;
                }
              }
            }
            $rootScope.pageTitle = 'Project/<a href="#codesystem&#47;'+ $scope.codeSystemShortname + '" target="_blank">' + $scope.codeSystemShortname + '/' + $routeParams.projectKey;
          }

          aagService.getBranchSAC(response.branchPath, false).then(function (sac) {
              aagService.getBranchCriteria(response.branchPath).then(function (criteria) {
                  $scope.fullSac = [];
                  if (sac && sac.criteriaItems) {
                    $scope.fullSac = sac.criteriaItems;
                    $scope.sortSacLists(sac);
                  }
                  if(criteria && criteria.creationDateLong && criteria.creationDateLong !== null){
                      $scope.creationDate = criteria.creationDateLong;
                  }
                });
          });
          rnmService.getBranchLineItems('MAIN').then(function (lineItems) {
              if (lineItems) {
                angular.forEach(lineItems, function (item) {
                    if(item.title === "Content Development Activity"){
                        $scope.globalLineItems.push(item);
                    }
                });
              }
          });
          rnmService.getBranchLineItems(response.branchPath).then(function (lineItems) {
              if (lineItems) {
                $scope.lineItems = lineItems;
              }
          });

          // set the local project and branch for use by containers (classification/validation)
          $scope.project = response;
          $scope.project.projectDroolsValidationDisabled = response.metadata && response.metadata.enableDroolsInRVF && response.metadata.enableDroolsInRVF === 'false' ? true : false;
          $scope.branch = response.branchPath;

          // last rebased time
          terminologyServerService.getLastRebase($scope.branch).then(function (rebaseTime) {
            if (rebaseTime) {
              let date = new Date(rebaseTime);
              $scope.project.lastRebaseTime = date.toUTCString();
            }
          });
          // last rebased time
//          if ($scope.project.branchBaseTimestamp) {
//            let date = new Date($scope.project.branchBaseTimestamp);
//            $scope.project.lastRebaseTime =  date.toUTCString();
//          }

          // last promotion time to MAIN
          terminologyServerService.getLastPromotionTimeToMain($scope.branch).then(function (promotionTime) {
            if (promotionTime) {
              let date = new Date(promotionTime);
              $scope.project.lastPromotionTimeToMain = date.toUTCString();
            }
          });

          // last TASK promotion time to project
          terminologyServerService.getLastTaskPromotionTime($scope.branch).then(function (promotionTime) {
            if (promotionTime) {
              let date = new Date(promotionTime);
              $scope.project.lastTaskPromotionTime = date.toUTCString();
            }
          });



          terminologyServerService.getBranch(($scope.branch)).then(function(response) {
            if (response.hasOwnProperty('userRoles')) {
              $scope.userRoles = response.userRoles;
              permissionService.setRolesForBranch($scope.branch, response.userRoles);
            } else {
              permissionService.setRolesForBranch($scope.branch, []);
            }
            if (response.locked) {
              $scope.project.branchLocked = true;
            }
          });

          // set the branch metadata for use by other elements
          metadataService.setBranchMetadata($scope.project);

          // set the branch assertion groups for use by other elements
          $scope.branchAssertionGroupNames = $scope.project.metadata.assertionGroupNames ?
                                            $scope.project.metadata.assertionGroupNames.split(',') : [];

          // set the extension metadata for use by other elements
          metadataService.setExtensionMetadata($scope.project.metadata);
          populateModuleNamesIfRequired();

          $scope.releaseNotesDisabled = metadataService.isExtensionSet();

          $rootScope.classificationRunning = $scope.project.latestClassificationJson && ($scope.project.latestClassificationJson.status === 'RUNNING' || $scope.project.latestClassificationJson.status === 'SCHEDULED' || $scope.project.latestClassificationJson.status === 'BUILDING');
          $rootScope.validationRunning = $scope.project.validationStatus && ($scope.project.validationStatus === 'SCHEDULED' || $scope.project.validationStatus === 'QUEUED' || $scope.project.validationStatus === 'RUNNING');
          if ($rootScope.validationRunning) {
            refreshValidationIndicator($scope.project.validationStatus);
          }

          // get the latest validation for this project (if exists)
          if ($scope.project.validationStatus !== 'NOT_TRIGGERED') {
            scaService.getValidationForProject($scope.project.key).then(function (response) {
              if (response) {
                response.notificationOff = validationNotificationOff;
                response.reloadContainer = reloadValidationReport;
              }
              $scope.validationContainer = response;
            });
          }
        });
      };

      function populateModuleNamesIfRequired() {
        if ($scope.project.metadata && $scope.project.metadata.defaultModuleId) {
          let moduleIds = [];
          moduleIds.push($scope.project.metadata.defaultModuleId);
          if ($scope.project.metadata.expectedExtensionModules) {
            moduleIds = moduleIds.concat($scope.project.metadata.expectedExtensionModules);
          }
          // get the extension default module concept
          terminologyServerService.searchAllConcepts($scope.project.branchPath, moduleIds.join(), null, 0, 50, null, true, true).then(function (response) {
            angular.forEach(response.items, function (item) {
              metadataService.setModuleName(item.concept.conceptId, item.concept.fsn);
            });
          }, function (error) {
            notificationService.sendError('Fatal error: Could not load extension module concept');
          });
        }
      }

      $scope.viewProjectMetadata = function () {
        return terminologyServerService.getEndpoint().then(function(endpoint) {
          window.open(endpoint + 'branches/' + $scope.branch + '/metadata?includeInheritedMetadata=true', '_blank');
        });
      };

      $scope.$on('reloadProject', function (event, data) {
        if (!data || data.project === $routeParams.projectKey) {
          $scope.getProject(data.reloadValidationReport, data.validationNotificationOff);
        }
      });

      $scope.$on('reloadProjectValidationStatus', function (event, data) {
        if (!data || (data.project === $routeParams.projectKey && !data.reloadProject)) {
          scaService.getProjectForKey($routeParams.projectKey).then(function (response) {
            $rootScope.validationRunning = response.validationStatus && (response.validationStatus === 'SCHEDULED' || response.validationStatus === 'QUEUED' || response.validationStatus === 'RUNNING');
            if ($rootScope.validationRunning) {
              refreshValidationIndicator(response.validationStatus);
            }
          });
        }
      });

      function refreshValidationIndicator(validationStatus) {
        if ($scope.validationContainer) {
          $scope.validationContainer.executionStatus = validationStatus;
        }
        $timeout(function () {
          // Remove the old class and add the new one
          var messageElement = angular.element(document.querySelector('.validation-message-header'));
          if (messageElement.attr('class')) {
            var classStr = messageElement.attr('class');
            var classArr = classStr.split(' ');
            for (var i = 0; i < classArr.length; i++) {
              if (classArr[i].startsWith('message_validation_')) {
                messageElement.removeClass(classArr[i]);
              }
            }
          }
          messageElement.addClass('message_validation_' + validationStatus);

          var statusElement = angular.element(document.querySelector('.validation-status-header'));
          if (statusElement.attr('class')) {
            var classStr = statusElement.attr('class');
            var classArr = classStr.split(' ');
            for (var i = 0; i < classArr.length; i++) {
              if (classArr[i].startsWith('indicator_')) {
                statusElement.removeClass(classArr[i]);
              }
            }
          }
          statusElement.addClass('indicator_' + (validationStatus === 'QUEUED' ? 'yellow' : (validationStatus === 'SCHEDULED' ? 'blue' : 'purple')));
        }, 0);
      }

      // reload SAC
      $scope.$on('reloadSAC', function (event, data) {
        if (!data.task && data.project === $routeParams.projectKey) {
          aagService.getBranchSAC($scope.branch, false).then(function (sac) {
            $scope.sac = [];
            $scope.fullSac = [];
            if (sac && sac.criteriaItems) {
              $scope.fullSac = sac.criteriaItems;
              angular.forEach(sac.criteriaItems, function (criteria) {
                if (criteria.authoringLevel === "PROJECT") {
                  $scope.sac.push(criteria);
                }
              });
            }
          });
        }
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

      $scope.sortSacLists = function (sac){
          $scope.firstHalfManualSac = [];
          $scope.secondHalfManualSac = [];
          $scope.sac = [];
          if (sac && sac.criteriaItems) {
            angular.forEach(sac.criteriaItems, function (criteria) {
              if (criteria.authoringLevel === "PROJECT") {
                $scope.sac.push(criteria);
                if (criteria.manual && $scope.firstHalfManualSac.length < (sac.criteriaItems.length/2)) {
                    $scope.firstHalfManualSac.push(criteria);
                }
                else{
                    if(criteria.manual){
                        $scope.secondHalfManualSac.push(criteria);
                    }
                }
              }
          });
        };
      }

      $scope.acceptManualSac = function (id) {
          aagService.acceptBranchSAC($scope.branch, id).then(function (sac) {
              aagService.getBranchSAC($scope.branch, false).then(function (sac) {
                  $scope.sortSacLists(sac);
              });
          });
      };

      $scope.unacceptManualSac = function (id) {
          aagService.unacceptBranchSAC($scope.branch, id).then(function (sac) {
              aagService.getBranchSAC($scope.branch, false).then(function (sac) {
                  $scope.sortSacLists(sac);
              });
          });
      };

      $scope.openSACConfigModal = function () {
          var modalInstance = $modal.open({
            templateUrl: 'shared/sacconfig/sacconfig.html',
            controller: 'sacconfigCtrl',
            resolve: {
                branch: function() {
                  return $scope.branch;
                },
                criteria: function() {
                  return $scope.fullSac;
                }
              }
          });

          modalInstance.result.then(function () {
              aagService.getBranchSAC($scope.branch, false).then(function (sac) {
                  $scope.sac = [];
                  $scope.fullSac = [];
                  $scope.sortSacLists(sac);
                  if (sac && sac.criteriaItems) {
                    $scope.fullSac = sac.criteriaItems;
                  }
              });
          });
        };

      $scope.openReleaseNotesConfigModal = function () {
          var modalInstance = $modal.open({
            templateUrl: 'shared/releaseNotes/releaseNotesConfig.html',
            controller: 'releaseNotesConfigCtrl',
            resolve: {
                branch: function() {
                  return $scope.branch;
                },
                lineItems: function() {
                  return $scope.globalLineItems;
                }
              }
          });

          modalInstance.result.then(function () {
          });
      };

      $scope.openLineItemModal = function (id, all) {
          let item = {};
          let globalItems = [];

          angular.forEach($scope.lineItems, function (lineItem) {
            if (lineItem.id === id) {
              item = lineItem;
            }
          });

          let readOnly = false;
          if (all){
              readOnly = true;
          }
          else if(!$scope.userRoles.includes('PROJECT_LEAD') && !$scope.userRoles.includes('RELEASE_LEAD') && item.id) {
             readOnly = true;
          }

          var mode;
          if (readOnly) {
            mode = 'READ_ONLY';
          } else {
            if (item.id) {
              mode = 'EDIT';
            } else {
              mode = 'NEW';
            }
          }
          angular.forEach($scope.globalLineItems, function (lineItem) {
            if(lineItem.title === "Content Development Activity"){
                angular.forEach(lineItem.children, function (child) {
                  if ($scope.lineItems.filter(function(item) {return item.title === child.title}).length == 0) {
                    globalItems.push(child);
                  }
                });
            }
          });
          var modalInstance = $modal.open({
            templateUrl: 'shared/releaseNotes/lineItem.html',
            controller: 'lineItemCtrl',
            backdrop: readOnly ? '' : 'static',
            keyboard: readOnly ? true: false,
            resolve: {
                branch: function() {
                  return $scope.branch;
                },
                lineItem: function() {
                  return item;
                },
                lineItems: function() {
                  return $scope.lineItems;
                },
                globalLineItems: function() {
                  return globalItems;
                },
                mode: function() {
                  return mode;
                },
                isProject: function() {
                  return true;
                }
              }
          });

          modalInstance.result.then(function () {
              rnmService.getBranchLineItems($scope.branch).then(function (lineItems) {
                  if (lineItems && lineItems.length > 0) {
                    $scope.lineItems = [];
                    angular.forEach(lineItems, function (item) {
                        $scope.lineItems.push(item);
                    });
                    if($scope.lineItems.length === 1){
                        $scope.lineItem = $scope.lineItems[0];
                    }
                  }
                  else{
                      $scope.lineItems = [];
                      delete $scope.lineItem;
                  }
              });
          });
      };

      $scope.refsetUpdate = function (name) {
          modalService.confirm('This will update the relevant refset/s, create a new task and redirect you to it.  Continue?').then(function () {
              templateService.refsetUpdate($scope.project.key, name).then(function (response) {
                  $location.url('tasks/task/' + $scope.project.key + '/' + response + '/edit');
              });
            }, function () {
              // do nothing
            });
      };

      // lock/unlock project
      $scope.toggleLockProject = function() {
        if ($scope.project.projectLocked) {
          modalService.confirm('Do you really want to unlock this project?').then(function () {
            notificationService.sendMessage('Unlocking project...');
            $scope.lockOrUnlockProjectInProgress = true;
            scaService.unlockProject($routeParams.projectKey).then(function() {
              scaService.getProjectForKey($routeParams.projectKey).then(function (response) {
                $scope.project.projectLocked = response.projectLocked;
                $scope.lockOrUnlockProjectInProgress = false;
                notificationService.sendMessage('Successfully unlocked project');
              });
            }, function(error) {
              $scope.lockOrUnlockProjectInProgress = false;
              notificationService.sendError('Error unlocking project. Message : ' + (error.data ? error.data.message : error.message));
            });
          }, function () {
            // do nothing
          });
        } else {
          modalService.confirm('This action will disable promotion and rebase on this project. Do you want to proceed?', 'width: 125%;').then(function () {
            notificationService.sendMessage('Locking project...');
            $scope.lockOrUnlockProjectInProgress = true;
            scaService.lockProject($routeParams.projectKey).then(function() {
              scaService.getProjectForKey($routeParams.projectKey).then(function (response) {
                $scope.project.projectLocked = response.projectLocked;
                $scope.lockOrUnlockProjectInProgress = false;
                notificationService.sendMessage('Successfully locked project');
              });
            }, function(error) {
              $scope.lockOrUnlockProjectInProgress = false;
              notificationService.sendError('Error locking project. Message : ' + (error.data ? error.data.message : error.message));
            });
          }, function () {
            // do nothing
          });
        }
      }

      // classify the project
      $scope.classify = function () {
        notificationService.sendMessage('Starting classification for project...');
        scaService.startClassificationForProject($scope.project.key).then(function (response) {

          notificationService.sendMessage('Classification running', 10000);
          $scope.classificationContainer = response;
          $rootScope.classificationRunning = true;
          $timeout(function () {
            $scope.getProject();
          }, 2000);
        }, function (error) {
          notificationService.sendError('Error starting classification: ' + error);
        });
      };

      // validate the project
      $scope.validate = function () {
        checkPrerequisitesForValidation().then(function(message) {
          if (message) {
            modalService.confirm(message, 'white-space: pre-line;').then(function () {
              doValidate();
            });
          } else {
            doValidate();
          }
        });
      };

      function checkPrerequisitesForValidation() {
        var deferred = $q.defer();
        scaService.getProjectForKey($routeParams.projectKey).then(function (response) {
          let msg = null;
          let canConflict = false;
          if (response.branchState &&
            (response.branchState === 'BEHIND' || response.branchState === 'DIVERGED' || response.branchState === 'STALE')) {
            canConflict = true;
          }
          if (response.latestClassificationJson) {
            let latestClassificationJson = response.latestClassificationJson;
            if (latestClassificationJson.status === 'SAVED' &&
              (new Date(response.branchHeadTimestamp)).getTime() - (new Date(latestClassificationJson.saveDate)).getTime() < 1000) {
              msg = null;
            } else if ((new Date(latestClassificationJson.creationDate)).getTime() < response.branchHeadTimestamp) {
              msg = canConflict ? 'The project has not been rebased. \n\nThere are new changes on this project since the last classification. \n\nDo you still want to start a validation?' :
                                  'There are new changes on this project since the last classification. Do you still want to start a validation?';
            } else {
              if ((latestClassificationJson.inferredRelationshipChangesFound || latestClassificationJson.equivalentConceptsFound)
                && latestClassificationJson.status !== 'SAVED') {
                  msg = canConflict ? 'The project has not been rebased. \n\nClassification has been run, but the results have not been saved. \n\nDo you still want to start a validation?' :
                                      'Classification has been run, but the results have not been saved. Do you still want to start a validation?';
              }
            }
          } else {
            msg = canConflict ? 'The project has not been rebased. \n\nClassification has not been run. \n\nDo you still want to start a validation?' :
                                'Classification has not been run. Do you still want to start a validation?';
          }

          if (!msg && canConflict) {
            msg = 'Project has not been rebased. Do you still want to start a validation?';
          }
          deferred.resolve(msg);
        });
        return deferred.promise;
      }

      function doValidate() {
        notificationService.sendMessage('Starting validation for project...');
        scaService.startValidationForProject($scope.project.key).then(function (response) {
          $scope.validationContainer = { status : response };
          $timeout(function () {
            notificationService.sendMessage('Validation running');
            $scope.getProject();
          }, 2000);
        }, function (error) {
          notificationService.sendError('Error starting validation: ' + error);
        });
      }

      // rebase the project
      $scope.mergeAndRebase = function () {
        terminologyServerService.getBranch($scope.branch).then(function (response) {
          if (!response.locked) {
            $location.url('projects/project/' + $routeParams.projectKey + '/conflicts');
          }
          else {
            notificationService.sendWarning('Unable to start rebase on project as the root branch is locked due to ongoing changes.', 7000);
            $scope.project.branchLocked = true;
          }
        });
      };


      $scope.promote = function () {

        notificationService.sendMessage('Preparing for project promotion...');

        promotionService.checkPrerequisitesForProject($routeParams.projectKey).then(function (flags) {

          // detect whether any user warnings were detected
          var warningsFound = false;
          angular.forEach(flags, function (flag) {
            if (flag.checkWarning) {
              warningsFound = true;
            }
          });

          // if response contains no flags, simply promote
          if (!warningsFound) {
            terminologyServerService.getBranch($scope.branch).then(function (response) {
              if (!response.locked) {
                terminologyServerService.getBranch(metadataService.getBranchRoot()).then(function (response) {
                  if (!response.locked) {
                    notificationService.sendMessage('Promoting project...');
                    scaService.promoteProject($routeParams.projectKey).then(function (response) {
                      if (response.status === 'CONFLICTS') {
                        var merge = JSON.parse(response.message);
                        terminologyServerService.searchMerge(merge.source, merge.target, 'CONFLICTS').then( function(response) {
                          if (response && response.items && response.items.length > 0) {
                            var msg = '';
                            var conflictCount = 0;
                            angular.forEach(response.items, function (item) {
                              if (item.id == merge.id) {
                                angular.forEach(item.conflicts, function (conflict) {
                                  if (msg.length > 0) {
                                    msg = msg + ' \n';
                                  }
                                  msg += conflict.message;
                                  conflictCount++;
                                });
                              }
                            });
                            if (msg.length > 0) {
                              notificationService.sendError('Conflicts : ' + (conflictCount > 1 ?  ' \n' : '') + msg);
                            }
                          }
                        });
                      }
                    });
                  }
                  else {
                    notificationService.sendWarning('Unable to start rebase as branch root is locked due to ongoing changes.', 7000);
                  }
                });
              }
              else {
                notificationService.sendWarning('Unable to start rebase as the project branch is locked due to ongoing changes.', 7000);
              }
            });

          } else {
            notificationService.clear();
            var modalInstance = $modal.open({
              templateUrl: 'shared/promote-modal/promoteModal.html',
              controller: 'promoteModalCtrl',
              resolve: {
                flags: function () {
                  return flags;
                },
                isTask: function () {
                  return false;
                }
              }
            });

            modalInstance.result.then(function (proceed) {
              if (proceed) {
                terminologyServerService.getBranch($scope.branch).then(function (response) {
                  if (!response.locked) {
                    terminologyServerService.getBranch(metadataService.getBranchRoot()).then(function (response) {
                      if (!response.locked) {
                        notificationService.sendMessage('Promoting project...');
                        scaService.promoteProject($routeParams.projectKey).then(function (response) {
                          if (response.status === 'CONFLICTS') {
                            var merge = JSON.parse(response.message);
                            terminologyServerService.searchMerge(merge.source, merge.target, 'CONFLICTS').then( function(response) {
                              if (response && response.items && response.items.length > 0) {
                                var msg = '';
                                var conflictCount = 0;
                                angular.forEach(response.items, function (item) {
                                  if (item.id == merge.id) {
                                    angular.forEach(item.conflicts, function (conflict) {
                                      if (msg.length > 0) {
                                        msg = msg + ' \n';
                                      }
                                      msg += conflict.message;
                                      conflictCount++;
                                    });
                                  }
                                });
                                if (msg.length > 0) {
                                  notificationService.sendError('Conflicts : ' + (conflictCount > 1 ?  ' \n' : '') + msg);
                                }
                              }
                            });
                          } else {
                            $scope.getProject();
                          }
                        });
                      }
                      else {
                        notificationService.sendWarning('Unable to start rebase as branch root is locked due to ongoing changes.', 7000);
                      }
                    });
                  }
                  else {
                    notificationService.sendWarning('Unable to start rebase as the project branch is locked due to ongoing changes.', 7000);
                  }
                });
              } else {
                notificationService.clear();
              }
            }, function () {
            });
          }
        }, function (error) {
          notificationService.sendError('Unexpected error preparing for promotion: ' + error);
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
                    $scope.convertReviewersToText(item.reviewers,'username').toLowerCase().indexOf(searchStr.toLowerCase()) > -1 ||
                    $scope.convertReviewersToText(item.reviewers,'displayName').toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
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

      $scope.openBranchMetadataConfigModal = function() {
        $modal.open({
          templateUrl: 'shared/branch-metadata-config-modal/branchMetadataConfigModal.html',
          controller: 'branchMetadataConfigCtrl',
          resolve: {
            branch: function () {
              return $scope.branch;
            },
            title: function () {
              return 'project';
            },
            isCodeSystem: function () {
              return false;
            }
          }
        });
      };

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
          if (response) {
            if (response === 'DELETED') {
              initialize();
            } else {
              let updatedTask = response.data;
              angular.forEach($scope.tasks, function (task) {
                if (task.key === updatedTask.key) {
                  task.assignee = updatedTask.assignee;
                  task.summary = updatedTask.summary;
                  task.description = updatedTask.description;
                  task.authorKey = task.assignee ? task.assignee.displayName : '';
                }
              });
              $scope.taskTableParams.reload();
            }
          } else {
            // do nothing
          }
        }, function () {
        });
      };

      $scope.viewTask = function (task) {

        // determine destination based on role
        accountService.getRoleForTask(task).then(function (role) {
          switch (role) {
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
        }, function() {
          $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/edit');
        });
      };

      $scope.convertReviewersToText = function (reviewers, property) {
        if (reviewers) {
          var list = reviewers.map(a => a[property]);
          return list.join(', ');
        }
        return '';
      };

      $scope.toggleTaskPromotion = function () {
        if ($scope.project.taskPromotionDisabled) {
          modalService.confirm('This action will enable task promotion. Do you want to proceed?').then(function () {
            notificationService.sendMessage('Enabling task promotion...');
            $scope.lockOrUnlockTaskInProgress = true;
            scaService.updateProject($scope.project.key, {'taskPromotionDisabled': false}).then(function() {
              scaService.getProjectForKey($routeParams.projectKey).then(function (response) {
                $scope.project.taskPromotionDisabled = response.taskPromotionDisabled;
                $scope.lockOrUnlockTaskInProgress = false;
                notificationService.sendMessage('Successfully enabled task promotion');
              });
            }, function(error) {
              $scope.lockOrUnlockTaskInProgress = false;
              notificationService.sendError('Error enabling task promotion. Message : ' + (error.data ? error.data.message : error.message));
            });
          }, function () {
            // do nothing
          });
        } else {
          modalService.confirm('This action will disable task promotion. Do you want to proceed?').then(function () {
            notificationService.sendMessage('Disabling task promotion...');
            $scope.lockOrUnlockTaskInProgress = true;
            scaService.updateProject($scope.project.key, {'taskPromotionDisabled': true}).then(function() {
              scaService.getProjectForKey($routeParams.projectKey).then(function (response) {
                $scope.project.taskPromotionDisabled = response.taskPromotionDisabled;
                $scope.lockOrUnlockTaskInProgress = false;
                notificationService.sendMessage('Successfully disabled task promotion');
              });
            }, function(error) {
              $scope.lockOrUnlockTaskInProgress = false;
              notificationService.sendError('Error disabling task promotion. Message : ' + (error.data ? error.data.message : error.message));
            });
          }, function () {
            // do nothing
          });
        }
      };

      $scope.toggleProjectScheduledRebase = function () {
        $scope.project.projectScheduledRebaseDisabled = !$scope.project.projectScheduledRebaseDisabled;
        notificationService.sendMessage('Updating Project Scheduled Rebase...');
        scaService.updateProject($scope.project.key, {'projectScheduledRebaseDisabled': $scope.project.projectScheduledRebaseDisabled}).then(function (response) {
          notificationService.sendMessage('Project Scheduled Rebase successfully updated', 5000);
        }, function (error) {
          $scope.project.projectScheduledRebaseDisabled = !$scope.project.projectScheduledRebaseDisabled;
          notificationService.sendError('Error udpating Project Scheduled Rebase: ' + error);
        });
      };

      $scope.toggleProjectDroolsValidation = function () {
        $scope.project.projectDroolsValidationDisabled = !$scope.project.projectDroolsValidationDisabled;
        notificationService.sendMessage('Updating Project Drools Validation...');
        var metadata = {'enableDroolsInRVF': !$scope.project.projectDroolsValidationDisabled + ''}
        terminologyServerService.updateBranchMetadata($scope.branch, metadata).then(function (response) {
          notificationService.sendMessage('Project Drools Validation has been ' + ($scope.project.projectDroolsValidationDisabled ? 'disabled' : 'enabled') + ' successfully', 5000);
        }, function (error) {
          $scope.project.projectDroolsValidationDisabled = !$scope.project.projectDroolsValidationDisabled;
          notificationService.sendError('Error udpating Project Drools Validation: ' + error);
        });
      };

      $scope.userHasRole = function(requiredRoles) {
        return !requiredRoles || $scope.userRoles.filter(function(role) { return requiredRoles.indexOf(role) !== -1;}).length !== 0;
      };

      // on load, retrieve tasks for project
      function initialize() {
        // initialize the project
        $scope.getProject();

        // start monitoring of project
        scaService.monitorProject($routeParams.projectKey);

        // get the project task list
        scaService.getTasksForProject($routeParams.projectKey).then(function (response) {
          $scope.tasks = response;
          angular.forEach($scope.tasks, function (task) {
            task.authorKey = task.assignee ? task.assignee.displayName : '';
          });
          $scope.taskTableParams.reload();
        });

        // Get uiState for project
        scaService.getUiStateForUser($routeParams.projectKey + '-merge-review-id').then(function (mergeReviewId) {
          if (mergeReviewId) {
            var viewedMergePoll = null;

            viewedMergePoll = $interval(function () {
              terminologyServerService.getMergeReview(mergeReviewId).then(function (response) {
                if (response.status === 'PENDING' || response.status === 'CURRENT') {
                  $rootScope.rebaseRunning = true;
                } else {
                  $rootScope.rebaseRunning = false;
                  scaService.deleteUiStateForUser($routeParams.projectKey + '-merge-review-id');
                  viewedMergePoll = $interval.cancel(viewedMergePoll);
                }
              });
            }, 2000);
          }
        });
      }

      // on reload task broadcast, re-initialize
      $scope.$on('reloadTasks', function (event, data) {
        initialize();
      });

      $scope.$on('promotion.completed', function (event, data) {
        if (data && data.project === $routeParams.projectKey && !data.task) {
          $scope.getProject();
        }
      });

      //
      // Initialize on load
      //
      initialize();



    }]);
