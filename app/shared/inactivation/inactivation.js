'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')

  .directive('inactivation', ['$rootScope', '$location', '$filter', '$q', 'ngTableParams', '$routeParams', 'scaService', 'snowowlService', 'metadataService', 'inactivationService', 'notificationService', '$timeout', '$modal', '$route', 'modalService',
    function ($rootScope, $location, $filter, $q, NgTableParams, $routeParams, scaService, snowowlService, metadataService, inactivationService, notificationService, $timeout, $modal, $route, modalService) {
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
          scope.affectedConceptAssocs = [];
          scope.finalizing = false;
          scope.isStatic = false;
          scope.tabOneAccepted = false;
          scope.tabTwoAccepted = false;
          scope.tabThreeAccepted = false;

          $(".btn").mouseup(function () {
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

            console.debug('parseAssocs', list);

            var deferred = $q.defer();
            var parsedComponents = {
              concepts: [],
              descriptionsWithConceptTarget: [],
              descriptionsWithDescriptionTarget: [],
              other: []
            };
            var count = 0;

            for (var i = list.length - 1; i >= 0; i--) {

              console.debug('parsing component', list[i].referencedComponent);
              
              if(list[i].active === false){
                count++;
                parsedComponents.other.push(list[i].referencedComponent);
                if (parsedComponents.concepts.length + parsedComponents.descriptionsWithConceptTarget.length + parsedComponents.descriptionsWithDescriptionTarget.length + parsedComponents.other.length === count) {
                deferred.resolve(parsedComponents);
              }}
              // check if referenced concept
              else if (snowowlService.isConceptId(list[i].referencedComponent.id)) {
                count++;
                // retrieve the referenced concept
                snowowlService.getFullConcept(list[i].referencedComponent.id, scope.branch).then(function (concept) {

                  // check against the available association target types
                  for (var j = 0; j < scope.associationTargets.length; j++) {

                    // iif concept has this association target
                    if (Object.keys(concept.associationTargets).indexOf(scope.associationTargets[j].id) !== -1) {

                      // if historical association targets were supplied to inactivation process
                      if (scope.histAssocTargets && scope.histAssocTargets.concepts.length > 0) {

                        // for each supplied concept
                        angular.forEach(scope.histAssocTargets.concepts, function (innerConcept) {

                          var item = concept;
                          item.refsetName = innerConcept.assocName;
                          item.inactivationIndicator = scope.reasonId;
                          item.newTargetId = innerConcept.conceptId;
                          item.newTargetFsn = innerConcept.fsn;

                          // if this concept not already added
                          if (parsedComponents.concepts.map(function (c) {
                              return c.conceptId
                            }).indexOf(item.conceptId) === -1) {
                            parsedComponents.concepts.push(item);
                          }
                        });
                      }

                      // if no historical association targets supplied, add single blank one
                      else {
                        var item = concept;
                        item.inactivationIndicator = scope.reasonId;
                        item.refsetName = scope.associationTargets[j].id;
                        if (parsedComponents.concepts.map(function (c) {
                            return c.conceptId
                          }).indexOf(item.conceptId) === -1) {
                          parsedComponents.concepts.push(item);
                        }
                      }
                    }
                  }

                  console.debug('check', parsedComponents, list.length);
                  if (parsedComponents.concepts.length + parsedComponents.descriptionsWithConceptTarget.length + parsedComponents.descriptionsWithDescriptionTarget.length + parsedComponents.other.length === count) {
                    deferred.resolve(parsedComponents);
                  }
                });

              }

              // check if referenced description
              else if (snowowlService.isDescriptionId(list[i].referencedComponent.id)) {
                console.debug('  found description');
                snowowlService.getDescriptionProperties(list[i].referencedComponent.id, scope.branch).then(function (description) {

                  console.debug('   description', description);
                  // for each association reference set
                  for (var j = 0; j < scope.associationTargets.length; j++) {

                    console.debug('    checking against target', scope.associationTargets[j]);

                    // if this description has this association reference set
                    if (Object.keys(description.associationTargets).indexOf(scope.associationTargets[j].id) !== -1) {
                      console.debug('     description has refset', scope.associationTargets[j].id);

                      var targetComponentId = description.associationTargets[scope.associationTargets[j].id][0];

                      console.debug('target component id', targetComponentId);

                      // if association referenced a concept, process as user-editable
                      if (snowowlService.isConceptId(targetComponentId)) {

                        // if new association targets were supplied
                        if (scope.histAssocTargets && scope.histAssocTargets.concepts.length > 0) {

                          console.debug('       new association targets supplied', scope.histAssocTargets);

                          // cycle over supplied targets
                          angular.forEach(scope.histAssocTargets.concepts, function (innerConcept) {

                            // construct the parsed table row
                            var item = description;
                            item.refsetName = innerConcept.assocName;
                            item.inactivationIndicator = scope.reasonId;
                            item.newTargetId = innerConcept.conceptId;
                            item.newTargetFsn = innerConcept.fsn;

                            console.debug('         constructing row', item);


                            // add to list if not already present
                            if (parsedComponents.descriptionsWithConceptTarget.map(function (d) {
                                return d.id;
                              }).indexOf(item.id) === -1) {
                              console.debug('           adding row', item);
                              parsedComponents.descriptionsWithConceptTarget.push(item);
                            }
                          });
                        }
                        else {
                          console.debug('         no new targets supplied');
                          var item = description;
                          item.inactivationIndicator = scope.reasonId;
                          item.refsetName = scope.associationTargets[j].id;
                          console.debug('         constructing row', item);


                          // note: match against id, not descriptionId
                          if (parsedComponents.descriptionsWithConceptTarget.map(function (d) {
                              return d.id;
                            }).indexOf(item.id) === -1) {
                            console.debug('           adding row', item);
                            parsedComponents.descriptionsWithConceptTarget.push(item);
                          } else {
                            console.debug('not adding row');
                          }
                        }
                      }

                      // otherwise, add to the other components list (dump list)
                      else if (snowowlService.isDescriptionId(targetComponentId)) {

                        console.debug('  found description targeting description', description);
                        var item = description;
                        item.refsetName = scope.associationTargets[j].id;
                        item.inactivationIndicator = scope.reasonId;
                        item.previousTargetId = targetComponentId;
                        snowowlService.getDescriptionProperties(targetComponentId, scope.branch).then(function (descriptionTarget) {
                          item.previousTargetTerm = descriptionTarget.term;
                          parsedComponents.descriptionsWithDescriptionTarget.push(item);

                          console.debug('check', parsedComponents, list.length);
                          if (parsedComponents.concepts.length + parsedComponents.descriptionsWithConceptTarget.length + parsedComponents.descriptionsWithDescriptionTarget.length === list.length) {
                            deferred.resolve(parsedComponents);
                          }
                        });

                      } else {
                        console.debug('found other target component');
                        parsedComponents.descriptionsWithDescriptionTarget.push(description);
                        console.debug('check', parsedComponents, list.length);
                        if (parsedComponents.concepts.length + parsedComponents.descriptionsWithConceptTarget.length + parsedComponents.descriptionsWithDescriptionTarget.length === list.length) {
                          deferred.resolve(parsedComponents);
                        }
                      }
                    }


                  }

                  console.debug('check', parsedComponents, list.length);
                  if (parsedComponents.concepts.length + parsedComponents.descriptionsWithConceptTarget.length + parsedComponents.descriptionsWithDescriptionTarget.length + parsedComponents.other.length === list.length) {
                    deferred.resolve(parsedComponents);
                  }
                });

              }

              // add to other (dump)  list
              else {
                parsedComponents.other.push(list[i].referencedComponent);
                console.debug('check', parsedComponents, list.length);
                if (parsedComponents.concepts.length + parsedComponents.descriptionsWithConceptTarget.length + parsedComponents.descriptionsWithDescriptionTarget.length + parsedComponents.other.length === list.length) {
                  deferred.resolve(parsedComponents);
                }
              }

            }
            
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
                var data = [];
                // recompute the affected relationships from ids or blank ids
                for (var conceptId in scope.affectedConcepts) {
                  if (scope.affectedConcepts[conceptId]) {
                    angular.forEach(scope.affectedConcepts[conceptId].relationships, function (rel) {
                      // add all relationships with no effective time
                      if (!rel.relationshipId && metadataService.isIsaRelationship(rel.type.conceptId)) {
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

          scope.acceptAll = function () {
            if (scope.actionTab === 1) {
              if (!scope.tabOneAccepted) {
                for (var conceptId in scope.affectedConcepts) {
                  if (scope.affectedConcepts[conceptId]) {
                    angular.forEach(scope.affectedConcepts[conceptId].relationships, function (rel) {
                      // add all relationships with no effective time
                      if (!rel.relationshipId && metadataService.isIsaRelationship(rel.type.conceptId)) {
                        if (rel.accepted !== true) {
                          rel.accepted = true;
                          rowsAccepted++;
                        }
                      }
                    });
                  }
                }
              }
              else {
                for (var conceptId in scope.affectedConcepts) {
                  if (scope.affectedConcepts[conceptId]) {
                    angular.forEach(scope.affectedConcepts[conceptId].relationships, function (rel) {
                      // add all relationships with no effective time
                      if (!rel.relationshipId && metadataService.isIsaRelationship(rel.type.conceptId)) {
                        if (rel.accepted !== false) {
                          rel.accepted = false;
                          rowsAccepted++;
                        }
                      }
                    });
                  }
                }
              }
              scope.tabOneAccepted = !scope.tabOneAccepted;
            }
            else if (scope.actionTab === 2) {
              if (!scope.tabTwoAccepted) {
                for (var conceptId in scope.affectedConcepts) {
                  if (scope.affectedConcepts[conceptId]) {
                    angular.forEach(scope.affectedConcepts[conceptId].relationships, function (rel) {

                      // add all relationships with no effective time
                      if (!rel.relationshipId && !metadataService.isIsaRelationship(rel.type.conceptId)) {
                        if (rel.accepted !== true) {
                          rel.accepted = true;
                          rowsAccepted++;
                        }
                      }
                    });
                  }
                }
              }
              else {
                for (var conceptId in scope.affectedConcepts) {
                  if (scope.affectedConcepts[conceptId]) {
                    angular.forEach(scope.affectedConcepts[conceptId].relationships, function (rel) {

                      // add all relationships with no effective time
                      if (!rel.relationshipId && !metadataService.isIsaRelationship(rel.type.conceptId)) {
                        if (rel.accepted !== false) {
                          rel.accepted = false;
                          rowsAccepted++;
                        }
                      }
                    });
                  }
                }
              }
              scope.tabTwoAccepted = !scope.tabTwoAccepted;
            }
            else if (scope.actionTab === 3) {
              if (!scope.tabThreeAccepted) {
                angular.forEach(scope.affectedConceptAssocs, function (rel) {
                  if (rel.accepted !== true) {
                    rel.accepted = true;
                    rowsAccepted++;
                  }
                });
                angular.forEach(scope.affectedDescToConceptAssocs, function (rel) {
                  console.debug('accepting', rel);
                  if (rel.accepted !== true) {
                    rel.accepted = true;
                    rowsAccepted++;
                  }
                });
              }
              else {
                angular.forEach(scope.affectedConceptAssocs, function (rel) {
                  if (rel.accepted !== false) {
                    rel.accepted = false;
                    rowsAccepted++;
                  }
                });
                angular.forEach(scope.affectedDescToConceptAssocs, function (rel) {
                  console.debug('accepting', rel);
                  if (rel.accepted !== false) {
                    rel.accepted = false;
                    rowsAccepted++;
                  }
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
                var data = [];
                // recompute the affected relationships from ids or blank ids
                for (var conceptId in scope.affectedConcepts) {
                  if (scope.affectedConcepts[conceptId]) {
                    angular.forEach(scope.affectedConcepts[conceptId].relationships, function (rel) {

                      // add all relationships with no effective time
                      if (!rel.relationshipId && !metadataService.isIsaRelationship(rel.type.conceptId)) {
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
          scope.assocsConceptTableParams = new NgTableParams({
              page: 1,
              count: 10
            },
            {
              // initial display text, overwritten in getData
              total: '-',
              getData: function ($defer, params) {
                var data = scope.affectedConceptAssocs ? scope.affectedConceptAssocs : [];
                params.total(data.length);
                data = params.sorting() ? $filter('orderBy')(data, params.orderBy()) : data;
                $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
              }
            }
          );

          // declare table parameters
          scope.assocsDescToConceptTableParams = new NgTableParams({
              page: 1,
              count: 10
            },
            {
              // initial display text, overwritten in getData
              total: '-',
              getData: function ($defer, params) {
                var data = scope.affectedDescToConceptAssocs ? scope.affectedDescToConceptAssocs : [];
                params.total(data.length);
                data = params.sorting() ? $filter('orderBy')(data, params.orderBy()) : data;
                $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
              }
            }
          );

          // declare table parameters
          scope.assocsDescToDescTableParams = new NgTableParams({
              page: 1,
              count: 10
            },
            {
              // initial display text, overwritten in getData
              total: '-',
              getData: function ($defer, params) {
                var data = scope.affectedDescToDescAssocs ? scope.affectedDescToDescAssocs : [];
                params.total(data.length);
                data = params.sorting() ? $filter('orderBy')(data, params.orderBy()) : data;
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
            console.debug('reloading tables');
            scope.isaRelsTableParams.reload();
            scope.attrRelsTableParams.reload();
            scope.assocsConceptTableParams.reload();
            scope.assocsDescToConceptTableParams.reload();
            scope.assocsDescToDescTableParams.reload();
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
            console.debug('remove relationship', relationship);
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
            if(scope.deletion){
                modalService.confirm('All changes made during inactivation will be lost, are you sure?').then(function () {
                    inactivationService.cancelInactivation(null);
                  $rootScope.$broadcast('inactivation.cancelInactivation');
                }, function (error) {
                  // do nothing
                });
            }
            else{
                modalService.confirm('All changes made during inactivation will be lost, are you sure?').then(function () {
                  inactivationService.cancelInactivation(null);
                  $rootScope.$broadcast('inactivation.cancelInactivation');
                }, function (error) {
                  // do nothing
                });
            }
          };

          function getFullConceptsForIds(ids, array) {
              
              var deferred = $q.defer();
                if (!array) {
                  array = [];
                }
            if (!ids || ids.length === 0) {
              deferred.resolve(array);
            } else {
              var idList = ids;
                snowowlService.bulkRetrieveFullConcept(idList, scope.branch).then(function (response) {
                    array.push(response.items);
                    deferred.resolve(array);
              });
            }
            return deferred.promise;
          }

          function getConceptsToUpdate() {
            console.debug('getConceptsToupdate');

            var deferred = $q.defer();

            //
            // prepare concepts from affected concepts map and affected concept associations
            //
            var conceptArray = $.map(scope.affectedConcepts, function (value, index) {
              return [value];
            });
            angular.forEach(scope.affectedConceptAssocs, function (item) {
              conceptArray.push(item);
            });


            //
            // prepare descriptions from affected description historical associations
            // For now, do not include desc-to-desc associations
            //
            var descriptionArray = scope.affectedDescToConceptAssocs;

            console.debug('conceptArray', conceptArray);
            console.debug('descriptionArray', descriptionArray);

            var conceptIds = conceptArray.map(function (c) {
              return c.id;
            });
            console.debug('conceptIds', conceptIds);
            var tempIds = descriptionArray.map(function (d) {
              return d.conceptId;
            });
            var descConceptIds = [];
            angular.forEach(tempIds, function (id) {
              if (conceptIds.indexOf(id) === -1 && descConceptIds.indexOf(id) === -1) {
                descConceptIds.push(id);
              }
            });
            console.debug('descConceptIds', descConceptIds);

            getFullConceptsForIds(descConceptIds).then(function (descConcepts) {
              conceptArray = conceptArray.concat(descConcepts);
              console.debug('concepts', conceptArray);


              angular.forEach(descriptionArray, function (d) {
                console.debug('checking description', d.id, d);
                angular.forEach(conceptArray, function (c) {
                  console.debug(' checking against concept', c.conceptId);
                  if (c.conceptId === d.conceptId) {
                    console.debug('  concept match found');
                    angular.forEach(c.descriptions, function (cd) {
                      console.debug('    checking against concept description', cd.descriptionId);
                      if (cd.descriptionId === d.id) {
                        console.debug('      match found');
                        cd.associationTargets = d.associationTargets;
                      }
                    });
                  }
                });
              });
              console.debug('updated concepts', conceptArray);
              deferred.resolve(conceptArray);
            }, function (error) {
              deferred.reject(error);
            });

            return deferred.promise;

          }

          scope.completeInactivation = function () {
            scope.finalizing = true;
            notificationService.sendMessage('Saving modified components and historical associations. Please remain on this page until the inactivation has finished.');
            console.log(scope.affectedConcepts);

            // clear association targets for affected concepts
            angular.forEach(scope.affectedConceptAssocs, function (item) {
              item.associationTargets = {};
            });

            // clear association targets for affected descriptions
            angular.forEach(scope.affectedDescToConceptAssocs, function (item) {
              item.associationTargets = {};
            });

            // update the historical associations on the objects
            updateHistoricalAssociations(scope.affectedConceptAssocs).then(function () {
              updateHistoricalAssociations(scope.affectedDescToConceptAssocs).then(function () {
                getConceptsToUpdate().then(function (conceptArray) {

                  angular.forEach(conceptArray, function (concept) {

                    // apparent special handling -- accepted relationships should have ids nulled
                    // TODO Not sure why? Needs explanation
                    angular.forEach(concept.relationships, function (rel) {
                      if (rel.accepted) {
                        rel.relationshipId = null;
                      }
                    });
                    snowowlService.cleanConcept(concept);
                  });


                  if (!scope.deletion) {
                    scope.inactivationConcept.inactivationIndicator = scope.reasonId;
                    scope.inactivationConcept.associationTargets = scope.assocs;
                    scope.inactivationConcept.active = false;

                    // remove attribute ""display" prior to performing to back end
                    angular.forEach(scope.inactivationConcept.relationships, function (rel){
                      if(typeof rel.display !== 'undefined') {
                        delete rel.display;
                      }
                    });
                    conceptArray.push(scope.inactivationConcept);
                    console.log(conceptArray);
                    snowowlService.bulkUpdateConcept(scope.branch, conceptArray).then(function (response) {
                      notificationService.sendMessage('Inactivation Complete');

                      // broadcast event to any listeners (currently task detail, crs concept list,
                      // conflict/feedback resolved lists)
                      $rootScope.$broadcast('conceptEdit.conceptChange', {                    
                        concept: scope.inactivationConcept                 
                      });
                      
                      $route.reload();
                    }, function (error) {
                      notificationService.sendError('Error inactivating concept: ' + error);
                    });
                  }
                  else {
                    snowowlService.bulkUpdateConcept(scope.branch, conceptArray).then(function (response) {
                      snowowlService.deleteConcept(scope.inactivationConcept.conceptId, scope.branch).then(function (response) {
                        if (response.status === 409) {
                          notificationService.sendError('Cannot delete concept - One or more components is published', 5000);
                          $route.reload();
                        }
                        else {
                          $rootScope.$broadcast('removeItem', {concept: scope.concept});
                          notificationService.sendMessage('Concept Deleted', 5000);
                          $route.reload();
                        }
                      });
                    }, function (error) {
                      notificationService.sendError('Error inactivating concept: ' + error);
                    });
                  }
                })
              });
            })
          };

          scope.dropAssociationTarget = function (relationship, data) {
            relationship.newTargetId = data.id;
            relationship.newTargetFsn = data.name;
            scope.reloadTables();
          };

          function updateHistoricalAssociations(list) {
            var deferred = $q.defer();
            console.log(list);
            if (list && list.length > 0) {
              var cntr = 0;

              function next() {
                if (cntr < list.length) {
                    if(list[cntr].newTargetId)
                    {
                      list[cntr].associationTargets[list[cntr].refsetName] = [list[cntr].newTargetId];
                      
                    }
                  cntr++;
                  next();
                }
                else {
                  deferred.resolve();
                }
              }

              next();
            }
            else {
              deferred.resolve();
            }
            return deferred.promise;
          }


          //
          // Retrieval functions
          //


          function getAffectedObjectIds() {
            console.log('Getting affected object ids');
            var deferred = $q.defer();
            snowowlService.getConceptRelationshipsInbound(scope.inactivationConcept.conceptId, scope.branch, 0).then(function (response) {
              scope.affectedRelationshipIds = [];

              angular.forEach(response.items, function (item) {

                // only want active, stated relationships
                if (item.active && item.characteristicType === 'STATED_RELATIONSHIP') {
                  // ng-table can't sort on A.B fields,
                  item.sourceFsn = item.source.fsn;
                  item.typeFsn = item.type.fsn;
                  scope.affectedRelationshipIds.push(item.id);
                  scope.affectedConcepts[item.sourceId] = {};
                }
              });
              deferred.resolve();
            });
            return deferred.promise;
          }

          /**
           * Initialization functions
           */


          function getAffectedConcepts() {
            var deferred = $q.defer();
            var idList = [];

            if (scope.affectedRelationshipIds.length === 0) {
              deferred.resolve();
            }
            else {
              var conceptsRetrieved = 0;
              angular.forEach(Object.keys(scope.affectedConcepts), function (conceptId) {
                idList.push(conceptId);
              });
              snowowlService.bulkRetrieveFullConcept(idList, scope.branch).then(function (response) {
                  angular.forEach(response, function (concept) {
                        scope.affectedConcepts[concept.conceptId] = concept;
                      
                  if (response.length === ++conceptsRetrieved) {
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

              scope.affectedConceptAssocs = [];
              scope.affectedDescToConceptAssocs = [];
              scope.affectedDescToDescAssocs = [];
              scope.affectedOtherAssocs = [];

              if (response.items && response.items.length > 0) {
                console.debug('parsing assocs');
                parseAssocs(response.items).then(function (parsedAssocs) {
                  console.debug('parsedAssocs', parsedAssocs);
                  scope.affectedConceptAssocs = parsedAssocs.concepts;
                  scope.affectedDescToConceptAssocs = parsedAssocs.descriptionsWithConceptTarget;
                  scope.affectedDescToDescAssocs = parsedAssocs.descriptionsWithDescriptionTarget;
                  scope.affectedOtherAssocs = parsedAssocs.other;

                  console.debug('affected concept assocs', scope.affectedConceptAssocs);
                  console.debug('affected desc-concept assocs', scope.affectedDescToConceptAssocs);
                  console.debug('affected desc-desc assocs', scope.affectedDescToDescAssocs);
                  deferred.resolve();
                });
              }
              else {
                deferred.resolve()
              }


            });
            return deferred.promise;
          }

          // inactivate a relationship and add new relationships for children
          function inactivateRelationship(concept, rel) {

            angular.forEach(scope.inactivationConceptParents, function (parent) {

              var newRel = angular.copy(rel);
              newRel.relationshipId = null;
              newRel.effectiveTime = null;
              newRel.released = false;
              newRel.target.conceptId = parent.conceptId;
              newRel.target.fsn = parent.fsn;
              concept.relationships.push(newRel);
            });


            // set the original relationship to inactive
            rel.active = 0;
          }

          function inactivateAttributeRelationship(concept, rel) {
            console.log('attributes');
            if (scope.histAssocTargets && scope.histAssocTargets.concepts.length > 0) {
              angular.forEach(scope.histAssocTargets.concepts, function (innerConcept) {
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
            else {
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
              if (scope.affectedConcepts.hasOwnProperty(key)) {
                var concept = scope.affectedConcepts[key];
                if (concept && concept.relationships) {
                  angular.forEach(concept.relationships, function (rel) {
                    if (scope.affectedRelationshipIds.indexOf(rel.relationshipId) !== -1 && metadataService.isIsaRelationship(rel.type.conceptId) && scope.histAssocTargets.concepts.length === 0) {
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
          scope.toggleRowAccepted = function (row) {
            row.accepted = !row.accepted;
            rowsAccepted += row.accepted ? 1 : -1;
          };

          scope.isComplete = function () {
            return !scope.initializing && rowsAccepted === scope.isaRelsTableParams.total() + scope.attrRelsTableParams.total() + scope.assocsConceptTableParams.total() + scope.assocsDescToConceptTableParams.total();
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
            if (reasonArr.length !== 1) {
              console.error('Unexpected number of reasons found for text ' + reason);
            }

            var assocs = [];
            angular.forEach(scope.associationTargets, function (target) {
                if(reasonArr.length > 0){
                    if (reasonArr[0].display.indexOf(target.display) !== -1) {
                        assocs.push(target);
                    }
                }
            });

            return assocs;
          };

          scope.getTargetConceptSuggestions = function (text) {
            return snowowlService.findConceptsForQuery($routeParams.projectKey, $routeParams.taskKey, text, 0, 10).then(function (response) {
              for (var i = 0; i < response.length; i++) {
                for (var j = response.length - 1; j > i; j--) {
                  if (response[j].concept.conceptId === response[i].concept.conceptId) {
                    response.splice(j, 1);
                    j--;
                  }
                }
              }
              for (var i = 0; i >= response.length - 1; i--) {
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

          scope.setRelTargetConcept = function (rel, concept) {
            rel.target.conceptId = concept.concept.conceptId;
            rel.target.fsn = concept.concept.fsn;
            rel.target.released = concept.concept.released;
            rel.target.active = concept.concept.active;
            rel.target.definitionStatus = concept.concept.definitionStatus;
          }

          scope.resetRelTargetConcept = function (rel) {
            if (rel.inactivationIndicator === 'NONCONFORMANCE_TO_EDITORIAL_POLICY') {
              rel.newTargetFsn = "";
              rel.newTargetId = "";
            }
          }

          scope.updateRefTarget = function (rel) {
            console.log('updating');
            for (var j = 0; j < scope.associationTargets.length; j++) {
              if (rel.refsetName === scope.associationTargets[j].text) {
                rel.refsetSaveable = scope.associationTargets[j].id;
                break;
              }
            }
            console.log(rel);
          };

          scope.hasNoConceptTarget = function () {           
            for (var i = 0; i < scope.affectedConceptAssocs.length; i++) {
              var concept = scope.affectedConceptAssocs[i];
              if ((!concept.newTargetId || !concept.newTargetFsn || !concept.refsetName) 
                && concept.inactivationIndicator !== 'NONCONFORMANCE_TO_EDITORIAL_POLICY') {
                return true;
              }
            }
            return false;
          };

          scope.detectDulicatedRelationships = function (sourceId) {
            var concept = scope.affectedConcepts[sourceId];    
            for (var i = 0; i < concept.relationships.length; i++) {
              var relationshipI = concept.relationships[i];          
              for (var j = i + 1; j < concept.relationships.length; j++) {
                var relationshipJ = concept.relationships[j];
                if (relationshipI.characteristicType === 'STATED_RELATIONSHIP'
                  && relationshipJ.characteristicType === 'STATED_RELATIONSHIP'
                  && relationshipI.relationshipId !== relationshipJ.relationshipId
                  && relationshipI.type.conceptId === relationshipJ.type.conceptId
                  && relationshipI.target.conceptId === relationshipJ.target.conceptId ) {
                  return true;
                }
              }
            }         
             
            return false;       
          };

          scope.detectCircularReference = function (sourceId) {
            var concept = scope.affectedConcepts[sourceId];    
            for (var i = 0; i < concept.relationships.length; i++) {
              var rel = concept.relationships[i];          
              if (rel.characteristicType === 'STATED_RELATIONSHIP' 
                  && rel.target.conceptId === concept.conceptId) {
                return true;
              }
            }         
             
            return false;       
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
            scope.histAssocTargets.descriptions = [];
            scope.deletion = inactivationService.getDeletion();

            console.debug('scope.assocs', scope.assocs);
            console.debug('reason id', scope.reasonId);


            for (var key in scope.assocs) {

              angular.forEach(scope.assocs[key], function (id) {


                var concept = {};
                concept.assocName = key;
                concept.conceptId = id;
                snowowlService.getConceptDescriptions(id, scope.branch).then(function (response) {
                  angular.forEach(response, function (desc) {
                    if (desc.typeId === '900000000000003001' && desc.active === true) {
                      concept.fsn = desc.term;
                    }
                  });

                });
                scope.histAssocTargets.concepts.push(concept);
                console.log(concept);


              });

            }

            console.debug('histAssocTargets', scope.histAssocTargets);

            // extract the parent concepts
            angular.forEach(scope.inactivationConcept.relationships, function (rel) {
              if (rel.active && rel.characteristicType === 'STATED_RELATIONSHIP' && metadataService.isIsaRelationship(rel.type.conceptId)) {
                scope.inactivationConceptParents.push({conceptId: rel.target.conceptId, fsn: rel.target.fsn});
              }
            });


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
