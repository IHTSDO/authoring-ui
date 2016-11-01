'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles Authoring Template retrieval and functionality
 */
  .service('templateService', function ($http, $rootScope, $q, scaService, snowowlService, componentAuthoringUtil) {

    var apiEndpoint = '../template-service/';


    //
    // Internal variables
    //
    var templateCache = null;
    var selectedTemplate = null;

    //
    // Patterns
    //
    var PATTERN_FSN = /(.+\s\(.*\))/i;
    var PATTERN_PT_FROM_FSN = /(.+)\s\(.*\)/i;
    var PATTERN_SEMANTIC_TAG = /.+\s\((.*)\)/i;

    //
    // Internal functions
    //

    function getSlotFunction(termSlot) {
      var t = termSlot.replace(/\$/g, '');
      return t.substring(0, t.lastIndexOf('_'));
    }

    function getSlotName(termSlot) {
      var t = termSlot.replace(/\$/g, '');
      return t.substring(t.lastIndexOf('_') + 1);
    }

    function getSlotValue(termSlot, template, nameValueMap) {
      var sn = getSlotName(termSlot);
      var sf = getSlotFunction(termSlot);

      var lt;
      try {
        lt = template.lexicalTemplates.filter(function (l) {
          return l.name === sn;
        })[0];
      } catch(error) {
        return '???';
      }
      console.debug('lexical template', lt);
      var match;

      // if no value, simply return the slot name (e.g. 'X' for 'term_X')
      if (!nameValueMap[sn]) {
        return sn;
      }

      // apply function to value
      switch (sf) {
        case 'fsn':
          match = nameValueMap[sn].match(PATTERN_FSN);
          break;
        case 'tag':
          match = nameValueMap[sn].match(PATTERN_SEMANTIC_TAG);
          break;
        case 'term':
          match = nameValueMap[sn].match(PATTERN_PT_FROM_FSN);
          break;
        default:
        // do nothing
      }

      // replace specified parts and extraneous whitespace
      var replaceValue;
      if (!match || !match[1] || match[1].length == 0) {
        replaceValue = '???';
      } else {
        replaceValue = match[1].toLowerCase();
        angular.forEach(lt.removeParts, function (rp) {
          if (replaceValue.indexOf(rp) != -1) {
            var re = new RegExp(rp, 'g');
            replaceValue = replaceValue.replace(re, '');
          }
        });

        // TODO Support replacement by regex as well as removal

      }
      replaceValue = replaceValue.replace(/[\s]{2,}/g, ' ');
      return replaceValue;
    }

    function getDescriptionTemplateTermValue(descriptionTemplate, template, nameValueMap) {
      // match all function/slotName pairs surrounded by $$
      var newTerm = descriptionTemplate.term;
      var termSlots = descriptionTemplate.term ? descriptionTemplate.term.match(/\$([^$]*)\$/g) : '';
      angular.forEach(termSlots, function (termSlot) {
        var re = new RegExp(termSlot.replace(/(\$)/g, '\\$'), 'g');
        var sv = getSlotValue(termSlot, template, nameValueMap);
        newTerm = newTerm.replace(re, sv);
        newTerm = newTerm.replace(/[\s]{2,}/g, ' ');
      });
      return newTerm;
    }

    function replaceTemplateValues(concept, template) {
      var nameValueMap = getTemplateValues(concept, template);

      // replace values in descriptions
      angular.forEach(concept.descriptions, function (d) {
        if (d.template) {
          d.term = getDescriptionTemplateTermValue(d.template, template, nameValueMap);
        }
      });

      // replace values in relationships
      angular.forEach(concept.relationships, function (r) {
        // no use-case as yet
      });

      // replace values in top-level concept fields
      // no use-case as yet


      return concept;
    }

    /**
     * @param template the template applied
     * @param concept the concept
     * @returns {{}} map of names and values from template slots
     */
    function getTemplateValues(concept, template) {

      // full map of replacement values
      var nameValueMap = {};

      angular.forEach(template.lexicalTemplates, function (lt) {
        var value = null;

        // find the matching relationship target slot by takeFSNFromSlot
        angular.forEach(concept.relationships, function (r) {

          // if a target slot with specified slot name
          if (r.targetSlot && r.targetSlot.slotName === lt.takeFSNFromSlot && r.target && r.target.conceptId) {
            value = r.target.fsn;
          }
        });
        nameValueMap[lt.name] = value;
      });
      return nameValueMap;
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

          if (r.type.conceptId && conceptIds.indexOf(r.type.conceptId) == -1) {
            conceptIds.push(r.type.conceptId);
          }
          if (r.target.conceptId && conceptIds.indexOf(r.target.conceptId) == -1) {
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

//
// Exposed functions
//
    function getTemplates(refreshCache) {
      var deferred = $q.defer();
      if (!templateCache || refreshCache) {
        $http.get(apiEndpoint + 'templates').then(function (response) {
          templateCache = response.data;
          deferred.resolve(templateCache);

        }, function (error) {
          deferred.reject('Failed to retrieve templates: ' + error.developerMessage);
        });
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
        if (tf.length == 1) {
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
      // TODO Wire to BE
    }

    function updateTemplate(template) {
      // TODO Wire to BE
    }

    function removeTemplate(templateName) {
      // TODO Wire to BE
    }

    function createTemplateConcept(template) {
      var deferred = $q.defer();

      // check required arguments
      if (!template) {
        deferred.reject('Template error: invalid arguments');
      } else {

        // create concept from the concept template
        var tc = angular.copy(template.conceptOutline);

        // store template details against each component
        angular.forEach(tc.descriptions, function (d) {
          d.template = angular.copy(d);
        });
        angular.forEach(tc.relationships, function (r) {
          r.template = angular.copy(r);
        });

        // ensure all required fields are set
        componentAuthoringUtil.setDefaultFields(tc);

        // apply temporary UUIDs and template variables/flags
        tc.conceptId = snowowlService.createGuid();
        tc.template = template;
        tc.templateComplete = false;

        angular.forEach(tc.descriptions, function (d) {
          d.descriptionId = snowowlService.createGuid();
        });
        angular.forEach(tc.relationships, function (r) {
          r.relationshipId = snowowlService.createGuid();
        });

        // replace template values (i.e. to replace display $term-x with x
        replaceTemplateValues(tc, template);

        deferred.resolve(tc);
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
      })
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
            else if (r.active && r.target.conceptId === rt.target.conceptId) {

              matchFound = true;
              r.template = rt;
              if (applyStyles) {
                r.templateStyle = 'tealhl';
              }

            }

          });
          if (!matchFound) {

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

// get values from target slots
      var nameValueMap = getTemplateValues(concept, template);

// match descriptions
      angular.forEach(template.conceptOutline.descriptions, function (dt) {
        var matchFound = false;
        angular.forEach(concept.descriptions, function (d) {


          // check by active/type/acceptability
          // TODO Add acceptability
          if (d.active && d.type === dt.type) {
            // check exact term match first
            if (d.term === dt.term) {
              matchFound = true;
              d.template = dt;
              if (applyStyles) {
                d.templateStyle = 'tealhl';
              }
            }

            // otherwise, check by pattern matching
            else {
              // replace slots with .*, escape special characters, and start/end terminate
              var exp = dt.term.replace(/\$.*\$/, '.*');
              exp = '^' + exp.replace(/([()[{$^\\|?])/g, '\\$1') + '$';


              // if match found
              if (d.term && d.term.match(exp)) {
                matchFound = true;
                d.template = dt;
                var templateTerm = getDescriptionTemplateTermValue(dt, template, nameValueMap);
                if (d.term !== templateTerm) {
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
                }

              }
            }
          }
        });

        if (!matchFound) {
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
        concept = replaceTemplateValues(concept, template);
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
        })
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
        if (relationship.active && r.groupId === relationship.groupId
          && r.type.conceptId === relationship.type.conceptId
          && (r.targetSlot || r.target.conceptId === relationship.target.conceptId)) {
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
        if (relationship.active && r.targetSlot && r.groupId === relationship.groupId && r.type.conceptId === relationship.type.conceptId) {
          return true;
        }
      }
      return false;
    }


    return {

      // Template CRUD functions
      getTemplates: getTemplates,
      getTemplateForName: getTemplateForName,
      createTemplate: createTemplate,
      updateTemplate: updateTemplate,
      removeTemplate: removeTemplate,

      // global template selection
      selectTemplate: selectTemplate,
      getSelectedTemplate: getSelectedTemplate,
      clearSelectedTemplate: clearSelectedTemplate,

      // Template application functions
      createTemplateConcept: createTemplateConcept,
      applyTemplateToConcept: applyTemplateToConcept,
      removeTemplateFromConcept: removeTemplateFromConcept,
      clearTemplateStylesAndMessages: clearTemplateStylesAndMessages,

      // utility functions
      isTemplateComplete: isTemplateComplete,
      relationshipHasTargetSlot: relationshipHasTargetSlot,
      relationshipInLogicalModel: relationshipInLogicalModel,

      // template-flagging
      storeTemplateForConcept: storeTemplateForConcept,
      removeStoredTemplateForConcept: removeStoredTemplateForConcept,
      getStoredTemplateForConcept: getStoredTemplateForConcept,
      logTemplateConceptSave: logTemplateConceptSave
    };

  })
;
