'use strict';
angular.module('singleConceptAuthoringApp')

  .directive('crsConceptList', function ($rootScope, $q, scaService, metadataService, crsService, notificationService) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        task: '='
      },
      templateUrl: 'shared/crs-concept-list/crsConceptList.html',

      link: function (scope) {

        scope.getCrsConcepts = crsService.getCrsConcepts;

        // get a concept properties object for dragging
        // TODO Handle MS?
        scope.getConceptPropertiesObj = function (item) {
          return {id: item.concept.conceptId, name: item.concept.fsn};
        };

        scope.selectItem = function (item) {
          $rootScope.$broadcast('editConcept', {
            conceptId : item.conceptId
          });
        };
      }
    };
  })
;
