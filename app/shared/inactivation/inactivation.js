'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')

  .directive('inactivation', ['$rootScope', '$location', '$filter', '$q', 'ngTableParams', '$routeParams', 'scaService', 'snowowlService', 'metadataService', 'inactivationService', 'notificationService', '$timeout', '$modal', '$route',
    function ($rootScope, $location, $filter, $q, NgTableParams, $routeParams, scaService, snowowlService, metadataService, inactivationService, notificationService, $timeout, $modal, $route) {
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
          scope.affectedAssocs = [];
          scope.finalizing = false;
          scope.isStatic = false;
          scope.tabOneAccepted = false;
          scope.tabTwoAccepted = false;
          scope.tabThreeAccepted = false;
            
          $(".btn").mouseup(function(){
            $(this).blur();
        })

          // currently edited concept
          scope.editedConcept = null;

          // children and parents (convenience arrays)
          scope.inactivationConceptChildren = [];
          scope.inactivationConceptParents = [];

          // table filtering (across all tabs)
          scope.tableFilter = null;
          //
          // Concept update function
          //
          scope.$on('saveInactivationEditing', function (event, data) {
            console.debug('saveInactivationEditing', data.concept);
            if (!data || !data.concept) {
              console.error('inactivationConceptChange notification sent without concept data');
              return;
            }
            scope.affectedConcepts[data.concept.conceptId] = data.concept;
            scope.reloadTables();
          });

          function relationshipFilter(item) {
            return item.sourceId.toLowerCase().indexOf(scope.tableFilter.toLowerCase()) > -1 ||
              item.sourceFsn.toLowerCase().indexOf(scope.tableFilter.toLowerCase()) > -1 ||
              item.target.conceptId.toLowerCase().indexOf(scope.tableFilter.toLowerCase()) > -1 ||
              item.target.fsn.toLowerCase().indexOf(scope.tableFilter.toLowerCase()) > -1 ||
              item.type.conceptId.toLowerCase().indexOf(scope.tableFilter.toLowerCase()) > -1 ||
              item.type.fsn.toLowerCase().indexOf(scope.tableFilter.toLowerCase()) > -1;
          }

          function assocFilter(item) {
            for (var i = 0; i < scope.associationTargets.length; i++) {
              if (item.referenceSetId === scope.associationTargets[i].conceptId) {
                return true;
              }
            }
            return false;
          }

          function parseAssocs(list) {
            var deferred = $q.defer();
            for (var i = list.length -1; i >= 0; i--) {
              for (var j = 0; j < scope.associationTargets.length; j++) {
                if (list[i].referenceSetId === scope.associationTargets[j].conceptId) {
                    console.log(scope.histAssocTargets);
                    if(scope.histAssocTargets && scope.histAssocTargets.concepts.length > 0){
                        angular.forEach(scope.histAssocTargets.concepts, function (concept){
                            var item = angular.copy(list[i]);
                            item.refsetName = scope.associationTargets[j].text;
                            item.refsetSaveable = scope.associationTargets[j].id;
                            item.newTargetId = concept.conceptId;
                            item.newTargetFsn = concept.fsn;
                            list.push(item);
                        });
                    }
                    else{
                        var item = angular.copy(list[i])
                        list[i].refsetName = scope.associationTargets[j].text;
                        list[i].refsetSaveable = scope.associationTargets[j].id;
                        list.push(item);
                    }
                }
              }
              list.splice(i, 1);
            }
            
            deferred.resolve(list);
            return deferred.promise;
          }

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

                // console.debug('GET DATA')
                var data = [];
                // recompute the affected relationships from ids or blank ids
                for (var conceptId in scope.affectedConcepts) {
                  if(scope.affectedConcepts[conceptId]){
                      angular.forEach(scope.affectedConcepts[conceptId].relationships, function (rel) {
                        // add all relationships with no effective time
                        if (!rel.effectiveTime && metadataService.isIsaRelationship(rel.type.conceptId)) {
                          rel.sourceFsn = scope.affectedConcepts[rel.sourceId].fsn;
                          rel.typeFsn = rel.type.fsn;
                          data.push(rel);
                        }
                      });
                  }
                }

                params.total(data.length);

                if (scope.tableFilter) {
                  data = data.filter(relationshipFilter);
                }


                // console.debug('  ISA DATA', data);
                data = params.sorting() ? $filter('orderBy')(data, params.orderBy()) : data;

                $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));

              }
            }
          );
            
          scope.acceptAll = function(){
              if(scope.actionTab === 1){
                  if(!scope.tabOneAccepted){
                      for (var conceptId in scope.affectedConcepts) {
                          if(scope.affectedConcepts[conceptId]){
                              angular.forEach(scope.affectedConcepts[conceptId].relationships, function (rel) {
                                // add all relationships with no effective time
                                if (!rel.effectiveTime && metadataService.isIsaRelationship(rel.type.conceptId)) {
                                  rel.accepted = true;
                                  rowsAccepted++;
                                }
                              });
                          }
                        }
                  }
                  else{
                        for (var conceptId in scope.affectedConcepts) {
                              if(scope.affectedConcepts[conceptId]){
                                  angular.forEach(scope.affectedConcepts[conceptId].relationships, function (rel) {
                                    // add all relationships with no effective time
                                    if (!rel.effectiveTime && metadataService.isIsaRelationship(rel.type.conceptId)) {
                                      rel.accepted = false;
                                      rowsAccepted--;
                                    }
                                  });
                              }
                        }
                  }
                  scope.tabOneAccepted = !scope.tabOneAccepted;
              }
              else if(scope.actionTab === 2){
                  if(!scope.tabTwoAccepted){
                      for (var conceptId in scope.affectedConcepts) {
                          if(scope.affectedConcepts[conceptId]){
                              angular.forEach(scope.affectedConcepts[conceptId].relationships, function (rel) {

                                // add all relationships with no effective time
                                if (!rel.effectiveTime && !metadataService.isIsaRelationship(rel.type.conceptId)) {
                                  rel.accepted = true;
                                  rowsAccepted++;
                                }
                              });
                          }
                        }
                  }
                  else{
                      for (var conceptId in scope.affectedConcepts) {
                          if(scope.affectedConcepts[conceptId]){
                              angular.forEach(scope.affectedConcepts[conceptId].relationships, function (rel) {

                                // add all relationships with no effective time
                                if (!rel.effectiveTime && !metadataService.isIsaRelationship(rel.type.conceptId)) {
                                  rel.accepted = false;
                                  rowsAccepted--;
                                }
                              });
                          }
                        }
                  }
                  scope.tabTwoAccepted = !scope.tabTwoAccepted;
              }
              else if(scope.actionTab === 3){
                  if(!scope.tabThreeAccepted){
                      angular.forEach(scope.affectedAssocs, function(rel){
                          rel.accepted = true;
                          rowsAccepted++;
                      });
                  }
                  else{
                      angular.forEach(scope.affectedAssocs, function(rel){
                          rel.accepted = false;
                          rowsAccepted--;
                      });
                  }
                  scope.tabThreeAccepted = !scope.tabThreeAccepted;
              }
              scope.reloadTables();
          };

          // declare table parameters
          scope.attrRelsTableParams = new NgTableParams({
              page: 1,
              count: 10
            },
            {
              // initial display text, overwritten in getData
              total: '-',
              getData: function ($defer, params) {

                // console.debug('GET DATA')
                var data = [];
                // recompute the affected relationships from ids or blank ids
                for (var conceptId in scope.affectedConcepts) {
                  if(scope.affectedConcepts[conceptId]){
                      angular.forEach(scope.affectedConcepts[conceptId].relationships, function (rel) {

                        // add all relationships with no effective time
                        if (!rel.effectiveTime && !metadataService.isIsaRelationship(rel.type.conceptId)) {
                          rel.sourceFsn = scope.affectedConcepts[rel.sourceId].fsn;
                          rel.typeFsn = rel.type.fsn;
                          data.push(rel);
                        }
                      });
                  }
                }

                params.total(data.length);
                if (scope.tableFilter) {
                  data = data.filter(relationshipFilter);
                }
                data = params.sorting() ? $filter('orderBy')(data, params.orderBy()) : data;

                $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));

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

                // console.debug('GET DATA')
                var data = [];
                // recompute the affected relationships from ids or blank ids
                data = scope.affectedAssocs;
                params.total(data.length);
                console.debug('assocs', scope.affectedAssocs);

//                if (scope.tableFilter) {
//                  data = data.filter(relationshipFilter);
//                }
                data = params.sorting() ? $filter('orderBy')(data, params.orderBy()) : data;

                $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));

              }
            }
          );
            
          scope.setTargetComponent = function(){
              
          };

          scope.selectAll = function (selectAllActive) {
            angular.forEach(scope.failures, function (failure) {
              failure.selected = selectAllActive;
            });
          };


          scope.reloadTables = function () {
            scope.isaRelsTableParams.reload();
            scope.attrRelsTableParams.reload();
            scope.assocsTableParams.reload();
          };

          /**
           * Remove concepts from viewed list on stopEditing events from
           * conceptEdit
           */
          scope.$on('stopEditing', function (event, data) {
            scope.editedConcept = false;
          });

          scope.editConcept = function (conceptId) {
            scope.isStatic = false;
            console.debug('edit concept', conceptId, scope.affectedConcepts[conceptId]);
            scope.editedConcept = null;
            $timeout(function () {
              scope.editedConcept = scope.affectedConcepts[conceptId];
            }, 250);

          };
        
          scope.viewAssociationConcept = function (conceptId) {
            scope.isStatic = true;
            scope.editedConcept = null;
            snowowlService.getFullConcept(conceptId, scope.branch).then(function (response) {
                scope.editedConcept = response;
            });
          };
            

          scope.removeRelationship = function (relationship) {
            var concept = scope.affectedConcepts[relationship.sourceId];
            for (var i = concept.relationships.length - 1; i >= 0; i--) {
              if (concept.relationships[i].target.conceptId === relationship.target.conceptId && concept.relationships[i].type.conceptId === relationship.type.conceptId) {
                concept.relationships.splice(i, 1);
              }
            }

            if (scope.editedConcept && scope.editedConcept.conceptId === relationship.sourceId) {
              scope.editConcept(relationship.sourceId);
            }
            scope.reloadTables();
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

          scope.completeInactivation = function () {
            scope.finalizing = true;
            notificationService.sendMessage('Saving Modified Relationships...');
            console.log(scope.affectedConcepts);
            if(scope.affectedConcepts && scope.affectedConcepts !== null){
                var conceptArray = $.map(scope.affectedConcepts, function (value, index) {
                  return [value];
                });
                angular.forEach(conceptArray, function (concept) {
                  if(concept && concept.relationships){
                      angular.forEach(concept.relationships, function (rel) {
                        if (rel.sourceFsn) {
                          delete rel.sourceFsn;
                        }
                        if (rel.typeFsn) {
                          delete rel.typeFsn;
                        }
                        if (rel.accepted) {
                          delete rel.accepted;
                          if(rel.relationshipId !== null)
                          {
                              rel.relationshipId = null;
                          }
                        }
                        
                      });
                  }
                });
                snowowlService.bulkUpdateConcept(scope.branch, conceptArray).then(function (response) {
                    notificationService.sendMessage('Updating Historical Associations...');
                    updateHistoricalAssociations(scope.affectedAssocs).then(function(){
                        notificationService.sendMessage('Inactivating Concept...');
                        inactivationService.inactivateConcept().then(function(){
                            notificationService.sendMessage('Inactivation Complete');
                            $route.reload();                         
                         });
                    });
                });
            }
            else{
                notificationService.sendMessage('Updating Historical Associations...');
                    updateHistoricalAssociations(scope.affectedAssocs).then(function(){
                        notificationService.sendMessage('Inactivating Concept...');
                        inactivationService.inactivateConcept().then(function(){
                            notificationService.sendMessage('Inactivation Complete');
                            $route.reload();                         
                         });
                    });
            }
          };
            
          scope.dropAssociationTarget = function (relationship, data) {
            relationship.newTargetId = data.id;
            relationship.newTargetFsn = data.name;
            scope.reloadTables();
          };
        
          function updateHistoricalAssociations(list){
              var deferred = $q.defer();
              if(list && list.length > 0){
                  var cntr = 0;
                  function next() {
                    if (cntr < list.length) {
                        var assoc = {};
                        assoc[list[cntr].refsetSaveable] = [list[cntr].newTargetId];
                        snowowlService.inactivateConcept(scope.branch, list[cntr].referencedComponent.id,  list[cntr].referencedComponent.inactivationIndicator, assoc).then(function () {
                                cntr++;
                                next();
                              });
                        }
                      else{deferred.resolve();};
                    }
                    next();
              }
              else{deferred.resolve();};
              return deferred.promise;
          };


          //
          // Retrieval functions
          //


          function getAffectedObjectIds() {
            console.log('Getting affected object ids');
            var deferred = $q.defer();
            snowowlService.getConceptRelationshipsInbound(scope.inactivationConcept.conceptId, scope.branch, 0).then(function (response) {
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

          function getAffectedAssociations() {
            var deferred = $q.defer();
            snowowlService.getMembersByTargetComponent(scope.inactivationConcept.conceptId, scope.branch).then(function (response) {
              scope.affectedAssocs = response.items ? response.items.filter(assocFilter) : [];
              console.debug('affected assocs', response, scope.affectedAssocs);

              // retrieve affected concepts from associations
              var conceptIds = [];

              if(response.items && response.items.length > 0){
                  parseAssocs(scope.affectedAssocs).then(function (list) {
                    scope.affectedAssocs = list;
                    deferred.resolve();
                  });
              }
                else{deferred.resolve()};
              
            });
            return deferred.promise;
          }

          // inactivate a relationship and add new relationships for children
          function inactivateRelationship(concept, rel) {
            //         console.debug('Inactivating relationship of type ', rel.type.fsn, rel);

            /*    // Switch behavior based on historical association targets present
             if (Object.keys(scope.histAssocTargets).length > 0) {

             }

             // otherwise assign copied new relationship to each parent
             else {*/
            angular.forEach(scope.inactivationConceptParents, function (parent) {

              var newRel = angular.copy(rel);
              newRel.relationshipId = null;
              newRel.effectiveTime = null;
              newRel.released = false;
              newRel.target.conceptId = parent.conceptId;
              newRel.target.fsn = parent.fsn;
              concept.relationships.push(newRel);
//              console.debug('    added relationship', newRel);
            });


            // set the original relationship to inactive
            rel.active = 0;
          }

          function inactivateAttributeRelationship(concept, rel) {
              console.log('attributes');
            if (scope.histAssocTargets && scope.histAssocTargets.concepts.length > 0) {
                  angular.forEach(scope.histAssocTargets.concepts, function(innerConcept){
                      var newRel = angular.copy(rel);
                      newRel.relationshipId = null;
                      newRel.effectiveTime = null;
                      newRel.released = false;
                      newRel.target.conceptId = innerConcept.conceptId;
                      newRel.target.fsn = innerConcept.fsn;
                      concept.relationships.push(newRel);
                      rel.active = 0;
                  });
            }
              else{
                  console.log('not assocs');
                  var newRel = angular.copy(rel);
                  newRel.relationshipId = null;
                  newRel.effectiveTime = null;
                  newRel.released = false;
                  newRel.target.conceptId = '';
                  newRel.target.fsn = '';
                  concept.relationships.push(newRel);
                  rel.active = 0;
              }
            }


          function prepareAffectedRelationships() {

            var deferred = $q.defer();

            for (var key in scope.affectedConcepts) {
              //console.debug('Preparing affected relationships for concept', key, scope.affectedConcepts);
              if (scope.affectedConcepts.hasOwnProperty(key)) {
                var concept = scope.affectedConcepts[key];
                if(concept && concept.relationships){
                    angular.forEach(concept.relationships, function (rel) {
                      //  console.debug('  Checking relationship ' + rel.relationshipId, scope.affectedRelationshipIds);
                      if (scope.affectedRelationshipIds.indexOf(rel.relationshipId) !== -1 && metadataService.isIsaRelationship(rel.type.conceptId) && scope.histAssocTargets.concepts.length === 0) {
                        // console.debug('  prepping relationship', rel.relationshipId);
                        inactivateRelationship(concept, rel);
                      }
                      else if (scope.affectedRelationshipIds.indexOf(rel.relationshipId) !== -1) {
                        inactivateAttributeRelationship(concept, rel);
                      }
                    });
                }
              }
            }
            deferred.resolve();
            return deferred.promise;
          }

          //
          // Relationship approval and completion marking
          //
          var rowsAccepted = 0;
          scope.toggleRowAccepted = function(row) {
            row.accepted = !row.accepted;
            rowsAccepted += row.accepted ? 1 : -1;
          };

          scope.isComplete = function () {
            return !scope.initializing && rowsAccepted === scope.isaRelsTableParams.total() + scope.attrRelsTableParams.total() + scope.assocsTableParams.total();
          };

          //
          // Association reference variables and functions
          //

          scope.associationTargets = [];
          scope.inactivationReasons = [];

          scope.getAssociationsForReason = function (reason) {
            var reasonArr = scope.inactivationReasons.filter(function (item) {
              return item.id === reason;
            });
            if (reasonArr.length != 1) {
              console.error('Unexpected number of reasons found for text ' + reason);
            }

            var assocs = [];
            angular.forEach(scope.associationTargets, function (target) {
              if (reasonArr[0].display.indexOf(target.display) !== -1) {
                assocs.push(target);
              }
            });

            return assocs;
          };

          scope.getTargetConceptSuggestions = function (text) {
            console.debug('getTargetConceptSuggestions:', text);
            return snowowlService.findConceptsForQuery($routeParams.projectKey, $routeParams.taskKey, text, 0, 10).then(function (response) {
              for (var i = 0; i < response.length; i++) {
              // console.debug('checking for duplicates', i, response[i]);
                  for (var j = response.length - 1; j > i; j--) {
                    if (response[j].concept.conceptId === response[i].concept.conceptId) {
                      // console.debug(' duplicate ', j, response[j]);
                      response.splice(j, 1);
                      j--;
                    }
                  }
              }
              for (var i = 0; i >= response.length -1; i--) {
                    if (response[i].active === false) {
                      response.splice(i, 1);
                    }
              }
              console.log(response);
              return response;
            });
          };

          scope.setTargetConcept = function (rel, concept) {
            rel.newTargetId = concept.concept.conceptId;
            rel.newTargetFsn = concept.concept.fsn;
          }
          scope.updateRefTarget = function(rel){
            console.log('updating');
            for (var j = 0; j < scope.associationTargets.length; j++) {
                if (rel.refsetName === scope.associationTargets[j].text) {
                    rel.refsetSaveable = scope.associationTargets[j].id;
                    break;
                }
              }
            console.log(rel);
          };
          


          //
          // Initialization
          //

          function initialize() {
            notificationService.sendMessage('Initializing inactivation...');

            scope.inactivationConcept = inactivationService.getConcept();
            scope.reasonId = inactivationService.getReasonId();
            scope.assocs = inactivationService.getAssocs();
            scope.associationTargets = metadataService.getAssociationInactivationReasons();
            scope.inactivationReasons = metadataService.getConceptInactivationReasons();
            scope.assocName = null;
            scope.histAssocTargets = {};
            scope.histAssocTargets.concepts = [];

            for (var key in scope.assocs) {
              
              angular.forEach(scope.assocs[key], function(id){
                  var concept = {};
                  concept.assocName = key;
                  concept.conceptId = id;
                  snowowlService.getConceptDescriptions(id, scope.branch).then(function (response) {
                    angular.forEach(response, function(desc){
                        if(desc.typeId === '900000000000003001' && desc.active === true)
                        {
                            concept.fsn = desc.term;
                        }
                    });
                    
                  });
                  console.log(concept);
                  scope.histAssocTargets.concepts.push(concept);
              });
              
            }

            // console.debug('  concept to inactivate', scope.inactivationConcept);

            // extract the parent concepts
            angular.forEach(scope.inactivationConcept.relationships, function (rel) {
              if (rel.active && rel.characteristicType === 'STATED_RELATIONSHIP' && metadataService.isIsaRelationship(rel.type.conceptId)) {
                scope.inactivationConceptParents.push({conceptId: rel.target.conceptId, fsn: rel.target.fsn});
              }
            });
            // console.debug('Concept parents:', scope.inactivationConceptParents);


            // ensure that children have been retrieved
            snowowlService.getStatedConceptChildren(scope.inactivationConcept.conceptId, scope.branch).then(function (children) {
              scope.inactivationConceptChildren = children;
              notificationService.sendMessage('Retrieving inbound relationships...');
              getAffectedObjectIds().then(function () {
                notificationService.sendMessage('Retrieving affected associations...');
                getAffectedAssociations().then(function () {
                  notificationService.sendMessage('Initializing affected concepts...')
                  getAffectedConcepts().then(function () {
                    notificationService.sendMessage('Preparing affected relationships...');
                    prepareAffectedRelationships().then(function () {
                      notificationService.sendMessage('Inactivation initialization complete', 5000);
                      scope.reloadTables();
                      scope.initializing = false;
                    })
                  });
                });
              });
            });
          }

          initialize();
        }

      }
        ;

    }])
;
