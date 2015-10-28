'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('conflicts', ['$rootScope', 'ngTableParams', '$routeParams', '$filter', '$timeout', '$modal', '$compile', '$sce', 'scaService', 'snowowlService', 'notificationService',
    function ($rootScope, NgTableParams, $routeParams, $filter, $timeout, $modal, $compile, $sce, scaService, snowowlService, notificationService) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {

          conflictsContainer: '=',

          // branch this conflict report was generated against
          sourceBranch: '=',

          // branch this conflict report was generated for
          targetBranch: '='

        },
        templateUrl: 'shared/conflicts/conflicts.html',

        link: function (scope) {

          console.debug('conflicts container', scope.conflictsContainer);

          scope.conflictsViewed = [];
          scope.conflictList = [];

          /**
           * Watch the conflicts container for any changes
           */
          scope.$watch('conflictsContainer', function () {

            console.debug('conflictsContainer changed', scope.conflictsContainer);

            if (!scope.conflictsContainer || !scope.conflictsContainer.conflicts) {
              scope.conflictsReportStatus = 'Conflicts report not available';
              return;
            } else {
              scope.conceptsInConflict = scope.conflictsContainer.conflicts.concepts;
            }
          }, true);

          /**
           On load, get ui state and populate previously viewed conflicts
           */
          scaService.getUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'conflict-list').then(function (uiState) {
            if (!uiState || Object.getOwnPropertyNames(uiState).length === 0) {
              scope.conflictList = [];
            }
            else {
              scope.conflictList = uiState;
              console.debug('conflict list', scope.conflictList);
              for (var i = 0; i < scope.conflictList.length; i++) {
                scope.viewConflict(scope.conflictList[i]);
              }
            }
          });

          /**
           * Save the current list of viewed conflicts as ui state
           */
          function saveUiState() {
            var conflictList = [];
            angular.forEach(scope.conflictsViewed, function (conflict) {
              conflictList.push(conflict.id);
            });
            scaService.saveUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'conflict-list', conflictList);
          }

          /**
           * Conflict ngTable parameters
           */
          scope.conceptsInConflictTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {fsn: 'asc'},
              orderBy: 'fsn'
            },
            {
              filterDelay: 50,
              total: scope.conceptsInConflict ? scope.conflictsInConflict.length : 0,

              getData: function ($defer, params) {

                var concepts = scope.conceptsInConflict;

                console.debug('concepts', concepts);

                if (!concepts) {
                  $defer.resolve([]);
                } else {

                  params.total(concepts.length);
                  concepts = params.sorting() ? $filter('orderBy')(concepts, params.orderBy()) : concepts;
                  concepts = concepts.slice((params.page() - 1) * params.count(), params.page() * params.count());
                  console.debug('concepts page', concepts);
                  $defer.resolve(concepts);
                }
              }
            }
          );

          /**
           * Helper function to pre-process a conflict triad (source, target,
           * merge)
           * @param conflictObj the object containing the three concepts
           */
          scope.viewConflictHelper = function (conflictObj) {

            console.debug('generating conflict triad', conflictObj);

            // TODO Sample styling, classes found in conceptEdit.html
            var styles = ['redhl', 'yellowhl', 'orangehl'];

            var testFlag = true;

            angular.forEach(conflictObj.source.descriptions, function (description) {

              console.debug('applying random style to description', description);
              var sourceStyle = {};

              testFlag = !testFlag;

              if (!testFlag) {
                conflictObj.styles[description.descriptionId] = {
                  message: null,
                  style: styles[getRandomInt(0, styles.length - 1)]
                };
              } else {

                conflictObj.styles[description.descriptionId + '-term'] = {
                  message: null,
                  style: styles[getRandomInt(0, styles.length - 1)]
                }

              }

              console.debug('applying random style', sourceStyle);
            });

            // push onto viewed list
            scope.conflictsViewed.push(conflictObj);

            // save the ui state
            saveUiState();

            if (scope.conflictsViewed.length === scope.conflictList.length) {
              notificationService.sendMessage('Conflict data loaded', 5000);
            }

            console.debug('new styles', scope.conflictsStyles);
          };

          /**
           * View a concept in conflict-view
           * @param concept
           */
          scope.viewConflict = function (conceptId) {

            console.debug('viewConflict', conceptId, scope.conflictList);

            if (scope.conflictList.indexOf(conceptId) === -1) {
              console.debug('adding to conflict list');
              scope.conflictList.push(conceptId);
            }

            notificationService.sendMessage('Loading conflict data...');

            var conflictObj = {id: conceptId, styles: []};

            snowowlService.getFullConcept(conceptId, scope.sourceBranch).then(function (response) {
              conflictObj.source = response;
              if (conflictObj.hasOwnProperty('target')) {
                scope.viewConflictHelper(conflictObj);
              }
            });

            snowowlService.getFullConcept(conceptId, scope.targetBranch).then(function (response) {
              conflictObj.target = response;
              if (conflictObj.hasOwnProperty('source')) {
                scope.viewConflictHelper(conflictObj);
              }
            })
          };

          /**
           * Generate a random int between min/max (inclusive)
           * @param min the min
           * @param max the max
           * @returns {*} the random integer
           */
          function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
          }

          /**
           * Watch for stop editing requests
           */
          scope.$on('stopEditing', function (event, data) {
            if (!data || !data.concept || !data.concept.conceptId) {
              console.error('stopEditing event received without concept id in conflicts view', data);
            } else {
              angular.forEach(scope.conceptsInConflict, function (concept) {
                if (concept.conceptId === data.concept.conceptId) {
                  concept.editing = false;
                }
              });
              for (var i = 0; i < scope.conflictsViewed.length; i++) {
                if (scope.conflictsViewed[i].source.conceptId === data.concept.conceptId) {
                  scope.conflictsViewed.splice(i, 1);
                  break;
                }
              }

              saveUiState();

            }
          });

          /**
           * Get whether the concept is currently edited
           * @param conceptId the concept id
           * @returns {boolean} true if editing, false if not
           */
          scope.isEdited = function (conceptId) {
            return scope.conflictList.indexOf(conceptId) !== -1;
          };

        }
      }
    }])
;