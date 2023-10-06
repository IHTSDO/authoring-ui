'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('upgradeModalCtrl', function ($scope, $modalInstance, $location, $filter, $q, ngTableParams, terminologyServerService, codeSystem, enGbLanguageRefsetPresent, modalService, metadataService) {

    $scope.codeSystem = codeSystem;

    $scope.enGbLanguageRefsetPresent = enGbLanguageRefsetPresent;

    $scope.versions = [];

    $scope.projects = [];

    $scope.selectedVersion = null;

    $scope.selectedProject = null;

    $scope.copyEnGb = false;

    $scope.projectsLoading = false;

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
            var mydata = $scope.projects;
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

      $scope.projectsLoading = true;
      var allProjects = [];
      var extensionMasterKey = $scope.codeSystem.shortName.substr($scope.codeSystem.shortName.indexOf('-') + 1);
      angular.forEach(metadataService.getProjects(), function (project) {
        let path = project.branchPath.substr(0, project.branchPath.lastIndexOf("/"));
        if(path === $scope.codeSystem.branchPath){
            var clonedProject = angular.copy(project);            
            allProjects.push(clonedProject);
        }
        if (project.key === extensionMasterKey) {
          $scope.selectedProject = project.key;
        }
      });

      if (allProjects.length === 0) {
        $scope.projectsLoading = false;
      } else {
        var promises = [];

        // Fetch branch state for each project
        angular.forEach(allProjects, function (project) {
          promises.push(terminologyServerService.getBranch(project.branchPath));
        });

        // on resolution of all promises
        $q.all(promises).then(function (responses) {
          angular.forEach(allProjects, function (project) {
            angular.forEach(responses, function (response) {
              if (response.path === project.branchPath) {
                project.branchState = response.state;
              }
            });
          });
          $scope.projects = allProjects;
          $scope.projectsLoading = false;
          $scope.projectTableParams.reload();
        }, function (error) {});
      }

      if (!$scope.selectedProject && $scope.projects.length !== 0) {
        $scope.selectedProject = $scope.projects[0].key;
      }
      if ($scope.enGbLanguageRefsetPresent) {
        $scope.copyEnGb = true;
      }
    }

    initialize();
  });
