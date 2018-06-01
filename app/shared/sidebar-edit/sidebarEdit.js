'use strict';
angular.module('singleConceptAuthoringApp.sidebarEdit', [])

  .controller('sidebarEditCtrl', ['$scope', '$rootScope', '$modal', '$location', '$routeParams', '$q', '$http', 'notificationService', 'scaService', 'snowowlService', 'metadataService', 'savedListService',
    function searchPanelCtrl($scope, $rootScope, $modal, $location, $routeParams, $q, $http, notificationService, scaService, snowowlService, metadataService, savedListService) {

      // on load, switch to Task Detail tab
        if($routeParams.mode === 'batch'){
            $scope.actionTab = 5;
        }
        else if($routeParams.mode === 'feedback'){
            $scope.actionTab = 6;
        }
        else{
            $scope.actionTab = 4;
        }
        $scope.hideBatch = metadataService.isTemplatesEnabled();

      $scope.setActiveTab = function (tabIndex) {
        $scope.actionTab = tabIndex;
      };
      $scope.$on('viewTaxonomy', function(event, data) {
        $scope.actionTab = 1;
        $rootScope.displayMainSidebar = true;
      });
      $scope.$on('viewSearch', function(event, data) {
        $scope.actionTab = 2;
        $rootScope.displayMainSidebar = true;
      });
        $scope.$on('viewList', function(event, data) {
        $scope.actionTab = 3;
        $rootScope.displayMainSidebar = true;
      });
        $scope.$on('viewReview', function(event, data) {
        $scope.actionTab = 6;
        $rootScope.displayMainSidebar = false;
      });
        $scope.$on('viewBatch', function(event, data) {
        $scope.actionTab = 5;
        $rootScope.displayMainSidebar = true;
      });
        $scope.$on('viewInfo', function(event, data) {
        $scope.actionTab = 4;
        $rootScope.displayMainSidebar = true;
      });

      $scope.savedList = {items: []};
      $scope.$watch(function () {
          return savedListService.savedList;
        },
        function(newVal, oldVal) {
          $scope.savedList = newVal;
        }, true);

      $scope.dropConcept = function(item) {
        if($scope.isInSavedList(item.concept.conceptId)) return;
        savedListService.addItemToSavedList(item,$routeParams.projectKey, $routeParams.taskKey);
      };

      $scope.isInSavedList = function (id) {
        if (!$scope.savedList || !$scope.savedList.items) {
          return false;
        }

        for (let i = 0, len = $scope.savedList.items.length; i < len; i++) {
          if ($scope.savedList.items[i].concept.conceptId === id) {
            return true;
          }
        }
        return false;
      };
    }
  ]);
