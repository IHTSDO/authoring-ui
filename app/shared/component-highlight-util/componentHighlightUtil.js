'use strict';

angular.module('singleConceptAuthoringApp')
  .service('componentHighlightUtil', function (terminologyServerService, $q) {
    
    //function to compare the current version of a concept with the version that existed at the time of branch creation
    //and highlight any changes
    function runComparison(conceptId, branch, concept, originalConcept) {
      var deferred = $q.defer();
      
      var styles = {};      
      var inactiveDescriptions = {};
      var currentConcept = angular.copy(concept);
      
      if (originalConcept) {
        compareConcept(styles, inactiveDescriptions, currentConcept, originalConcept).then(function(response){
          deferred.resolve(response);
        });
      }
      else {
        terminologyServerService.getFullConceptAtDate(conceptId, branch, null, '-').then(function (concept) {
          compareConcept(styles, inactiveDescriptions, currentConcept, concept).then(function(response){
            deferred.resolve(response);
          });
        }, 
        //if the concept is not found in the before version then it has been created within the lifecycle of the task
        function () {
          styles = {isNew: true};
          var response = {};
          response.styles = styles;          
          response.concept = currentConcept;
          response.inactiveDescriptions = inactiveDescriptions;
  
          deferred.resolve(response);
        });
      }
      
      return deferred.promise;
    }

    function compareConcept(styles, inactiveDescriptions, currentConcept, originalConcept) {
      var deferred = $q.defer();
      //check concept conditions first
      if(currentConcept.active !== originalConcept.active
        || currentConcept.definitionStatus !== originalConcept.definitionStatus){
        highlightComponent(styles, inactiveDescriptions, currentConcept.conceptId);
      }
      compareDescriptions(styles, inactiveDescriptions, currentConcept, originalConcept).then(function () {
        compareAxioms(styles, inactiveDescriptions, currentConcept, originalConcept).then(function () {
          var response = {};
          response.styles = styles;              
          response.concept = currentConcept;
          response.inactiveDescriptions = inactiveDescriptions;

          deferred.resolve(response);
        })
      });

      return deferred.promise;
    }
    
    function compareDescriptions(styles, inactiveDescriptions, currentConcept, originalConcept){
      var deferred = $q.defer();
      let originalIds = [];
      let newIds = [];
      //build list of before and after ids for simpler iteration
      angular.forEach(originalConcept.descriptions, function(description){
        originalIds.push(description.descriptionId);
      });
      angular.forEach(currentConcept.descriptions, function(description){
        newIds.push(description.descriptionId);
        //description is not new but has changed
        angular.forEach(originalConcept.descriptions, function(originalDescription){
            if(description.descriptionId === originalDescription.descriptionId){
              if(description.active !== originalDescription.active
              || description.caseSignificance !== originalDescription.caseSignificance
              || description.lang !== originalDescription.lang
              || description.term !== originalDescription.term
              || description.type !== originalDescription.type
              || description.inactivationIndicator !== originalDescription.inactivationIndicator
              || !isEquivalent(description.acceptabilityMap, originalDescription.acceptabilityMap)){
                highlightComponent(styles, inactiveDescriptions, currentConcept.conceptId, description.descriptionId, originalDescription, description);
              }
            } 
        });
      });
      //description is new
      angular.forEach(newIds, function(id){
        if(!originalIds.includes(id)){
          highlightComponent(styles, inactiveDescriptions, currentConcept.conceptId, id);
        }
      });
      deferred.resolve();
      return deferred.promise;
    }

    function compareAxioms(styles, inactiveDescriptions, currentConcept, originalConcept){
      var deferred = $q.defer();
      let originalIds = [];
      let newIds = [];
      //build list of before and after ids for simpler iteration
      angular.forEach(originalConcept.classAxioms, function(axiom){
        originalIds.push(axiom.axiomId);
      });
      angular.forEach(originalConcept.gciAxioms, function(axiom){
        originalIds.push(axiom.axiomId);
      });
      angular.forEach(currentConcept.classAxioms, function(axiom){
        newIds.push(axiom.axiomId);
        angular.forEach(originalConcept.classAxioms, function(originalAxiom){
          if(axiom.axiomId === originalAxiom.axiomId){
            originalAxiom.found = true;
            compareAxiomRelationshipGroups(axiom, originalAxiom, currentConcept).then(function (params) {
                compareAxiomRelationships(styles, inactiveDescriptions, axiom, originalAxiom, currentConcept, params).then(function (modifiedAxiom) {
                  axiom = modifiedAxiom;
                  if(axiom.active !== originalAxiom.active
                  || axiom.definitionStatus !== originalAxiom.definitionStatus){
                        highlightComponent(styles, inactiveDescriptions, currentConcept.conceptId, axiom.axiomId, null, null, null, true);
                  }
                  if(originalAxiom.active && !axiom.active){
                        highlightComponent(styles, inactiveDescriptions, currentConcept.conceptId, axiom.axiomId, null, null, true);
                  }
                });
            });
          }
        });
      });

      angular.forEach(originalConcept.classAxioms, function(originalAxiom){
        if(originalAxiom.found !== true){
            originalAxiom.active = false;
            originalAxiom.deleted = true;
            currentConcept.classAxioms.push(originalAxiom);
            highlightComponent(styles, inactiveDescriptions, currentConcept.conceptId, originalAxiom.axiomId, null, null, true);
        }
        delete originalAxiom.found
      });

      angular.forEach(currentConcept.gciAxioms, function(axiom){
        newIds.push(axiom.axiomId);
        angular.forEach(originalConcept.gciAxioms, function(originalAxiom){
          if(axiom.axiomId === originalAxiom.axiomId){
            originalAxiom.found = true;
            compareAxiomRelationshipGroups(axiom, originalAxiom, currentConcept).then(function (params) {
                compareAxiomRelationships(styles, inactiveDescriptions, axiom, originalAxiom, currentConcept, params).then(function (modifiedAxiom) {
                  axiom = modifiedAxiom;
                  if(axiom.active !== originalAxiom.active
                    || axiom.definitionStatus !== originalAxiom.definitionStatus){
                      highlightComponent(styles, inactiveDescriptions, currentConcept.conceptId, axiom.axiomId, null, null, null, true);
                  }
                  if(originalAxiom.active && !axiom.active){
                      highlightComponent(styles, inactiveDescriptions, currentConcept.conceptId, axiom.axiomId, null, null, true);
                  }
                });
            });
          } 
        });
      });

      angular.forEach(originalConcept.gciAxioms, function(originalAxiom){
        if(originalAxiom.found !== true){
            originalAxiom.active = false;
            originalAxiom.deleted = true;
            currentConcept.gciAxioms.push(originalAxiom);
            highlightComponent(styles, inactiveDescriptions, currentConcept.conceptId, originalAxiom.axiomId, null, null, true);
        }
        delete originalAxiom.found
      });

      //axiom is new
      angular.forEach(newIds, function(id){
        if(!originalIds.includes(id)){
          highlightComponent(styles, inactiveDescriptions, currentConcept.conceptId, id);
        }
      });
      deferred.resolve();
      return deferred.promise;
    }

    function compareAxiomRelationships (styles, inactiveDescriptions, axiom, originalAxiom, currentConcept, params){
      var deferred = $q.defer();
      angular.forEach(axiom.relationships, function(newRelationship){
        let newRelClone = angular.copy(newRelationship);       
        delete newRelClone.target.pt;
        delete newRelClone.target.preferredSynonym;
        delete newRelClone.relationshipId;

        angular.forEach(originalAxiom.relationships, function(originalRelationship){
          let oldRelClone = angular.copy(originalRelationship);
          delete oldRelClone.target.pt;
          delete oldRelClone.target.preferredSynonym;
          delete oldRelClone.relationshipId;
          if(!params.originalMatchedGroups.includes(originalRelationship.groupId) && JSON.stringify(newRelClone) === JSON.stringify(oldRelClone)){
            newRelationship.found = true;
          }
        });
        if(!newRelationship.found && !params.matchedGroups.includes(newRelationship.groupId)){
          if(params.partialMatches){
              angular.forEach(originalAxiom.relationships, function(originalRelationship){
                  if(params.partialMatches.includes(newRelationship.groupId)){
                    delete newRelClone.groupId
                    
                    let oldRelClone = angular.copy(originalRelationship);
                    delete oldRelClone.groupId
                    delete oldRelClone.target.pt;
                    delete oldRelClone.target.preferredSynonym;
                    delete oldRelClone.relationshipId;
                    
                    if(JSON.stringify(newRelClone) === JSON.stringify(oldRelClone)){
                        newRelationship.found = true;
                    }
                  }
                });
          }
          if(!newRelationship.found){
              newRelationship.relationshipId = terminologyServerService.createGuid();
              highlightComponent(styles, inactiveDescriptions, currentConcept.conceptId, newRelationship.relationshipId);
          }
        }
      });
        
      angular.forEach(axiom.relationships, function(newRelationship){
        if(newRelationship.found){
        delete newRelationship.found;
        }
      });
        
      angular.forEach(originalAxiom.relationships, function(originalRelationship){
        var cleanedOriginalRelationship = angular.copy(originalRelationship);
        delete cleanedOriginalRelationship.relationshipId;        
        delete cleanedOriginalRelationship.target.pt;
        delete cleanedOriginalRelationship.target.preferredSynonym;
        angular.forEach(axiom.relationships, function(newRelationship){
          var cleanedNewRelationship = angular.copy(newRelationship);
          delete cleanedNewRelationship.relationshipId;         
          delete cleanedNewRelationship.target.pt;
          delete cleanedNewRelationship.target.preferredSynonym;
          if(JSON.stringify(cleanedNewRelationship) === JSON.stringify(cleanedOriginalRelationship)){
            originalRelationship.found = true;
          }
        });
        if(!originalRelationship.found && !params.matchedGroups.includes(originalRelationship.groupId) && (originalRelationship.groupId === 0 || !params.onlyNew)){
          originalRelationship.relationshipId = terminologyServerService.createGuid();
          originalRelationship.active = false;
          originalRelationship.deleted = true;
          axiom.relationships.push(originalRelationship);
          highlightComponent(styles, inactiveDescriptions, currentConcept.conceptId, originalRelationship.relationshipId, null, null, true);
        }
      });
      deferred.resolve(axiom);
      return deferred.promise;
    }

    function compareAxiomRelationshipGroups (axiom, originalAxiom, currentConcept){
      var deferred = $q.defer();
      let newGroups = {};
      let oldGroups = {};
      let matchedGroups = [];
      let params= {};
      let originalMatchedGroups = [];
      let partialMatches = [];
        
      angular.forEach(axiom.relationships, function(newRelationship){
          if(newRelationship.groupId !== 0){
              if(!newGroups[newRelationship.groupId]){
                  newGroups[newRelationship.groupId] = [];
              }
              newGroups[newRelationship.groupId].push(newRelationship);
          }
          
      });
        
      angular.forEach(originalAxiom.relationships, function(originalRelationship){
          if(originalRelationship.groupId !== 0){
              if(!oldGroups[originalRelationship.groupId]){
                  oldGroups[originalRelationship.groupId] = [];
              }
              oldGroups[originalRelationship.groupId].push(originalRelationship);
          }
      });
        
      angular.forEach(newGroups, function(newGroup){
          let newGroupString = '';
          let groupId = '';
          angular.forEach(newGroup, function(relationship){
              groupId = relationship.groupId;
              let newClone = angular.copy(relationship);
              delete newClone.groupId;
              delete newClone.target.pt;
              delete newClone.target.preferredSynonym;
              newGroupString = newGroupString + JSON.stringify(newClone)
          })
          angular.forEach(oldGroups, function(oldGroup){
              let oldGroupId = '';
              let oldGroupString = '';
              angular.forEach(oldGroup, function(relationship){
                  oldGroupId = relationship.groupId;
                  let oldClone = angular.copy(relationship);
                  delete oldClone.groupId;
                  delete oldClone.target.pt;
                  delete oldClone.target.preferredSynonym;
                  oldGroupString = oldGroupString + JSON.stringify(oldClone)
              })
              if(newGroupString === oldGroupString && groupId !== 0){
                  matchedGroups.push(groupId);
                  originalMatchedGroups.push(oldGroupId);
              }
          });
      });
      
      //check for partial matches
      angular.forEach(newGroups, function(newGroup){
          let groupId = '';
          angular.forEach(newGroup, function(relationship){
              if(!matchedGroups.includes(relationship.groupId) && relationship.groupId !== 0){
                  groupId = relationship.groupId;
                  let newClone = angular.copy(relationship);
                  delete newClone.groupId
                  angular.forEach(oldGroups, function(oldGroup){
                          angular.forEach(oldGroup, function(relationship){
                              if(!originalMatchedGroups.includes(relationship.groupId) && relationship.groupId !== 0){
                                  let oldClone = angular.copy(relationship);
                                  delete oldClone.groupId
                                  if(JSON.stringify(newClone) === JSON.stringify(oldClone)){
                                      partialMatches.push(groupId);
                                  }
                              }
                          })
                  });
              }
          })
      });
        
      let size = 0;
      for (var key in oldGroups) {
          if (newGroups.hasOwnProperty(key)) size++;
      }
      if(size === matchedGroups.length && size !== 0){
          params.onlyNew = true;
      }
      params.partialMatches = partialMatches;
      params.matchedGroups = matchedGroups;
      params.originalMatchedGroups = originalMatchedGroups;
        
      deferred.resolve(params);
      return deferred.promise;
    }

    //called on concept load after comparison to add components, concepts and axioms to styles list
    function highlightComponent(styles, inactiveDescriptions, conceptId, componentId, originalDescription, currentDescription, removed, axiom) {      
      if(originalDescription !== null && currentDescription !== null && originalDescription !== undefined && currentDescription !== undefined){
          
          //detects changes to description type and displays change in tooltip
          if (currentDescription.type !== originalDescription.type) {
            styles[componentId + '-type'] = {
              message: 'Change from ' + originalDescription.type + ' to ' + currentDescription.type,
              style: 'triangle-redhl'
            };
          }
          
          //detects changes to case significance and displays change in tooltip
          if (currentDescription.caseSignificance !== originalDescription.caseSignificance) {
            styles[componentId + '-caseSignificance'] = {
              message: 'Change from ' + getCaseSignificanceDisplayText(originalDescription) + ' to ' + getCaseSignificanceDisplayText(currentDescription),
              style: 'triangle-redhl'
            };
          }
          
          //detects changes to inactivation indicator and historical associations and displays change in description more
          if ((originalDescription.inactivationIndicator !== currentDescription.inactivationIndicator
                      || checkAssociationTargetsChanged(originalDescription.associationTargets, currentDescription.associationTargets))
                      && !originalDescription.active 
                      && !currentDescription.active) {
            inactiveDescriptions[originalDescription.descriptionId] = originalDescription;
          }
          
          //Detects changes to acceptability and displays change in tooltip
          var componentDialects = Object.keys(currentDescription.acceptabilityMap);
          componentDialects = componentDialects.concat(Object.keys(originalDescription.acceptabilityMap));
          
          angular.forEach(componentDialects, function (dialectId) {
              if (currentDescription.acceptabilityMap[dialectId] && !originalDescription.acceptabilityMap[dialectId]) {
                styles[componentId + '-acceptability-' + dialectId] = {
                  message: 'Change from Not Acceptable to ' + getAcceptabilityTooltipText(currentDescription,dialectId),
                  style: 'triangle-redhl'
                };
              }
              if (!currentDescription.acceptabilityMap[dialectId] && originalDescription.acceptabilityMap[dialectId]) {
                styles[componentId + '-acceptability-' + dialectId] = {
                  message: 'Change from ' + getAcceptabilityTooltipText(originalDescription,dialectId) + ' to Not Acceptable',
                  style: 'triangle-redhl'
                };
              }
              if (currentDescription.acceptabilityMap[dialectId] && originalDescription.acceptabilityMap[dialectId]
                && currentDescription.acceptabilityMap[dialectId] !== originalDescription.acceptabilityMap[dialectId]) {
                  styles[componentId + '-acceptability-' + dialectId] = {
                  message: 'Change from ' + getAcceptabilityTooltipText(originalDescription,dialectId) + ' to ' + getAcceptabilityTooltipText(currentDescription,dialectId),
                  style: 'triangle-redhl'
                };
              }
          });
      }

      // if component id specified, add style field
      if (componentId && !removed && !axiom) {
        styles[componentId] = {message: null, style: 'tealhl'};
      }
        
      else if (componentId && removed && !axiom) {
        styles[componentId] = {message: null, style: 'redhl'};
      }
        
      else if (componentId && axiom) {
        styles[componentId] = {message: null, style: 'tealhl', new: true};
      }

      // otherwise, add to concept style directly
      else {
        styles.conceptStyle = {message: null, style: 'tealhl'};
      }
    }

    function isEquivalent(a, b) {
      // Create arrays of property names
      var aProps = Object.getOwnPropertyNames(a);
      var bProps = Object.getOwnPropertyNames(b);
      
      if (aProps.length != bProps.length) {
        return false;
      }

      for (var i = 0; i < aProps.length; i++) {
        var propName = aProps[i];
          // Check all first level property values
        if (a[propName] !== b[propName]) {
          return false;
        }
      }
      return true;
    }

    function checkAssociationTargetsChanged(associationTarget1, associationTarget2) {
      for (var key in associationTarget1) {
        if (associationTarget2.hasOwnProperty(key)) {
          var items1 =  associationTarget1[key];
          var items2 =  associationTarget2[key];
          if (JSON.stringify(items1.sort()) !== JSON.stringify(items2.sort())) {
          return true;
          }
        } else {
          return true;
        }  
      }
      return false;
  }

  function getCaseSignificanceDisplayText (description) {
    switch (description.caseSignificance) {
      case 'INITIAL_CHARACTER_CASE_INSENSITIVE':
        return 'cI';
      case 'CASE_INSENSITIVE':
        return 'ci';
      case 'ENTIRE_TERM_CASE_SENSITIVE':
        return 'CS';
      default:
        return '??';
    }
  }

  function getAcceptabilityTooltipText(description, dialectId) {
    if (!description || !dialectId) {
      return null;
    }

    // if no acceptability map specified, return 'N' for Not Acceptable
    if (!description.acceptabilityMap || !description.acceptabilityMap[dialectId]) {
      return 'Not Acceptable';
    }
    return description.acceptabilityMap[dialectId] === 'PREFERRED' ? 'Preferred' : 'Acceptable';
  }

  return {
    runComparison: runComparison
  };
});