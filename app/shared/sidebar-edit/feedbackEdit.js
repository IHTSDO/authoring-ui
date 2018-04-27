'use strict';
angular.module('singleConceptAuthoringApp.sidebarEdit')

  .controller('feedbackEditCtrl', ['$scope', '$rootScope', '$modal', '$location', '$routeParams', '$q', '$http', 'notificationService', 'scaService', 'snowowlService', 'metadataService', 'layoutHandler',
    function feedbackEditCtrl($scope, $rootScope, $modal, $location, $routeParams, $q, $http, notificationService, scaService, snowowlService, metadataService, layoutHandler) {     
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
        });
          $scope.$on('viewBatch', function(event, data) {
          $scope.actionTab = 5;
        });
          $scope.$on('viewInfo', function(event, data) {
          $scope.actionTab = 4;
        });  

        /**
         * May need to change depending on responsive needs
         * @param name the unique column name
         * @returns (*) an array of col-(size)-(width) class names
         */
        $scope.getLayoutWidths = layoutHandler.getLayoutWidths;
    }
  ]);