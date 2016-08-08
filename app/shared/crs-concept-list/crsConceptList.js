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

        // open a concept from the list
        scope.openConcept = function (concept) {
          $rootScope.$broadcast('editConcept', concept);
        };

        // on saveConcept events, mark the concept as saved
        scope.finishConcept = function (concept) {
          // TODO
        };

        // completely remove a concept from the list
        scope.removeConcept = function (concept) {
          // TODO
        };


        //
        // Initialization
        //
        function initialize() {
          crsService.getCrsConceptsForTask(scope.task).then(function (concepts) {
            scope.concepts = concepts;
          }, function(error) {
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
