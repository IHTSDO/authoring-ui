'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles Authoring Template retrieval and functionality
 */
  .service('templateService', function ($http, $rootScope, $q, scaService, snowowlService, componentAuthoringUtil, $interval) {

    var apiEndpoint = '../template-service/';


    //
    // Internal variables
    //
    var currentTask = null;
    var selectedTemplate = null;
    var templateCache = null;

    //
    // Patterns
    //
    var PATTERN_FSN = /(.+\s\(.*\))/i;
    var PATTERN_PT_FROM_FSN = /(.+)\s\(.*\)/i;
    var PATTERN_SEMANTIC_TAG = /.+\s\((.*)\)/i;
    var PATTERN_SLOT = /\$([^$]+)\$/g;
    
    function searchByTemplate(templateName, branch, stated, model){
        let statedFlag = true;
        let logical = '';
        let lexical = '';
        if(stated === 'inferred'){
            statedFlag = false;
        }
        if(model === 'logical')
            {
                logical = 'true';
                lexical = '';
            }
        else if(model === 'logical!lexical')
            {
                logical = 'true';
                lexical = 'false';
            }
        else
            {
                logical = 'true';
                lexical = 'true';
            }
        var deferred = $q.defer();
        var array = [];
        let name = templateName.replace(/\//g, '%252F');
        $http.get(apiEndpoint + branch + '/templates/' + name + '/concepts?lexicalMatch=' + lexical + '&logicalMatch=' + logical + '&stated=' + statedFlag).then(function (idList) {
                    deferred.resolve(idList);
            }, function (error) {
              deferred.reject('Failed to retrieve template concepts: ' + error.message);
            });
        return deferred.promise;
    }
    
    function transform(branch, source, target, reason, concepts, logical, lexical){
        var deferred = $q.defer();
        let body = {
                  "conceptsToTransform": concepts,
                  "inactivationReason": reason,
                  "sourceTemplate": source.name,
                  "lexicalTransform": lexical,
                  "logicalTransform": logical
                }
        
        $http.post(apiEndpoint + branch + '/templates/' + target.name.replace(/\//g, '%252F') + '/transform', body).then(function (response) {
                    let id = response.headers('location');
                    id = id.substring(id.lastIndexOf("/") + 1);
                    let transformStatus = $interval(function () {
                            $http.get(apiEndpoint + 'templates/transform/' + id).then(function (response) {
                              if (response.data.status === 'COMPLETED') {
                                  $http.get(apiEndpoint + 'templates/transform/' + id + '/results/').then(function (results) {
                                      angular.forEach(results.data.concepts, function(result){
                                          result.template = target;
                                          angular.forEach(result.relationships, function(rel){
                                              if(rel.type.moduleId){
                                                  delete rel.type.moduleId;
                                              }
                                              if(rel.type.definitionStatus){
                                                  delete rel.type.definitionStatus;
                                              }
                                              if(!rel.relationshipId){
                                                  rel.relationshipId = snowowlService.createGuid();
                                              }
                                          });
                                          angular.forEach(result.descriptions, function(rel){
                                              if(!rel.descriptionId){
                                                  rel.descriptionId = snowowlService.createGuid();
                                              }
                                          });
                                      });
                                      console.log(results.data.concepts);
                                      deferred.resolve(results.data.concepts);
                                      $interval.cancel(transformStatus);
                                });
                              }
                              else if (response.data.status === 'COMPLETED_WITH_FAILURE') {
                                  $http.get(apiEndpoint + 'templates/transform/' + id + '/results/').then(function (results) {
                                      angular.forEach(results.data.concepts, function(result){
                                          result.template = target;
                                          angular.forEach(result.relationships, function(rel){
                                              if(rel.type.moduleId){
                                                  delete rel.type.moduleId;
                                              }
                                              if(rel.type.definitionStatus){
                                                  delete rel.type.definitionStatus;
                                              }
                                              if(!rel.relationshipId){
                                                  rel.relationshipId = snowowlService.createGuid();
                                              }
                                          });
                                          angular.forEach(result.descriptions, function(rel){
                                              if(!rel.descriptionId){
                                                  rel.descriptionId = snowowlService.createGuid();
                                              }
                                          });
                                      });
                                      console.log(results.data.concepts);
                                      deferred.resolve(results.data.concepts);
                                      $interval.cancel(transformStatus);
                                });
                              }
                              else if (response.data.status === 'FAILED') {
                                  deferred.reject(response.data.errorMsg);
                                  $interval.cancel(transformStatus);
                              }
                            });
                        }, 5000);
                    
            }, function (error) {
              deferred.reject('Failed to retrieve template concepts: ' + error.message);
            });
        return deferred.promise;
    }

    function getSlotValue(slotName, template, nameValueMap) {
      if(template.additionalSlots && template.additionalSlots.indexOf(slotName) !== -1){
          return ''
      }
      // find the lexical template for this slot
      var lt;
      try {
        lt = template.lexicalTemplates.filter(function (l) {
          return l.name === slotName;
        })[0];
      } catch (error) {
        return '???';
      }

      // if no value, return display name in brackets
      if (!nameValueMap[slotName] && lt && lt !== undefined) {
        return '[' + lt.displayName + ']';
      }
      // replace specified parts and extraneous whitespace
      var match = nameValueMap[slotName].match(PATTERN_PT_FROM_FSN);
      var replaceValue;
      if (!match || !match[1] || match[1].length === 0) {
        replaceValue = '???';
      } else {
        replaceValue = match[1];
        angular.forEach(lt.removeParts, function (rp) {
          if (replaceValue.indexOf(rp) !== -1) {
            var re = new RegExp(rp, 'g');
            replaceValue = replaceValue.replace(re, '');
          }
        });
      }
      replaceValue = replaceValue.replace(/[\s]{2,}/g, ' ');
      return replaceValue;
    }

    function getDescriptionTemplateTermValue(descriptionTemplate, template, nameValueMap) {
      // match all function/slotName pairs surrounded by $$
      var newTerm = descriptionTemplate.termTemplate;

      var termSlots = [];
      var match;
      while (match = PATTERN_SLOT.exec(newTerm)) {
        termSlots.push(match[1]);
      }

      angular.forEach(termSlots, function (termSlot) {
        var re = new RegExp('\\$' + termSlot + '\\$');
        var sv = getSlotValue(termSlot, template, nameValueMap);
        newTerm = newTerm.replace(re, sv);
        newTerm = newTerm.replace(/[\s]{2,}/g, ' ');
        newTerm = newTerm.trim();
        newTerm = newTerm.substring(0, 1).toUpperCase() + newTerm.substring(1);
      });
      return newTerm;
    }

    // triggers replacement of logical values given a changed relationship
    function replaceLogicalValuesForRelationship(concept, relationship) {
      // placeholder promise in anticipation of asynchronous operations
      var deferred = $q.defer();

      if (!relationship || !relationship.template || !relationship.template.targetSlot) {
        deferred.reject('No target slot detected');
      } else {
        // check for linked/referenced slots
        for (var i = 0; i < concept.relationships.length; i++) {
          var r = concept.relationships[i];
          if (r.template && r.template.targetSlot && r.template.targetSlot.slotReference === relationship.template.targetSlot.slotName) {
            r.target.conceptId = relationship.target.conceptId;
            r.target.fsn = relationship.target.fsn;
          }
        }
        deferred.resolve(relationship);
      }
      return deferred.promise;
    }

    function replaceLogicalValues(concept) {
     var deferred = $q.defer();
      var promises = [];
      angular.forEach(concept.relationships, function (relationship) {
        if (relationship.template && relationship.template.targetSlot && relationship.template.targetSlot.slotName) {
          promises.push(replaceLogicalValuesForRelationship(concept, relationship));
       }
      });
      $q.all(promises).then(function (relationships) {
        deferred.resolve(concept);
      }, function (error) {
        deferred.reject(error);
      });

      return deferred.promise;
    }
    
    function getConceptNames(relationships, currentTask) {
            var deferred = $q.defer();
            var conceptIds = [];
        
             angular.forEach(relationships, function(rel) {
                if(rel.target.conceptId !== null)
                    {
                        conceptIds.push(rel.target.conceptId);
                    }                   
             });
             
               // skip if no concept ids
              if (conceptIds.length > 0) {

                // bulk call for concept ids
                snowowlService.bulkGetConcept(conceptIds, currentTask.branchPath).then(function (concepts) {
                  angular.forEach(concepts.items, function (concept) {
                    angular.forEach(relationships, function(rel){
                        if(concept.id === rel.target.conceptId){
                            rel.target.fsn = concept.fsn.term;
                        }
                    });
                  });

                  deferred.resolve(relationships);
                });
              } else {
                deferred.resolve();
              }

            return deferred.promise;
          }

    function replaceLexicalValues(concept, template) {
      var deferred = $q.defer();
      getTemplateValues(concept, template).then(function (nameValueMap) {

        // replace values in descriptions
        for (var i = 0; i < concept.descriptions.length; i++) {
          var d = concept.descriptions[i];
          if (d.template) {
            d.term = getDescriptionTemplateTermValue(d.template, template, nameValueMap);
            d.term = d.term.substring(0, 1).toUpperCase() + d.term.substring(1);

            if (!d.released && snowowlService.isSctid(d.descriptionId)) {
              delete d.descriptionId;
            }
            
            // check case sensitive terms for non-CS terms
            if (d.caseSignificance !== 'ENTIRE_TERM_CASE_SENSITIVE') {
              if (d.term.substring(1).toLowerCase() !== d.term.substring(1)) {
                d.caseSignificance = 'INITIAL_CHARACTER_CASE_INSENSITIVE';
              } else {
                d.caseSignificance = 'CASE_INSENSITIVE';
              }
            }
          }
        }

        // placeholder resolution in anticipation of replacement using promises
        deferred.resolve();
      }, function (error) {
        deferred.reject('Could not replace lexical valus: ' + error);
      });
      return deferred.promise;
    }

    function updateTargetSlot(concept, template, relationship) {
      var deferred = $q.defer();

      replaceLogicalValuesForRelationship(concept, relationship).then(function () {
        replaceLexicalValues(concept, template).then(function () {
          deferred.resolve(concept);
        }, function (error) {
          deferred.reject(error);
        });
      }, function (error) {
        deferred.reject(error);
      });
      return deferred.promise;
    }

    function getTargetSlotConcepts(concept) {
      var deferred = $q.defer();
      var conceptIds = [];
      angular.forEach(concept.relationships, function (r) {
        if (r.targetSlot && r.target !== undefined && r.target.conceptId) {
          conceptIds.push(r.target.conceptId);
        }
      });

      if (conceptIds.length > 0) {
        snowowlService.bulkGetConcept(conceptIds, currentTask.branchPath).then(function (response) {
          deferred.resolve(response.items);
        }, function (error) {
          deferred.reject(error);
        });
      } else {
        deferred.resolve([]);
      }

      return deferred.promise;
    }

    /**
     * @param template the template applied
     * @param concept the concept
     * @returns {{}} map of names and values from template slots
     */
    function getTemplateValues(concept, template) {

      var deferred = $q.defer();

      // full map of replacement values
      var nameValueMap = {};

      // get full target concepts
      getTargetSlotConcepts(concept).then(function (targetConcepts) {


        angular.forEach(template.lexicalTemplates, function (lt) {

          // find the matching relationship target slot by takeFSNFromSlot
          angular.forEach(concept.relationships, function (r) {

            // if a target slot with specified slot name
            if (r.targetSlot && r.targetSlot.slotName === lt.takeFSNFromSlot && r.target && r.target.conceptId) {

              var targetConcept = targetConcepts.filter(function (c) {
                return c.id === r.target.conceptId;
              })[0];
              var fsn = targetConcept.fsn;

              // determine value based on case signifiance
              switch (fsn.caseSignificance) {
                case 'ENTIRE_TERM_CASE_SENSITIVE' : // entire term case sensitive
                  nameValueMap[lt.name] = fsn.term;
                  break;
                case 'CASE_INSENSITIVE': // entire term case insensitive
                case 'INITIAL_CHARACTER_CASE_INSENSITIVE' : // initial character case insensitive
                  nameValueMap[lt.name] = fsn.term.substring(0, 1).toLowerCase() + fsn.term.substring(1);
                  break;
                default:
                  nameValueMap[lt.name] = '???';
              }
            }
          });
        });
        deferred.resolve(nameValueMap);
      }, function (error) {
        deferred.reject(error);
      });
      return deferred.promise;
    }

// function to populate concept FSNs from ids in templates
    function initializeTemplate(template) {

      var deferred = $q.defer();

      if (template.initialized) {
        deferred.resolve(template);
      } else {

        componentAuthoringUtil.setDefaultFields(template.conceptOutline);

        var conceptIds = [];
        var idConceptMap = {};

        angular.forEach(template.conceptOutline.relationships, function (r) {

          if (r.type.conceptId && conceptIds.indexOf(r.type.conceptId) === -1) {
            conceptIds.push(r.type.conceptId);
          }
          if (r.target.conceptId && conceptIds.indexOf(r.target.conceptId) === -1) {
            conceptIds.push(r.target.conceptId);
          }
        });

        // get FSNs for relationship types and targets
        snowowlService.bulkGetConcept(conceptIds, 'MAIN').then(function (concepts) {
            angular.forEach(concepts.items, function (c) {
              idConceptMap[c.id] = c;
            });
            angular.forEach(template.conceptOutline.relationships, function (r) {
              r.type.fsn = r.type && r.type.conceptId ? idConceptMap[r.type.conceptId].fsn.term : null;
              r.target.fsn = r.target && r.target.conceptId ? idConceptMap[r.target.conceptId].fsn.term : null;
              r.target.definitionStatus = r.target && r.target.conceptId ? idConceptMap[r.target.conceptId].definitionStatus : null;
            });
            template.initialized = true;
            deferred.resolve(template);
          },
          function (error) {
            deferred.reject('Error retrieving FSNs for template concepts: ' + error.message);
          });
      }
      return deferred.promise;
    }


    function createTemplateConcept(template, targetSlotMap, relAndDescMap) {
      var deferred = $q.defer();
      // check required arguments
      if (!template) {
        deferred.reject('Template error: invalid arguments');
      } else {

        // ensure template is initialized
        initializeTemplate(template).then(function () {


          // create concept from the concept template
          var tc = angular.copy(template.conceptOutline);

          // store template details against each component
          angular.forEach(tc.descriptions, function (d) {
            d.template = angular.copy(d);
            d.term = d.initialTerm;
          });
          angular.forEach(tc.relationships, function (r) {
            r.template = angular.copy(r);

            // if slot map provided, fill in target values
            if (r.targetSlot && targetSlotMap && targetSlotMap.hasOwnProperty(r.targetSlot.slotName)) {
              r.target.conceptId = targetSlotMap[r.targetSlot.slotName].conceptId;
              r.target.fsn = targetSlotMap[r.targetSlot.slotName].fsn;
            }
          });
          if(relAndDescMap && relAndDescMap !== undefined && relAndDescMap !== null){
              angular.forEach(relAndDescMap.descriptions, function (d) {
                // if description has a term then add to concept
                if (d.term) {
                    for(var i = tc.descriptions.length - 1; i >= 0; i--){
                        if(tc.descriptions[i].initialTerm === d.initialTerm){
                            tc.descriptions.splice(i, 1);
                        }
                    }
                    tc.descriptions.push(d);
                }
              });
          }
          // ensure all required fields are set
          componentAuthoringUtil.setDefaultFields(tc);

          // apply temporary UUIDs and template variables/flags
          tc.conceptId = snowowlService.createGuid();
          tc.template = template;
          tc.templateComplete = false;

          // by default, template concepts are Fully Defined
          if(template.conceptOutline.definitionStatus !== undefined)
              {
                  tc.definitionStatus = template.conceptOutline.definitionStatus;
              }
          else{
              tc.definitionStatus = 'PRIMITIVE';
          }
          if(template.conceptOutline.moduleId !== undefined)
              {
                  tc.moduleId = template.conceptOutline.moduleId;
              }
          if(relAndDescMap !== null && relAndDescMap !== undefined){
              for(var i = 0; i < tc.relationships.length; i++)
                  {
                      tc.relationships[i].target = relAndDescMap.relationships[i].target;
                  }
          }

          // assign sctids
          angular.forEach(tc.descriptions, function (d) {
            d.descriptionId = snowowlService.createGuid();
          });
          angular.forEach(tc.relationships, function (r) {
            r.relationshipId = snowowlService.createGuid();
          });

          // replace logical values
          replaceLogicalValues(tc).then(function () {
            // replace template values (i.e. to replace display $term-x with x
            replaceLexicalValues(tc, template).then(function () {
                getConceptNames(tc.relationships, currentTask).then(function(rels){
                    tc.relationships = rels;
                    angular.forEach(tc.descriptions, function (d) {
                        if(template.conceptOutline.moduleId !== undefined)
                          {
                              d.moduleId = template.conceptOutline.moduleId;
                          }
                      });
                      angular.forEach(tc.relationships, function (r) {
                        r.relationshipId = snowowlService.createGuid();
                          if(template.conceptOutline.moduleId !== undefined)
                          {
                              r.moduleId = template.conceptOutline.moduleId;
                          }
                      });
                    deferred.resolve(tc);
                })
            }, function (error) {
              deferred.reject(error);
            })
          }, function (error) {
            deferred.reject(error);
          })
        }, function (error) {
          deferred.reject('Error initializing template: ' + error);
        });
      }
      return deferred.promise;
    }

//
// Template functionality -- consider moving to templateUtility
//


    function clearTemplateStylesAndMessages(concept) {
      delete concept.templateMessages;
      angular.forEach(concept.descriptions, function (d) {
        delete d.templateStyle;
        delete d.templateMessages;
      });
      angular.forEach(concept.relationships, function (r) {
        delete r.templateStyle;
        delete r.templateMessages;
      });
    }


    function removeTemplateFromConcept(concept) {
      clearTemplateStylesAndMessages(concept);
      delete concept.template;
      angular.forEach(concept.descriptions, function (d) {
        delete d.template;
      });
      angular.forEach(concept.relationships, function (r) {
        delete r.template;
        delete r.targetSlot;
      });
    }
    
    function applyTemplateToExistingConcept(concept, template){
        var deferred = $q.defer();
        var conceptCopy = angular.copy(concept);
        conceptCopy.templateMessages = [];
        if(template.conceptOutline.definitionStatus !== undefined)
              {
                  conceptCopy.definitionStatus = template.conceptOutline.definitionStatus;
              }
          else{
              conceptCopy.definitionStatus = 'PRIMITIVE';
          }
        initializeTemplate(template).then(function () {
            concept.template = template;
            conceptCopy.template = template;
            componentAuthoringUtil.setDefaultFields(template);
            angular.forEach(conceptCopy.relationships, function (r) {
                r.relationshipId = snowowlService.isSctid(r.relationshipId) ? r.relationshipId : snowowlService.createGuid();
            });
            angular.forEach(template.conceptOutline.relationships, function (rt) {

              var matchFound = false;
              angular.forEach(conceptCopy.relationships, function (r) {

                // check for target slot
              if (rt.targetSlot && r.active && r.groupId === rt.groupId && r.type.conceptId === rt.type.conceptId) {
                  matchFound = true;
                  r.template = rt;
                  r.targetSlot = rt.targetSlot;
                }
              });
              if (!matchFound) {
                var newRel = angular.copy(rt);
                newRel.template = rt;
                conceptCopy.relationships.push(newRel);
              }
            });
            for (var i = conceptCopy.relationships.length - 1; i >= 0; i--) {
                if (conceptCopy.relationships[i].relationshipId !== null && conceptCopy.relationships[i].relationshipId !== undefined && conceptCopy.relationships[i].type !== 'INFERRED' && !conceptCopy.relationships[i].targetSlot) {
                    conceptCopy.relationships.splice(i, 1);
                }
            }
            var nameValueMap;
          var componentsToBeRemoved = [];
          getTemplateValues(conceptCopy, template).then(function (map) {
            nameValueMap = map;
            angular.forEach(template.conceptOutline.descriptions, function (dt) {
              var matchFound = false;
              angular.forEach(conceptCopy.descriptions, function (d) {
                // check by active/type/en-us acceptability
                if (d.active && d.type === dt.type && d.acceptabilityMap && dt.acceptabilityMap && d.acceptabilityMap['900000000000509007'] === dt.acceptabilityMap['900000000000509007']) {
                  // if term matches initial term, match found
                  if (d.term === dt.initialTerm) {
                    matchFound = true;
                    d.template = dt;
                  }

                  // otherwise, check for value match via pattern matching
                  else {
                    // replace slots with .*, escape special characters, and start/end terminate
                    var exp = dt.termTemplate.replace(/\$.*\$/, '.*');
                    exp = '^' + exp.replace(/([()[{$^\\|?])/g, '\\$1') + '$';


                    // if match found
                    if (d.term && d.term.match(exp)) {
                      matchFound = true;
                      d.template = dt;
                      var templateTerm = getDescriptionTemplateTermValue(dt, template, nameValueMap);
                      if (d.term !== templateTerm) {
                          d.term = templateTerm;

                      }
                    }
                      else{
                          if (d.type === 'FSN') {
                            d.term = d.term.replace(/\(([^)]*)\)[^(]*$/, '').trim();
                            componentsToBeRemoved.push(angular.copy(d));
                          }
                          if(d.type !== 'DEFINITION'){
                              d.acceptabilityMap['900000000000509007'] = 'ACCEPTABLE';
                              d.acceptabilityMap['900000000000508004'] = 'ACCEPTABLE';
                              d.type = 'SYNONYM';
                          }
                      }
                  }
                }
              });

              if (!matchFound) {
                
                var newDesc = angular.copy(dt);
                newDesc.descriptionId = snowowlService.createGuid();
                newDesc.term = getDescriptionTemplateTermValue(dt, template, nameValueMap);
                newDesc.template = dt;
                newDesc.templateMessages = [];
                conceptCopy.descriptions.push(newDesc);
              }
            });

        // Cycle all descriptions and remove any duplicated ones
            if (componentsToBeRemoved.length > 0) {
              angular.forEach(componentsToBeRemoved, function (item) {
                var count = 0;
                for (var i = conceptCopy.descriptions.length - 1; i >= 0; i--) {
                  var d = conceptCopy.descriptions[i];
                  if (!d.template 
                    && item.term === d.term
                    && item.lang === d.lang
                    && d.active
                    && d.type === 'SYNONYM') {
                    count++;
                    if (count > 1) {
                      conceptCopy.descriptions.splice(i, 1);
                    }                    
                  }
                }                
              });
            }
        // cycle over all descriptions -- no style flag means not in template

        // otherwise, flag as outside template
            angular.forEach(conceptCopy.descriptions, function (d) {
              if (d.active && d.type === 'FSN') {
                  concept.fsn = d.term;
              }
            });
            angular.forEach(conceptCopy.descriptions, function (d) {
                d.descriptionId = snowowlService.isSctid(d.descriptionId) ? d.descriptionId : snowowlService.createGuid();
            });
            angular.forEach(conceptCopy.relationships, function (r) {
                r.relationshipId = snowowlService.isSctid(r.relationshipId) ? r.relationshipId : snowowlService.createGuid();
            });

            componentAuthoringUtil.setDefaultFields(conceptCopy);
            replaceLogicalValues(conceptCopy).then(function () {
                replaceLexicalValues(conceptCopy, template).then(function () {
                      deferred.resolve(conceptCopy);
                    }, function (error) {
                      deferred.reject(error);
                    });
             });

          }, function (error) {
            deferred.reject('Could not compute target slot values: ' + error);
          });
        });
        
        return deferred.promise;
    }

    /**
     * Main Functionality -- take a concept and apply a template to it
     * (1) Appends template elements to each component, adds missing components
     * (2) Options: replace values, append user messages, apply conditional styling
     */
    function applyTemplateToConcept(concept, template, applyValues, applyMessages, applyStyles) {
      var deferred = $q.defer();

      // reset all template variables
      concept.templateMessages = [];
      if (!concept.conceptId) {
        concept.conceptId = snowowlService.createGuid();
      }
      concept.template = template;
      angular.forEach(concept.descriptions, function (d) {
        d.template = null;
        d.templateStyle = null;
        d.templateMessages = [];
        if (!d.descriptionId) {
          d.descriptionId = snowowlService.createGuid();
        }
      });
      angular.forEach(concept.relationships, function (r) {
        r.template = null;
        r.templateStyle = null;
        r.templateMessages = [];
        if (!r.relationshipId) {
          r.relationshipId = snowowlService.createGuid();
        }
      });

      // match relationships
      angular.forEach(template.conceptOutline.relationships, function (rt) {

          var matchFound = false;
          angular.forEach(concept.relationships, function (r) {

            // check for target slot
            if (rt.targetSlot && r.active && r.groupId === rt.groupId && r.type.conceptId === rt.type.conceptId) {
              matchFound = true;
              r.template = rt;
              if (applyStyles) {
                r.templateStyle = 'bluehl darken-2';
              }
              r.targetSlot = rt.targetSlot;


              // if target slot not filled, mark error
              if (applyMessages && !r.target.conceptId) {
                r.templateMessages.push({type: 'Error', message: 'Template target slot cannot be empty'});
              }
            }

            // otherwise, check specified target concept id
            else if (r.active && r.groupId === rt.groupId && r.type && rt.type && r.target && rt.target && r.type.conceptId === rt.type.conceptId && r.target.conceptId === rt.target.conceptId) {

              matchFound = true;
              r.template = rt;
              if (applyStyles) {
                r.templateStyle = 'tealhl';
              }

            }

          });
          if (!matchFound && applyValues) {

            var newRel = angular.copy(rt);
            newRel.template = rt;
            newRel.templateMessages = [];
            if (applyStyles) {
              newRel.templateStyle = 'tealhl';
            }
            if (applyMessages) {
              newRel.templateMessages.push({type: 'Message', message: 'Relationship automatically added by template'});
            }
            concept.relationships.push(newRel);

          }
        }
      );


      angular.forEach(concept.relationships, function (r) {
        if (r.active && !r.template) {
          if (applyStyles) {
            r.templateStyle = 'redhl';
          }
          if (applyMessages) {
            r.templateMessages.push({type: 'Error', message: 'Relationship not valid for template; please remove'});
          }
        }
      });

      // get the target slot name->value map and process descriptions
      var nameValueMap;
      getTemplateValues(concept, template).then(function (map) {
        nameValueMap = map;

// match descriptions
        angular.forEach(template.conceptOutline.descriptions, function (dt) {
          var matchFound = false;
          angular.forEach(concept.descriptions, function (d) {


            // check by active/type/en-us acceptability
            if (d.active && d.type === dt.type && d.acceptabilityMap && dt.acceptabilityMap && d.acceptabilityMap['900000000000509007'] === dt.acceptabilityMap['900000000000509007']) {
              // if term matches initial term, match found
              if (d.term === dt.initialTerm) {
                matchFound = true;
                d.template = dt;
                if (applyStyles) {
                  d.templateStyle = 'tealhl';
                }
              }

              // otherwise, check for value match via pattern matching
              else {
                // replace slots with .*, escape special characters, and start/end terminate
                var exp = dt.termTemplate.replace(/\$.*\$/, '.*');
                exp = '^' + exp.replace(/([()[{$^\\|?])/g, '\\$1') + '$';


                // if match found
                if (d.term && d.term.match(exp)) {
                  matchFound = true;
                  d.template = dt;
                  var templateTerm = getDescriptionTemplateTermValue(dt, template, nameValueMap);
                  if (d.term !== templateTerm) {
                    if (applyStyles) {
                      d.templateStyle = 'redhl';
                    }

                    // if apply values set, value will be replaced below, append warning
                    if (applyValues) {
                      d.term = templateTerm;
                      if (applyMessages) {
                        d.templateMessages.push({
                          type: 'Warning',
                          message: 'Description term updated to conform to template, previous term: ' + d.term
                        });
                      }
                    }

                    // otherwise, append error
                    else if (applyMessages) {
                      d.templateMessages.push({
                        type: 'Warning',
                        message: 'Description term does not conform to template, expected: ' + templateTerm
                      });
                    }
                  } else {
                    if (applyStyles) {
                      d.templateStyle = 'tealhl';
                    }
                  }

                }
              }
            }
          });

          if (!matchFound && applyValues) {
            var newDesc = angular.copy(dt);
            newDesc.descriptionId = snowowlService.createGuid();
            newDesc.term = getDescriptionTemplateTermValue(dt, template, nameValueMap);
            if (applyStyles) {
              newDesc.templateStyle = 'bluehl lighten-2';
            }
            newDesc.template = dt;
            newDesc.templateMessages = [];
            if (applyMessages) {
              newDesc.templateMessages.push({type: 'Message', message: 'Description automatically added by template'});
            }
            concept.descriptions.push(newDesc);
          }
        });

// cycle over all descriptions -- no style flag means not in template

// otherwise, flag as outside template
        angular.forEach(concept.descriptions, function (d) {
          if (d.active && !d.template) {
            if (applyStyles) {
              d.templateStyle = 'redhl';
            }

            d.templateMessages = [];
            if (applyMessages) {
              d.templateMessages.push({type: 'Error', message: 'Description not valid for template; please remove'});
            }
          }
        });

        componentAuthoringUtil.setDefaultFields(concept);


        if (applyValues) {
          concept = replaceLexicalValues(concept, template);
        }

// apply top-level messages
        if (applyMessages) {
          var msg = {type: 'Message', message: 'Template Concept Valid'};
          angular.forEach(concept.descriptions.concat(concept.relationships), function (component) {
            angular.forEach(component.templateMessages, function (tm) {
              // overwrite with highest severity
              if (tm.type === 'Error') {
                msg = {type: 'Error', message: 'Template Errors Found'};
              } else if (tm.type === 'Warning' && msg && msg.type !== 'Error') {
                msg = {type: 'Warning', message: 'Template Warnings Found'};
              }
            });
          });
          concept.templateMessages.push(msg);
        }


        deferred.resolve(concept);
      }, function (error) {
        deferred.reject('Could not compute target slot values: ' + error);
      });

      return deferred.promise;
    }

    function selectTemplate(template) {
      var deferred = $q.defer();
      if (!template) {
        selectedTemplate = null;
        deferred.resolve();
      } else {
        initializeTemplate(template).then(function (t) {
          selectedTemplate = t;
          deferred.resolve(selectedTemplate);
        });
      }
      return deferred.promise;
    }

    function getSelectedTemplate() {
      return selectedTemplate;
    }

    function clearSelectedTemplate() {
      selectedTemplate = null;
    }

    function isTemplateComplete(concept) {
      angular.forEach(concept.relationships, function (relationship) {
        if (relationship.targetSlot && !relationship.target.conceptId) {
          return false;
        }
      });
      return true;
    }

//
// Template "flagging" functions to track active templates across sessions
// NOTE: In absence of traceability or similar service, "faking" this with shared UI State
//

// add concept to project master list (intended as reference for what concepts were created by what templates)
    function logTemplateConceptSave(projectKey, conceptId, fsn, template) {
      var deferred = $q.defer();
      scaService.getSharedUiStateForTask(projectKey, 'project-template-store', 'template-concept-list').then(function (list) {
        var newList = list ? list : [];
        var item = {
          conceptId: conceptId,
          fsn: fsn,
          templateName: template.name,
          templateVersion: template.version,
          saveDate: new Date().getTime()
        };
        newList.push(item);
        scaService.saveSharedUiStateForTask(projectKey, 'project-template-store', 'template-concept-list', newList).then(function () {
          deferred.resolve();
        }, function (error) {
          deferred.reject('UI State Error: ' + error.message);
        });
      });
      return deferred.promise;
    }

    function bulkLogTemplateConceptSave(projectKey, concepts, template) {
      var deferred = $q.defer();
      scaService.getSharedUiStateForTask(projectKey, 'project-template-store', 'template-concept-list').then(function (list) {
        var newList = list ? list : [];
        angular.forEach(concepts, function(c) {
          var item = {
            conceptId: c.conceptId, 
            fsn: c.fsn,        
            templateName: template.name,
            templateVersion: template.version,
            saveDate: new Date().getTime()
          };
          newList.push(item);
        });
        
        scaService.saveSharedUiStateForTask(projectKey, 'project-template-store', 'template-concept-list', newList).then(function () {
          deferred.resolve();
        }, function (error) {
          deferred.reject('UI State Error: ' + error.message);
        });
      });
      return deferred.promise;
    }

    function storeTemplateForConcept(projectKey, conceptId, template) {
      var deferred = $q.defer();
      scaService.saveSharedUiStateForTask(projectKey, 'project-template-store', 'template-concept-' + conceptId, template).then(function () {
        deferred.resolve();
      }, function (error) {
        deferred.reject('Shared UI-State Error: ' + error.message);
      });
      return deferred.promise;
    }

    function removeStoredTemplateForConcept(projectKey, conceptId) {
      var deferred = $q.defer();
      scaService.deleteSharedUiStateForTask(projectKey, 'project-template-store', 'template-concept-' + conceptId).then(function () {
        deferred.resolve();
      }, function (error) {
        deferred.reject('Shared UI-State Error: ' + error.message);
      });
      return deferred.promise;
    }

    function getStoredTemplateForConcept(projectKey, conceptId) {
      var deferred = $q.defer();
      scaService.getSharedUiStateForTask(projectKey, 'project-template-store', 'template-concept-' + conceptId).then(function (template) {
        deferred.resolve(template);
      }, function (error) {
        deferred.reject('Shared UI-State Error: ' + error.message);
      });
      return deferred.promise;
    }

    function relationshipInLogicalModel(relationship, template) {
      if (!template) {
        return false;
      }
      for (var i = 0; i < template.conceptOutline.relationships.length; i++) {
        var r = template.conceptOutline.relationships[i];

        // if active, group, type match, and either target slot OR target matches
        if (relationship.active && r.groupId === relationship.groupId &&
          r.type.conceptId === relationship.type.conceptId &&
          (r.targetSlot || r.target.conceptId === relationship.target.conceptId)) {
          return true;
        }

      }
      return false;

    }

    function relationshipHasTargetSlot(relationship, template) {

      if (!template) {
        return false;
      }

      for (var i = 0; i < template.conceptOutline.relationships.length; i++) {
        var r = template.conceptOutline.relationships[i];
        if (relationship.active && r.targetSlot && r.targetSlot.slotName && r.groupId === relationship.groupId && r.type.conceptId === relationship.type.conceptId) {
          return true;
        }
      }
      return false;
    }

    function isNumeric(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    }

    function sortTemplatesByName(a,b) {
      var nameA = a.name.toUpperCase(); // ignore upper and lowercase
      var nameB = b.name.toUpperCase(); // ignore upper and lowercase

      var nameA_Arr = nameA.split("-");
      var nameB_Arr = nameB.split("-");
      if(nameA_Arr.length > 0 && nameB_Arr.length > 0) {
        for (var i = 0 ; i < nameA_Arr.length; i++) {
          if(typeof nameA_Arr[i] !== 'undefined' && typeof nameB_Arr[i] !== 'undefined') {
            if(isNumeric(nameA_Arr[i].trim()) && isNumeric(nameB_Arr[i].trim())) {                                
              if(Number(nameA_Arr[i]) < Number(nameB_Arr[i])) return -1;
              if(Number(nameA_Arr[i]) > Number(nameB_Arr[i])) return 1;  
            } else {
              if (nameA_Arr[i] < nameB_Arr[i]) return -1;
              if (nameA_Arr[i] > nameB_Arr[i]) return 1;
            }
          }                                      
        }
      }

      if (nameA_Arr.length < nameB_Arr.length) return -1;
      if (nameA_Arr.length > nameB_Arr.length) return 1;
      
      // names must be equal
      return 0;
    }


//
// Exposed functions
//
    function getTemplates(refreshCache, parentIds, branch) {
      var deferred = $q.defer();
      if (!templateCache || refreshCache) {
        if(!parentIds || typeof parentIds === 'undefined' || parentIds.length === 0)
            {
                $http.get(apiEndpoint + 'templates').then(function (response) {
                  templateCache = response.data;
                  templateCache.sort(function(a, b){
                    return sortTemplatesByName(a, b);
                  });
                  deferred.resolve(templateCache);
                }, function (error) {
                  deferred.reject('Failed to retrieve templates: ' + error.message);
                });
            }
        else{
            $http.get(apiEndpoint + branch + '/templates?descendantOf=' + parentIds + '&ancestorOf=' + parentIds).then(function (response) {
              deferred.resolve(response.data.sort(function(a, b){ return sortTemplatesByName(a, b)}));
            }, function (error) {
              deferred.reject('Failed to retrieve templates: ' + error.message);
            });
        }
        
      } else {
        deferred.resolve(templateCache);
      }
      return deferred.promise;
    }

    function getTemplateForName(name, refreshCache) {
      var deferred = $q.defer();

      getTemplates(refreshCache).then(function (templates) {
        var tf = templates.filter(function (t) {
          return t.name === name;
        });
        if (tf.length === 1) {
          deferred.resolve(tf[0]);
        } else if (tf.length > 1) {
          deferred.reject('Multiple templates for name: ' + name);
        } else {
          deferred.reject('No template for name: ' + name);
        }
      }, function (error) {
        deferred.reject('Could not get templates: ' + error);
      });
      return deferred.promise;
    }

    function createTemplate(template) {
      var deferred = $q.defer();
      if (!template || !template.name) {
        deferred.reject('Template or template name not specified');
      } else {

        $http.post(apiEndpoint + 'templates?name=' + encodeURIComponent(template.name), template).then(function (response) {
          getTemplates(true).then(function () {
            if (templateCache.filter(function (t) {
                return t.name === template.name;
              }).length === 0) {
              deferred.reject('Template creation reported successful, but not present in refreshed cache');
            } else {
              deferred.resolve(templateCache);
            }
          }, function (error) {
            deferred.reject('Template creation reported successful, but could not refresh template cache: ' + error.message);
          });
        }, function (error) {
          deferred.reject('Failed to create template: ' + error.message);
        });
      }
      return deferred.promise;
    }


    function updateTemplate(template) {
      var deferred = $q.defer();
      if (!template || !template.name) {
        deferred.reject('Template or template name not specified');
      } else if (templateCache.filter(function (t) {
          return t.name === template.name;
        }).length === 0) {
        deferred.reject('Update called, but template not in cache');
      } else {

        var version = template.version;
        $http.put(apiEndpoint + 'templates/' + encodeURIComponent(template.name), template).then(function (response) {
          getTemplates(true).then(function () {
            if (templateCache.filter(function (t) {
                return t.name === template.name && t.version === template.version;
              }).length > 0) {
              deferred.reject('Template update reported successful, but version not updated');
            } else {
              deferred.resolve(response.data);
            }
          }, function (error) {
            deferred.reject('Template update reported successful, but could not refresh template cache: ' + error.message);
          });
        }, function (error) {
          deferred.reject('Failed to update template: ' + error.message);
        });
      }
      return deferred.promise;
    }

    function setTask(task) {
      currentTask = task;
    }
    
    function downloadTemplateCsv(branch, template) {
        return $http({
          'method': 'GET',
            //replace with task level branch path - working around BE bug
          'url': apiEndpoint + branch + '/templates/' + window.encodeURIComponent(template).replace('%2F', '%252F') + '/empty-input-file'
          
        }).then(function (response) {
          return response;
        });
      }
    
    function uploadTemplateCsv(branch, template, file) {
        var deferred = $q.defer();
        $http.post(apiEndpoint + branch + '/templates/' + window.encodeURIComponent(template).replace('%2F', '%252F') + '/generate', file, {
        withCredentials: true,
        headers: {'Content-Type': undefined },
        transformRequest: angular.identity
        }).then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }


    return {

      // task initialization
      setTask: setTask,

      // Template CRUD functions
      getTemplates: getTemplates,
      getTemplateForName: getTemplateForName,
      searchByTemplate: searchByTemplate,
      createTemplate: createTemplate,
      updateTemplate: updateTemplate,

      // global template selection
      selectTemplate: selectTemplate,
      getSelectedTemplate: getSelectedTemplate,
      clearSelectedTemplate: clearSelectedTemplate,

      // Template application functions
      createTemplateConcept: createTemplateConcept,
      applyTemplateToExistingConcept: applyTemplateToExistingConcept,
      applyTemplateToConcept: applyTemplateToConcept,
      removeTemplateFromConcept: removeTemplateFromConcept,
      clearTemplateStylesAndMessages: clearTemplateStylesAndMessages,
      updateTargetSlot: updateTargetSlot,

      // utility functions
      isTemplateComplete: isTemplateComplete,
      relationshipHasTargetSlot: relationshipHasTargetSlot,
      relationshipInLogicalModel: relationshipInLogicalModel,

      // template-flagging
      storeTemplateForConcept: storeTemplateForConcept,
      removeStoredTemplateForConcept: removeStoredTemplateForConcept,
      getStoredTemplateForConcept: getStoredTemplateForConcept,
      logTemplateConceptSave: logTemplateConceptSave,
      bulkLogTemplateConceptSave: bulkLogTemplateConceptSave,
        
      // batch functions
      downloadTemplateCsv: downloadTemplateCsv,
      uploadTemplateCsv: uploadTemplateCsv,
      transform: transform
    };

  })
;
