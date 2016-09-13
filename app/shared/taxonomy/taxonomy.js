'use strict';
angular.module('singleConceptAuthoringApp.taxonomyPanel', [])

  .controller('taxonomyPanelCtrl', ['$scope', '$rootScope', '$location', '$routeParams', 'metadataService',
    function taxonomyPanelCtrl($scope, $rootScope, $location, $routeParams, metadataService) {

      $scope.branch = metadataService.getBranch();

      // initialize with root concept (triggers rendering of full SNOMEDCT hierarchy)
      $scope.rootConcept = null;

      /**
       * Drag and drop object
       * @param conceptId the concept to be dragged
       * @returns {{id: *, name: null}}
       */
      $scope.getConceptPropertiesObj = function (concept) {
        return {id: concept.id, name: concept.fsn};
      };

      // watch for viewTaxonomy events
      $scope.$on('viewTaxonomy', function(event, data) {
         $scope.rootConcept = data.concept;
      });

      $scope.clearConcept = function() {
        $scope.rootConcept = null;
      };
    }]);
