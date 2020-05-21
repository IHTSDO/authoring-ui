angular.module('singleConceptAuthoringApp.transformationModal', [])
  .controller('transformationModalCtrl', function ($scope, $modalInstance, metadataService, scaService, templateService) {
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
      $("#translation-batch-file-label").html('File Selected: ' + $scope.selectedFile.name);
    };
    
    $scope.createTasks = function() {
      var errors = checkPrerequisites();
      if (errors.length > 0) {
        window.alert(errors.join('\n'));
        return;
      }
      let branchPath = getProjectBranchPath($scope.transformation.projectKey);
      templateService.createTransformationJob(branchPath, $scope.transformation.recipe, $scope.transformation.batchSize, $scope.transformation.projectKey, $scope.transformation.taskTitle, $scope.fd).then(function(jobId) {
        $modalInstance.close({branchPath: branchPath, recipe: $scope.transformation.recipe, jobId: jobId});
      }, function(error) {
        console.error('Error while transforming a job: ' + error)      
      });      
    };    

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

    function checkPrerequisites() {
      var error = [];
      
      if (!$scope.transformation.taskTitle) {
        error.push('No Task Title found');
      }
      if (!$scope.transformation.projectKey) {
        error.push('No Project found');
      }
      if (!$scope.transformation.recipe) {
        error.push('No Recipe found');
      }
      if (!$scope.selectedFile) {
        error.push('No Batch File found');
      }

      return error;
    }    

    function getUsers(start, end) {
      var expand =  'users[' + start + ':' + end + ']';
      scaService.getUsers(expand).then(function (response) {
        if (response.users.items.length > 0) {
          angular.forEach(response.users.items, function (item) {
            var user = {};
            user.avatarUrl = item.avatarUrls['16x16'];
            user.displayName = item.displayName;
            user.email = item.emailAddress;
            user.username = item.key;
            $scope.users.push(user);
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
