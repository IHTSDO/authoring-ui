'use strict';
angular.module('singleConceptAuthoringApp.sidebarEdit', [])

  .controller('sidebarEditCtrl', ['$scope', '$rootScope', '$modal', '$location', '$routeParams', '$q', '$http', 'notificationService', 'scaService', 'snowowlService', 'metadataService',
    function searchPanelCtrl($scope, $rootScope, $modal, $location, $routeParams, $q, $http, notificationService, scaService, snowowlService, metadataService) {

      // on load, switch to Task Detail tab
        if($routeParams.mode === 'batch'){
            $scope.actionTab = 5;
        }
        else{
            $scope.actionTab = 4;
        }
        $scope.hideBatch = metadataService.isTemplatesEnabled();

      $scope.$on('viewTaxonomy', function(event, data) {
        $scope.actionTab = 1;
      });
      $scope.$on('viewSearch', function(event, data) {
        $scope.actionTab = 2;
      });
        $scope.$on('viewList', function(event, data) {
        $scope.actionTab = 3;
      });
        $scope.$on('viewReview', function(event, data) {
        $scope.actionTab = 6;
        $scope.viewReview();
      });
        $scope.$on('viewInfo', function(event, data) {
        $scope.actionTab = 4;
      });
      
    }
  ]);