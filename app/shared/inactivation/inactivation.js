'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')

  .directive('inactivation', ['$rootScope', '$filter', '$q', '$routeParams', 'ngTableParams', 'terminologyServerService', 'metadataService', 'inactivationService', 'notificationService', '$timeout', '$route', 'modalService','scaService',
    function ($rootScope, $filter, $q, $routeParams, NgTableParams, terminologyServerService, metadataService, inactivationService, notificationService, $timeout, $route, modalService, scaService) {
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
          scope.tabFourAccepted = false;

          $(".btn").mouseup(function () {
            $(this).blur();
          })

          // currently edited concept
          scope.editedConcept = null;

          // children and parents (convenience arrays)
          scope.inactivationConceptChildren = [];
          scope.inactivationConceptParents = [];
          scope.newTargetConceptParents = [];

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

            var buildConceptHistoricalAssoc = function(conceptId) {
              var def = $q.defer();
              // retrieve the referenced concept
              terminologyServerService.getFullConcept(conceptId, scope.branch).then(function (concept) {

                // check against the available association target types
                for (var j = 0; j < scope.associationTargets.length; j++) {

                  // if concept has this association target
                  if (Object.keys(concept.associationTargets).indexOf(scope.associationTargets[j].id) !== -1) {

                    // if historical association targets were supplied to inactivation process
                      if (scope.histAssocTargets && scope.histAssocTargets.concepts.length > 0) {

                      // for each supplied concept
                      angular.forEach(scope.histAssocTargets.concepts, function (innerConcept, index) {
                        if (!scope.useFirstTarget   || (scope.useFirstTarget && index === 0)) {
                          var item = angular.copy(concept);
                          item.refsetName = innerConcept.assocName;
                          if (!scope.deletion) {
                            if (!concept.active && concept.inactivationIndicator) {
                              item.oldInactivationIndicator = concept.inactivationIndicator;
                            }
                            item.inactivationIndicator = scope.reasonId;
                          }
                          else {
                            if (concept.inactivationIndicator) {
                              var associations = scope.getAssociationsForReason(concept.inactivationIndicator);
                              if(associations.length == 1) {
                                item.refsetName = associations[0].id;
                              } else {
                                item.refsetName = '';
                              }
                            }
                          }                         
                          
                          item.newTargetId = innerConcept.conceptId;
                          item.newTargetFsn = innerConcept.fsn; 

                          parsedComponents.concepts.push(item);
                        }
                      });
                    }

                    // if no historical association targets supplied, add single blank one
                    else {
                      var item = angular.copy(concept);
                      item.inactivationIndicator = scope.reasonId;
                      item.refsetName = scope.associationTargets[j].id;

                      parsedComponents.concepts.push(item);
                    }
                  }
                }

                def.resolve();
              });         

              return def.promise;
            };

            var buildDescriptionHistoricalAssoc = function(descriptionId) {
              var def = $q.defer();
              terminologyServerService.getDescriptionProperties(descriptionId, scope.branch).then(function (description) {

                var subPromises = [];

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
                    if (terminologyServerService.isConceptId(targetComponentId)) {

                      // if new association targets were supplied
                      if (scope.histAssocTargets && scope.histAssocTargets.concepts.length > 0) {

                        console.debug('       new association targets supplied', scope.histAssocTargets);

                        // cycle over supplied targets
                        angular.forEach(scope.histAssocTargets.concepts, function (innerConcept, index) {
                          if (!scope.useFirstTarget   || (scope.useFirstTarget && index === 0)) {
                            // construct the parsed table row
                            var item = angular.copy(description);

                            if(item.inactivationIndicator === 'NOT_SEMANTICALLY_EQUIVALENT') {
                              item.refsetName = 'REFERS_TO';
                              item.newTargetId = innerConcept.conceptId;
                              item.newTargetFsn = innerConcept.fsn;
                            } else {
                              item.refsetName = '';
                              item.newTargetId = '';
                              item.newTargetFsn = '';
                            }

                            parsedComponents.descriptionsWithConceptTarget.push(item);
                          }                          
                        });
                      }
                      else {
                        console.debug('         no new targets supplied');
                        var item = description;
                        if(scope.reasonId === 'NONCONFORMANCE_TO_EDITORIAL_POLICY') {
                          item.inactivationIndicator = scope.reasonId;
                          item.refsetName = '';                            
                        }

                        if(item.inactivationIndicator === 'NOT_SEMANTICALLY_EQUIVALENT') {
                          item.refsetName = 'REFERS_TO';                           
                        } else {
                          item.refsetName = '';                           
                        } 

                        item.newTargetId = '';
                        item.newTargetFsn = '';

                        parsedComponents.descriptionsWithConceptTarget.push(item);
                      }
                    }

                    // otherwise, add to the other components list (dump list)
                    else if (terminologyServerService.isDescriptionId(targetComponentId)) {
                      console.debug('  found description targeting description', description);

                      var buildDesAssoc = function(description, targetComponentId) {
                        var d = $q.defer();
                        var item = angular.copy(description);
                        item.refsetName = scope.associationTargets[j].id;
                        item.inactivationIndicator = scope.reasonId;
                        item.previousTargetId = targetComponentId;
                        terminologyServerService.getDescriptionProperties(targetComponentId, scope.branch).then(function (descriptionTarget) {
                          item.previousTargetTerm = descriptionTarget.term;
                          parsedComponents.descriptionsWithDescriptionTarget.push(item);
                          d.resolve();                  
                        });
                        return d.promise;
                      }
                      subPromises.push(buildDesAssoc(description,targetComponentId));
                    } else {
                      console.debug('found other target component');
                      parsedComponents.descriptionsWithDescriptionTarget.push(description);             
                    }
                  }
                }
                if (subPromises.length !== 0) {
                  // Resolve all promises
                  $q.all(subPromises).then(function() {
                    def.resolve();
                  });
                } else {
                  def.resolve();
                }

              });
              return def.promise;
            };

            var buildOtherHistoricalAssoc = function (referencedComponent) {
              var def = $q.defer();
              parsedComponents.other.push(referencedComponent);
              def.resolve();
              return def.promise;
            }

            var promises = [];
            for (var i = list.length - 1; i >= 0; i--) {

              if(list[i].active === false) {
                promises.push(buildOtherHistoricalAssoc(list[i].referencedComponent));               
              }

              // check if referenced concept
              else if (terminologyServerService.isConceptId(list[i].referencedComponentId) && terminologyServerService.isConceptId(list[i].referencedComponent.id)) {
                promises.push(buildConceptHistoricalAssoc(list[i].referencedComponent.id));
              }

              // check if referenced description
              else if (terminologyServerService.isDescriptionId(list[i].referencedComponentId)) {
                promises.push(buildDescriptionHistoricalAssoc(list[i].referencedComponentId));
              }

              // add to other (dump)  list
              else {       
                if(buildOtherHistoricalAssoc(list[i].referencedComponent)){
                   promises.push(buildOtherHistoricalAssoc(list[i].referencedComponent));  
                }        
              }

            }
            // Resolve all promises
            $q.all(promises).then(() => {
              deferred.resolve(parsedComponents);
            });
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
                    angular.forEach(scope.affectedConcepts[conceptId].classAxioms, function (axiom) {
                        angular.forEach(axiom.relationships, function (rel) {
                          // add all relationships with no effective time
                          if (rel.new && metadataService.isIsaRelationship(rel.type.conceptId)) {
                            rel.sourceFsn = scope.affectedConcepts[rel.sourceId].fsn;
                            rel.typeFsn = rel.type.fsn;
                            data.push(rel);
                          }
                        });
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
            
          scope.gciRelsTableParams = new NgTableParams({
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
                    angular.forEach(scope.affectedConcepts[conceptId].gciAxioms, function (axiom) {
                        angular.forEach(axiom.relationships, function (rel) {
                          // add all relationships with no effective time
                          if (rel.new) {
                            rel.sourceFsn = scope.affectedConcepts[rel.sourceId].fsn;
                            rel.typeFsn = rel.type.fsn;
                            data.push(rel);
                          }
                        });
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
                    angular.forEach(scope.affectedConcepts[conceptId].classAxioms, function (axiom) {
                      angular.forEach(axiom.relationships, function (rel) {
                          // add all relationships with no effective time
                          if (rel.new && metadataService.isIsaRelationship(rel.type.conceptId)) {
                            if (rel.accepted !== true) {
                              rel.accepted = true;
                              rowsAccepted++;
                            }
                          }
                      });
                    });
                  }
                }
              }
              else {
                for (var conceptId in scope.affectedConcepts) {
                  if (scope.affectedConcepts[conceptId]) {
                    angular.forEach(scope.affectedConcepts[conceptId].classAxioms, function (axiom) {
                      angular.forEach(axiom.relationships, function (rel) {
                          // add all relationships with no effective time
                          if (rel.new && metadataService.isIsaRelationship(rel.type.conceptId)) {
                            if (rel.accepted !== false) {
                              rel.accepted = false;
                              rowsAccepted--;
                            }
                          }
                      });
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
                   angular.forEach(scope.affectedConcepts[conceptId].classAxioms, function (axiom) {
                      angular.forEach(axiom.relationships, function (rel) {
                          // add all relationships with no effective time
                          if (rel.new && !metadataService.isIsaRelationship(rel.type.conceptId)) {
                            if (rel.accepted !== true) {
                              rel.accepted = true;
                              rowsAccepted++;
                            }
                          }
                      });
                    });
                  }
                }
              }
              else {
                for (var conceptId in scope.affectedConcepts) {
                  if (scope.affectedConcepts[conceptId]) {
                    angular.forEach(scope.affectedConcepts[conceptId].classAxioms, function (axiom) {
                      angular.forEach(axiom.relationships, function (rel) {
                          // add all relationships with no effective time
                          if (rel.new && !metadataService.isIsaRelationship(rel.type.conceptId)) {
                            if (rel.accepted !== true) {
                              rel.accepted = true;
                              rowsAccepted++;
                            }
                          }
                      });
                    });
                  }
                }
              }
              scope.tabTwoAccepted = !scope.tabTwoAccepted;
            }
            else if (scope.actionTab === 3) {
              if (!scope.tabThreeAccepted) {
                for (var conceptId in scope.affectedConcepts) {
                  if (scope.affectedConcepts[conceptId]) {
                   angular.forEach(scope.affectedConcepts[conceptId].gciAxioms, function (axiom) {
                      angular.forEach(axiom.relationships, function (rel) {
                          // add all relationships with no effective time
                          if (rel.new) {
                            if (rel.accepted !== true) {
                              rel.accepted = true;
                              rowsAccepted++;
                            }
                          }
                      });
                    });
                  }
                }
              }
              else {
                for (var conceptId in scope.affectedConcepts) {
                  if (scope.affectedConcepts[conceptId]) {
                    angular.forEach(scope.affectedConcepts[conceptId].gciAxioms, function (axiom) {
                      angular.forEach(axiom.relationships, function (rel) {
                          // add all relationships with no effective time
                          if (rel.new) {
                            if (rel.accepted !== true) {
                              rel.accepted = true;
                              rowsAccepted++;
                            }
                          }
                      });
                    });
                  }
                }
              }
              scope.tabThreeAccepted = !scope.tabThreeAccepted;
            }
            else if (scope.actionTab === 4) {
              if (!scope.tabFourAccepted) {
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
                    rowsAccepted--;
                  }
                });
                angular.forEach(scope.affectedDescToConceptAssocs, function (rel) {
                  console.debug('accepting', rel);
                  if (rel.accepted !== false) {
                    rel.accepted = false;
                    rowsAccepted--;
                  }
                });
              }
              scope.tabFourAccepted = !scope.tabFourAccepted;
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
                    angular.forEach(scope.affectedConcepts[conceptId].classAxioms, function (axiom) {
                        angular.forEach(axiom.relationships, function (rel) {
                          // add all relationships with no effective time
                          if (rel.new && !metadataService.isIsaRelationship(rel.type.conceptId)) {
                            rel.sourceFsn = scope.affectedConcepts[rel.sourceId].fsn;
                            rel.typeFsn = rel.type.fsn;
                            data.push(rel);
                          }
                        });
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
            scope.gciRelsTableParams.reload();
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
            terminologyServerService.getFullConcept(conceptId, scope.branch).then(function (response) {
              scope.editedConcept = response;
            });
          };


          scope.removeRelationship = function (relationship, axiomId) {
            console.debug('remove relationship', relationship);
            var concept = scope.affectedConcepts[relationship.sourceId];
            angular.forEach(concept.classAxioms, function(axiom){
                for (var i = axiom.relationships.length - 1; i >= 0; i--) {
                  if (axiom.relationships[i].target.conceptId === relationship.target.conceptId && axiom.relationships[i].type.conceptId === relationship.type.conceptId && (typeof axiomId === "undefined" || axiomId === axiom.axiomId)) {
                    let statedParents = axiom.relationships.filter(function (el) {
                      return el.type.conceptId === '116680003' && el.characteristicType === 'STATED_RELATIONSHIP';
                    });

                    if (relationship.type.conceptId === '116680003' && relationship.characteristicType === 'STATED_RELATIONSHIP' && statedParents.length === 1) {
                      notificationService.sendError('Cannot remove relationship - This concept has only one stated parent', 10000);
                      return;
                    } 
                    else {
                      axiom.relationships.splice(i, 1);
                    }
                  }
                }
            })
            angular.forEach(concept.gciAxioms, function(axiom){
                for (var i = axiom.relationships.length - 1; i >= 0; i--) {
                  if (axiom.relationships[i].target.conceptId === relationship.target.conceptId && axiom.relationships[i].type.conceptId === relationship.type.conceptId && (typeof axiomId === "undefined" || axiomId === axiom.axiomId)) {
                    axiom.relationships.splice(i, 1);
                  }
                }
            })

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
                modalService.confirm('All changes made during deletion will be lost, are you sure?').then(function () {
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
                terminologyServerService.bulkRetrieveFullConcept(idList, scope.branch).then(function (response) {
                    if (ids.length === 1 && response.length > 0) {
                      array.push(response[0]);
                    } else {
                      array.push(response.items);
                    }
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

            // Begin Merge associationTargets for concept
            var tempConceptMap = {};
            for (var i = 0; i < scope.affectedConceptAssocs.length; i++) {
              if (tempConceptMap[scope.affectedConceptAssocs[i].conceptId] !== undefined) {
                var tempConcept = tempConceptMap[scope.affectedConceptAssocs[i].conceptId]
                for (var j = i; j < scope.affectedConceptAssocs.length; j++) {
                  if (tempConcept.conceptId ===  scope.affectedConceptAssocs[j].conceptId) {                    
                    for (var key in scope.affectedConceptAssocs[j].associationTargets) {
                      if (tempConcept.associationTargets.hasOwnProperty(key)){                        
                        angular.forEach(scope.affectedConceptAssocs[j].associationTargets[key], function(item) {
                          if (!tempConcept.associationTargets[key].includes(item)) {
                            tempConcept.associationTargets[key].push(item);
                          }                          
                        });
                      } else {
                        tempConcept.associationTargets[key] = scope.affectedConceptAssocs[j].associationTargets[key];
                      }
                    }
                  }
                }
              } else {
                tempConceptMap[scope.affectedConceptAssocs[i].conceptId] = scope.affectedConceptAssocs[i];
              }              
            }
            // End Merge associationTargets

            if (Object.keys(tempConceptMap).length !== 0) {
              angular.forEach(Object.keys(tempConceptMap), function(key) {
                conceptArray.push(tempConceptMap[key])
              });
            }            

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

              var tempDescConceptMap = {};
              angular.forEach(descriptionArray, function (d) {
                console.debug('checking description', d.id, d);
                angular.forEach(conceptArray, function (c) {
                  console.debug(' checking against concept', c.conceptId);
                  if (c.conceptId === d.conceptId) {
                    console.debug('  concept match found');
                    angular.forEach(c.descriptions, function (cd) {
                      console.debug('    checking against concept description', cd.descriptionId);
                      if (cd.descriptionId === d.descriptionId) {
                        console.debug('      match found');
                        if (d.inactivationIndicator !== 'NOT_SEMANTICALLY_EQUIVALENT') {
                          cd.inactivationIndicator = d.inactivationIndicator;
                          delete cd.associationTargets;
                        } else {
                          if (tempDescConceptMap[d.id + '-' + d.conceptId] !== undefined) {
                            for (var key in d.associationTargets) {
                              if (cd.associationTargets.hasOwnProperty(key)){                        
                                angular.forEach(d.associationTargets[key], function(item) {
                                  if (!cd.associationTargets[key].includes(item)) {
                                    cd.associationTargets[key].push(item);
                                  }                                  
                                });
                              } 
                            }                           
                          } else {
                            cd.associationTargets = d.associationTargets;
                            tempDescConceptMap[d.id + '-' + d.conceptId] = true;
                          }
                        }                        
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
            notificationService.sendMessage('Saving modified components and historical associations. Please remain on this page until the ' + (scope.deletion ? 'deletion' : 'inactivation') + ' has finished.');
            console.log(scope.affectedConcepts);

            // clear association targets for affected concepts
            //angular.forEach(scope.affectedConceptAssocs, function (item) {
            //  item.associationTargets = {};
            //});

            // clear old association target
            angular.forEach(scope.affectedConceptAssocs, function (item) {
              for (var key in item.associationTargets) {
                item.associationTargets[key] = item.associationTargets[key].filter(function(id) {
                  return id !== scope.inactivationConcept.conceptId;
                });
              }
            });

            // clear association targets for affected descriptions
            //angular.forEach(scope.affectedDescToConceptAssocs, function (item) {
            //  item.associationTargets = {};
            //});

            // clear old association target
            angular.forEach(scope.affectedDescToConceptAssocs, function (item) {
              for (var key in item.associationTargets) {
                item.associationTargets[key] = item.associationTargets[key].filter(function(id) {
                  return id !== scope.inactivationConcept.conceptId;
                });
              }
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
                    terminologyServerService.cleanConcept(concept);
                  });


                  if (!scope.deletion) {
                    scope.inactivationConcept.inactivationIndicator = scope.reasonId;
                    scope.inactivationConcept.associationTargets = scope.assocs;
                    scope.inactivationConcept.active = false;
                    scope.inactivationConcept.definitionStatus = 'PRIMITIVE';

                    scope.inactivationConcept.classAxioms.forEach(function(axiom){
                      axiom.definitionStatus = 'PRIMITIVE';
                    });
                                        
                    terminologyServerService.cleanConcept(scope.inactivationConcept);
                    
                    conceptArray.push(scope.inactivationConcept);
                    console.log(conceptArray);
                    terminologyServerService.bulkUpdateConcept(scope.branch, conceptArray).then(function (response) {
                      notificationService.sendMessage('Inactivation Complete');

                      // remove ui-state for inactive concept if any
                      scaService.deleteUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'concept-' + scope.inactivationConcept.conceptId).then(function(){
                        // broadcast event to any listeners (currently task detail, crs concept list,
                        // conflict/feedback resolved lists)
                        $rootScope.$broadcast('conceptEdit.conceptChange', {                    
                          concept: scope.inactivationConcept                 
                        });
                        
                        $route.reload();
                      });
                    }, function (error) {
                      notificationService.sendError('Error inactivating concept: ' + error);
                    });
                  }
                  else {
                    terminologyServerService.bulkUpdateConcept(scope.branch, conceptArray).then(function (response) {
                      terminologyServerService.deleteConcept(scope.inactivationConcept.conceptId, scope.branch).then(function (response) {
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
                      if(typeof list[cntr].associationTargets[list[cntr].refsetName] !== 'undefined'
                        && !list[cntr].associationTargets[list[cntr].refsetName].includes(list[cntr].newTargetId)) {
                        list[cntr].associationTargets[list[cntr].refsetName].push(list[cntr].newTargetId);
                      }
                      else {
                        list[cntr].associationTargets[list[cntr].refsetName] = [list[cntr].newTargetId];
                      }
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
            terminologyServerService.searchConcepts(scope.branch,'', '*: *' + ' = ' + scope.inactivationConcept.conceptId, 0, 1000, false, '', true).then(function (response) {
              scope.affectedRelationshipIds = [];
              angular.forEach(response.items, function (item) {
                if(item.conceptId){
                    scope.affectedConceptIds.push(item.conceptId);
                    scope.affectedConcepts[item.conceptId] = {};
                }
                else{
                    scope.affectedConceptIds.push(item.id);
                    scope.affectedConcepts[item.id] = {};
                }
                
                
              });
                
              terminologyServerService.searchConcepts(scope.branch,'', '<! '+ scope.inactivationConcept.conceptId, 0, 1000, false, '', true).then(function (children){
                angular.forEach(children.items, function (item) {
                  if(item.conceptId){
                        scope.affectedConcepts[item.conceptId] = {};
                    }
                    else{
                        scope.affectedConcepts[item.id] = {};
                    }
                  
                });
                deferred.resolve();
              });
              
            });
            return deferred.promise;
          }

          /**
           * Initialization functions
           */


          function getAffectedConcepts() {
              var deferred = $q.defer();
              var idList = [];
              var conceptsRetrieved = 0;
              angular.forEach(Object.keys(scope.affectedConcepts), function (conceptId) {
                idList.push(conceptId);
              });
              if(idList.length > 0){
                  terminologyServerService.bulkRetrieveFullConcept(idList, scope.branch).then(function (response) {
                      angular.forEach(response, function (concept) {
                            scope.affectedConcepts[concept.conceptId] = concept;
                      if (response.length === ++conceptsRetrieved) {
                                deferred.resolve();
                            }
                      });
                  });
              }
              else{
                  deferred.resolve(null);
              }
              return deferred.promise;
          }

          function getAffectedAssociations() {
            var deferred = $q.defer();
            terminologyServerService.getHistoricalAssociationMembers(scope.inactivationConcept.conceptId, scope.branch).then(function (response) {

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
            
          function getAffectedGcis(){
              var deferred = $q.defer();
              terminologyServerService.getGciExpressionsFromTarget(scope.inactivationConcept.conceptId, scope.branch).then(function (response) {
                  if (response.items && response.items.length > 0) {
                    angular.forEach(response.items, function (item) {
                      scope.affectedConceptIds.push(item.referencedComponentId);
                      scope.affectedConcepts[item.referencedComponentId] = {};
                    });
                    deferred.resolve();
                  }
                  else {
                    deferred.resolve()
                  }
              });
              return deferred.promise;
          }

          // inactivate a relationship and add new relationships for children
          function inactivateRelationship(rel, axiom, newTargets) {
            angular.forEach(newTargets, function (parent) {
              var newRel = angular.copy(rel);
              newRel.relationshipId = null;
              newRel.effectiveTime = null;
              newRel.released = false;
              newRel.target.conceptId = parent.conceptId;
              newRel.target.fsn = parent.fsn;
              newRel.new = true;
              axiom.relationships.push(newRel);
            });            
          }

          function inactivateAttributeRelationship(rel, axiom, newTargets) {
            if (newTargets && newTargets.length > 0) {
              angular.forEach(newTargets, function (innerConcept, index) {
                if (!scope.useFirstTarget 
                  || (scope.useFirstTarget && index === 0)) {
                  var newRel = angular.copy(rel);
                  newRel.relationshipId = null;
                  newRel.effectiveTime = null;
                  newRel.released = false;
                  newRel.target.conceptId = innerConcept.conceptId;
                  newRel.target.fsn = innerConcept.fsn;
                  newRel.new = true;
                    console.log(newRel.target.fsn);
                  
                  if (metadataService.isIsaRelationship(newRel.type.conceptId)) {
                    // check source and new target of incoming IS A relationship are the same or not
                    let flag = false;    
                    angular.forEach(axiom.relationships, function (otherRel) {                      
                      if (otherRel.characteristicType === 'STATED_RELATIONSHIP'
                        && metadataService.isIsaRelationship(otherRel.type.conceptId)
                        && newRel.characteristicType === 'STATED_RELATIONSHIP'
                        && newRel.type.conceptId === otherRel.type.conceptId
                        && newRel.target.conceptId === otherRel.target.conceptId
                        && newRel.groupId === otherRel.groupId) {
                          console.log(otherRel);
                        flag = true;
                      }
                   });                  

                    if (flag && scope.newTargetConceptParents && scope.newTargetConceptParents.length > 0) {
                      for (let index = 0; index < scope.newTargetConceptParents.length; index++) {
                        var copyiedRel = angular.copy(newRel);
                        copyiedRel.target.conceptId = scope.newTargetConceptParents[index].concept.conceptId;
                        copyiedRel.target.fsn = scope.newTargetConceptParents[index].concept.fsn;
                        axiom.relationships.push(copyiedRel);
                      }
                    } else {
                      axiom.relationships.push(newRel);
                    }                  
                  } else {
                    axiom.relationships.push(newRel);
                  }                  
                }                
              });
            }
            else {
              var newRel = angular.copy(rel);
              newRel.new = true;
              newRel.relationshipId = null;
              newRel.effectiveTime = null;
              newRel.released = false;
              newRel.target.conceptId = '';
              newRel.target.fsn = '';
              axiom.relationships.push(newRel);              
            }
          }


          function prepareAffectedRelationships() {

            var deferred = $q.defer();
            var relationshipsToRemove = {};
            for (var key in scope.affectedConcepts) {
              if (scope.affectedConcepts.hasOwnProperty(key)) {
                var concept = scope.affectedConcepts[key];
                if (concept && concept.classAxioms) {
                  angular.forEach(concept.classAxioms, function (axiom) {
                      angular.forEach(axiom.relationships, function (rel) {
                        if (rel.target.conceptId === scope.inactivationConcept.conceptId && !rel.new) {
                          if (scope.histAssocTargets.concepts.length === 0) {
                            if (metadataService.isIsaRelationship(rel.type.conceptId)) {
                              inactivateRelationship(rel,axiom,scope.inactivationConceptParents);
                            }
                            else {
                              inactivateAttributeRelationship(rel,axiom,scope.inactivationConceptParents);
                            }
                          }                          
                          else {
                            inactivateAttributeRelationship(rel,axiom,scope.histAssocTargets.concepts);
                          }

                          var relationships = relationshipsToRemove.hasOwnProperty(axiom.axiomId) ? relationshipsToRemove[axiom.axiomId] : [];
                          relationships.push(rel);
                          relationshipsToRemove[axiom.axiomId] = relationships;                          
                        }
                      });
                  });
                  angular.forEach(concept.gciAxioms, function (axiom) {
                      angular.forEach(axiom.relationships, function (rel) {
                        if (rel.target.conceptId === scope.inactivationConcept.conceptId && !rel.new) {
                          if (scope.histAssocTargets.concepts.length === 0) {
                            if (metadataService.isIsaRelationship(rel.type.conceptId)) {
                              inactivateRelationship(rel,axiom,scope.inactivationConceptParents);
                            }
                            else {
                              inactivateAttributeRelationship(rel,axiom,scope.inactivationConceptParents);
                            }
                          }                          
                          else {
                            inactivateAttributeRelationship(rel,axiom,scope.histAssocTargets.concepts);
                          }
                          var relationships = relationshipsToRemove.hasOwnProperty(axiom.axiomId) ? relationshipsToRemove[axiom.axiomId] : [];
                          relationships.push(rel);
                          relationshipsToRemove[axiom.axiomId] = relationships;
                        }
                      });
                  });
                }
              }
            }
            
            if (Object.keys(relationshipsToRemove).length !== 0) {
              angular.forEach(Object.keys(relationshipsToRemove), function (key) {
                angular.forEach(relationshipsToRemove[key], function (rel) {
                  scope.removeRelationship(rel,key);
                });
              });
            }

            deferred.resolve();
            return deferred.promise;
          }
            
          function getNewTargetConceptParents() {
            var deferred = $q.defer();
            var assocs = inactivationService.getAssocs();
            if (Object.keys(assocs).length > 0) {
              var ids = assocs[Object.keys(assocs)[0]];
              terminologyServerService.searchAllConcepts(scope.branch,'','>!' + ids[0], null, null, null, null, null, null, null, 'stated', null).then(function (parents) {
                deferred.resolve(parents.items);
              }, function () {
                deferred.resolve([]);
              });
            } else {
              deferred.resolve([]);
            }            
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
            return !scope.initializing && rowsAccepted === scope.isaRelsTableParams.total() + scope.attrRelsTableParams.total() + scope.gciRelsTableParams.total() + scope.assocsConceptTableParams.total() + scope.assocsDescToConceptTableParams.total();
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
            
          scope.getTargetConceptSuggestions = function (searchStr) {
            return terminologyServerService.searchAllConcepts(metadataService.getBranch(), searchStr, null, 0, 50, null, true, true).then(function (response){

              // remove duplicates
              for (var i = 0; i < response.items.length; i++) {
                for (var j = response.items.length - 1; j > i; j--) {
                  if (response.items[j].concept.conceptId === response.items[i].concept.conceptId) {
                    response.splice(j, 1);
                    j--;
                  }
                }
              }

              return response.items;
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
            } else {
              rel.newTargetFsn = scope.histAssocTargets.concepts[0].fsn;
              rel.newTargetId = scope.histAssocTargets.concepts[0].conceptId;
            }

            var associations = scope.getAssociationsForReason(rel.inactivationIndicator);
            if(associations.length == 1) {
              rel.refsetName = associations[0].id;
            } else {
              rel.refsetName = '';
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
          };

          scope.updateDescRefAssocTarget = function (rel) {
            if(rel.inactivationIndicator === 'NOT_SEMANTICALLY_EQUIVALENT') {
              rel.refsetName = 'REFERS_TO';
              rel.newTargetFsn = scope.histAssocTargets.concepts[0].fsn;
              rel.newTargetId = scope.histAssocTargets.concepts[0].conceptId;

            } else {
              rel.refsetName = '';
              rel.newTargetId = '';
              rel.newTargetFsn = '';
            }            
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
              if (relationshipI.relationshipId === null
                && relationshipI.effectiveTime === null) {
                for (var j = 0; j < concept.relationships.length; j++) {
                  var relationshipJ = concept.relationships[j];
                  if (relationshipI.characteristicType === 'STATED_RELATIONSHIP'
                    && relationshipJ.characteristicType === 'STATED_RELATIONSHIP'
                    && relationshipI.relationshipId !== relationshipJ.relationshipId
                    && relationshipI.type.conceptId === relationshipJ.type.conceptId
                    && relationshipI.target.conceptId === relationshipJ.target.conceptId
                    && relationshipI.groupId === relationshipJ.groupId) {
                    return true;
                  }
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
                  && rel.target.conceptId === concept.conceptId
                  && !rel.relationshipId) {
                return true;
              }
            }         
             
            return false;       
          };

          scope.convertToTextFromCode = function (code) {
            if(!code) {
              return '';
            }

            var text = code.replace(/_/g, " ");
            text = text.toLowerCase();
            return text.charAt(0).toUpperCase() + text.slice(1);
          }

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
            scope.descriptionInactivationReasons = metadataService.getDescriptionInactivationReasons();
            scope.assocName = null;
            scope.histAssocTargets = {};
            scope.histAssocTargets.concepts = [];
            scope.histAssocTargets.descriptions = [];
            scope.deletion = inactivationService.getDeletion();
            scope.useFirstTarget = inactivationService.isUseFirstTarget();

            console.debug('scope.assocs', scope.assocs);
            console.debug('reason id', scope.reasonId);


            for (var key in scope.assocs) {

              angular.forEach(scope.assocs[key], function (id) {


                var concept = {};
                concept.assocName = key;
                concept.conceptId = id;
                terminologyServerService.getConceptDescriptions(id, scope.branch).then(function (response) {
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
            angular.forEach(scope.inactivationConcept.classAxioms, function (axiom) {
              angular.forEach(axiom.relationships, function (rel) {
                  if (rel.characteristicType === 'STATED_RELATIONSHIP' && metadataService.isIsaRelationship(rel.type.conceptId)) {
                    scope.inactivationConceptParents.push({conceptId: rel.target.conceptId, fsn: rel.target.fsn});
                  }
              });
            });


            // ensure that children have been retrieved
            getNewTargetConceptParents().then(function (parents) {
              scope.newTargetConceptParents = parents;
              notificationService.sendMessage('Retrieving inbound relationships...');
              getAffectedObjectIds().then(function () {
                notificationService.sendMessage('Retrieving affected associations...');
                getAffectedAssociations().then(function () {
                  notificationService.sendMessage('Retreiving affected GCIs... ');
                  getAffectedGcis().then(function () {
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
            });
          }

          initialize();
        }

      }
        ;

    }])
;
