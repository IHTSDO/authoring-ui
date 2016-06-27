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

          scope.editable = attrs.editable === 'true';
          scope.taskKey = $routeParams.taskKey;

          scope.getSNF = function (id) {
            var deferred = $q.defer();
            snowowlService.getConceptSNF(id, scope.branch).then(function (response) {
              deferred.resolve(response);
            });
            return deferred.promise;
          };

          scope.conceptUpdateFunction = function (project, task, concept) {
            var deferred = $q.defer();
            snowowlService.updateConcept(project, task, concept).then(function (response) {
              deferred.resolve(response);
            });
            return deferred.promise;
          };

          //
          // Fsn by Id retrieval
          // NOTE: Call this on page changes to ensure concept ids are present
          //
          var fsnIdMap = {};
          function populateFsns() {
            var newIds = [];
            for (var id in fsnIdMap) {
              if (!fsnIdMap.hasOwnProperty(id)) {
                newIds.push(id);
              }
            }
            snowowlService.bulkGetConcept(newIds).then(function(concepts) {
              angular.forEach(concepts, function(concept) {
                fsnIdMap[concept.id] = concept.fsn.term;
              })
            })
          }

          //
          // Proposed value functions
          //
          function getProposedRelationship(relationship) {

            // isa relationships -- parents become grandparents of children
            if (metadataService.isIsaRelationship(relationship.type)) {

            } else {
              relationship.target.fsn = null;
              relationship.target.conceptId = null;
            }
          }

          function getProposedAssociationReference(assocationReference) {

          }

          //
          // Relationship retrieval functions
          //
          /**
           * Helper function to get and set a page of, or all, inbound relationships
           * @param conceptId
           * @param branch
           * @param startIndex
           * @param maxResults
           */
          function getInboundRelationships(startIndex, maxResults) {
            console.log('getting inbound relationships', startIndex, maxResults);
            var deferred = $q.defer();

            // get the concept relationships again (all)
            snowowlService.getConceptRelationshipsInbound(scope.inactivationConcept.conceptId, scope.branch, 0, scope.tableLimit).then(function (response) {

              // temporary array for preventing duplicate children
              var activeRels = [];

              // ng-table cannot handle e.g. source.fsn sorting, so extract fsns and
              // make top-level properties
              angular.forEach(response.inboundRelationships, function (item) {

                console.debug('checking relationship', item.active, item);

                // filter out non-active relationships
                if (item.active) {
                  item.sourceFsn = item.source.fsn;
                  item.typeFsn = item.type.fsn;
                  activeRels.push(item);
                }
              });

              // reassign the active rels
              response.inboundRelationships = activeRels;

              deferred.resolve(response);

            });
            return deferred.promise;
          }


          //
          // NgTable declarations
          //

          // declare table parameters
          scope.relsTableParams = new NgTableParams({
              page: 1,
              count: 10
            },
            {
              filterDelay: 50,

              // initial display text, overwritten in getData
              total: '-',
              getData: function ($defer, params) {

                getInboundRelationships((params.page() - 1) * params.count(), params.count()).then(function (response) {
                  console.log('ngTable inbound relationships', params);
                  scope.relsTableParams.total(response.total);
                  $defer.resolve(response.inboundRelationships);
                });
              }
            }
          );

          // declare table parameters
          scope.assocsTableParams = new NgTableParams({
              page: 1,
              count: 10
            },
            {
              // initial display text, overwritten in getData
              total: '-',
              getData: function ($defer, params) {
                // TODO Put call here
                scope.relsTableParams.total(0);
                $defer.resolve([]);
              }
            }
          );

          scope.selectAll = function (selectAllActive) {
            angular.forEach(scope.failures, function (failure) {
              failure.selected = selectAllActive;
            });
          };

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
        }

      };

    }])
;
