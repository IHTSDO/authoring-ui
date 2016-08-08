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

        // get a concept properties object for dragging
        // TODO Handle MS?
        scope.getConceptPropertiesObj = function (item) {
          return {id: item.concept.conceptId, name: item.concept.fsn};
        };

        scope.selectItem = function (item) {
          $rootScope.$broadcast('editConcept', {
            conceptId : item.crsGuid
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
            if (scope.concepts[i].crsGuid === data.concept.crsGuid) {
              scope.concepts[i].savedConcept = angular.merge(scope.concepts[i].conceptJson, data.concept);
              scope.concepts[i].saved = true;
              crsService.saveCrsConcepts(scope.concepts);
            }
          }
        });




        //
        // Initialization
        //
        function initialize() {
          crsService.getCrsConceptsForTask(scope.task).then(function (concepts) {
            console.debug('****** CRS Concept List', concepts);
            scope.concepts = concepts;
          }, function (error) {
            notificationService.sendError(error);
          })
        }

        // re-initialize on task changes
        scope.$watch('task', function () {
          console.debug('crs concept list: task changed', scope.task)
          if (scope.task) {
            initialize();
          }
        })

      }
    };
  })
;
