'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.codesystems', [
  //insert dependencies here
  'ngRoute',
  'ngTable'
])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/codesystems', {
        controller: 'CodesystemsCtrl',
        templateUrl: 'components/codesystems/codesystems.html',
        resolve: ['terminologyServerService', 'metadataService', '$q', function(terminologyServerService, metadataService, $q) {
            var defer = $q.defer();
            $q.all([terminologyServerService.getEndpoint(), metadataService.isProjectsLoaded()]).then(function() {
                defer.resolve();
            });       
            return defer.promise;
          }
        ]
      });
  })

  .controller('CodesystemsCtrl', function CodesystemsCtrl($scope, $rootScope, ngTableParams, $filter, $modal, scaService, terminologyServerService, $timeout, $q, notificationService, hotkeys, localStorageService, accountService, metadataService) {

    // clear task-related i nformation
    $rootScope.validationRunning = false;
    $rootScope.classificationRunning = false;
    $scope.preferences = {};

    // TODO Placeholder, as we only have the one tab at the moment
    $rootScope.pageTitle = "All Code Systems"
    $scope.codesystems = null;
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
        count: localStorageService.get('codesystems-table-display-number') ? localStorageService.get('codesystems-table-display-number') : 10,
        sorting: {
          name: 'asc',
          shortName: 'asc'
        },
        orderBy: 'name'
      },
      {
        filterDelay: 50,
        total: $scope.codesystems ? $scope.codesystems.length : 0, // length of data
        getData: function ($defer, params) {

          // Store display number to local storage, then can be re-used later
          if (!localStorageService.get('codesystems-table-display-number') 
              || params.count() !== localStorageService.get('codesystems-table-display-number')) {
              localStorageService.set('codesystems-table-display-number', params.count());
          }  

          if (!$scope.codesystems || $scope.codesystems.length === 0) {
            $defer.resolve(new Array());
          } else {

            var searchStr = params.filter().search;
            var mydata = [];
            if($scope.selectedType.type !== 'All'){
               mydata = $scope.codesystems.filter(function (item) {
                if ($scope.selectedType.type === 'International') {
                  return !item.maintainerType
                }
                else if(item.maintainerType){
                    return item.maintainerType === $scope.selectedType.type
                }
                else return -1
              }); 
            }

            if (searchStr) {
              if($scope.selectedType.type === 'All'){
                  mydata = $scope.codesystems;
              }
              mydata = mydata.filter(function (item) {
                return item.name.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                || item.shortName.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
              });
            } else if ($scope.selectedType.type === 'All' && !searchStr) {
              mydata = $scope.codesystems;
            }
            params.total(mydata.length);
            mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;

            $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }

        }
      }
    );

    // on successful set, reload table parameters
    $scope.$watch('codesystems', function () {
      if (!$scope.codesystems || $scope.codesystems.length === 0) {
      }
      else {
        // add top-level element for ng-table sorting
        angular.forEach($scope.codesystems, function(codesystem) {
          if(codesystem && codesystem.maintainerType && codesystem.maintainerType !== undefined  && !$scope.typeDropdown.includes(codesystem.maintainerType)){
             $scope.typeDropdown.push(codesystem.maintainerType);
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


    // Initialization:  get codesystems
    function initialize() {
        notificationService.sendMessage('Loading Code Systems...');
        $scope.codesystems = [];
        scaService.getProjects().then(function (projects) {
            angular.forEach(metadataService.getCodeSystems(), function(codesystem) {
              angular.forEach(projects, function (project) {
                let path = project.branchPath.substr(0, project.branchPath.lastIndexOf("/"));
                if(path === codesystem.branchPath && !$scope.codesystems.includes(codesystem)){
                    if(codesystem.dependantVersionEffectiveTime && codesystem.dependantVersionEffectiveTime != ''){
                        let date = codesystem.dependantVersionEffectiveTime.toString()
                        codesystem.dependantVersionEffectiveTime = [date.slice(0, 4), date.slice(4,6), date.slice(6,8)].join('-');
                    }
                    $scope.codesystems.push(codesystem);
                    return
                }
              });

            });
            var anyInternationalProjectPresent = false;
            angular.forEach($scope.codesystems, function(codesystem) {
              if (!codesystem.maintainerType) {
                anyInternationalProjectPresent = true;
              }
              if(codesystem && codesystem.maintainerType && codesystem.maintainerType !== undefined  && !$scope.typeDropdown.includes(codesystem.maintainerType)){
                  $scope.typeDropdown.push(codesystem.maintainerType);
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
                notificationService.sendMessage('Code Systems loaded.', 5000);
                $scope.tableParams.reload();
              });
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
