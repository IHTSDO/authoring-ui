'use strict';
angular.module('singleConceptAuthoringApp.taxonomyPanel', [])

  .controller('taxonomyPanelCtrl', ['$q', '$scope', '$rootScope', '$location', '$routeParams', 'metadataService', 'terminologyServerService',
    function taxonomyPanelCtrl($q, $scope, $rootScope, $location, $routeParams, metadataService, terminologyServerService) {

      $scope.branch = metadataService.getBranch();

      // initialize with root concept (triggers rendering of full SNOMEDCT hierarchy)
      $scope.rootConcept = null;
      $scope.secondRootConcept = null;
      $scope.languages = [];
      $scope.selectedLanguage = null;
      $scope.stopLoadingTaxonomy = false;

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
        $scope.secondRootConcept = null;         
      });

      // watch for viewTaxonomy reder
      $scope.$on('stopLoadingTaxonomy', function(event, data) {
        $scope.stopLoadingTaxonomy = data.stopLoadingTaxonomy;
      });

      $scope.clearConcept = function() {
        $scope.rootConcept = null;
      };

      $scope.dropConcept = function (concept) {
        if (concept) {
          $scope.secondRootConcept = {conceptId: concept.id,fsn: concept.name};
        }       
      };

      $scope.closeTaxonomy = function () {
        $scope.secondRootConcept = null;
      };      

            

      // on extension metadata set
      $scope.$on('setExtensionMetadata', function (event, data) {
        let result = metadataService.getDropdownLanguages();
        $scope.languages = result.languages;
        $scope.selectedLanguage = result.selectedLanguage;     
      });

      function initialize () {
        let result = metadataService.getDropdownLanguages();
        $scope.languages = result.languages;
        $scope.selectedLanguage = result.selectedLanguage; 
      }
      
      initialize ();

    }]);
