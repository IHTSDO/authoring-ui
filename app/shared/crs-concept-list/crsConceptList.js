'use strict';
angular.module('singleConceptAuthoringApp')

  .directive('crsConceptList', function ($rootScope, $q, scaService, metadataService, crsService) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        task : '='
      },
      templateUrl: 'shared/crsConceptList/crsConceptList.html',

      link: function (scope) {

        // open a concept from the list
        scope.openConcept = function(concept) {
          $rootScope.$broadcast('editConcept', concept);
        };

        // on saveConcept events, mark the concept as saved
        scope.finishConcept = function(concept) {
          // TODO
        }

        // completely remove a concept from the list
        scope.removeConcept = function(concept) {
          // TODO
        }


        //
        // Initialization
        //
        function initialize() {

        }

        initialize();

      }
    };
  })
;
