'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('inactivation', ['$rootScope', '$filter', '$q', 'ngTableParams', '$routeParams', 'scaService', 'snowowlService', 'metadataService', 'inactivationService', 'notificationService', '$timeout', '$modal',
    function ($rootScope, $filter, $q, NgTableParams, $routeParams, scaService, snowowlService, metadataService, inactivationService, notificationService, $timeout, $modal) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          //concept that is being inactivated
          inactivationConcept: '=',

          // branch this report is good for
          branch: '='
        },
        templateUrl: 'shared/inactivation/inactivation.html',

        link: function (scope, element, attrs, linkCtrl) {

          console.debug('INACTIVATION VIEW', scope.inactivationConcept, scope.branch)

          // tab content arrays
          scope.isaRels = [];
          scope.attrRels = [];
          scope.assocRefs = [];

          // map of changed concepts for batch update
          scope.affectedRelationshipIds = [];
          scope.affectedConceptIds = [];
          scope.affectedConcepts = {};

          // currently edited concept
          scope.viewedConcept = null;

          // children and parents (convenience arrays)
          scope.inactivationConceptChildren = [];
          scope.inactivationConceptParents = [];

          //
          // Concept update function
          //
          scope.conceptUpdateFunction = function (project, task, concept) {
            scope.affectedConcepts[concept.conceptId] = concept;
            reloadTables();
          };


          //
          // NgTable declarations
          //

          // declare table parameters
          scope.isaRelsTableParams = new NgTableParams({
              page: 1,
              count: 10
            },
            {
              filterDelay: 50,

              // initial display text, overwritten in getData
              total: '-',
              getData: function ($defer, params) {

                console.debug('GET DATA')
                var data = [];
                // recompute the affected relationships from ids or blank ids
                for (var conceptId in scope.affectedConcepts) {
                  angular.forEach(scope.affectedConcepts[conceptId].relationships, function (rel) {
                    // add all relationships with no id
                    if (!rel.relationshipId && metadataService.isIsaRelationship(rel.type.conceptId)) {
                      rel.sourceFsn = scope.affectedConcepts[rel.sourceId].fsn;
                      rel.typeFsn = rel.type.fsn;
                      data.push(rel);
                    }
                  })
                }
                console.debug('  ISA DATA', data);
                data = params.sorting() ? $filter('orderBy')(data, params.orderBy()) : data;
                params.total(data.length);
                $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));

              }
            }
          );

          // declare table parameters
          scope.attrRelsTableParams = new NgTableParams({
              page: 1,
              count: 10
            },
            {
              // initial display text, overwritten in getData
              total: '-',
              getData: function ($defer, params) {

                console.debug('GET DATA')
                var data = [];
                // recompute the affected relationships from ids or blank ids
                for (var conceptId in scope.affectedConcepts) {
                  angular.forEach(scope.affectedConcepts[conceptId].relationships, function (rel) {
                    // add all relationships with no id
                    if (!rel.relationshipId && !metadataService.isIsaRelationship(rel.type.conceptId)) {
                      rel.sourceFsn = scope.affectedConcepts[rel.sourceId].fsn;
                      rel.typeFsn = rel.type.fsn;
                      data.push(rel);
                    }
                  })
                }
                console.debug('  ATTR DATA', data);
                data = params.sorting() ? $filter('orderBy')(data, params.orderBy()) : data;
                params.total(data.length);
                $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));

              }
            }
          );

          scope.selectAll = function (selectAllActive) {
            angular.forEach(scope.failures, function (failure) {
              failure.selected = selectAllActive;
            });
          };


          function reloadTables() {
            scope.isaRelsTableParams.reload();
            scope.attrRelsTableParams.reload();
          }

          /**
           * Remove concepts from viewed list on stopEditing events from
           * conceptEdit
           */
          scope.$on('stopEditing', function (event, data) {
            for (var i = 0; i < scope.viewedConcepts.length; i++) {
              if (scope.viewedConcepts[i].conceptId === data.concept.conceptId) {
                scope.viewedConcepts.splice(i, 1);
                return;
              }
            }
          });

          /**
           * Function to add a concept by id to the list
           * Used by single editConcept or multiple editSelectedConcept methods
           * @param conceptId
           * @returns {*|promise}
           */
          function editConceptHelper(conceptId) {
            var deferred = $q.defer();

            snowowlService.getFullConcept(conceptId, scope.branch).then(function (response) {
              if (!scope.viewedConcepts || !Array.isArray(scope.viewedConcepts)) {
                scope.viewedConcepts = [];
              }
              scope.viewedConcepts.push(response);
              deferred.resolve(response);
            }, function (error) {
              deferred.reject(); // no error passing, for count purposes only
            });

            return deferred.promise;
          }

          scope.editConcept = function (conceptId) {

            var existingIds = scope.viewedConcepts.map(function (viewed) {
              return viewed.conceptId;
            });

            // NOTE: Requires string conversion based on RVF format
            if (existingIds.indexOf(conceptId.toString()) !== -1) {
              notificationService.sendWarning('Concept already loaded', 5000);
            } else {

              notificationService.sendMessage('Loading concept...');
              editConceptHelper(conceptId).then(function (response) {
                notificationService.sendMessage('Concept loaded', 5000);

                $timeout(function () {
                  $rootScope.$broadcast('viewTaxonomy', {
                    concept: {
                      conceptId: response.conceptId,
                      fsn: response.fsn
                    }
                  });
                }, 500);
              }, function (error) {
                notificationService.sendError('Error loading concept', 5000);
              });
            }
          };

          scope.editSelectedConcepts = function () {
            var nConcepts = 0;
            notificationService.sendMessage('Loading concepts...');

            console.debug(scope.failures);

            // construct array of concept ids for previously loaded concepts
            var existingIds = scope.viewedConcepts.map(function (viewed) {
              return viewed.conceptId;
            });

            var conceptsToAdd = [];
            angular.forEach(scope.failures, function (failure) {
              if (failure.selected && existingIds.indexOf(failure.errorMessage.conceptId.toString()) === -1) {
                conceptsToAdd.push(failure.errorMessage.conceptId);
              }
            });

            console.debug('existing ids', existingIds);

            // cycle over all failures
            var conceptsLoaded = 0;
            angular.forEach(conceptsToAdd, function (conceptId) {

              console.debug('loading concept ', conceptId);

              // add the concept
              editConceptHelper(conceptId).then(function () {

                if (++conceptsLoaded === conceptsToAdd.length) {
                  notificationService.sendMessage('Concepts loaded.', 5000);
                }
              }, function (error) {
                notificationService.sendError('Error loading at least one concept');
              });
            });
          };

          //
          // Retrieval functions
          //


          function getAffectedObjectIds() {
            console.log('Getting affected object ids');
            var deferred = $q.defer();
            snowowlService.getConceptRelationshipsInbound(scope.inactivationConcept.conceptId, scope.branch, 0, -1).then(function (response) {
              scope.affectedRelationshipIds = [];

              angular.forEach(response.inboundRelationships, function (item) {

                // only want active, stated relationships
                if (item.active && item.characteristicType === 'STATED_RELATIONSHIP') {
                  // ng-table can't sort on A.B fields,
                  item.sourceFsn = item.source.fsn;
                  item.typeFsn = item.type.fsn;
                  scope.affectedRelationshipIds.push(item.id);
                  scope.affectedConcepts[item.sourceId] = {};
                }
              });
              console.debug('  Affected relationship ids ', scope.affectedRelationshipIds);
              console.debug('  Affected concept ids', scope.affectedConcepts);
              deferred.resolve();
            });
            return deferred.promise;
          }

          /**
           * Initialization functions
           */


          function getAffectedConcepts(inboundRelationships) {
            console.debug('Getting affected concepts');
            var deferred = $q.defer();
            var conceptsRetrieved = 0;
            angular.forEach(Object.keys(scope.affectedConcepts), function (conceptId) {
              console.debug('  Getting concept ' + conceptId);
              snowowlService.getFullConcept(conceptId, scope.branch).then(function (concept) {
                scope.affectedConcepts[conceptId] = concept;
                if (Object.keys(scope.affectedConcepts).length === ++conceptsRetrieved) {
                  console.debug('  Final concept map', scope.affectedConcepts);
                  deferred.resolve();
                }
              })
            });


            return deferred.promise;
          }

          // inactivate a relationship and add new relationships for children
          function inactivateRelationship(concept, rel) {
            console.debug('Inactivating relationship ', rel);

            // assign copied new relationship to each parent
            angular.forEach(scope.inactivationConceptParents, function (parent) {

              var newRel = angular.copy(rel);
              newRel.relationshipId = null;
              newRel.effectiveTime = null;
              newRel.released = false;
              newRel.target.id = parent.conceptId;
              newRel.target.fsn = parent.fsn;
              concept.relationships.push(newRel);
              console.debug('    added relationship', newRel);
            });

            rel.active = 0;
            console.debug('  Final state of concept', concept);
          }


          function prepareAffectedRelationships() {

            for (var key in scope.affectedConcepts) {
              console.debug('Preparing affected relationships for concept' + key);
              if (scope.affectedConcepts.hasOwnProperty(key)) {
                var concept = scope.affectedConcepts[key];
                angular.forEach(concept.relationships, function (rel) {
                  console.debug('  Checking relationship ' + rel.relationshipId, scope.affectedRelationshipIds);
                  if (scope.affectedRelationshipIds.indexOf(rel.relationshipId) !== -1) {
                    console.debug('  prepping relationship', rel.relationshipId);
                    inactivateRelationship(concept, rel);
                  }
                });
              }
            }
          };


          function initialize() {
            notificationService.sendMessage('Initializing inactivation...');

            // extract the parent concepts
            angular.forEach(scope.inactivationConcept.relationships, function (rel) {
              if (rel.active && rel.characteristicType === 'STATED_RELATIONSHIP' && metadataService.isIsaRelationship(rel.type.conceptId)) {
                scope.inactivationConceptParents.push({conceptId: rel.target.conceptId, fsn: rel.target.fsn});
              }
            });
            console.debug('Concept parents:', scope.inactivationConceptParents);


            // ensure that children have been retrieved
            snowowlService.getConceptChildren(scope.inactivationConcept.conceptId, scope.branch).then(function (children) {
              scope.inactivationConceptChildren = children;
              notificationService.sendMessage('Retrieving inbound relationships...');
              getAffectedObjectIds().then(function () {
                notificationService.sendMessage('Initializing affected concepts...');
                getAffectedConcepts().then(function () {
                  notificationService.sendMessage('Preparing affected relationships...');
                  prepareAffectedRelationships();
                  notificationService.sendMessage('Inactivation initialization complete');
                  reloadTables();

                });
              });
            });
          };

          initialize();
        }

      };

    }])
;
