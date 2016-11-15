'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('jsBatchEditing', ['$rootScope', '$compile', '$filter', '$timeout', '$q', 'ngTableParams', 'templateService', 'batchEditingService', 'scaService', 'constraintService', 'notificationService',
    function ($rootScope, $compile, $filter, $timeout, $q, ngTableParams, templateService, batchEditingService, scaService, constraintService, notificationService) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          // branch
          branch: '=',

          // task
          task: '='
        },
        templateUrl: 'shared/js-batch-editing/batchEditing.html',

        link: function (scope, element, attrs, linkCtrl) {

          console.debug('js-batch-editing directive');

          var
            hotElem,          // the html element itself
            hot,              // the hands on table object
            hotDebounce,      // debounce timer used for async operations
            fsnToIdMap = {}        // map of fsn to SCTID used by target slots
            ;

          scope.viewedConcepts = [];  // concepts opened for editing by user
          scope.templates = []; // available templates
          //
          // HTML Renderers for removal and other user actions
          //

          var deleteControl = function (hotInstance, td, row, col, prop, value) {
            var el = '<a class="glyphicon glyphicon-trash" title="Remove from Batch" ng-click="removeConcept(' + row + ')">' + '</a>';

            // clear children so that re-renders don't cause duplication
            while (td.firstChild) {
              td.removeChild(td.firstChild);
            }
            var compiled = $compile(el)(scope);
            td.appendChild(compiled[0]);
            return td;
          }

          var userControls = function (hotInstance, td, row, col, prop, value) {
            var els = [
              '<a class="glyphicon glyphicon-edit" title="Edit Full Concept" ng-click="editConcept(' + row + ')">' + '</a>',
              '<a class="md md-save" title="Save Concept" ng-click="saveConcept(' + row + ')">' + '</a>',
              '<a class="md md-school" title="Validate Concept" ng-click="validateConcept(' + row + ')">' + '</a>'
            ];

            // clear children so that re-renders don't cause duplication
            while (td.firstChild) {
              td.removeChild(td.firstChild);
            }
            angular.forEach(els, function (el) {
              var compiled = $compile(el)(scope);
              td.appendChild(compiled[0]);
            });
            return td;
          };

          //
          // HoT <-> Concept model interface functions
          //
          function updateConceptModelFromRow(row) {

          }

          //
          // HoT Table Functions
          //

          function createHotTableFromConcepts(concepts) {

            var hotData = [];
            angular.forEach(concepts, function (concept) {
              hotData.push(batchEditingService.getHotRowForConcept(concept));
            });

            hotElem = document.getElementById('hotElem');
            hot = new Handsontable(hotElem, {
              data: hotData,
              colHeaders: true,
              afterChange: function (changes, source) {

                console.debug('after change', source, changes);

                // if not user edit, perform no actions
                if (source === 'edit') {


                  /// cycle over each cell change
                  angular.forEach(changes, function (change) {

                    console.debug('checking change', change);

                    // format: row, field, oldValue, newValue
                    if (change[1].startsWith('targetSlot') && change[3] !== change[2]) {

                      // convenience variables
                      var row = change[0];
                      var field = change[1];
                      var fsn = change[3];

                      // get concept for row
                      var conceptId = hot.getSourceDataAtRow(row).conceptId;
                      var concept = batchEditingService.getBatchConcept(conceptId);
                      console.debug('concept affected', concept);

                      // extract slot name (format targetSlot_SLOTNAME.target.fsn)
                      var slotName = field.match(/^targetSlot_([^.]*)/i)[1];
                      console.debug('target slot name', slotName);

                      // replace target slot values
                      angular.forEach(concept.relationships, function (r) {
                        if (r.targetSlot && r.targetSlot.slotName === slotName) {
                          r.target.fsn = fsn;
                          r.target.conceptId = fsnToIdMap[fsn];
                          console.debug('found target slot, modified concept', concept);

                          // apply template logical/lexical replacement
                          templateService.updateTargetSlot(concept, concept.template, r).then(function () {
                            // replace row values
                            var newRow = batchEditingService.getHotRowForConcept(concept);
                            console.debug('new row', newRow);
                            for (var key in newRow) {
                              console.debug('setting ', row, key, newRow[key], 'template');
                              hot.setDataAtRowProp(row, key, newRow[key], 'template');
                            }

                          })
                        }
                      });

                    }
                  });
                }

              },


              // columns for CT of X
              columns: [
                {
                  title: ' ',
                  renderer: deleteControl,
                  readOnly: true
                }, // null/empty values render as Excel-style alphabetic title
                // }
                /* temp or SCTID, used for testing only
                 {data: 'conceptId', title: 'ID', readOnly: true},*/

                // SCTID -- computed field, actual concept id is hidden
                {data: 'sctid', title: 'SCTID', readOnly: true},
                {data: 'fsn', title: 'FSN'},
                {
                  data: 'targetSlot_procSite.target.fsn',
                  title: 'Procedure Site -- direct (attribute)',
                  type: 'autocomplete',
                  strict: true,
                  source: function (query, process) {

                    $timeout.cancel(hotDebounce);
                    if (query && query.length > 2) {
                      hotDebounce = $timeout(function () {
                        console.debug(hot.getSchema(), hot.getSchema().targetSlot_0);
                        constraintService.getConceptsForValueTypeahead(
                          '405813007 ', query, scope.branch,
                          '<< 442083009 | Anatomical or acquired body structure |')
                          .then(function (concepts) {
                            // TODO Ideally would store only one fsn (on select), but haven't found HoT hook yet
                            angular.forEach(concepts, function (c) {
                              fsnToIdMap[c.fsn.term] = c.id;
                            });
                            console.debug('updated fsn to id map', fsnToIdMap);
                            process(concepts.map(function (c) {
                              return c.fsn.term
                            }));
                          }, function (error) {
                            console.error('error getting typeahead values', error);
                          })
                      }, 500)
                    }

                  }
                }, {
                  title: ' ', // null/empty values render as Excel-style alphabetic title
                  renderer: userControls,
                  readOnly: true
                }]
            })
          }

          function getIndexForColumnName(colName) {
            console.debug('col heade3rs', hot.getColHeader());
            return hot.getColHeader().indexOf(colName);
          }

          //3405 @62.618 [afterChange] [[1,5,5814,"asdf"]], "edit",


          //
          // User action functions
          //

          function createTemplateConcepts(template, batchSize) {

            var deferred = $q.defer();

            console.debug('creating template concepts');

            // store the selected template for use by conceptEdit.js
            templateService.selectTemplate(template);

            var concepts = [];
            var promises = [];

            for (var i = 0; i < batchSize; i++) {
              promises.push(templateService.createTemplateConcept(template));
            }

            $q.all(promises).then(function (concepts) {
              deferred.resolve(concepts);
            }, function (error) {
              deferred.reject('Error creating template concepts: ' + error);
            });

            return deferred.promise;


          }


          scope.addBatchConceptsFromTemplate = function (template, batchSize) {

            createTemplateConcepts(template, batchSize).then(function (concepts) {

              // add to the existing batch concepts
              batchEditingService.addBatchConcepts(concepts);

              // weirdly can't seem to actually add rows from format in instantiation, so recreate table
              createHotTableFromConcepts(batchEditingService.getBatchConcepts());
            });
          };

// retrieve and add concept to editing panel
          scope.editConcept = function (row) {
            console.debug('edit row', row, hot.getSourceDataAtRow(row));
            var conceptId = hot.getSourceDataAtRow(row).conceptId; // direct match to column
            var concept = batchEditingService.getBatchConcept(conceptId);
            console.debug('concept for row', concept);
            if (scope.viewedConcepts.filter(function (c) {
                return c.conceptId === concept.conceptId;
              }).length === 0) {
              scope.viewedConcepts.push(concept);
            } else {
              notificationService.sendWarning('Concept already added', 3000);
            }
          };

// update the actual concept from row values
          scope.saveConcept = function (row) {

          };

          scope.removeConcept = function (row) {
            console.debug('remove row', row, hot.getSourceDataAtRow(row));
            var colIndex = getIndexForColumnName('sctid');
            var conceptId = hot.getSourceDataAtRow(row).conceptId; // direct match to column
            batchEditingService.removeBatchConcept(conceptId).then(function () {
              hot.alter('remove_row', row);
              removeViewedConcept(conceptId);
            }, function (error) {
              notificationService.sendError('Unexpected error removing batch concept: ' + error);
            })

          };

          scope.validateConcept = function (row) {

          };


          function removeViewedConcept(conceptId) {
            var index = scope.viewedConcepts.map(function (c) {
              return c.conceptId
            }).indexOf(conceptId);
            console.debug('remove index', conceptId, index);
            if (index !== -1) {
              scope.viewedConcepts.splice(index, 1);
            }
          }

          //
          // Scope listeners
          //

          // watch for close events
          scope.$on('stopEditing', function (event, data) {
            console.debug('received stop editing', data)
            removeViewedConcept(data.concept.conceptId);
          });


          // watch for save events from editing panel
          scope.$on('conceptEdit.conceptChange', function (event, data) {

          });


          //
          // Initialization
          //
          function initialize() {

            console.debug('Batch Editing: initializing');

            // get templates for dropdown
            templateService.getTemplates().then(function (templates) {
              scope.templates = templates;
            });


            // initialize from task
            batchEditingService.initializeFromTask(scope.task).then(function () {

              // create the table from batch concepts (if present)
              createHotTableFromConcepts(batchEditingService.getBatchConcepts());
            })
          }


          scope.$watch('task', function () {
            if (scope.task) {
              initialize();
            }
          });
        }

      }
    }
  ]);
