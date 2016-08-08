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

        // on saveConcept events, mark the concept as saved
        scope.finishConcept = function (concept) {
          // TODO
        };

        // completely remove a concept from the list
        scope.removeConcept = function (concept) {
          // TODO
        };

        // on concept change notifications from conceptEdit.js
        scope.$on('conceptEdit.conceptChange', function(event, data) {
          for (var i = 0; i < scope.concepts.length; i++) {
            if (scope.concepts[i].conceptId === data.concept.conceptId) {
              scope.concepts[i].savedConcept = angular.merge(scope.concepts[i].conceptJson, data.concept);
              scope.concepts[i].saved = true;
              crsService.saveCrsConcepts(scope.concepts);
            }
          }
        });

      }
    };
  })
;
