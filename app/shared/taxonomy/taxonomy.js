'use strict';
angular.module('singleConceptAuthoringApp.taxonomyPanel', [])

  .controller('taxonomyPanelCtrl', ['$q', '$scope', '$rootScope', '$location', '$routeParams', 'metadataService', 'snowowlService',
    function taxonomyPanelCtrl($q, $scope, $rootScope, $location, $routeParams, metadataService, snowowlService) {

      $scope.branch = metadataService.getBranch();

      // initialize with root concept (triggers rendering of full SNOMEDCT hierarchy)
      $scope.rootConcept = null;
      $scope.secondRootConcept = null;

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

      $scope.clearConcept = function() {
        $scope.rootConcept = null;
      };

      $scope.dropConcept = function (concept) {
        if ($scope.thisView === 'feedback') {
          checkInferredRelationships($scope.rootConcept.conceptId).then(function(flag) {
            if (flag) {
              $scope.secondRootConcept = {conceptId: concept.id,fsn: concept.name};
            } else {
              $scope.secondRootConcept = null;
            }
          })
        } else {
          $scope.secondRootConcept = {conceptId: concept.id,fsn: concept.name};
        }       
      }

      $scope.closeTaxonomy = function () {
        $scope.secondRootConcept = null;
      }

      function checkInferredRelationships (conceptId) {
          var deferred = $q.defer();
          var searchExtensionFlag = metadataService.isExtensionSet();
          var acceptLanguageValue = metadataService.getAcceptLanguageValueForModuleId(
          searchExtensionFlag ? metadataService.getCurrentModuleId() : metadataService.getInternationalModuleId());          

          snowowlService.getConceptParents(conceptId, $scope.branch, acceptLanguageValue, searchExtensionFlag, false).then(function (parents) {             
              deferred.resolve(parents ? true : false);
            },
            function () {
              console.error('Could not retrieve parents for node', node);
              deferred.resolve(false);
            }
          );
          return deferred.promise;
        };
    }]);
