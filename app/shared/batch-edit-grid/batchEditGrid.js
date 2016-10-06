'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles IMS authentication, user roles, and user settings
 */
  .directive('batchEditGrid', function (batchEditService, snowowlService, componentAuthoringUtil, notificationService) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      templateUrl: 'shared/batch-edit-grid/batchEditGrid.html',
      link: function (scope, element, attrs, linkCtrl) { //noinspection UnreachableCodeJS

        console.debug('entered batchEditGrid');

        // the summary objects from batchEditService
        var batchConcepts;

        // the full concepts initialized from summary objects
        scope.fullConcepts = [];

        scope.hotSettingsLocal = {
          manualColumnResize: true,
          columnSorting: {
            column: 1
          }
        }


        // the grid columns
        scope.columns = [
          {
            title: 'SCTID',
            data: 'conceptId'
          },
          {
            title: 'FSN',
            data: 'fsn'
          },
          {
            title: 'PT',
            data: 'pt'
          }

        ];


        function getFullConcepts() {
          var conceptIds = batchConcepts.map(function (item) {
            return item.concept.conceptId
          });
          console.debug('getting full concepts', conceptIds);
          snowowlService.bulkGetConcept(conceptIds, scope.task.branchPath, true).then(function (response) {
            scope.fullConcepts = response.items;
            console.debug('full concepts', scope.fullConcepts);
            angular.forEach(scope.fullConcepts, function (concept) {

            })
          })

        }


        function initialize() {
          console.log('Initializing batch view');
          batchEditService.setTask(scope.task).then(function () {
            batchConcepts = batchEditService.getBatchConcepts();
            getFullConcepts();

          }, function (error) {
            notificationService.sendError('Failed to initialize batch edit view from task: ' + error);
          })
        }


        scope.$watch('task', function () {
          if (scope.task) {
            initialize();
          }
        })

      }
    }

  });
