'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('upgradeModalCtrl', function ($scope, $modalInstance, $location, terminologyServerService, codeSystem, enGbLanguageRefsetPresent, modalService, metadataService) {

    $scope.codeSystem = codeSystem;

    $scope.enGbLanguageRefsetPresent = enGbLanguageRefsetPresent;

    $scope.versions = [];

    $scope.projects = [];

    $scope.selectedVersion = null;

    $scope.selectedProject = null;

    $scope.copyEnGb = false;


    /////////////////////////////////////////
    // Modal control buttons
    /////////////////////////////////////////

    $scope.upgrade = function() {
      modalService.confirm('Do you really want to upgrade the ' + $scope.codeSystem.name + ' to the new ' + $scope.selectedVersion.version + ' International Edition?').then(function () {
        var queryParam = '';
        if ($scope.copyEnGb && $scope.selectedProject) {
          queryParam = '?projectKey=' + $scope.selectedProject;
        }
        $location.url('codesystem/' + $scope.codeSystem.shortName + '/upgrade/' + $scope.selectedVersion.version + queryParam);
        $modalInstance.close();
      }, function () {
        // do nothing
      });
    };

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

    /////////////////////////////////////////
    // Intialization
    /////////////////////////////////////////

    function initialize() {
      var dependantVersionEffectiveTime = parseInt($scope.codeSystem.dependantVersionEffectiveTime.split('-').join(''));
      terminologyServerService.getAllCodeSystemVersionsByShortName('SNOMEDCT').then(function (response) {
        if (response.data.items && response.data.items.length > 0) {
          $scope.versions = response.data.items.filter(function (item) {
            return item.effectiveDate > dependantVersionEffectiveTime;
          });
        }
      });

      var projects = metadataService.getProjects();
      var extensionMasterKey = $scope.codeSystem.shortName.substr($scope.codeSystem.shortName.indexOf('-') + 1);
      angular.forEach(projects, function (project) {
        let path = project.branchPath.substr(0, project.branchPath.lastIndexOf("/"));
        if(path === $scope.codeSystem.branchPath){
            $scope.projects.push(project);
        }
        if (project.key === extensionMasterKey) {
          $scope.selectedProject = project.key;
        }
      });
      if (!$scope.selectedProject && $scope.projects.length !== 0) {
        $scope.selectedProject = $scope.projects[0].key;
      }
    }

    initialize();
  });
