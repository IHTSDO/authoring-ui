angular.module('singleConceptAuthoringApp.transformationModal', [])
  .controller('transformationModalCtrl', function ($rootScope, $scope, $timeout, $modalInstance, metadataService, scaService, templateService, notificationService) {
    $scope.transformation = {};
    $scope.transformation.batchSize = 100;   
    
    $scope.projects = metadataService.getProjects();
    $scope.users = [];
    $scope.conceptsPerTaskOptions = [5, 10, 15, 20, 25, 50, 100, 200, 500];
    $scope.transformationRecipes = [];
    
    $scope.selectedFile = null;
    $scope.fd = null;   
    
    $scope.uploadFile = function(input) {
      var files = input.files;

      //Take the first selected file
      $scope.selectedFile = files[0];       
      
      $scope.fd = new FormData();     
      $scope.fd.append("tsvFile", $scope.selectedFile);
      // Refresh UI
      $timeout(function() {
        angular.element('#translation-batch-file-label').triggerHandler('click');
      }); 
    };
    
    $scope.createTasks = function() {
      var errors = $scope.checkPrerequisites();
      if (errors.length > 0) {
        window.alert(errors.join('\n'));
        return;
      }
      $scope.uploading = true;
      const branchPath = getProjectBranchPath($scope.transformation.projectKey);
      const assignee = $scope.transformation.assignee ? $scope.transformation.assignee.username : null;
      const reviewer = $scope.transformation.reviewer ? $scope.transformation.reviewer.username : null;
      templateService.createTransformationJob(branchPath, $scope.transformation.recipe, $scope.transformation.batchSize, $scope.transformation.projectKey, $scope.transformation.taskTitle, $scope.fd, assignee, reviewer).then(function(jobId) {
        $modalInstance.close({branchPath: branchPath, recipe: $scope.transformation.recipe, jobId: jobId, assignee: $scope.transformation.assignee});
      }, function(error) {
        notificationService.sendError('Error while transforming a job: ' + error.data.message)
        $scope.uploading = false;      
      });      
    };    

    $scope.getUsersForTypeahead = function (excludeUser) {
      if (!excludeUser) {
        return $scope.users;
      }        
      else {
        return $scope.users.filter(function(item) {
          return item.username !== excludeUser.username;
        })
      }
    }

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

    $scope.reloadTasks = function () {
      $modalInstance.close(true);
    };   
    
    function getProjectBranchPath(projectKey) {
      for (let i = 0; i < $scope.projects.length; i++) {
        if ($scope.projects[i].key === projectKey) {
          return $scope.projects[i].branchPath;
        }
      }

      return '';
    }

    $scope.checkPrerequisites = function () {
      var error = [];
      
      if (!$scope.transformation.taskTitle) {
        error.push('No Task Title found');
      }
      if (!$scope.transformation.projectKey) {
        error.push('No Project found');
      }
      if (!$scope.transformation.recipe) {
        error.push('No Import Type found');
      }
      if (!$scope.selectedFile) {
        error.push('No Batch File found');
      }

      return error;
    }    

    function getUsers(start, end) {
      scaService.getUsers(start,end).then(function (response) {
        if (response.users.items.length > 0) {
          angular.forEach(response.users.items, function (item) {
            var user = {};
            user.avatarUrl = item.avatarUrls['16x16'];
            user.displayName = item.displayName;
            user.email = item.emailAddress;
            user.username = item.name;
            $scope.users.push(user);

            if (user.username === $rootScope.accountDetails.login) {
              $scope.transformation.assignee = user;
            }
          });
        }

        if (response.users.size > end) {
          getUsers(start + 50, end + 50);
        }
      });
    }

    function getTransformationRecipes() {
      templateService.getTransformationRecipes().then(function(response) {
        $scope.transformationRecipes = response;
      });
    }

    function initialize() {            
      getUsers(0,50);
      getTransformationRecipes();
    }

    initialize();
  });
