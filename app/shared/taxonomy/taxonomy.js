'use strict';
angular.module('singleConceptAuthoringApp.taxonomyPanel', [])

  .controller('taxonomyPanelCtrl', ['$scope', '$rootScope', '$location', '$routeParams', '$q', '$http', 'notificationService', 'scaService',
    function taxonomyPanelCtrl($scope, $rootScope, $location, $routeParams) {

      $scope.branch = 'MAIN/' + $routeParams.projectKey + '/' + $routeParams.taskKey;

      // initialize with root concept (triggers rendering of full SNOMEDCT hierarchy)
      $scope.rootConcept = null;

      /**
       * Drag and drop object
       * @param conceptId the concept to be dragged
       * @returns {{id: *, name: null}}
       */
      $scope.getConceptPropertiesObj = function (concept) {
        console.debug('Getting concept properties obj', concept);
        return {id: concept.id, name: concept.fsn};
      };

      // watch for viewTaxonomy events
      $scope.$on('viewTaxonomy', function(event, data) {
        console.debug('taxonomy.js received viewTaxonomy event, changing root concept to ', data.concept);
         $scope.rootConcept = data.concept;
         console.debug('root concept', $scope.rootConcept);
      });

      $scope.clearConcept = function() {
        console.debug('Resetting root concept to SNOMEDCT root');
        $scope.rootConcept = null;
       /* {
          active: true,
          conceptId: '138875005',
          definitionStatus: 'PRIMITIVE',
          fsn: 'SNOMED CT Concept',
          isLeafInferred: false,
          isLeafStated: false
        };*/
        console.debug('root concept', $scope.rootConcept);
      }
    }]);