'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('UpgradeCtrl', function ($scope, $rootScope, $routeParams, $location, $q, $timeout, terminologyServerService, scaService, notificationService) {
    $rootScope.pageTitle = 'Code System/<a href="#codesystem&#47;'+ $routeParams.codeSystem + '" target="_blank">' + $routeParams.codeSystem + '/Upgrade';

    $scope.upgradingText = null;
    $scope.upgradeStatus = null;
    var newDependantVersion = parseInt($routeParams.newDependantVersion.split('-').join(''));

    $scope.back = function() {
      $location.url('codesystem/' + $routeParams.codeSystem);
    };

    function proceedCodeSystemUpgrade(codeSystem) {
      $scope.upgradingText = 'Checking pre-integrity...';
      terminologyServerService.branchIntegrityCheck(codeSystem.branchPath).then(function(response) {
        if (response && response.empty == false) {
          $scope.upgradeStatus = 'Failed pre-integrity check'
          $scope.upgradingText = null;
        } else {
          $scope.upgradingText = 'Upgrading code system...';
          scaService.upgradeCodeSystem($routeParams.codeSystem, newDependantVersion).then(function(location) {
            var jobId = location.substr(location.lastIndexOf('/') + 1);
            scaService.saveSharedUiStateForTask($routeParams.codeSystem, $routeParams.codeSystem, 'code-system-upgrade-job', {jobId: jobId});
            waitAndDoPostIntegrityCheck(codeSystem, jobId);
          }, function(error) {
            $scope.upgradingText = null;
            $scope.upgradeStatus = 'Failed upgrade';
            if (error.message) {
              notificationService.sendError(error.message);
            }
          });
        }
      }, function(error) {
        notificationService.sendError('Branch integrity check failed. ' + error);
      });
    }

    function waitAndDoPostIntegrityCheck(codeSystem, jobId) {
      waitForCodeSystemUpgradeToComplete(jobId).then(function(upgradeJob) {
        if (upgradeJob.status === 'COMPLETED') {
          doPostIntegrityCheck(codeSystem);
        } else {
          $scope.upgradingText = null;
          $scope.upgradeStatus = 'Failed upgrade';
          if (upgradeJob.errorMessage) {
            notificationService.sendError(upgradeJob.errorMessage);
          }
        }                    
      });
    }

    function doPostIntegrityCheck(codeSystem) {
      $scope.upgradingText = 'Checking post-integrity...';
      terminologyServerService.branchIntegrityCheck(codeSystem.branchPath).then(function(response) {
        if (response && response.empty == false) {
          $scope.upgradeStatus = 'Upgrade completed with integrity failures';
        } else {
          $scope.upgradeStatus = 'Upgrade completed';
        }
        $scope.upgradingText = null;
      });
    }    

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

    ///////////////////////////////////////////
    function initialize() {
      notificationService.clear();
      terminologyServerService.getCodeSystem($routeParams.codeSystem).then(function (codeSystem) {
        if (codeSystem.userRoles && !codeSystem.userRoles.includes('ADMIN')) {
          notificationService.sendError('You must login as ADMIN to upgrade this code system.');
          return;
        }

        if (codeSystem.dependantVersionEffectiveTime === newDependantVersion) {
          notificationService.sendError('The code system has been upgraded to ' + $routeParams.newDependantVersion + ' version.');
        } else if (codeSystem.dependantVersionEffectiveTime > newDependantVersion) {
          notificationService.sendError('The new dependant version must be after the extensions current dependency release date.');
        } else {
          scaService.getSharedUiStateForTask($routeParams.codeSystem, $routeParams.codeSystem, 'code-system-upgrade-job').then(function(response){
            if (response && response.jobId) {
              scaService.getCodeSystemUpgradeJob(response.jobId).then(function (upgradeJob) {
                if (upgradeJob.status === 'RUNNING') {
                  $scope.upgradingText = 'Upgrading code system...';
                  $scope.upgradeStatus = null;
                  waitAndDoPostIntegrityCheck(codeSystem, response.jobId);
                } else {
                  proceedCodeSystemUpgrade(codeSystem);
                }
              });
            } else {
              proceedCodeSystemUpgrade(codeSystem);
            }
          });          
        }
      }, function(error) {
        notificationService.sendError('Code System not found.');
      });
    }

    initialize();
  });
