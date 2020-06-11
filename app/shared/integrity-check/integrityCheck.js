angular.module('singleConceptAuthoringApp')

  .directive('integrityCheck', ['$rootScope', 'ngTableParams', '$route', '$routeParams', '$filter',  'terminologyServerService', 'notificationService',
    function ($rootScope, NgTableParams, $route, $routeParams, $filter, terminologyServerService, notificationService) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          integrityCheckResult: '=',
          branch: '='

        },
        templateUrl: 'shared/integrity-check/integrityCheck.html',

        link: function (scope) {
          $rootScope.pageTitle = 'Upgrade/' + $routeParams.projectKey + ($routeParams.taskKey ? '/' + $routeParams.taskKey : '');
          
          scope.concepts = [];
          scope.selectedConcept = {};
          scope.selectedConcept.priorConcept = null;
          scope.selectedConcept.resolutionConcept = null;
          scope.componentStyle = {};
          scope.actionTab = 3;
          scope.viewConcepts = [];

          scope.setActiveTab = function (tabIndex) {
            scope.actionTab = tabIndex;
          };         

          scope.integrityCheckTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {term: 'asc'},
              orderBy: 'term'
            },
            {
              filterDelay: 50,
              total: scope.concepts ? scope.concepts.length : 0,

              getData: function ($defer, params) {
                if (!scope.concepts) {
                  $defer.resolve([]);
                } else {

                  params.total(scope.concepts.length);
                  scope.concepts = params.sorting() ? $filter('orderBy')(scope.concepts, params.orderBy()) : scope.concepts;
                  var concepts = scope.concepts.slice((params.page() - 1) * params.count(), params.page() * params.count());
                  
                  $defer.resolve(concepts);
                }
              }
            }
          );

          scope.toggleSidebar = function () {
            scope.hideSidebar = !scope.hideSidebar;
          };

          scope.selectAll = function (isChecked) {
            angular.forEach(scope.concepts, function (item) {
              item.selected = isChecked;
            });
          };

          scope.applyAutomatedContentFix = function() {
            var selectedConcepts = [];
            if (scope.checkAll) {
              selectedConcepts = scope.concepts;
            }
            else {
              angular.forEach(scope.concepts, function (item) {
                if (item.selected) {
                  selectedConcepts.push(item);
                }
              });
            }
            if (selectedConcepts.length === 0) {
              return;
            }

            let ids = [];
            angular.forEach(selectedConcepts, function (selectedConcept) {
              ids.push(selectedConcept.conceptId);
              for (let axiomId in selectedConcept.axiomsToBeReplaced) {
                ids = ids.concat(selectedConcept.axiomsToBeReplaced[axiomId]);
              }
            });          
            notificationService.sendMessage('Saving auto-fixed content for selected concepts...');
            // Fetch the active and inacive concepts
            terminologyServerService.bulkRetrieveFullConcept(ids,scope.branch).then(function (concepts) {
              // find concept id replacements
              var inactiveConceptIdMap = {};
              for (let i =0; i < concepts.length; i++) {
                let concept = concepts[i];
                if (!concept.active && concept.hasOwnProperty('associationTargets')) {
                  for (let associationTarget in concept.associationTargets){
                    inactiveConceptIdMap[concept.conceptId] = concept.associationTargets[associationTarget];
                  }
                }                
              }

              var updatedConcepts = [];
              for (let i =0; i < selectedConcepts.length; i++) {
                let concept = selectedConcepts[i];
                for (let j =0; j < concepts.length; j++) { 
                  let conceptFull = concepts[j];                 
                  if (concept.conceptId === conceptFull.conceptId) {
                    for (let axiomId in concept.axiomsToBeReplaced) {
                      for (let k =0; k < conceptFull.classAxioms.length; k++) {
                        replaceInactiveTargetId(axiomId, conceptFull.classAxioms[k], inactiveConceptIdMap);
                      }
                      for (let k =0; k < conceptFull.gciAxioms.length; k++) {
                        replaceInactiveTargetId(axiomId, conceptFull.gciAxioms[k], inactiveConceptIdMap);
                      }
                    }
                    updatedConcepts.push(conceptFull);
                    break;
                  }                
                }                
              }

              if (updatedConcepts.length !== 0) {
                terminologyServerService.bulkValidateConcepts(scope.branch, updatedConcepts).then(function(validationResponse){
                  var invalidConceptIds = []
                  if (validationResponse && validationResponse.data && validationResponse.data.length !== 0) {
                    for (let i = 0; i < validationResponse.data.length; i++) {
                      if (validationResponse.data[i].severity === 'ERROR' && !invalidConceptIds.includes(validationResponse.data[i].conceptId)) {
                        invalidConceptIds.push(validationResponse.data[i].conceptId);
                      }
                    }
                  }

                  if (invalidConceptIds.length !== 0) {
                    updatedConcepts = updatedConcepts.filter(function(item) {
                      return !invalidConceptIds.includes(item.conceptId);
                    })
                  }
                  if (updatedConcepts.length !== 0) {
                    terminologyServerService.bulkUpdateConcept(scope.branch, updatedConcepts).then(function(response) {
                      if (response.conceptIds) {
                        var message = 'Updated ' + response.conceptIds.length + ' concepts successfully.';
                        if (invalidConceptIds.length > 0) {
                          message += ' ' + invalidConceptIds.length + ' concepts failed to validate, please correct them manually and re-try.';
                        }
                        
                        notificationService.sendMessage(message)
                        scope.concepts = scope.concepts.filter(function(item) {
                          return !response.conceptIds.includes(parseInt(item.conceptId));
                        });
    
                        if (scope.concepts.length !== 0) {
                          var found = scope.concepts.filter(function(item) {
                            return item.conceptId === scope.selectedConcept.priorConcept.conceptId;
                          }).length !== 0;
    
                          if (!found) {
                            scope.viewConcept(scope.concepts[0], true);
                          }
                          scope.integrityCheckTableParams.reload();
                        } 
                        else {
                          $route.reload();
                        }
                      }
                    });
                  } else {
                    notificationService.sendMessage(invalidConceptIds.length + ' concepts failed to validate, please correct them manually and re-try.');
                  }
                });                
              } else {
                notificationService.sendMessage('No concepts updated.');
              }
            });
          }

          scope.viewConcept = function (concept, skipNotifcation) {
            if (!skipNotifcation) {
              notificationService.sendMessage('Loading concept: ' + concept.term);
            }            
            scope.selectedConcept.priorConcept = null;
            scope.selectedConcept.resolutionConcept = null;
            scope.componentStyle = {};
            terminologyServerService.getFullConcept(concept.conceptId, scope.branch).then(function (response) {
              scope.selectedConcept.priorConcept = response;                      
              highlightInactiveComponents(scope.selectedConcept.priorConcept, concept.axiomsToBeReplaced);
              constructResolutionConcept(response, concept.axiomsToBeReplaced, skipNotifcation);              
            });
          };   

          scope.$on('viewTaxonomy', function(event, data) {
            scope.actionTab = 1;
          });
          scope.$on('viewSearch', function(event, data) {
            scope.actionTab = 2;
          });

          scope.$on('loadNextConcept', function () {
            let pos = -1;
            for (let i = 0; i < scope.concepts.length; i++) {
              if (scope.concepts[i].conceptId === scope.selectedConcept.priorConcept.conceptId) {
                pos = i;
                break;                
              }
            }
            if (pos !== -1) {
              scope.concepts.splice(pos, 1);
              scope.integrityCheckTableParams.reload();
            }
            if (scope.concepts.length > 0) {
              scope.viewConcept(pos > scope.concepts.length - 1 ? scope.concepts[pos - 1] : scope.concepts[pos]);
            }
            else {
              $route.reload();
            }
          });

          scope.$on('editConcept', function (event, data) {
            // verify that this SCTID does not exist in the edit list
            for (var i = 0; i < scope.viewConcepts.length; i++) {
              if (scope.viewConcepts[i].conceptId === data.conceptId) {
                notificationService.sendWarning('Concept already loaded', 5000);           
                return;
              }
            }
            // send loading notification for user display
            notificationService.sendMessage('Loading concepts...', 10000, null);
            terminologyServerService.getFullConcept(data.conceptId, scope.branch).then(function (response) {            
              if (!response) {
                return;
              }
              scope.viewConcepts.push(response);
              scope.$broadcast('editingConcepts', {concepts: scope.viewConcepts});
              notificationService.clear();
            });      
          });

          scope.$on('stopEditing', function (event, data) {
            removeViewedConcept(data.concept.conceptId);
            scope.$broadcast('editingConcepts', {concepts: scope.viewConcepts});
          });

          function removeViewedConcept(conceptId) {
            var index = scope.viewConcepts.map(function (c) {
              return c.conceptId
            }).indexOf(conceptId);
            if (index !== -1) {
              scope.viewConcepts.splice(index, 1);
            }
          }

          function constructResolutionConcept(originalConcept, axiomsToBeReplaced, skipNotifcation) {
            scope.componentStyle.resolutionConcept = {};
            let ids = [];         
            for (let axiomId in axiomsToBeReplaced) {
              ids = ids.concat(axiomsToBeReplaced[axiomId]);
            }
            // Fetch the inacive concepts
            terminologyServerService.bulkRetrieveFullConcept(ids,scope.branch).then(function (inactiveConcepts) {              
              let newIds = [];

              // find concept id replacements
              var inactiveConceptIdMap = {};
              for (let i =0; i < inactiveConcepts.length; i++) {
                let inactiveConcept = inactiveConcepts[i];
                if (!inactiveConcept.active && inactiveConcept.hasOwnProperty('associationTargets')) {
                  for (let associationTarget in inactiveConcept.associationTargets){
                    newIds = newIds.concat(inactiveConcept.associationTargets[associationTarget]);
                    inactiveConceptIdMap[inactiveConcept.conceptId] = inactiveConcept.associationTargets[associationTarget];
                  }
                }                
              }

              // get concepts and replace the originalConcept
              terminologyServerService.bulkGetConcept(newIds,scope.branch).then(function (response) {
                let replacedConceptMap = {};
                for (let i = 0; i < response.items.length; i++) {
                  replacedConceptMap[response.items[i].conceptId] = response.items[i];
                }

                let resolutionConcept = angular.copy(originalConcept);                
                for (let axiomId in axiomsToBeReplaced) {
                  replaceInactiveConcepts(resolutionConcept.classAxioms, axiomId, axiomsToBeReplaced[axiomId], inactiveConceptIdMap, replacedConceptMap);
                  replaceInactiveConcepts(resolutionConcept.gciAxioms, axiomId, axiomsToBeReplaced[axiomId], inactiveConceptIdMap, replacedConceptMap);
                }

                scope.selectedConcept.resolutionConcept = resolutionConcept;
                if (!skipNotifcation) {
                  notificationService.clear();
                }                
              });
            });
          }

          function highlightInactiveComponents(priorConcept, axiomsToBeReplaced) {
            scope.componentStyle.priorConcept = {};
            for (let i = 0; i < priorConcept.classAxioms.length; i++) {
              let axiom  = priorConcept.classAxioms[i];                
              if (axiomsToBeReplaced.hasOwnProperty(axiom.axiomId)) {
                let relationships = axiom.relationships;
                for (let j = 0; j < relationships.length; j++) {
                  if (axiomsToBeReplaced[axiom.axiomId].includes(parseInt(relationships[j].target.conceptId))) {
                    relationships[j].relationshipId = terminologyServerService.createGuid();                         
                    scope.componentStyle.priorConcept[relationships[j].relationshipId] = {};
                    scope.componentStyle.priorConcept[relationships[j].relationshipId].style = 'redhl';
                  }
                }
              }                
            } 
          }

          function highlightNewComponents(relationship) {
            relationship.relationshipId = terminologyServerService.createGuid();                         
            scope.componentStyle.resolutionConcept[relationship.relationshipId] = {};
            scope.componentStyle.resolutionConcept[relationship.relationshipId].style = 'tealhl';
          }

          function replaceInactiveTargetId(axiomId , axiom, inactiveConceptIdMap) {            
            if (axiomId === axiom.axiomId){
              for (let l =0; l < axiom.relationships.length; l++) {
                let relationship = axiom.relationships[l];
                if (inactiveConceptIdMap.hasOwnProperty(relationship.target.conceptId)) {
                  let newTargetIds = inactiveConceptIdMap[relationship.target.conceptId];
                  for (let m = 0; m < newTargetIds.length; m++) {
                    if (m === 0) {                            
                      relationship.target.conceptId = newTargetIds[m];
                    }
                    else {
                      let newRelationship = angular.copy(relationship);
                      newRelationship.target.conceptId = newTargetIds[m];                                  
                      axiom.relationships.push(newRelationship);
                    }
                  }
                }
              }
            }
          }

          function replaceInactiveConcepts(axioms, axiomId, conceptIdsToBeReplaced, inactiveConceptIdMap, replacedConceptMap) {
            for (let axiomIndex = 0; axiomIndex < axioms.length; axiomIndex++) {
              let axiom = axioms[axiomIndex];
              if (axiomId === axiom.axiomId) {
                for (let relIndex = 0; relIndex < axiom.relationships.length; relIndex++) {
                  let relationship = axiom.relationships[relIndex];
                  for (let conceptIdToBeReplacedIndex = 0; conceptIdToBeReplacedIndex < conceptIdsToBeReplaced.length; conceptIdToBeReplacedIndex++) {
                    if (parseInt(relationship.target.conceptId) === conceptIdsToBeReplaced[conceptIdToBeReplacedIndex]) {
                      let  inactiveConceptIds = inactiveConceptIdMap[relationship.target.conceptId];                      
                      let originalRelationShip = angular.copy(relationship);

                      for (let i = 0; i < inactiveConceptIds.length; i++) {
                        let newTarget = replacedConceptMap[inactiveConceptIds[i]];
                        newTarget.fsn = newTarget.fsn && newTarget.fsn.term ? newTarget.fsn.term : newTarget.fsn;
                        newTarget.pt = newTarget.pt && newTarget.pt.term ? newTarget.pt.term :newTarget.pt;
                        newTarget.preferredSynonym = newTarget.pt && newTarget.pt.term ? newTarget.pt.term : newTarget.pt;

                        if (i === 0) {                            
                          relationship.target = newTarget;
                          highlightNewComponents(relationship);
                        }
                        else {
                          let newRelationship = angular.copy(originalRelationShip);
                          newRelationship.target = newTarget;
                          highlightNewComponents(newRelationship);
                          axiom.relationships.push(newRelationship);
                        }
                      }                      
                    }
                  }                        
                }
              } 
            }
          }
          
          function constructConcepts() {
            let conceptIds = []; 
            for (let axiomId in scope.integrityCheckResult.axiomsWithMissingOrInactiveReferencedConcept) {
              let concept = scope.integrityCheckResult.axiomsWithMissingOrInactiveReferencedConcept[axiomId];
              if (conceptIds.includes(concept.conceptId)) {
                scope.concepts[conceptIds.indexOf(concept.conceptId)].axiomsToBeReplaced[axiomId] = concept.missingOrInactiveConcepts;
              }
              else {
                concept.term = concept.fsn.term;
                concept.axiomsToBeReplaced = {};
                concept.axiomsToBeReplaced[axiomId] = concept.missingOrInactiveConcepts;
                delete concept.missingOrInactiveConcepts;

                conceptIds.push(concept.conceptId);
                scope.concepts.push(concept);
              }
            }
          }
          
          function initialize() {
            constructConcepts();

            // sort concepts
            scope.concepts =  $filter('orderBy')(scope.concepts, 'term');

            // Load first concept
            scope.viewConcept(scope.concepts[0]);
          }

          initialize();

        }
      };
    }
  ]
);
