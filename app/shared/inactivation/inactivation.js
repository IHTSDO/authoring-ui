'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')

  .directive('inactivation', ['$rootScope', '$location', '$filter', '$q', 'ngTableParams', '$routeParams', 'scaService', 'snowowlService', 'metadataService', 'inactivationService', 'notificationService', '$timeout', '$modal',
    function ($rootScope, $location, $filter, $q, NgTableParams, $routeParams, scaService, snowowlService, metadataService, inactivationService, notificationService, $timeout, $modal) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {

          // branch this report is good for
          branch: '='
        },
        templateUrl: 'shared/inactivation/inactivation.html',

        link: function (scope, element, attrs, linkCtrl) {


          scope.initializing = true;

          // map of changed concepts for batch update
          scope.affectedRelationshipIds = [];
          scope.affectedConceptIds = [];
          scope.affectedConcepts = {};

          // currently edited concept
          scope.editedConcept = null;

          // children and parents (convenience arrays)
          scope.inactivationConceptChildren = [];
          scope.inactivationConceptParents = [];

          // table filtering (across all tabs)
          scope.filter = null;
          //
          // Concept update function
          //
          scope.conceptUpdateFunction = function (project, task, concept) {
            var deferred = $q.defer();
            scope.affectedConcepts[concept.conceptId] = concept;
            scope.reloadTables();
            deferred.resolve(concept);
            return deferred.promise;
          };

          function relationshipFilter(item) {
            return item.sourceId.toLowerCase().indexOf(scope.filter.toLowerCase()) > -1 ||
              item.sourceFsn.toLowerCase().indexOf(scope.filter.toLowerCase()) > -1 ||
              item.target.conceptId.toLowerCase().indexOf(scope.filter.toLowerCase()) > -1 ||
              item.target.fsn.toLowerCase().indexOf(scope.filter.toLowerCase()) > -1 ||
              item.type.conceptId.toLowerCase().indexOf(scope.filter.toLowerCase()) > -1 ||
              item.type.fsn.toLowerCase().indexOf(scope.filter.toLowerCase()) > -1;
          }

          //
          // NgTable declarations
          //

          // declare table parameters
          scope.isaRelsTableParams = new NgTableParams({
              page: 1,
              count: 5
            },
            {
              filterDelay: 50,

              // initial display text, overwritten in getData
              total: '-',
              getData: function ($defer, params) {

                // console.debug('GET DATA')
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
                  });
                }

                if (scope.filter) {
                  data = data.filter(relationshipFilter);
                }


                // console.debug('  ISA DATA', data);
                data = params.sorting() ? $filter('orderBy')(data, params.orderBy()) : data;
                params.total(data.length);
                $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));

              }
            }
          );

          // declare table parameters
          scope.attrRelsTableParams = new NgTableParams({
              page: 1,
              count: 5
            },
            {
              // initial display text, overwritten in getData
              total: '-',
              getData: function ($defer, params) {

                // console.debug('GET DATA')
                var data = [];
                // recompute the affected relationships from ids or blank ids
                for (var conceptId in scope.affectedConcepts) {
                    console.log(scope.affectedConcepts);
                  angular.forEach(scope.affectedConcepts[conceptId].relationships, function (rel) {
                    // add all relationships with no id
                    if (!rel.relationshipId && !metadataService.isIsaRelationship(rel.type.conceptId)) {
                      rel.sourceFsn = scope.affectedConcepts[rel.sourceId].fsn;
                      rel.typeFsn = rel.type.fsn;
                      data.push(rel);
                    }
                  });
                }

                if (scope.filter) {
                  data = data.filter(relationshipFilter);
                }
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


          scope.reloadTables = function () {
            scope.isaRelsTableParams.reload();
            scope.attrRelsTableParams.reload();
          };

          /**
           * Remove concepts from viewed list on stopEditing events from
           * conceptEdit
           */
          scope.$on('stopEditing', function (event, data) {
            scope.editedConcept = false;
          });

          scope.editConcept = function (conceptId) {
            // console.debug('edit request', conceptId, scope.affectedConcepts[conceptId], scope.affectedConcepts);
            scope.editedConcept = scope.affectedConcepts[conceptId];
          };

          //
          // Complete and cancel
          //
          scope.cancelInactivation = function () {
            if (window.confirm('All changes made during inactivation will be lost, are you sure?')) {
              inactivationService.cancelInactivation(null);
              $rootScope.$broadcast('inactivation.cancelInactivation');
            }
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
              // console.debug('  Affected relationship ids ', scope.affectedRelationshipIds);
              // console.debug('  Affected concept ids', scope.affectedConcepts);
              deferred.resolve();
            });
            return deferred.promise;
          }

          /**
           * Initialization functions
           */


          function getAffectedConcepts() {
            // console.debug('Getting affected concepts');
            var deferred = $q.defer();

            if (scope.affectedRelationshipIds.length === 0) {
              deferred.resolve();
            }
            else {
              var conceptsRetrieved = 0;

              angular.forEach(Object.keys(scope.affectedConcepts), function (conceptId) {
                // console.debug('  Getting concept ' + conceptId);
                snowowlService.getFullConcept(conceptId, scope.branch).then(function (concept) {
                  scope.affectedConcepts[conceptId] = concept;
                  if (Object.keys(scope.affectedConcepts).length === ++conceptsRetrieved) {
                    // console.debug('  Final concept map', scope.affectedConcepts);
                    deferred.resolve();
                  }
                });
              });
            }


            return deferred.promise;
          }

          // inactivate a relationship and add new relationships for children
          function inactivateRelationship(concept, rel) {
            // console.debug('Inactivating relationship of type ', rel.type.fsn, rel);

            // assign copied new relationship to each parent
            angular.forEach(scope.inactivationConceptParents, function (parent) {

              var newRel = angular.copy(rel);
              newRel.relationshipId = null;
              newRel.effectiveTime = null;
              newRel.released = false;
              newRel.target.conceptId = parent.conceptId;
              newRel.target.fsn = parent.fsn;
              concept.relationships.push(newRel);
              // console.debug('    added relationship', newRel);
            });

            rel.active = 0;
            // console.debug('  Final state of concept', concept);
          }
            
          function inactivateAttributeRelationship(concept, rel) {
              if(scope.histAssocTarget != null){
                  
                  var newRel = angular.copy(rel);
                  newRel.relationshipId = null;
                  newRel.effectiveTime = null;
                  newRel.released = false;
                  newRel.target.conceptId = scope.histAssocTarget.conceptId;
                  newRel.target.fsn = scope.histAssocTarget.fsn;
                  concept.relationships.push(newRel);
                  rel.active = 0;
              }
              
          }


          function prepareAffectedRelationships() {

            for (var key in scope.affectedConcepts) {
              // console.debug('Preparing affected relationships for concept' + key);
              if (scope.affectedConcepts.hasOwnProperty(key)) {
                var concept = scope.affectedConcepts[key];
                angular.forEach(concept.relationships, function (rel) {
                  // console.debug('  Checking relationship ' + rel.relationshipId, scope.affectedRelationshipIds);
                  if (scope.affectedRelationshipIds.indexOf(rel.relationshipId) !== -1 && metadataService.isIsaRelationship(rel.type.conceptId)) {
                    // console.debug('  prepping relationship', rel.relationshipId);
                    inactivateRelationship(concept, rel);
                  }
                  else if(scope.affectedRelationshipIds.indexOf(rel.relationshipId) !== -1){
                    inactivateAttributeRelationship(concept, rel);
                  }
                });
              }
            }
          }


          function initialize() {
            notificationService.sendMessage('Initializing inactivation...');

            scope.inactivationConcept = inactivationService.getConcept();
            scope.reasonId = inactivationService.getReasonId();
            scope.assocs = inactivationService.getAssocs();
            scope.histAssocTarget = {};
            for (var key in scope.assocs) {
                scope.histAssocTarget.conceptId = "";
                scope.histAssocTarget.fsn = "";
                scope.histAssocTarget.conceptId = scope.assocs[key];
                snowowlService.getConceptPreferredTerm(scope.histAssocTarget.conceptId, scope.branch).then(function (response) {
                    scope.histAssocTarget.fsn = response.term;
                });
                
                break;
            }
            console.log(scope.histAssocTarget);

            // console.debug('  concept to inactivate', scope.inactivationConcept);

            // extract the parent concepts
            angular.forEach(scope.inactivationConcept.relationships, function (rel) {
              if (rel.active && rel.characteristicType === 'STATED_RELATIONSHIP' && metadataService.isIsaRelationship(rel.type.conceptId)) {
                scope.inactivationConceptParents.push({conceptId: rel.target.conceptId, fsn: rel.target.fsn});
              }
            });
            // console.debug('Concept parents:', scope.inactivationConceptParents);


            // ensure that children have been retrieved
            snowowlService.getConceptChildren(scope.inactivationConcept.conceptId, scope.branch).then(function (children) {
              scope.inactivationConceptChildren = children;
              notificationService.sendMessage('Retrieving inbound relationships...');
              getAffectedObjectIds().then(function () {
                notificationService.sendMessage('Initializing affected concepts...');
                getAffectedConcepts().then(function () {
                  notificationService.sendMessage('Preparing affected relationships...');
                  prepareAffectedRelationships();
                  notificationService.sendMessage('Inactivation initialization complete', 5000);
                  scope.reloadTables();
                  scope.initializing = false;

                });
              });
            });
          }

          initialize();
        }

      };

    }])
;
