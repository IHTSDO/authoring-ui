'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.projects', [
  //insert dependencies here
  'ngRoute',
  'ngTable'
])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/projects', {
        controller: 'ProjectsCtrl',
        templateUrl: 'components/projects/projects.html',
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

  .controller('ProjectsCtrl', function ProjectsCtrl($scope, $rootScope, ngTableParams, $filter, $modal, scaService, terminologyServerService, $timeout, $q, notificationService, hotkeys, localStorageService, accountService, metadataService) {

    // clear task-related i nformation
    $rootScope.validationRunning = false;
    $rootScope.classificationRunning = false;
    $rootScope.codeSystemUpgradeRunning = false;
    $scope.preferences = {};

    // TODO Placeholder, as we only have the one tab at the moment
    $rootScope.pageTitle = "All Projects"
    $scope.projects = null;
    $scope.browserLink = '..';
    $scope.typeDropdown = ['All'];
    $scope.selectedType = {type:''};
    $scope.selectedType.type = $scope.typeDropdown[0];
    
    hotkeys.bindTo($scope)
        .add({
          combo: 'alt+t',
          description: 'Create a New Task',
          callback: function() {$scope.openCreateTaskModal();}
        })
        .add({
          combo: 'alt+l',
          description: 'Go to notification link',
          callback: function() {
             $rootScope.$broadcast('gotoNotificationLink', {});
          }
        });

    // declare table parameters
    $scope.tableParams = new ngTableParams({
        page: 1,
        count: localStorageService.get('projects-table-display-number') ? localStorageService.get('projects-table-display-number') : 10,
        sorting: {
          title: 'asc',
          lead: 'asc',
          latestClassificationJson: 'asc',
          validationStatus: 'asc'
        },
        orderBy: 'title'
      },
      {
        filterDelay: 50,
        total: $scope.projects ? $scope.projects.length : 0, // length of data
        getData: function ($defer, params) {

          // Store display number to local storage, then can be re-used later
          if (!localStorageService.get('projects-table-display-number') 
              || params.count() !== localStorageService.get('projects-table-display-number')) {
              localStorageService.set('projects-table-display-number', params.count());
          }  

          if (!$scope.projects || $scope.projects.length === 0) {
            $defer.resolve(new Array());
          } else {

            var searchStr = params.filter().search;
            var mydata = [];
            if($scope.selectedType.type !== 'All'){
               mydata = $scope.projects.filter(function (item) {
                if ($scope.selectedType.type === 'International') {
                  return !item.codeSystem.maintainerType
                }
                else if(item.codeSystem){
                    console.log(item.codeSystem.maintainerType === $scope.selectedType.type);
                    return item.codeSystem.maintainerType === $scope.selectedType.type
                }
                else return -1
              }); 
            }

            if (searchStr) {
              if($scope.selectedType.type === 'All'){
                  mydata = $scope.projects;
              }
              mydata = mydata.filter(function (item) {
                return item.title.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                || item.projectLead.displayName.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                || item.projectLead.username.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                || item.key.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
              });
            } else if ($scope.selectedType.type === 'All' && !searchStr) {
              mydata = $scope.projects;
            }
            params.total(mydata.length);
            mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;

            $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }

        }
      }
    );

    // on successful set, reload table parameters
    $scope.$watch('projects', function () {
      if (!$scope.projects || $scope.projects.length === 0) {
      }
      else {
        // add top-level element for ng-table sorting
        angular.forEach($scope.projects, function(project) {
          project.lead = project.projectLead.displayName;
          if(project.codeSystem && project.codeSystem.maintainerType && project.codeSystem.maintainerType !== undefined  && !$scope.typeDropdown.includes(project.codeSystem.maintainerType)){
             $scope.typeDropdown.push(project.codeSystem.maintainerType);
          }
        });
        accountService.getUserPreferences().then(function (preferences) {
            $scope.preferences = preferences;

            if(preferences.hasOwnProperty("selectedType")) {
              $scope.selectedType.type = $scope.preferences.selectedType;
            }
            $scope.tableParams.reload();
          });
      }

    }, true);

    $scope.$on('reloadProjectValidationStatus', function (event, data) {
      if (data && data.project) {
          for (var i = 0; i < $scope.projects.length; i++) {
              if (data.project === $scope.projects[i].key) {
                  scaService.getValidationForProject(data.project).then(function (response) {
                      $scope.projects[i].validationStatus = response.executionStatus;
                      $scope.tableParams.reload();
                  });
                  break;
              }
          }
      }
    });

    $scope.$on('reloadProjectClassification', function (event, data) {
      if (data && data.project) {
        for (var i = 0; i < $scope.projects.length; i++) {
            if (data.project === $scope.projects[i].key) {
                scaService.getProjectForKey(data.project).then(function (response) {
                    $scope.projects[i].latestClassificationJson = response.latestClassificationJson;
                    $scope.tableParams.reload();
                });
                break;
            }
        }
      }
    });
    
    $scope.refreshTable = function () {
        $scope.preferences.selectedType = $scope.selectedType.type;
        accountService.saveUserPreferences($scope.preferences).then(function (response) {
        });
        $scope.tableParams.reload();
    }

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

      modalInstance.result.then(function () {
      }, function () {
      });
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


    // Initialization:  get projects
    function initialize() {

      notificationService.sendMessage('Loading projects...');

      $scope.projects = [];      
      scaService.getProjects().then(function (response) {
        if (!response || response.length === 0) {
          $scope.projects = [];
          return;
        }

        $scope.projects = response;
        var anyInternationalProjectPresent = false;
        angular.forEach($scope.projects, function(project) {
          project.lead = project.projectLead.displayName;
          if (!project.codeSystem.maintainerType) {
            anyInternationalProjectPresent = true;
          }
          if(project.codeSystem && project.codeSystem.maintainerType && project.codeSystem.maintainerType !== undefined  && !$scope.typeDropdown.includes(project.codeSystem.maintainerType)){
              $scope.typeDropdown.push(project.codeSystem.maintainerType);
          }
        });
        if (anyInternationalProjectPresent && !$scope.typeDropdown.includes('International')) {
          $scope.typeDropdown.splice(1, 0, 'International');
        }
        accountService.getUserPreferences().then(function (preferences) {
            $scope.preferences = preferences;

            if(preferences.hasOwnProperty("selectedType")) {
              $scope.selectedType.type = $scope.preferences.selectedType;
            }
            notificationService.sendMessage('Projects loaded.', 5000);
            $scope.tableParams.reload();
          });

      }, function (error) {
        // TODO Handle errors
      });      
    }


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

      modalInstance.result.then(function () {
        initialize();
      }, function () {
      });
    };


    initialize();
  })
;
