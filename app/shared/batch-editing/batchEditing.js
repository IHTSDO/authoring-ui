'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('batchEditing', ['$rootScope', '$compile', '$filter', '$timeout', '$q', 'ngTableParams', 'modalService', 'componentAuthoringUtil', 'templateService', 'batchEditingService', 'scaService', 'snowowlService', 'constraintService', 'notificationService',
    function ($rootScope, $compile, $filter, $timeout, $q, ngTableParams, modalService, componentAuthoringUtil, templateService, batchEditingService, scaService, snowowlService, constraintService, notificationService) {
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
        templateUrl: 'shared/batch-editing/batchEditing.html',

        link: function (scope, element, attrs, linkCtrl) {

          console.debug('batch-editing directive');

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

          function compileCell(td, elements) {
            // clear children so that re-renders don't cause duplication
            while (td.firstChild) {
              td.removeChild(td.firstChild);
            }
            angular.forEach(elements, function (el) {
              var compiled = $compile(el)(scope);
              td.appendChild(compiled[0]);
            });
          }

          var deleteControl = function (hotInstance, td, row, col, prop, value) {
            var els = ['<a class="glyphicon glyphicon-trash" title="Remove from Batch" ng-click="removeConcept(' + row + ')">' + '</a>'];
            return compileCell(td, els);
          };

          var relationshipTarget = function (hotInstance, td, row, col, prop, value) {
            var els = ['<div contenteditable="true" style="width: 100%;" class="pull-left sourcename" drag-enter-class="sca-drag-target" drag-hover-class="sca-drag-hover" drop-channel="conceptPropertiesObj" ui-on-drop="dropRelationshipTarget(row, prop, $data)"></div>'];
            return compileCell(td, els);
          }

          var userControls = function (hotInstance, td, row, col, prop, value) {
            var els = [
              '<a class="glyphicon glyphicon-edit" title="Edit Full Concept" ng-click="editConcept(' + row + ')">' + '</a>',
              '<a class="md md-save" title="Save Concept" ng-click="saveConcept(' + row + ')">' + '</a>',
              '<a class="md md-school" title="Validate Concept" ng-click="validateConcept(' + row + ')">' + '</a>'
            ];
            return compileCell(td, els);
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
              columnSorting: {
                column: 3
              },
              sortIndicator: true,
              afterChange: function (changes, source) {

                // if not user edit, perform no actions
                // currently used sources are: edit, save, templateService
                if (source === 'edit') {

                  /// cycle over each cell change
                  angular.forEach(changes, function (change) {

                    // format: row, field, oldValue, newValue
                    if (change[1].startsWith('targetSlot') && change[3] !== change[2]) {

                      console.debug('targetSlot change on edit action detected', change, source);

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
                            updateRowDataFromConcept(row, concept, 'templateService');
                            batchEditingService.updateBatchConcept(concept);

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
            console.debug('col headeers', hot.getColHeader());
            return hot.getColHeader().indexOf(colName);
          }

          function updateRowDataFromConcept(rowIndex, concept, source) {
            // replace row values
            var newRow = batchEditingService.getHotRowForConcept(concept);
            console.debug('new row', newRow);
            for (var key in newRow) {
              console.debug('setting ', rowIndex, key, newRow[key], source);
              hot.setDataAtRowProp(rowIndex, key, newRow[key], source);
            }
          }
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

            notificationService.sendMessage('Adding ' + batchSize + ' concepts from template ' + template.name + '...');

            createTemplateConcepts(template, batchSize).then(function (concepts) {

              // add to the existing batch concepts
              batchEditingService.addBatchConcepts(concepts).then(function () {

                notificationService.sendMessage(' Concepts added', 3000);

                // weirdly can't seem to actually add rows from format in instantiation, so recreate table
                createHotTableFromConcepts(batchEditingService.getBatchConcepts());
              })
            });
          };

          scope.clearConcepts = function () {
            hot.destroy();
            batchEditingService.setBatchConcepts([]).then(function () {
              notificationService.sendMessage('Concepts removed from batch', 3000);
            })
          }

// retrieve and add concept to editing panel
          scope.editConcept = function (visibleIndex) {
            console.debug('physicalIndex', visibleIndex, hot.sortIndex)
            var physicalIndex = hot.sortIndex[visibleIndex][0];
            var conceptId = hot.getSourceDataAtRow(physicalIndex).conceptId; // direct match to column
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

            // get corresponding concept
            var sourceData = hot.getSourceDataAtRow(row);
            var concept = batchEditingService.getBatchConcept(sourceData.conceptId);

            notificationService.sendMessage('Saving batch concept ' +
              (sourceData.sctid ? sourceData.sctid : '(new)') +
              ' |' + sourceData.fsn + '| ...');

            console.debug('concept to save', concept);

            // check for completion
            var completionErrors = componentAuthoringUtil.checkConceptComplete(concept);

            if (completionErrors.length > 0) {
              var msg = 'Concept is not complete. Please fix the following problems:';
              modalService.message('Please Complete Concept', msg, completionErrors);
            } else {

              // store template
              var template = concept.template;

              // store concept id (if not an SCTID)
              var originalConceptId = concept.conceptId;

              // clean concept
              snowowlService.cleanConcept(concept);

              console.debug('cleaned concept', concept);

              // In order to ensure proper term-server behavior,
              // need to delete SCTIDs without effective time on descriptions and relationships
              // otherwise the values revert to termserver version
              angular.forEach(concept.descriptions, function (description) {
                if (snowowlService.isSctid(description.descriptionId) && !description.effectiveTime) {
                  delete description.descriptionId;
                }
              });
              angular.forEach(concept.relationships, function (relationship) {
                if (snowowlService.isSctid(relationship.relationshipId) && !relationship.effectiveTime) {
                  delete relationship.relationshipId;
                }
              });

              var saveFn = null;

              if (!concept.conceptId) {
                saveFn = snowowlService.createConcept;
              } else {
                saveFn = snowowlService.updateConcept;
              }

              saveFn(
                scope.task.projectKey,
                scope.task.key,
                concept
              ).then(function (savedConcept) {

                // re-attach the concept id if present, using passed reference object from batchEditingService
                concept.conceptId = originalConceptId;

                console.debug('concept saved', savedConcept);
                if (template) {

                  templateService.applyTemplateToConcept(savedConcept, template).then(function () {
                    templateService.storeTemplateForConcept(scope.task.projectKey,savedConcept.conceptId, template);
                    templateService.logTemplateConceptSave(scope.task.projectKey, savedConcept.conceptId, savedConcept.fsn, template);

                    console.debug('after applying template', savedConcept);
                    updateRowDataFromConcept(row, savedConcept, 'save');
                    batchEditingService.updateBatchConcept(savedConcept, originalConceptId).then(function () {
                      notificationService.sendMessage('Concept saved, batch successfully updated', 3000);
                    }, function (error) {
                      notificationService.sendWarning('Concept saved, but batch failed to update: ' + error);
                    })
                  }, function (error) {
                    notificationService.sendError('Failed to apply template: ' + error);
                  })
                } else {
                  notificationService.sendError('Unexpected error: No template stored for concept');
                }

              }, function (error) {
                notificationService.sendError('Error saving concept: ' + error);
              })
            }

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
            if (!data || !data.concept) {
              return;
            }

            notificationService.sendMessage('Updating batch list with saved concept...');

            console.debug('concept edit panel save event', data.concept, scope.viewedConcepts);

            // replace in tabular data
            var hotData = hot.getData();
            var rowFound = false;
            for (var i = 0; i < hotData.length; i++) {
              var sourceDataRow = hot.getSourceDataAtRow(i);
              console.debug('checking row', hotData[i]);
              if (sourceDataRow.conceptId === data.concept.conceptId || sourceDataRow.conceptId === data.previousConceptId) {
                rowFound = true;
                updateRowDataFromConcept(i, data.concept, 'save');
                break;
              }
            }
            if (!rowFound) {
              notificationService.sendError('Concept saved from edit panel, but not found in batch');
            } else {
              notificationService.sendMessage('Batch list successfully updated', 3000);
            }
          });

          //
          // Drag 'n Drop
          //

          scope.dropConcept = function (event, data) {

            console.debug('drop concept', event, data);


            // Hide the helper, so that we can use .elementFromPoint
            // to grab the item beneath the cursor by coordinate

            var $destination = $(document.elementFromPoint(event.clientX, event.clientY));

            // Grab the parent tr, then the parent tbody so that we
            // can use their index to find the row and column of the
            // destination object
            var $tr = $destination.closest('tr');
            var $tbody = $tr.closest('tbody');

            var col = $tr.children().index($destination);
            var row = $tbody.children().index($tr);

            // get the column prop
            var prop = hot.colToProp(col);

            // Use the setDataAtCell method, which takes a row and
            // col number, to adjust the data
            if (prop.startsWith('targetSlot')) {
              hot.setDataAtCell(row, col, data.name, 'edit');
            }

          };

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
