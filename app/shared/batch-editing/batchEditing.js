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
        templateUrl: 'shared/batch-editing/batchEditingNgTable.html',

        link: function (scope, element, attrs, linkCtrl) {

          scope.viewedConcepts = [];  // concepts opened for editing by user
          scope.templates = []; // available templates

          scope.isBatchLoaded = false;

          //
          // Utility functions from services
          //
          scope.isSctid = snowowlService.isSctid;

          //
          // NgTable functions
          //

          function applyNgTableSortingParams(concept) {
            concept.sctid = snowowlService.isSctid(concept.conceptId) ? concept.conceptId : '';
            concept.fsn = componentAuthoringUtil.getFsnForConcept(concept);
            angular.forEach(concept.relationships, function (r) {
              if (r.targetSlot && r.targetSlot.slotName) {
                console.debug('setting for ', r.targetSlot, r.target.fsn);
                concept[r.targetSlot.slotName] = r.target.fsn;
              }
            });
            console.debug('final concept', concept);
          }

          scope.updateField = function (concept, fieldName, text, id) {

          };

          function initNgTableSlots(template) {

            console.debug('initNgTableSlots', template);
            if (template) {
              angular.forEach(template.conceptOutline.relationships, function (r) {
                if (r.targetSlot && r.targetSlot.slotName) {
                  console.debug('Slot detected', r.targetSlot.slotName);
                  switch (r.targetSlot.slotName) {
                    case 'procSite':
                      scope.hasProcSite = true;
                      break;
                    case 'action':
                      scope.hasAction = true;
                      break;
                    default:
                      break;
                  }
                }
              });
            }
            console.debug('columns', template, scope.batchTableColumns);
          }

          scope.sortTable = function (sortBy, direction) {
            var sortObj = {};
            if (sortBy) {
              sortObj[sortBy] = direction ? direction : 'asc';
            }
            scope.batchTableParams.sorting(sortObj);
            scope.batchTableParams.reload();
          };

          scope.batchTableParams = new ngTableParams({
              page: 1,
              count: 10,
              sorting: {fsn: 'asc'}
            },
            {
              filterDelay: 50,
              total: batchEditingService.getBatchConcepts() ? batchEditingService.getBatchConcepts().length : 0,
              getData: function ($defer, params) {

                // initialize columns from template
                initNgTableSlots(batchEditingService.getCurrentTemplate());

                // get the current batch concepts
                var bcs = batchEditingService.getBatchConcepts();

                if (!bcs || bcs.length === 0) {
                  $defer.resolve([]);
                } else {

                  // apply sort to batch concepts to ensure table/operation order matching
                  console.debug('params.sorting()', params.sorting());
                  bcs.sort(function (a, b) {
                    for (var key in params.sorting()) {
                      var dir = params.sorting()[key] === 'asc' ? 1 : -1;
                      if (a[key] < b[key]) {
                        return dir
                      }
                    }

                    return 0;
                  });

                  var searchStr = params.filter().search;
                  var concepts = [];

                  if (searchStr) {
                    concepts = bcs.filter(function (item) {
                      return item.toLowerCase().indexOf(searchStr) !== -1;
                    });
                  } else {
                    concepts = bcs;
                  }

                  angular.forEach(concepts, function (c) {
                    applyNgTableSortingParams(c);
                  });

                  params.total(concepts.length);


                  concepts = params.sorting() ? $filter('orderBy')(concepts, params.orderBy()) : concepts;


                  concepts = concepts.slice((params.page() - 1) * params.count(), params.page() * params.count());

                  console.debug('CONCEPTS', concepts);
                  $defer.resolve(concepts);
                }

              }
            }
          );

          scope.getConceptsForValueTypeahead = function (concept, slotName, searchStr) {
            var deferred = $q.defer();
            // get the slot name
            try {
              var slotRelationship = concept.relationships.filter(function (r) {
                return r.targetSlot && r.targetSlot.slotName === slotName;
              })[0];
              constraintService.getConceptsForValueTypeahead(slotRelationship.type.conceptId, searchStr, scope.branch, slotRelationship.targetSlot.allowableRangeECL).then(function (response) {
                console.debug('typeahead', response);
                deferred.resolve(response);
              }, function (e) {
                deferred.reject();
              })
            } catch (e) {
              deferred.reject();
            }
            return deferred.promise;
          };

          scope.getRelationshipTargetDragObject = function (concept, slotName) {
            var dragObj;
            angular.forEach(concept.relationships, function (relationship) {
              if (relationship.targetSlot && relationship.targetSlot.slotName === slotName) {
                dragObj = {
                  id: relationship.target.conceptId,
                  name: relationship.target.fsn
                };
              }
            });
            console.debug('drag object', dragObj);
            return dragObj;
          };

          scope.dropRelationshipTarget = function (concept, slotName, data) {
            console.debug('drop relationship target', concept, slotName, data);
            angular.forEach(concept.relationships, function (relationship) {
              if (relationship.targetSlot && relationship.targetSlot.slotName === slotName) {
                constraintService.isValueAllowedForType(relationship.type.conceptId, data.id, scope.branch,
                  relationship.template && relationship.template.targetSlot ? relationship.template.targetSlot.allowableRangeECL : null).then(function () {
                  relationship.target.conceptId = data.id;
                  relationship.target.fsn = data.name;
                  templateService.updateTargetSlot(concept, scope.selectedTemplate, relationship).then(function () {
                    scope.batchTableParams.reload();
                  })
                }, function (error) {
                  notificationService.sendWarning('MRCM validation error: ' + data.name + ' is not a valid target for attribute type ' + relationship.type.fsn + '.');
                });

              }
            })
          };

// TODO Set relationship target and update target slot on typeahead select
          scope.setTargetSlot = function (concept, slotName, data) {
            console.debug('set target slot', concept, slotName, data);
            angular.forEach(concept.relationships, function (r) {
              if (r.targetSlot && r.targetSlot.slotName === slotName) {
                console.debug('setting target for ', r.targetSlot);
                r.target.conceptId = data.id;
                r.target.fsn = data.fsn.term;
                templateService.updateTargetSlot(concept, concept.template, r).then(function () {
                  batchEditingService.updateBatchConcept(concept).then(function () {
                    scope.batchTableParams.reload();
                  })
                });
              }
            })
          };

          // checks for empty assignments
          scope.cleanTargetSlot = function (concept, slotName) {
            if (!concept[slotName]) {
              scope.setTargetSlot(concept, slotName, {id: null, fsn: {term: null}});
            }
          };

//
// User action functions
//
          function createTemplateConcepts(template, batchSize) {

            var deferred = $q.defer();

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

            console.debug('addBatchConceptsFromTemplate', template, batchSize);
            batchEditingService.setCurrentTemplate(template);
            initNgTableSlots(template);

            notificationService.sendMessage('Adding ' + batchSize + ' concepts from template ' + template.name + '...');

            createTemplateConcepts(template, batchSize).then(function (concepts) {

              // add to the existing batch concepts
              batchEditingService.addBatchConcepts(concepts).then(function () {
                notificationService.sendMessage(' Concepts added', 3000);
                scope.batchTableParams.reload();
              });
            });
          };

          scope.clearConcepts = function () {

            scope.viewedConcepts = [];
            batchEditingService.setBatchConcepts([]).then(function () {
              scope.batchTableParams.reload();
              notificationService.sendMessage('Concepts removed from batch', 3000);
            })
          };

          scope.editConcept = function (concept) {
            if (scope.viewedConcepts.filter(function (c) {
                return c.conceptId === concept.conceptId;
              }).length === 0) {
              scope.viewedConcepts.push(concept);
            } else {
              notificationService.sendWarning('Concept already added', 3000);
            }
          };

          //
          // Validation Functions
          //

          function validateAllHelper(concepts) {

            if (!concepts || concepts.length === 0) {
              return;
            }

            var concept = concepts[0];

            var tableConcept;

            try {
              tableConcept = scope.batchTableParams.data.filter(function (c) {
                return c.conceptId === concept.conceptId;
              })[0];
            } catch (e) {
              // do nothing
            }
            console.debug('table concept', tableConcept);
            if (tableConcept) {
              tableConcept.tableAction = 'Validating...';
            }

            console.debug('calling save');

            scope.validateConcept(tableConcept ? tableConcept : concept, true).then(function () {
              console.debug('validate returned successfully');
              if (tableConcept) {
                tableConcept.tableAction = null;
                scope.batchTableParams.reload();
              }
              validateAllHelper(concepts.slice(1));

            }, function (error) {
              console.debug('rejected validation');
              if (tableConcept) {
                tableConcept.tableAction = null;
                tableConcept.errorMsg = error;
              }
              validateAllHelper(concepts.slice(1));
            });

          }

          scope.validateAll = function () {
            console.debug('validateAll');
            angular.forEach(scope.batchTableParams.data, function (c) {
              c.errorMsg = null;
              c.tableAction = 'Waiting...'
            });
            var concepts = batchEditingService.getBatchConcepts();
            validateAllHelper(concepts);
          };

          scope.validateConcept = function (concept) {
            var deferred = $q.defer();

            var template = concept.template;

            concept.tableAction = 'Validating...';
            concept.validation = null;
            var originalConceptId = concept.conceptId;
            var conceptCopy = angular.copy(concept);
            snowowlService.validateConcept(scope.task.projectKey,
              scope.task.key,
              conceptCopy
            ).then(function (validationResults) {
              var results = {
                hasWarnings: false,
                hasErrors: false,
                warnings: {},
                errors: {}
              };

              angular.forEach(validationResults, function (validationResult) {
                if (validationResult.severity === 'WARNING') {
                  results.hasWarnings = true;
                  if (!results.warnings[validationResult.componentId]) {
                    results.warnings[validationResult.componentId] = [];
                  }
                  results.warnings[validationResult.componentId].push(validationResult.message);
                }

                else if (validationResult.severity === 'ERROR') {
                  results.hasErrors = true;
                  if (!results.errors[validationResult.componentId]) {
                    results.errors[validationResult.componentId] = [];
                  }
                  results.errors[validationResult.componentId].push(validationResult.message);
                }
              });
              console.debug('applying template to concept');
              templateService.applyTemplateToConcept(conceptCopy, template).then(function () {

                  console.debug('success');
                  conceptCopy.validation = results;
                  conceptCopy.tableAction = null;

                  applyNgTableSortingParams(conceptCopy);

                  concept = conceptCopy;

                  console.debug('conceptCopy', concept);

                  batchEditingService.updateBatchConcept(concept, originalConceptId).then(function () {
                    scope.batchTableParams.reload();
                    deferred.resolve();
                  }, function (error) {
                    deferred.reject(error);
                  });
                }
              ), function (error) {
                console.debug('template reapplication error after validation');
                deferred.reject(error);
              }
            }, function (error) {
              deferred.reject(error);
            });

            return deferred.promise;
          };

          //
          // Save Functions
          //

// update the actual concept from row values\

          function saveAllHelper(concepts) {


            console.debug('save all helper', concepts);

            if (concepts.length === 0) {
              return;
            }
            var concept = concepts[0];

            var tableConcept;

            try {
              tableConcept = scope.batchTableParams.data.filter(function (c) {
                return c.conceptId === concept.conceptId;
              })[0];
            } catch (e) {
              // do nothing
            }
            console.debug('table concept', tableConcept);
            if (tableConcept) {
              tableConcept.tableAction = 'Saving...';
            }

            console.debug('calling save');

            scope.saveConcept(tableConcept ? tableConcept : concept, true).then(function () {
              console.debug('save returned successfully');
              if (tableConcept) {
                tableConcept.tableAction = null;
                scope.batchTableParams.reload();
              }
              saveAllHelper(concepts.slice(1));

            }, function (error) {
              console.debug('rejected save');
              if (tableConcept) {
                tableConcept.tableAction = null;
                tableConcept.errorMsg = error;
              }
              saveAllHelper(concepts.slice(1));
            });
          }


          scope.saveAll = function () {
            console.debug('saveAll');
            angular.forEach(scope.batchTableParams.data, function (c) {
              c.errorMsg = null;
              c.tableAction = 'Waiting...'
            });
            var concepts = batchEditingService.getBatchConcepts();
            saveAllHelper(concepts);
          };

          scope.saveConcept = function (originalConcept, saveAllMode) {

            originalConcept.errorMsg = null;

            var deferred = $q.defer();

            notificationService.sendMessage('Saving batch concept ' + (originalConcept.sctid ? originalConcept.sctid : '(new)') + ' |' + originalConcept.fsn + '| ...');


            // check for completion
            var completionErrors = componentAuthoringUtil.checkConceptComplete(originalConcept);

            if (completionErrors.length > 0) {
              originalConcept.errorMsg = 'Incomplete';
              deferred.reject('Incomplete');
            } else {

              var concept = angular.copy(originalConcept);

              // store template
              var template = concept.template;

              // store concept id (if not an SCTID)
              var originalConceptId = concept.conceptId;

              // clean concept
              snowowlService.cleanConcept(concept);

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
              console.debug('saveFn')
              saveFn(
                scope.task.projectKey,
                scope.task.key,
                concept
              ).then(function (savedConcept) {

                // re-attach the concept id if present, using passed reference object from batchEditingService
                concept.conceptId = originalConceptId;
                if (template) {

                  templateService.applyTemplateToConcept(savedConcept, template).then(function () {
                    templateService.storeTemplateForConcept(scope.task.projectKey, savedConcept.conceptId, template);
                    templateService.logTemplateConceptSave(scope.task.projectKey, savedConcept.conceptId, savedConcept.fsn, template);

                    $rootScope.$broadcast('batchEditing.conceptChange', {
                      concept: concept,
                      isModified: false,
                      previousConceptId: originalConceptId
                    });
                    batchEditingService.updateBatchConcept(savedConcept, originalConceptId).then(function () {
                      notificationService.sendMessage('Concept saved, batch successfully updated', 3000);
                      deferred.resolve(savedConcept);
                    }, function (error) {
                      notificationService.sendWarning('Concept saved, but batch failed to update: ' + error);
                      deferred.resolve(savedConcept);
                    })
                  }, function (error) {
                    notificationService.sendError('Failed to apply template: ' + error);
                    deferred.resolve(savedConcept);
                  })
                } else {
                  notificationService.sendError('Unexpected error: No template stored for concept');
                  deferred.resolve(savedConcept);
                }


              }, function (error) {
                notificationService.sendError('Error saving concept: ' + error);
                deferred.reject('Error saving concept: ' + concept.fsn);
              })
            }

            return deferred.promise;

          };

          scope.removeConcept = function (concept) {

            batchEditingService.removeBatchConcept(concept.conceptId).then(function () {
              removeViewedConcept(concept.conceptId);
              scope.batchTableParams.reload();

            }, function (error) {
              notificationService.sendError('Unexpected error removing batch concept: ' + error);
            })

          };


          function removeViewedConcept(conceptId) {
            var index = scope.viewedConcepts.map(function (c) {
              return c.conceptId
            }).indexOf(conceptId);
            if (index !== -1) {
              scope.viewedConcepts.splice(index, 1);
            }
          }

//
// Scope listeners
//

// watch for close events
          scope.$on('stopEditing', function (event, data) {
            removeViewedConcept(data.concept.conceptId);
          });


// watch for save events from editing panel
          scope.$on('conceptEdit.conceptChange', function (event, data) {
            if (!data || !data.concept) {
              return;
            }

            console.debug('conceptEdit.conceptChange', data);

            // if validation result returned, apply to concept for storage
            if (data.validation) {
              data.concept.validation = data.validation;
            }

            notificationService.sendMessage('Updating batch list with saved concept...');
            batchEditingService.updateBatchConcept(data.concept, data.previousConceptId).then(function () {
              scope.batchTableParams.reload();
            });
          });

//
// Drag 'n Drop
//

          scope.dropConcept = function (event, data) {

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

            // get templates for dropdown
            templateService.getTemplates().then(function (templates) {
              scope.templates = templates;
            });


            // initialize from scope
            batchEditingService.initializeFromScope(scope).then(function () {

              scope.selectedTemplate = batchEditingService.getCurrentTemplate();
              scope.batchTableParams.reload();
              console.debug('selected template', scope.selectedTemplate);

            })
          }


          scope.$watch('task', function () {
            if (scope.task) {
              initialize();
            }
          });

          scope.$on('batchConcept.change', function () {
            scope.batchTableParams.reload();
          });

          scope.$on('conceptEdit.validation', function (event, data) {
            data.concept.validation = data.validation;
            batchEditingService.updateBatchConcept(data.concept, data.previousConceptId).then(function () {
              scope.batchTableParams.reload();
            });
          })


        }

      }
    }
  ])
;
