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
          scope.selectedTemplate = null;

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
                concept[r.targetSlot.slotName] = r.target.fsn;
              }
            });
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
          }

          scope.dropRelationshipTargetInNgTable = function (concept, slotName, data) {
            angular.forEach(concept.relationships, function (relationship) {
              if (relationship.targetSlot && relationship.targetSlot.slotName === slotName) {
                constraintService.isValueAllowedForType(relationship.type.conceptId, data.id, scope.branch,
                  relationship.template && relationship.template.targetSlot ? relationship.template.targetSlot.allowableRangeECL : null).then(function () {
                  relationship.target.conceptId = data.id;
                  relationship.target.fsn = data.name;
                  templateService.updateTargetSlot(concept, scope.selectedTemplate, relationship);
                }, function (error) {
                  notificationService.sendWarning('MRCM validation error: ' + data.name + ' is not a valid target for attribute type ' + relationship.type.fsn + '.');
                  relationship.target.fsn = tempFsn;
                });

              }
            })
          };

// TODO Set relationship target and update target slot on typeahead select
          scope.setTargetSlot = function (concept, slotName, data) {
            console.debug('set target slot', concept, slotName, data);
            angular.forEach(concept.relationships, function (r) {
              if (r.targetSlot && r.targetSlot.slotName === slotName) {
                r.target.conceptId = data.id;
                r.target.fsn = data.fsn.term;
                templateService.updateTargetSlot(concept, concept.template, r).then(function () {
                  scope.batchTableParams.reload();
                })
              }
            })
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

          function validateAllHelper(conceptIds) {
            console.debug('validateAllHelper', conceptIds, scope.batchTableParams.data, scope.batchTableParams.data.filter(function (c) {
              return c.conceptId === conceptIds[0];
            }));
            try {
              var concept = batchEditingService.getBatchConcepts().filter(function (c) {
                return c.conceptId === conceptIds[0];
              })[0];
              concept.action = 'Validating...';
              scope.validateConcept(angular.copy(concept), true).then(function () {
                conceptIds.splice(0, 1);
                validateAllHelper(conceptIds);
                scope.batchTableParams.reload();

              }, function (error) {
                validateAllHelper(conceptIds);
                conceptIds.splice(0, 1);

              })
            } catch (e) {
              console.error('Concept validation error: ' + conceptIds[0] + ' -- ' + e);
            }
          }

          scope.validateAll = function () {
            console.debug('validateAll');
            var conceptIds = scope.batchTableParams.data.map(function (c) {
              return c.conceptId
            });
            if (conceptIds.length > 0) {
              validateAllHelper(conceptIds);
            }
          };

          scope.validateConcept = function (concept) {
            var deferred = $q.defer();

            concept.action = 'Validating...';
            concept.validation = null;
            var conceptCopy = angular.copy(concept);
            snowowlService.validateConcept(scope.task.projectKey,
              scope.task.key,
              conceptCopy
            ).then(function (validationResults) {
              concept.action = null;
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

              concept.validation = results;

              batchEditingService.updateBatchConcept(concept, concept.conceptId).then(function () {
                scope.batchTableParams.reload();
                deferred.resolve();
              }, function (error) {
                deferred.reject(error);
              });
            }, function (error) {
              deferred.reject(error);
            });

            return deferred.promise;
          };

          //
          // Save Functions
          //

// update the actual concept from row values\

          function saveAllHelper(conceptIds) {
            console.debug('saveAllHelper', conceptIds, scope.batchTableParams.data, scope.batchTableParams.data.filter(function (c) {
              return c.conceptId === conceptIds[0];
            }));
            try {
              var concept = batchEditingService.getBatchConcepts().filter(function (c) {
                return c.conceptId === conceptIds[0];
              })[0];
              concept.action = 'Saving...';
              scope.saveConcept(angular.copy(concept), true).then(function () {
                conceptIds.splice(0, 1);
                saveAllHelper(conceptIds);
                scope.batchTableParams.reload();

              }, function (error) {
                saveAllHelper(conceptIds);
                conceptIds.splice(0, 1);

              })
            } catch (e) {
              console.error('Concept not found: ' + conceptIds[0] + ' -- ' + e);
            }
          }

          scope.saveAll = function () {
            console.debug('saveAll');
            var conceptIds = scope.batchTableParams.data.map(function (c) {
              return c.conceptId
            });
            if (conceptIds.length > 0) {
              saveAllHelper(conceptIds);
            }
          };

          scope.saveConcept = function (concept, saveAllMode) {

            var deferred = $q.defer();

            notificationService.sendMessage('Saving batch concept ' + (concept.sctid ? concept.sctid : '(new)') + ' |' + concept.fsn + '| ...');


            // check for completion
            var completionErrors = componentAuthoringUtil.checkConceptComplete(concept);

            if (completionErrors.length > 0) {
              if (!saveAllMode) {
                var msg = 'Concept is not complete. Please fix the following problems:';
                modalService.message('Please Complete Concept', msg, completionErrors);
              } else {
                deferred.reject('Concept incomplete. ' + completionErrors);
              }
            } else {

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
