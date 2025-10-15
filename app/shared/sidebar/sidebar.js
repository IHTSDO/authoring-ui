'use strict';
angular.module('singleConceptAuthoringApp.sidebar', [])

  .controller('sidebarCtrl', ['$scope', '$rootScope', '$location', '$modal', '$q', '$timeout','metadataService','templateService', 'notificationService','accountService',
    function sidebarCtrl($scope, $rootScope, $location, $modal, $q, $timeout, metadataService, templateService, notificationService, accountService) {

      $scope.gotoBrowser = function() {
        window.open('/browser', '_blank');
      };

      $scope.gotoMyProjects = function() {
        $location.url('my-projects');
      };

      $scope.gotoAllProjects = function() {
        $location.url('projects');
      };

      $scope.gotoHome = function() {
        $location.url('home');
      };
      $scope.gotoReviews = function() {
        $location.url('review-tasks');
      };

      $scope.isProjectsLoaded = function() {
        var projects = metadataService.getProjects();
        return projects && projects.length > 0;
      };

      $scope.openCreateTaskModal = function () {
        var modalInstance = $modal.open({
          templateUrl: 'shared/task/task.html',
          controller: 'taskCtrl',
          resolve: {
            task: function() {
              return null;
            },
            canDelete: function() {
              return false;
            }
          }
        });

        modalInstance.result.then(function (response) {
          $rootScope.$broadcast('reloadTasks', {isCreateTask : true, concept : response});
        }, function () {
        });
      };

      $scope.openTaskSearchModal = function () {
        $modal.open({
            templateUrl: 'shared/task-search/taskSearch.html',
            controller: 'taskSearchCtrl',
            backdrop: 'static',
            size: 'large',
            resolve: {
                task: function () {
                    return null;
                },
                canDelete: function () {
                    return false;
                }
            }
        });
      };
      
      $scope.openUploadBatchModal = function() {
        var modalInstance = $modal.open({
          templateUrl: 'shared/transformation/transformationModal.html',
          controller: 'transformationModalCtrl'          
        });

        modalInstance.result.then(function (result) {
          $rootScope.batchFileUploading = true;
          // creates element for dialog download of classification data
          var dlcDialog = (function (data, fileName) {

            // create the hidden element
            var a = document.createElement('a');
            document.body.appendChild(a);

            return function (data, fileName) {
              var blob = new Blob([data], {type: 'text/tab-separated-values'}),
                  url = window.URL.createObjectURL(blob);
              a.href = url;
              a.download = fileName;
              a.click();
              window.URL.revokeObjectURL(url);
            };
          }());

          var pollForTransformation = function(branchPath, recipe, jobId, intervalTime) {
            var deferred = $q.defer();
      
            if (!jobId) {
              console.error('Cannot poll for Transformation details, id required');
              deferred.reject('Cannot poll for Transformation details, id required');
            }      
      
            $timeout(function () {
              templateService.getTransformationJob(branchPath, recipe, jobId).then(function (response) {
                if (response && response.status && (response.status.status === 'COMPLETED' || response.status.status === 'COMPLETED_WITH_FAILURE' || response.status.status === 'FAILED')) {
                  deferred.resolve(response);
                } else {
                  pollForTransformation(branchPath, recipe, jobId, intervalTime).then(function (pollResults) {
                    deferred.resolve(pollResults);
                  }, function (error) {
                    deferred.reject(error);
                  });
                }
              }, function (error) {
                deferred.reject('Cannot retrieve Transformation information');
              });
            }, intervalTime);
      
            return deferred.promise;
          };

          pollForTransformation(result.branchPath, result.recipe, result.jobId, 1000).then(function (response) {
            if (response.status.status === 'COMPLETED') {
              notificationService.sendMessage('Batch Upload Complete.');
            } 
            else if (response.status.status === 'COMPLETED_WITH_FAILURE') {
              notificationService.sendWarning('Batch Upload Completed With Error: ' + response.status.message);
            }
            else {
              notificationService.sendError('Batch Upload Failed: ' + response.status.message);               
            }  
            templateService.getTransformationJobResultAsTsv(result.branchPath , result.recipe, result.jobId).then(function (data) {
              const fileName = 'Batch_result_' + result.jobId + '.tsv';
              dlcDialog(data, fileName);
            });
            $rootScope.batchFileUploading = false;
            
            // reload tasks if no assignee or assignee is login user
            if (!result.assignee || result.assignee.username === $rootScope.accountDetails.login) {
              $rootScope.$broadcast('reloadTasks', {disableNotification: true});
            }            
          }, function (error) {            
          });        
        }, function () {
        });
      };

      function initialize() {
        accountService.getRoleForTask({}).then(function (role) {
          if (role === 'REVIEWER_ONLY') {
              $scope.isReviewerOnly = true;
          }
        });
      }

      initialize();
    }
  ]);
