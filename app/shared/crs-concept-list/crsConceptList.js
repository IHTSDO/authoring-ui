'use strict';
angular.module('singleConceptAuthoringApp')

  .directive('crsConceptList', function ($rootScope, $q, scaService, metadataService, crsService, notificationService, modalService) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        task: '='
      },
      templateUrl: 'shared/crs-concept-list/crsConceptList.html',

      link: function (scope) {

        scope.crsConcepts = [];
        scope.getCrsConcepts = crsService.getCrsConcepts;
        scope.getCrsEmptyRequests = crsService.getCrsEmptyRequests;

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
        
        scope.rejectCrsRequest = function (item) {
          modalService.confirm('Do you really want to reject this concept?').then(function () {
            notificationService.sendMessage('Rejecting CRS concept', 10000);
            crsService.rejectCrsConcept(scope.task.key, item.scaId, item.crsId).then(function(){
             notificationService.sendMessage('Concept successfully rejected', 10000);
              initialize();
            }, function (error) {
              notificationService.sendError('Error while rejecting concept');
            });            
          }, function () {
            // do nothing
          });
          
        };

        scope.isPendingForClarification = function(item) {
          let crsRequestStatuses = crsService.getCrsRequestsStatus();
          if (crsRequestStatuses && crsRequestStatuses.length !== 0) {
            for (var i = 0; i < crsRequestStatuses.length; i++) {
              if (crsRequestStatuses[i].crsId === item.crsId 
                  && crsRequestStatuses[i].status === 'CLARIFICATION_NEEDED')
                return true;
            }
          }

          return false;
        };

        scope.pendingRequest = function(item) {          
          modalService.confirm('Do you really want to change this CRS request to Pending Classification?').then(function () {
            let ids = [];
            ids.push(item.crsId);
            notificationService.sendMessage('Updating CRS request status to Pending Clarification...');
            crsService.requestClarification(ids);
          });
        };

        function initialize() {
          scope.crsConcepts = scope.getCrsConcepts();
        }

        initialize();

        scope.$on('removeItem', function (event, data) {
          scope.deleteConcept(data.concept);
        });

        scope.deleteConcept = function(concept) {
          crsService.deleteCrsConcept(concept.conceptId);
          scope.crsConcepts = scope.getCrsConcepts();
        };
        
      }
    };
  })
;
