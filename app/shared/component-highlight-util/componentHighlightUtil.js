'use strict';

angular.module('singleConceptAuthoringApp')
  .service('componentHighlightUtil', function (terminologyServerService, $q) {

      var styles = {};
      var innerComponentStyle = {};

      //function to compare the current version of a concept with the version that existed at the time of branch creation
      //and highlight any changes
      function runComparison(conceptId, branch, currentConcept){
        styles = {};
        innerComponentStyle = {};

        var deferred = $q.defer();
        terminologyServerService.getFullConceptAtDate(conceptId, branch, null, '^').then(function (response) {
          //check concept conditions first
          if(currentConcept.active !== response.active
              || currentConcept.definitionStatus !== response.definitionStatus){
              highlightComponent(currentConcept.conceptId);
          }
          compareDescriptions(currentConcept, response).then(function () {
            compareAxioms(currentConcept, response).then(function () {
              var response = {};
              response.styles = styles;
              response.innerComponentStyle = innerComponentStyle;

              deferred.resolve(response);
            })
          });
        }, 
        //if the concept is not found in the before version then it has been created within the lifecycle of the task
        function (error) {
          styles[currentConcept.conceptId] = {isNew: true}; 
                   
          deferred.resolve({'styles' : styles});
        });
        return deferred.promise;
      }

      function compareDescriptions(currentConcept, originalConcept){
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
                  highlightComponent(currentConcept.conceptId, description.descriptionId, originalDescription, description);
                }
              } 
          });
        });
        //description is new
        angular.forEach(newIds, function(id){
          if(!originalIds.includes(id)){
            highlightComponent(currentConcept.conceptId, id);
          }
        });
        deferred.resolve();
        return deferred.promise;
      }

      function compareAxioms(currentConcept, originalConcept){
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
                compareAxiomRelationships(axiom, originalAxiom, currentConcept).then(function (modifiedAxiom) {
                  axiom = modifiedAxiom;
                  if(axiom && (axiom.active !== originalAxiom.active
                      || axiom.definitionStatus !== originalAxiom.definitionStatus)){
                        highlightComponent(currentConcept.conceptId, axiom.axiomId, null, null, null, true);
                  }
                });
              }
            });
        });
        angular.forEach(currentConcept.gciAxioms, function(axiom){
          newIds.push(axiom.axiomId);
          angular.forEach(originalConcept.gciAxioms, function(originalAxiom){
            if(axiom.axiomId === originalAxiom.axiomId){
              compareAxiomRelationships(axiom, originalAxiom, currentConcept).then(function (modifiedAxiom) {
                axiom = modifiedAxiom;
                if(axiom && (axiom.active !== originalAxiom.active
                  || axiom.definitionStatus !== originalAxiom.definitionStatus)){
                    highlightComponent(currentConcept.conceptId, axiom.axiomId, null, null, null, true);
                }
              });
            } 
          });
        });
        //axiom is new
        angular.forEach(newIds, function(id){
          if(!originalIds.includes(id)){
            highlightComponent(currentConcept.conceptId, id);
          }
        });
        deferred.resolve();
        return deferred.promise;
      }

      function compareAxiomRelationships(axiom, originalAxiom, currentConcept){
        var deferred = $q.defer();
        angular.forEach(axiom.relationships, function(newRelationship){
          angular.forEach(originalAxiom.relationships, function(originalRelationship){
            if(JSON.stringify(newRelationship) === JSON.stringify(originalRelationship)){
              newRelationship.found = true;
            }
          });
          if(!newRelationship.found){
            newRelationship.relationshipId = terminologyServerService.createGuid();
            highlightComponent(currentConcept.conceptId, newRelationship.relationshipId);
          }
        });
          
        angular.forEach(axiom.relationships, function(newRelationship){
          if(newRelationship.found){
           delete newRelationship.found;
          }
        });
          
        angular.forEach(originalAxiom.relationships, function(originalRelationship){
          angular.forEach(axiom.relationships, function(newRelationship){
            if(JSON.stringify(newRelationship) === JSON.stringify(originalRelationship)){
              originalRelationship.found = true;
            }
          });
          if(!originalRelationship.found){
            originalRelationship.relationshipId = terminologyServerService.createGuid();
            originalRelationship.active = false;
            axiom.relationships.push(originalRelationship);
            highlightComponent(currentConcept.conceptId, originalRelationship.relationshipId, null, null, true);
          }
        });
        deferred.resolve();
        return deferred.promise;
      }

      //called on concept load after comparison to add components, concepts and axioms to styles list
      function highlightComponent(conceptId, componentId, mainDescription, taskDescription, removed, axiom) {
        if (!innerComponentStyle) {
          innerComponentStyle = {};
        }
        if(mainDescription !== null && taskDescription !== null && mainDescription !== undefined && taskDescription !== undefined){
            
            //detects changes to description type and displays change in tooltip
            if (taskDescription.type !== mainDescription.type) {
              innerComponentStyle[componentId + '-type'] = {
                message: 'Change from ' + mainDescription.type + ' to ' + taskDescription.type,
                style: 'triangle-redhl'
              };
            }
            
            //detects changes to case significance and displays change in tooltip
            if (taskDescription.caseSignificance !== mainDescription.caseSignificance) {
              innerComponentStyle[componentId + '-caseSignificance'] = {
                message: 'Change from ' + getCaseSignificanceDisplayText(mainDescription) + ' to ' + getCaseSignificanceDisplayText(taskDescription),
                style: 'triangle-redhl'
              };
            }
            
            //Detects changes to acceptability and displays change in tooltip
            var componentDialects = Object.keys(taskDescription.acceptabilityMap);
            componentDialects = componentDialects.concat(Object.keys(mainDescription.acceptabilityMap));
            
            angular.forEach(componentDialects, function (dialectId) {
                if (taskDescription.acceptabilityMap[dialectId] && !mainDescription.acceptabilityMap[dialectId]) {
                  innerComponentStyle[componentId + '-acceptability-' + dialectId] = {
                    message: 'Change from Not Acceptable to ' + getAcceptabilityTooltipText(taskDescription,dialectId),
                    style: 'triangle-redhl'
                  };
                }
                if (!taskDescription.acceptabilityMap[dialectId] && mainDescription.acceptabilityMap[dialectId]) {
                  innerComponentStyle[componentId + '-acceptability-' + dialectId] = {
                    message: 'Change from ' + getAcceptabilityTooltipText(mainDescription,dialectId) + ' to Not Acceptable',
                    style: 'triangle-redhl'
                  };
                }
                if (taskDescription.acceptabilityMap[dialectId] && mainDescription.acceptabilityMap[dialectId]
                  && taskDescription.acceptabilityMap[dialectId] !== mainDescription.acceptabilityMap[dialectId]) {
                  innerComponentStyle[componentId + '-acceptability-' + dialectId] = {
                    message: 'Change from ' + getAcceptabilityTooltipText(mainDescription,dialectId) + ' to ' + getAcceptabilityTooltipText(taskDescription,dialectId),
                    style: 'triangle-redhl'
                  };
                }
            });
        }
        if (!styles) {
          styles = {};
        }
        if (!styles[conceptId]) {
          styles[conceptId] = {};
        }

        // if a new concept, don't highlight
        if (styles[conceptId].isNew) {
          return;
        }

        // if component id specified, add style field
        if (componentId && !removed && !axiom) {
          styles[conceptId][componentId] = {message: null, style: 'tealhl'};
        }
          
        else if (componentId && removed && !axiom) {
          styles[conceptId][componentId] = {message: null, style: 'redhl'};
        }
          
        else if (componentId && axiom) {
          styles[conceptId][componentId] = {message: null, style: 'tealhl', new: true};
        }

        // otherwise, add to concept style directly
        else {
          styles[conceptId].conceptStyle = {message: null, style: 'tealhl'};
        }
      }

      function isEquivalent(a, b) {
        // Create arrays of property names
        var aProps = Object.getOwnPropertyNames(a);
        var bProps = Object.getOwnPropertyNames(b);
        for (var i = 0; i < aProps.length; i++) {
          var propName = aProps[i];
            // Check all first level property values
          if (a[propName] !== b[propName]) {
            return false;
          }
        }
        return true;
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

    }
  )
;
