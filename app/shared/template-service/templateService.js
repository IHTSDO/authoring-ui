'use strict';

angular.module('singleConceptAuthoringApp')
  /**
   * Handles Authoring Template retrieval and functionality
   */
  .service('templateService', function ($http, $rootScope, $q, scaService, terminologyServerService, componentAuthoringUtil, $interval, $filter) {

    var apiEndpoint = '../template-service/';

    var exclusionList = [];

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

    function searchByTemplate(templateName, branch, stated, model) {
      let statedFlag = true;
      let logical = '';
      let lexical = '';
      if (stated === 'inferred') {
        statedFlag = false;
      }
      if (model === 'logical') {
        logical = 'true';
        lexical = '';
      }
      else if (model === 'logical!lexical') {
        logical = 'true';
        lexical = 'false';
      }
      else {
        logical = 'true';
        lexical = 'true';
      }
      var deferred = $q.defer();
      $http.get(apiEndpoint + branch + '/templates/concept-search?templateName=' + encodeURIComponent(templateName) +'&lexicalMatch=' + lexical + '&logicalMatch=' + logical + '&stated=' + statedFlag).then(function (idList) {
        deferred.resolve(idList);
      }, function (error) {
        deferred.reject('Failed to retrieve template concepts: ' + (error.message ? error.message : error.status + ' ' + error.statusText));
      });
      return deferred.promise;
    }

    function transform(branch, source, target, reason, concepts, logical, lexical) {
      var deferred = $q.defer();
      let body = {
        "conceptsToTransform": concepts,
        "inactivationReason": reason,
        "sourceTemplate": source.name,
        "destinationTemplate": target.name,
        "lexicalTransform": lexical,
        "logicalTransform": logical
      }

      $http.post(apiEndpoint + branch + '/templates/transform', body).then(function (response) {
        let id = response.headers('location');
        id = id.substring(id.lastIndexOf("/") + 1);
        let transformStatus = $interval(function () {
          $http.get(apiEndpoint + 'templates/transform/' + id).then(function (response) {
            if (response.data.status === 'COMPLETED') {
              $http.get(apiEndpoint + 'templates/transform/' + id + '/results/').then(function (results) {
                angular.forEach(results.data.concepts, function (result) {
                  result.template = target;
                  angular.forEach(result.classAxioms, function (axiom) {
                    angular.forEach(axiom.relationships, function (rel) {
                      if (rel.type.moduleId) {
                        delete rel.type.moduleId;
                      }
                      if (rel.type.definitionStatus) {
                        delete rel.type.definitionStatus;
                      }
                      if (!rel.relationshipId) {
                        rel.relationshipId = terminologyServerService.createGuid();
                      }
                      rel.type.pt = rel.type.pt.term;
                      rel.target.fsn = rel.target.fsn.term;
                    });
                  });

                  angular.forEach(result.descriptions, function (desc) {
                    if (!desc.descriptionId) {
                      desc.descriptionId = terminologyServerService.createGuid();
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
                angular.forEach(results.data.concepts, function (result) {
                  result.template = target;
                  angular.forEach(result.classAxioms, function (axiom) {
                    angular.forEach(result.relationships, function (rel) {
                      if (rel.type.moduleId) {
                        delete rel.type.moduleId;
                      }
                      if (rel.type.definitionStatus) {
                        delete rel.type.definitionStatus;
                      }
                      if (!rel.relationshipId) {
                        rel.relationshipId = terminologyServerService.createGuid();
                      }
                      rel.type.pt = rel.type.pt.term;
                      rel.target.fsn = rel.target.fsn.term;
                    });
                  });
                  angular.forEach(result.descriptions, function (desc) {
                    if (!desc.descriptionId) {
                      desc.descriptionId = terminologyServerService.createGuid();
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
        deferred.reject('Failed to retrieve template concepts: ' + (error.message ? error.message : error.status + ' ' + error.statusText));
      });
      return deferred.promise;
    }

    function getSlotValue(slotName, template, nameValueMap) {
      if (template.additionalSlots && template.additionalSlots.indexOf(slotName) !== -1) {
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
        for (var i = 0; i < concept.classAxioms[0].relationships.length; i++) {
          var r = concept.classAxioms[0].relationships[i];
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
      angular.forEach(concept.classAxioms, function (axiom) {
        angular.forEach(axiom.relationships, function (relationship) {
          if (relationship.template && relationship.template.targetSlot && relationship.template.targetSlot.slotName) {
            promises.push(replaceLogicalValuesForRelationship(concept, relationship));
          }
        });
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

      angular.forEach(relationships, function (rel) {
        if (rel.target.conceptId !== null) {
          conceptIds.push(rel.target.conceptId);
        }
      });

      // skip if no concept ids
      if (conceptIds.length > 0) {

        // bulk call for concept ids
        terminologyServerService.bulkGetConceptUsingPOST(conceptIds, currentTask.branchPath).then(function (concepts) {
          angular.forEach(concepts.items, function (concept) {
            angular.forEach(relationships, function (rel) {
              if (concept.id === rel.target.conceptId) {
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

    function replaceLexicalValues(concept, template, branch, skipApplyingTemplateToConcept) {
      var deferred = $q.defer();
      let templeteConceptComplete = isTemplateComplete(concept);
      if (!templeteConceptComplete) {
        deferred.resolve(concept);
      } else {
        var copiedConcept = angular.copy(concept);
        terminologyServerService.cleanConcept(copiedConcept);
        transformConceptToTemplate(branch, template, copiedConcept).then(function (response) {
          concept.descriptions = angular.copy(response.descriptions);
          angular.forEach(concept.descriptions, function (d) {
            if (!d.released && terminologyServerService.isSctid(d.descriptionId)) {
              delete d.descriptionId;
            }
          });
          if (response.fsn) {
            concept.fsn = response.fsn;
          } else {
            angular.forEach(concept.descriptions, function (d) {
              if (d.active && d.type === 'FSN') {
                concept.fsn = d.term;
                return;
              }
            });
          }

          concept.definitionStatus = response.definitionStatus;
          if (concept.classAxioms && concept.classAxioms.length !== 0) {
            let definedAxiom = false;
            angular.forEach(concept.classAxioms, function(axiom){
                if(axiom.definitionStatus === 'FULLY_DEFINED'){
                    definedAxiom = true;
                }
            });
            if (concept.definitionStatus === 'FULLY_DEFINED' && !definedAxiom) {
              concept.classAxioms[0].definitionStatus = concept.definitionStatus;
            }
            else if (concept.definitionStatus === 'PRIMITIVE' && definedAxiom) {
              angular.forEach(concept.classAxioms, function(axiom){
                axiom.definitionStatus = concept.definitionStatus;
              });
            }
            else {
              // do nothing
            }
          }
          if (!skipApplyingTemplateToConcept) {
            applyTemplateToConcept(concept, template);
          }
          deferred.resolve(concept);
        });
      }

      return deferred.promise;
    }

    function updateTargetSlot(branch, concept, template, relationship) {
      var deferred = $q.defer();

      replaceLogicalValuesForRelationship(concept, relationship).then(function () {
        replaceLexicalValues(concept, template, branch).then(function () {
          deferred.resolve(concept);
        }, function (error) {
          deferred.reject(error);
        });
      }, function (error) {
        deferred.reject(error);
      });
      return deferred.promise;
    }


    function transformConceptToTemplate(branch, destinationTemplate, conceptToTransform) {
      var deferred = $q.defer();
      if (!branch || !destinationTemplate || !conceptToTransform) {
        deferred.reject('Invalid arguments');
      }
      angular.forEach(conceptToTransform.classAxioms[0].relationships, function (r) {
        r.type.fsn = { "term": r.type.fsn };
        r.target.fsn = { "term": r.target.fsn };
        r.type.pt = { "term": r.type.pt };
        r.target.pt = { "term": r.target.pt };
      });
      conceptToTransform.descriptions = [];
      $http.post(apiEndpoint + branch + '/templates/transform/concept?destinationTemplate=' + encodeURI(destinationTemplate.name), conceptToTransform).then(function (response) {
        deferred.resolve(response.data);
      }, function (error) {
        deferred.reject('Failed to retrieve template concepts: ' + (error.message ? error.message : error.status + ' ' + error.statusText));
      });
      return deferred.promise;
    }

    function getTargetSlotConcepts(concept) {
      var deferred = $q.defer();
      var conceptIds = [];
      angular.forEach(concept.classAxioms, function (axiom) {
        angular.forEach(axiom.relationships, function (r) {
          if (r.targetSlot && r.target !== undefined && r.target.conceptId) {
            conceptIds.push(r.target.conceptId);
          }
        });
      });

      if (conceptIds.length > 0) {
        terminologyServerService.bulkRetrieveFullConcept(conceptIds, currentTask.branchPath).then(function (response) {
          deferred.resolve(response);
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
          angular.forEach(concept.classAxioms, function (axiom) {
            angular.forEach(axiom.relationships, function (r) {

              // if a target slot with specified slot name
              if (r.targetSlot && r.targetSlot.slotName === lt.takeFSNFromSlot && r.target && r.target.conceptId) {

                var targetConcept = targetConcepts.filter(function (c) {
                  return c.conceptId === r.target.conceptId;
                })[0];
                var fsn = targetConcept.descriptions.filter(function (description) {
                  return description.active === true && description.term === targetConcept.fsn;
                })[0];

                // determine value based on case signifiance
                switch (fsn.caseSignificance) {
                  case 'ENTIRE_TERM_CASE_SENSITIVE': // entire term case sensitive
                    nameValueMap[lt.name] = fsn.term;
                    break;
                  case 'CASE_INSENSITIVE': // entire term case insensitive
                  case 'INITIAL_CHARACTER_CASE_INSENSITIVE': // initial character case insensitive
                    nameValueMap[lt.name] = fsn.term.substring(0, 1).toLowerCase() + fsn.term.substring(1);
                    break;
                  default:
                    nameValueMap[lt.name] = '???';
                }
              }
            });
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

        angular.forEach(template.conceptOutline.classAxioms[0].relationships, function (r) {

          if (r.type && r.type.conceptId && conceptIds.indexOf(r.type.conceptId) === -1) {
            conceptIds.push(r.type.conceptId);
          }
          if (r.target && r.target.conceptId && conceptIds.indexOf(r.target.conceptId) === -1) {
            conceptIds.push(r.target.conceptId);
          }
        });

        // get FSNs for relationship types and targets
        terminologyServerService.bulkGetConceptUsingPOST(conceptIds, 'MAIN').then(function (concepts) {
          angular.forEach(concepts.items, function (c) {
            idConceptMap[c.id] = c;
          });
          angular.forEach(template.conceptOutline.classAxioms[0].relationships, function (r) {
            if (typeof r.active === 'undefined') {
              r.active = true;
            }
            r.type.pt = r.type && r.type.conceptId ? idConceptMap[r.type.conceptId].pt.term : null;
            r.type.fsn = r.type && r.type.conceptId ? idConceptMap[r.type.conceptId].fsn.term : null;
            if (!r.target) {
              r.target = {};
              r.target.conceptId = null;
            }
            r.target.fsn = r.target && r.target.conceptId ? idConceptMap[r.target.conceptId].fsn.term : null;
            r.target.pt = r.target && r.target.conceptId ? idConceptMap[r.target.conceptId].pt.term : null;
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


    function createTemplateConcept(template, targetSlotMap, relAndDescMap, branch) {
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
          if (typeof tc.classAxioms === "undefined") {
            tc.classAxioms = [];
            tc.classAxioms.push(componentAuthoringUtil.getNewAxiom(true));
          }

          angular.forEach(tc.classAxioms, function (a) {
            angular.forEach(a.relationships, function (r) {
              r.template = angular.copy(r);
              // if slot map provided, fill in target values
              if (r.targetSlot && targetSlotMap && targetSlotMap.hasOwnProperty(r.targetSlot.slotName)) {
                r.target.conceptId = targetSlotMap[r.targetSlot.slotName].conceptId;
                r.target.fsn = targetSlotMap[r.targetSlot.slotName].fsn;
              }
            });
          });
          if (relAndDescMap && relAndDescMap !== undefined && relAndDescMap !== null) {
            angular.forEach(relAndDescMap.descriptions, function (d) {
              // if description has a term then add to concept
              if (d.term) {
                for (var i = tc.descriptions.length - 1; i >= 0; i--) {
                  if (tc.descriptions[i].initialTerm === d.initialTerm) {
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
          tc.conceptId = terminologyServerService.createGuid();
          tc.template = template;
          tc.templateComplete = false;

          // by default, template concepts are Fully Defined
          if (template.conceptOutline.definitionStatus !== undefined) {
            tc.definitionStatus = template.conceptOutline.definitionStatus;
            tc.classAxioms[0].definitionStatus = template.conceptOutline.definitionStatus;
          }
          else {
            tc.definitionStatus = 'PRIMITIVE';
            tc.classAxioms[0].definitionStatus = 'PRIMITIVE';
          }

          if (typeof template.conceptOutline.moduleId !== 'undefined') {
            tc.moduleId = template.conceptOutline.moduleId;
          }

          if (relAndDescMap !== null && relAndDescMap !== undefined) {
            // remove optional attributes if no value provide
            tc.classAxioms[0].relationships = tc.classAxioms[0].relationships.filter(function(tcRel) {
              if (!isOptionalAttribute(tcRel)) {
                return true;
              }

              for (var i = 0; i < relAndDescMap.classAxioms[0].relationships.length; i++) {
                let rel = relAndDescMap.classAxioms[0].relationships[i];
                if (typeof tcRel.targetSlot !== 'undefined'
                  && typeof rel.targetSlot !== 'undefined'
                  && tcRel.targetSlot.slotName === rel.targetSlot.slotName
                  && typeof rel.target !== 'undefined'
                  && typeof rel.target.conceptId !== 'undefined')
                  return true
              }

              return false;
            });

            for (var i = 0; i < tc.classAxioms[0].relationships.length; i++) {
              tc.classAxioms[0].relationships[i].target = relAndDescMap.classAxioms[0].relationships[i].target;
            }
          }

          // assign sctids
          angular.forEach(tc.descriptions, function (d) {
            d.descriptionId = terminologyServerService.createGuid();
          });
          angular.forEach(tc.classAxioms, function (a) {
            a.axiomId = terminologyServerService.createGuid();
            angular.forEach(a.relationships, function (r) {
              r.relationshipId = terminologyServerService.createGuid();
            })
          });

          // replace logical values
          replaceLogicalValues(tc).then(function () {
            // replace template values (i.e. to replace display $term-x with x
            replaceLexicalValues(tc, template, branch).then(function () {
              getConceptNames(tc.classAxioms[0].relationships, currentTask).then(function (rels) {
                tc.classAxioms[0].relationships = rels;
                angular.forEach(tc.descriptions, function (d) {
                  if (typeof template.conceptOutline.moduleId !== 'undefined') {
                    d.moduleId = template.conceptOutline.moduleId;
                  }
                });
                angular.forEach(tc.classAxioms, function (axiom) {
                  if (typeof template.conceptOutline.moduleId !== 'undefined') {
                    axiom.moduleId = template.conceptOutline.moduleId;
                  }
                  angular.forEach(axiom.relationships, function (r) {
                    r.relationshipId = terminologyServerService.createGuid();
                    if (typeof template.conceptOutline.moduleId !== 'undefined') {
                      r.moduleId = template.conceptOutline.moduleId;
                    }
                  });
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
      angular.forEach(concept.classAxioms, function (a) {
        angular.forEach(a.relationships, function (r) {
          delete r.templateStyle;
          delete r.templateMessages;
        });
      });
    }


    function removeTemplateFromConcept(concept) {
      clearTemplateStylesAndMessages(concept);
      delete concept.template;
      angular.forEach(concept.descriptions, function (d) {
        delete d.template;
      });
      angular.forEach(concept.classAxioms, function (a) {
        angular.forEach(a.relationships, function (r) {
          delete r.template;
          delete r.targetSlot;
        });
      });
    }

    function applyTemplateToExistingConcept(concept, template, branch) {
      var deferred = $q.defer();
      var conceptCopy = angular.copy(concept);
      conceptCopy.templateMessages = [];
      if (template.conceptOutline.definitionStatus !== undefined) {
        conceptCopy.definitionStatus = template.conceptOutline.definitionStatus;
        conceptCopy.classAxioms[0].definitionStatus = template.conceptOutline.definitionStatus;
      }
      else {
        conceptCopy.definitionStatus = 'PRIMITIVE';
        conceptCopy.classAxioms[0].definitionStatus = 'PRIMITIVE';
      }

      initializeTemplate(template).then(function () {
        concept.template = template;
        conceptCopy.template = template;
        componentAuthoringUtil.setDefaultFields(template);
        angular.forEach(concept.classAxioms, function (axiom) {
          angular.forEach(axiom.relationships, function (r) {
            r.relationshipId = terminologyServerService.isSctid(r.relationshipId) ? r.relationshipId : terminologyServerService.createGuid();
          });
          angular.forEach(template.conceptOutline.classAxioms[0].relationships, function (rt) {
            var matchFound = false;
            axiom.matches = 0;
            angular.forEach(axiom.relationships, function (r) {
              if (rt.targetSlot && r.active && r.groupId === rt.groupId && r.type.conceptId === rt.type.conceptId) {
                matchFound = true;
              }
              axiom.matches++;
            });
          });
        });

        concept.classAxioms = $filter('orderBy')(concept.classAxioms, 'matches')
        concept.classAxioms = [concept.classAxioms.slice(-1)[0]];
        delete concept.gciAxioms;

        angular.forEach(conceptCopy.classAxioms[0].relationships, function (r) {
          r.relationshipId = terminologyServerService.isSctid(r.relationshipId) ? r.relationshipId : terminologyServerService.createGuid();
        });
        angular.forEach(template.conceptOutline.classAxioms[0].relationships, function (rt) {

          var matchFound = false;
          angular.forEach(conceptCopy.classAxioms[0].relationships, function (r) {

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
            conceptCopy.classAxioms[0].relationships.push(newRel);
          }
        });
        for (var i = conceptCopy.classAxioms[0].relationships.length - 1; i >= 0; i--) {
          if (conceptCopy.classAxioms[0].relationships[i].relationshipId !== null && conceptCopy.classAxioms[0].relationships[i].relationshipId !== undefined && conceptCopy.classAxioms[0].relationships[i].type !== 'INFERRED' && !conceptCopy.classAxioms[0].relationships[i].targetSlot) {
            conceptCopy.classAxioms[0].relationships.splice(i, 1);
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
                  else {
                    if (d.type === 'FSN') {
                      d.term = d.term.replace(/\(([^)]*)\)[^(]*$/, '').trim();
                      componentsToBeRemoved.push(angular.copy(d));
                    }
                    if (d.type !== 'DEFINITION') {
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
              newDesc.descriptionId = terminologyServerService.createGuid();
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
            d.descriptionId = terminologyServerService.isSctid(d.descriptionId) ? d.descriptionId : terminologyServerService.createGuid();
          });
          angular.forEach(conceptCopy.classAxioms[0].relationships, function (r) {
            r.relationshipId = terminologyServerService.isSctid(r.relationshipId) ? r.relationshipId : terminologyServerService.createGuid();
          });

          componentAuthoringUtil.setDefaultFields(conceptCopy);
          replaceLogicalValues(conceptCopy).then(function () {
            replaceLexicalValues(conceptCopy, template, branch).then(function () {
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
    function applyTemplateToConcept(concept, template, applyValues, applyMessages, applyStyles, branch) {
      var deferred = $q.defer();

      // re-calculate groupId if any group has been removed
      if (template.removedGroupIds && template.removedGroupIds.length !== 0 && terminologyServerService.isSctid(concept.conceptId)) {
        template.conceptOutline.classAxioms[0].relationships = template.conceptOutline.classAxioms[0].relationships.filter(function(rel) {
          return !template.removedGroupIds.includes(rel.groupId);
        });       

        // re-calculate groupId
        var groupIds = [];
        for (let i = 0; i < template.conceptOutline.classAxioms[0].relationships.length; i++) {
          var groupId = template.conceptOutline.classAxioms[0].relationships[i].groupId;
          if (!groupIds.includes(groupId)) {
            groupIds.push(groupId);
          }
        }
        groupIds.sort(function (a, b) {
          return parseInt(a) - parseInt(b);
        });
       
        angular.forEach(template.conceptOutline.classAxioms[0].relationships, function(rel) {
          var index = groupIds.indexOf(rel.groupId);
          rel.newGroupId = index;
        });
      }

      // reset all template variables
      concept.templateMessages = [];
      if (!concept.conceptId) {
        concept.conceptId = terminologyServerService.createGuid();
      }
      concept.template = template;
      angular.forEach(concept.descriptions, function (d) {
        d.template = null;
        d.templateStyle = null;
        d.templateMessages = [];
        if (!d.descriptionId) {
          d.descriptionId = terminologyServerService.createGuid();
        }
      });
      angular.forEach(concept.classAxioms, function (axiom) {
        angular.forEach(axiom.relationships, function (r) {
          r.template = null;
          r.templateStyle = null;
          r.templateMessages = [];
          if (!r.relationshipId) {
            r.relationshipId = terminologyServerService.createGuid();
          }
        });
      });

      // match relationships
      angular.forEach(template.conceptOutline.classAxioms[0].relationships, function (rt) {

        var matchFound = false;
        angular.forEach(concept.classAxioms[0].relationships, function (r) {

          // check for target slot
          if (rt.targetSlot && r.active && (rt.newGroupId ? rt.newGroupId === r.groupId : r.groupId === rt.groupId) && r.type.conceptId === rt.type.conceptId) {
            matchFound = true;
            r.template = rt;
            if (applyStyles) {
              r.templateStyle = 'bluehl darken-2';
            }
            r.targetSlot = rt.targetSlot;


            // if target slot not filled, mark error
            if (applyMessages && !r.target.conceptId) {
              r.templateMessages.push({ type: 'Error', message: 'Template target slot cannot be empty' });
            }
          }

          // otherwise, check specified target concept id
          else if (r.active && (rt.newGroupId ? rt.newGroupId === r.groupId : r.groupId === rt.groupId) && r.type && rt.type && r.target && rt.target && r.type.conceptId === rt.type.conceptId && r.target.conceptId === rt.target.conceptId) {

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
            newRel.templateMessages.push({ type: 'Message', message: 'Relationship automatically added by template' });
          }
          concept.classAxioms[0].relationships.push(newRel);
        }
      }
      );


      angular.forEach(concept.classAxioms[0].relationships, function (r) {
        if (r.active && !r.template) {
          if (applyStyles) {
            r.templateStyle = 'redhl';
          }
          if (applyMessages) {
            r.templateMessages.push({ type: 'Error', message: 'Relationship not valid for template; please remove' });
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
            newDesc.descriptionId = terminologyServerService.createGuid();
            newDesc.term = getDescriptionTemplateTermValue(dt, template, nameValueMap);
            if (applyStyles) {
              newDesc.templateStyle = 'bluehl lighten-2';
            }
            newDesc.template = dt;
            newDesc.templateMessages = [];
            if (applyMessages) {
              newDesc.templateMessages.push({ type: 'Message', message: 'Description automatically added by template' });
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
              d.templateMessages.push({ type: 'Error', message: 'Description not valid for template; please remove' });
            }
          }
        });

        componentAuthoringUtil.setDefaultFields(concept);


        //if (applyValues) {
        //  concept = replaceLexicalValues(concept, template, branch);
        //}

        // apply top-level messages
        if (applyMessages) {
          var msg = { type: 'Message', message: 'Template Concept Valid' };
          angular.forEach(concept.descriptions.concat(concept.classAxioms[0].relationships), function (component) {
            angular.forEach(component.templateMessages, function (tm) {
              // overwrite with highest severity
              if (tm.type === 'Error') {
                msg = { type: 'Error', message: 'Template Errors Found' };
              } else if (tm.type === 'Warning' && msg && msg.type !== 'Error') {
                msg = { type: 'Warning', message: 'Template Warnings Found' };
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
        initializeTemplate(angular.copy(template)).then(function (t) {
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
      for (var i = 0; i < concept.classAxioms[0].relationships.length; i++) {
        var relationship = concept.classAxioms[0].relationships[i];
        if (relationship.targetSlot && !relationship.target.conceptId) {
          return false;
        }
      }

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
        angular.forEach(concepts, function (c) {
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
      for (var i = 0; i < template.conceptOutline.classAxioms[0].relationships.length; i++) {
        var r = template.conceptOutline.classAxioms[0].relationships[i];

        // if active, group, type match, and either target slot OR target matches
        if (relationship.active && r.groupId === relationship.groupId &&
          r.type.conceptId === relationship.type.conceptId &&
          (r.targetSlot || r.target.conceptId === relationship.target.conceptId)) {
          return true;
        }

      }
      return false;

    }

    function isOptionalAttribute(relationship) {
      if (!relationship) {
        return false;
      }

      if ((relationship.cardinalityMin
        && relationship.cardinalityMax
        && relationship.cardinalityMin === '0'
        && (relationship.cardinalityMax === '1' || relationship.cardinalityMax === '*'))
        || (relationship.template
          && relationship.template.cardinalityMin
          && relationship.template.cardinalityMax
          && relationship.template.cardinalityMin === '0'
          && (relationship.template.cardinalityMax === '1' || relationship.template.cardinalityMax === '*'))) {
        return true;
      }

      return false;

    }

    function relationshipHasTargetSlot(relationship, template) {

      if (!template) {
        return false;
      }

      for (var i = 0; i < template.conceptOutline.classAxioms[0].relationships.length; i++) {
        var r = template.conceptOutline.classAxioms[0].relationships[i];
        if (relationship.active && r.targetSlot && r.targetSlot.slotName && r.groupId === relationship.groupId && r.type.conceptId === relationship.type.conceptId) {
          return true;
        }
      }
      return false;
    }

    function isNumeric(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    }

    function sortTemplatesByName(a, b) {
      var nameA = a.name.toUpperCase(); // ignore upper and lowercase
      var nameB = b.name.toUpperCase(); // ignore upper and lowercase

      var nameA_Arr = nameA.split("-");
      var nameB_Arr = nameB.split("-");
      if (nameA_Arr.length > 0 && nameB_Arr.length > 0) {
        for (var i = 0; i < nameA_Arr.length; i++) {
          if (typeof nameA_Arr[i] !== 'undefined' && typeof nameB_Arr[i] !== 'undefined') {
            if (isNumeric(nameA_Arr[i].trim()) && isNumeric(nameB_Arr[i].trim())) {
              if (Number(nameA_Arr[i]) < Number(nameB_Arr[i])) return -1;
              if (Number(nameA_Arr[i]) > Number(nameB_Arr[i])) return 1;
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
        if (!parentIds || typeof parentIds === 'undefined' || parentIds.length === 0) {
          $http.get(apiEndpoint + 'templates').then(function (response) {
            templateCache = response.data.filter(function (el) { return exclusionList.indexOf(el.name) === -1; });
            templateCache.sort(function (a, b) {
              return sortTemplatesByName(a, b);
            });
            deferred.resolve(templateCache);
          }, function (error) {
            deferred.reject('Failed to retrieve templates: ' + error.message);
          });
        }
        else {
          $http.get(apiEndpoint + branch + '/templates?descendantOf=' + parentIds + '&ancestorOf=' + parentIds).then(function (response) {
            deferred.resolve(response.data.sort(function (a, b) { return sortTemplatesByName(a, b) }));
          }, function (error) {
            deferred.reject('Failed to retrieve templates: ' + error.message);
          });
        }

      } else {
        deferred.resolve(templateCache);
      }
      return deferred.promise;
    }

    function setTask(task) {
      currentTask = task;
    }

    function setExclusionList(list) {
      exclusionList = list;
    }

    function downloadTemplateCsv(template) {
      return $http({
        'method': 'GET',
        //replace with task level branch path - working around BE bug
        'url': apiEndpoint + '/templates/empty-input-file?templateName=' + encodeURIComponent(template)

      }).then(function (response) {
        return response;
      });
    }

    function uploadTemplateCsv(branch, template, file) {
      var deferred = $q.defer();
      $http.post(apiEndpoint + branch + '/templates/generate?templateName=' + encodeURIComponent(template), file, {
        withCredentials: true,
        headers: { 'Content-Type': undefined },
        transformRequest: angular.identity
      }).then(function (response) {
        deferred.resolve(response.data);
      }, function (error) {
        deferred.reject(error);
      });
      return deferred.promise;
    }

    function getTransformationRecipes() {
      var deferred = $q.defer();

      $http.get(apiEndpoint + 'MAIN/recipes').then(function (response) {
        deferred.resolve(response.data);
      }, function (error) {
        deferred.reject('Failed to retrieve Transformation Recipes: ' + error.message);
      });

      return deferred.promise;
    }

    function getTransformationJob(branchPath, recipe, jobId) {
      var deferred = $q.defer();

      $http.get(apiEndpoint + branchPath + '/recipes/' + recipe + '/jobs/' + jobId).then(function (response) {
        deferred.resolve(response.data);
      }, function (error) {
        deferred.reject('Failed to retrieve Transformation Job: ' + error.message);
      });

      return deferred.promise;
    }

    function getTransformationJobResultAsTsv(branchPath, recipe, jobId) {
      var deferred = $q.defer();

      $http.get(apiEndpoint + branchPath + '/recipes/' + recipe + '/jobs/' + jobId + '/result-tsv').then(function (response) {
        deferred.resolve(response.data);
      }, function (error) {
        deferred.reject('Failed to retrieve Transformation Job result: ' + error.message);
      });

      return deferred.promise;
    }

    function createTransformationJob(branchPath, recipe, batchSize, projectKey, taskTitle, file, assignee, reviewer, skipDroolsValidation) {
      var deferred = $q.defer();
      var params = {};

      if (batchSize) {
        params.batchSize = batchSize;
      }

      if (projectKey) {
        params.projectKey = projectKey;
      }

      if (taskTitle) {
        params.taskTitle = taskTitle;
      }

      if (assignee) {
        params.taskAssignee = assignee;
      }

      if (reviewer) {
        params.taskReviewer = reviewer;
      }

      params.skipDroolsValidation = skipDroolsValidation;

      $http.post(apiEndpoint + branchPath + '/recipes/' + recipe + '/jobs', file, {
        withCredentials: true,
        params : params,
        headers: { 'Content-Type': undefined },
        transformRequest: angular.identity
      }).then(function (response) {
        var locHeader = response.headers('Location');
        var jobId = locHeader.substr(locHeader.lastIndexOf('/') + 1);
        deferred.resolve(jobId);
      }, function (error) {
        deferred.reject(error);
      });
      return deferred.promise;
    }

    function refsetUpdate(project, name){
      var deferred = $q.defer();
      let config = {
          "jobName": name,
          "project": project
        }
      $http.post(apiEndpoint + '/batch-jobs', config).then(function (response) {
        deferred.resolve(response.data.resultUrl);
      }, function (error) {
        deferred.reject(error);
      });
      return deferred.promise;
    }

    return {

      // task initialization
      setTask: setTask,

      // Template exclusion list
      setExclusionList: setExclusionList,

      // Template CRUD functions
      getTemplates: getTemplates,
      searchByTemplate: searchByTemplate,

      // global template selection
      selectTemplate: selectTemplate,
      getSelectedTemplate: getSelectedTemplate,
      clearSelectedTemplate: clearSelectedTemplate,

      // Template application functions
      createTemplateConcept: createTemplateConcept,
      applyTemplateToExistingConcept: applyTemplateToExistingConcept,
      applyTemplateToConcept: applyTemplateToConcept,
      removeTemplateFromConcept: removeTemplateFromConcept,
      updateTargetSlot: updateTargetSlot,
      replaceLexicalValues: replaceLexicalValues,

      // utility functions
      relationshipHasTargetSlot: relationshipHasTargetSlot,
      relationshipInLogicalModel: relationshipInLogicalModel,
      isOptionalAttribute: isOptionalAttribute,

      // template-flagging
      storeTemplateForConcept: storeTemplateForConcept,
      removeStoredTemplateForConcept: removeStoredTemplateForConcept,
      getStoredTemplateForConcept: getStoredTemplateForConcept,
      logTemplateConceptSave: logTemplateConceptSave,
      bulkLogTemplateConceptSave: bulkLogTemplateConceptSave,

      // batch functions
      downloadTemplateCsv: downloadTemplateCsv,
      uploadTemplateCsv: uploadTemplateCsv,
      transform: transform,
      getTransformationRecipes: getTransformationRecipes,
      getTransformationJob: getTransformationJob,
      getTransformationJobResultAsTsv: getTransformationJobResultAsTsv,
      createTransformationJob: createTransformationJob,
      refsetUpdate: refsetUpdate
    };

  })
  ;
