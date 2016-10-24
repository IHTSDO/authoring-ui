'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles Authoring Template retrieval and functionality
 */
  .service('templateService', function ($http, $rootScope, $q, scaService, snowowlService, componentAuthoringUtil, templateUtility) {

    //
    // Internal variables
    //
    var templateCache = null;
    var selectedTemplate = null;

    //
    // Patterns
    //
    var PATTERN_PT_FROM_FSN = /(.+)\s\(.*\)/i;
    var PATTERN_SEMANTIC_TAG = /.+\s\((.*)\)/i;

    //
    // Internal functions
    //

    function getLexicalFunctionName(lexicalTemplate) {
      return lexicalTemplate.name.substring(0, lexicalTemplate.name.lastIndexOf('-'));
    }

    function getLexicalShortName(lexicalTemplate) {
      return lexicalTemplate.name.substring(lexicalTemplate.name.lastIndexOf('-') + 1);
    }

    function replaceTemplateValues(concept, nameValueMap) {
      console.debug('replacing values', nameValueMap);

      // TODO Check top-level concept properties

      //  console.debug('replace template values', concept, nameValueMap);
      // replace in descriptions
      angular.forEach(concept.descriptions, function (d) {
        if (d.template) {
          console.debug('checking description', d.term);
          for (var name in nameValueMap) {
            if (nameValueMap.hasOwnProperty(name)) {
              d.term = d.template.term.replace('{{' + name + '}}', nameValueMap[name]);
              d.term = d.term.replace(/[ ]{2,}/g, ' ');
            }
          }
        }
      });

      // replace in relationships
      angular.forEach(concept.relationships, function (r) {
        // do nothing as yet
      });

      return concept;
    }

    function getTemplateValues(template, concept) {
      console.debug('getting template values', template, concept);

      // full map of replacement values
      var nameValueMap = {};

      angular.forEach(template.lexicalTemplates, function (lt) {
        var value = null;
        var fnName = getLexicalFunctionName(lt);
        var shortName = getLexicalShortName(lt);

        // find the matching relationship target slot by takeFSNFromSlot
        angular.forEach(concept.relationships, function (r) {
          //      console.debug('    checking relationship', r)
          if (r.targetSlot && r.targetSlot.slotName === lt.takeFSNFromSlot) {
            //        console.debug('      target slot found');

            if (!r.target.conceptId) {
              value = shortName;

            } else {
              var match;
              switch (fnName) {
                case 'fsn':
                  match = r.target.fsn;
                  break;
                case 'term':
                  match = r.target.fsn.match(PATTERN_PT_FROM_FSN);
                  break;
                case 'tag':
                  match = r.target.fsn.match(PATTERN_SEMANTIC_TAG);
                  break;
                default:
                // do nothing
              }

              if (!match || !match[1] || match[1].length == 0) {
                value = '???';
              } else {
                value = match[1].toLowerCase();
                angular.forEach(lt.removeParts, function (rp) {
                  if (value.indexOf(rp) != -1) {
                    value = value.replace(rp, '');
                  }
                });
                value = value.replace(/[ ]{2,}/g, ' ');
              }
            }
          }
        });
        nameValueMap[lt.name] = value;
      });
      return nameValueMap;
    }

    //
    // Exposed functions
    //

    function getTemplates(refreshCache) {
      console.debug('getTemplates', templateCache);
      var deferred = $q.defer();
      if (!templateCache || refreshCache) {
        // TODO Wire this to BE, using JSON temporary file for dev purposes
        $http.get('shared/template-service/templates.json').then(function (response) {
          console.debug('http templates', response);
          templateCache = response.data;
          deferred.resolve(templateCache);
        });

      } else {
        console.debug('returning cached templates', templateCache);
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

    function createTemplateConcept(template, params) {
      var deferred = $q.defer();

      // check required arguments
      if (!template) {
        deferred.reject('Template error: invalid arguments');
      } else {

        // create concept from the concept template
        var tc = angular.copy(template.conceptTemplate);

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

        angular.forEach(tc.descriptions, function(d) {
          d.descriptionId = snowowlService.createGuid();
        });
        angular.forEach(tc.relationships, function(r) {
          r.relationshipId = snowowlService.createGuid();
        });

        // replace template values (i.e. to replace display {{term-x}} with x
        var nameValueMap = getTemplateValues(selectedTemplate, tc);
        replaceTemplateValues(tc, nameValueMap);

        console.debug('template concept', tc);
        deferred.resolve(tc);
      }
      return deferred.promise;
    }

    //
    // Template functionality -- consider moving to templateUtility
    //


    function updateTemplateConcept(concept) {
      var deferred = $q.defer();
      clearTemplateStylesAndMessages(concept);
      var nameValueMap = getTemplateValues(selectedTemplate, concept);
      replaceTemplateValues(concept, nameValueMap);

      concept.templateComplete = isTemplateComplete(concept);

      deferred.resolve(concept);
      return deferred.promise;
    }

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

    function getTermForTemplateTerm(templateTerm, nameValueMap) {
      var modTerm = templateTerm;
      for (var name in nameValueMap) {
        if (nameValueMap.hasOwnProperty(name)) {
          modTerm = modTerm.replace('{{' + name + '}}', nameValueMap[name]);
          modTerm = modTerm.replace(/[ ]{2,}/g, ' ');
        }
      }
      return modTerm;
    }


    function applyTemplateToConcept(concept, applyValues, applyStyles) {
      var deferred = $q.defer();

      console.debug('apply template to concept', selectedTemplate, concept, applyValues, applyStyles);

      // completion flag
      var templateComplete = true;

      // reset template messages and GUIDs for descriptions, relationships, and top-level concept
      concept.templateMessages = [];
      if (!concept.conceptId) {
        c.conceptId = snowowlService.createGuid();
      }
      angular.forEach(concept.descriptions, function(d) {
        d.templateMessages = [];
        if (!d.descriptionId) {
          d.descriptionId = snowowlService.createGuid();
        }
      });
      angular.forEach(concept.relationships, function(r) {
        r.templateMessages = [];
        if (!r.relationshipId) {
          r.relationshipId = snowowlService.createGuid();
        }

        // if target slot not filled, mark false
        if (r.targetSlot && !r.target.conceptId) {
          r.templateMessages.push({type : 'Error', message : 'Template target slot cannot be empty'});
        }
      });

      // match relationships
      angular.forEach(selectedTemplate.conceptTemplate.relationships, function (rt) {

        var matchFound = false;
        angular.forEach(concept.relationships, function (r) {



          // check by active/group/type
          if (r.active && r.groupId === rt.groupId && r.type.conceptId === rt.type.conceptId) {


            // if a target slot, assign template and target slot
            if (rt.targetSlot) {

              matchFound = true;
              r.template = rt;
              if (applyStyles) {
                r.templateStyle = 'bluehl darken-2';
              }
              r.targetSlot = rt.targetSlot;
            }

            // otherwise, check specified target concept id
            else if (r.target.conceptId === rt.target.conceptId) {

              matchFound = true;
              r.template = rt;
              if (applyStyles) {
                r.templateStyle = 'tealhl';
              }

            }
          }
        });
        if (!matchFound) {

          var newRel = angular.copy(rt);
          if (applyStyles) {
            newRel.templateStyle = 'tealhl';
          }
          newRel.template = rt;
          newRel.templateMessages = [];
          newRel.templateMessages.push({type : 'Message', message : 'Relationship automatically added by template'});
          concept.relationships.push(newRel);

        }
      });


      angular.forEach(concept.relationships, function (r) {
        if (!r.template) {
          if (applyStyles) {
            r.templateStyle = 'redhl';
          }
          r.templateMessages.push({type : 'Error', message : 'Relationship not valid for template; please remove'});
        }
      });

      // get values from target slots
      var nameValueMap = getTemplateValues(selectedTemplate, concept);

      // match descriptions
      for (var i = 0; i < selectedTemplate.conceptTemplate.descriptions.length; i++) {
        var dt = selectedTemplate.conceptTemplate.descriptions[i];

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
              var exp = dt.term.replace(/\{\{.*}}/, '.*');
              exp = exp.replace(/([()[{$^\\|?])/g, '\\$1');
              exp = '^' + exp + '$';

              // if match found
              if (d.term && d.term.match(exp)) {
                matchFound = true;
                d.template = dt;
                var templateTerm = getTermForTemplateTerm(dt.term, nameValueMap);
                if (d.term !== templateTerm) {
                  // if apply values set, value will be replaced below, append warning
                  if (applyValues) {
                    d.templateMessages.push({type : 'Warning', message : 'Description term updated to conform to template, previous term: ' + d.term});
                  }

                  // otherwise, append error
                  else {
                    d.templateMessages.push({type : 'Warning', message : 'Description term does not conform to template, expected: ' + templateTerm});
                  }
                }

              }
            }
          }
        });

        if (!matchFound) {
          var newDesc = angular.copy(dt);
          newDesc.descriptionId = snowowlService.createGuid();
          newDesc.term = getTermForTemplateTerm(dt.term, nameValueMap);
          if (applyStyles) {
            newDesc.templateStyle = 'bluehl lighten-2';
          }
          newDesc.template = dt;
          newDesc.templateMessages = [];
          newDesc.templateMessages.push({type : 'Message', message :'Description automatically added by template'});
          concept.descriptions.push(newDesc);
        }
      }

      console.debug('before checking all', concept.descriptions);

      // cycle over all descriptions -- no style flag means not in template

      // otherwise, flag as outside template
      angular.forEach(concept.descriptions, function (d) {
        if (!d.template) {
          if (applyStyles) {
            d.templateStyle = 'redhl';
          }

          d.templateMessages = [];
          d.templateMessages.push({type : 'Error', message : 'Description not valid for template; please remove'});
        }
      });

      componentAuthoringUtil.setDefaultFields(concept);


      if (applyValues) {
        concept = replaceTemplateValues(concept, nameValueMap);
        console.debug('replaced values in concept', concept);
      }

      // apply top-level messages
      var msg = { type: 'Message', message: 'Template Concept Valid'};
      angular.forEach(concept.descriptions.concat(concept.relationships), function(component) {
        angular.forEach(component.templateMessages, function(tm) {
          // overwrite with highest severity
          if (tm.type === 'Error') {
            msg = { type: 'Error', message: 'Template Errors Found'};
          } else if (tm.type === 'Warning' && msg && msg.type !== 'Error') {
            msg = { type: 'Warning', message: 'Template Warnings Found'};
          }
        });
      });
      concept.templateMessages.push(msg);
      console.debug('concept messages', msg, concept.templateMessages);


      deferred.resolve(concept);

      return deferred.promise;
    }

    function selectTemplate(template) {
      selectedTemplate = template;
    }

    function getSelectedTemplate() {
      return selectedTemplate;
    }

    function clearSelectedTemplate() {
      selectedTemplate = null;
    }

    function isTemplateComplete(concept) {
      angular.forEach(concept.relationships, function (relationship) {
        if (relationship.targetSlot) {
          return false;
        }
      });
      return true;
    }

    return {

      // Template CRUD functions
      getTemplates: getTemplates,
      getTemplateForName: getTemplateForName,
      createTemplate: createTemplate,
      updateTemplate: updateTemplate,
      removeTemplate: removeTemplate,

      // Utility functions
      selectTemplate: selectTemplate,
      getSelectedTemplate: getSelectedTemplate,
      clearSelectedTemplate: clearSelectedTemplate,

      // Template application functions
      createTemplateConcept: createTemplateConcept,
      updateTemplateConcept: updateTemplateConcept,
      applyTemplateToConcept: applyTemplateToConcept,
      clearTemplateStylesAndMessages: clearTemplateStylesAndMessages,
      isTemplateComplete: isTemplateComplete
    };

  })
;
