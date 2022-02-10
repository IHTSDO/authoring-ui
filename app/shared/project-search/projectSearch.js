'use strict';
angular.module('singleConceptAuthoringApp')
  .controller('projectSearchCtrl', function ($scope, ngTableParams, $modalInstance, $location, $filter, notificationService, metadataService, scaService) {
    $scope.projects = metadataService.getProjects();

    // Update branch state in case its state has been changed
    scaService.getProjects(true).then(function (response) {      
      angular.forEach(response, function (c1) {
        angular.forEach($scope.projects, function (c2) {
          if (c1.key == c2.key && c2.branchState != c1.branchState) {
            c2.branchState = c1.branchState;
          }
        });
      });
      metadataService.setProjects(response);
    });

    $scope.projectsTableParams = new ngTableParams({
      page: 1,
      count: 10,
      sorting: {
        title: 'asc',
        lead: 'asc'
      },
      orderBy: 'title'
    },
    {
      filterDelay: 50,
      total: $scope.projects ? $scope.projects.length : 0, // length of data
      getData: function ($defer, params) {
          if (!$scope.projects || $scope.projects.length === 0) {
              $defer.resolve([]);
          } else {
              var searchStr = params.filter().search;
              var mydata = $scope.projects;
              if (searchStr) {
                mydata = mydata.filter(function (item) {
                  return item.title.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                  || item.projectLead.displayName.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                  || item.projectLead.username.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                  || item.key.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
                });
              }

              params.total(mydata.length);
              mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;
              $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
        }
      }
    );

    $scope.goToProject = function (project, newTab) {
      if (!project || !project.key) {
          notificationService.sendError('Unexpected error, cannot access task', 10000);
          return;
      }
      if(newTab) {
        window.open('#/project/' + project.key, '_blank');
      }
      else {
        $location.url('project/' + project.key);
        $scope.close();
      }
    };

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

	  // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };

  }
);
