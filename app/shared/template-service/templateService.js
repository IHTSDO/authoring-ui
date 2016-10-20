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

      // TODO Check top-level concept properties

      //  console.debug('replace template values', concept, nameValueMap);
      // replace in descriptions
      angular.forEach(concept.descriptions, function (d) {
        if (d.template) {
          //    console.debug(' template found');
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

        // apply a temporary UUID and template variables/flags
        tc.conceptId = snowowlService.createGuid();
        tc.template = template;
        tc.templateComplete = false;

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
      var nameValueMap = getTemplateValues(selectedTemplate, concept);
      replaceTemplateValues(concept, nameValueMap);

      concept.templateComplete = isTemplateComplete(concept);

      deferred.resolve(concept);
      return deferred.promise;
    }

    function removeTemplateFromConcept(concept) {
      delete concept.template;
      angular.forEach(concept.descriptions, function (d) {
        delete d.template;
        delete d.templateStyle;
      });
      angular.forEach(concept.relationships, function (r) {
        delete r.template;
        delete r.templateStyle;
      })
    }

    function termMatchesTemplate(term, templateTerm, nameValueMap) {
      var modTerm = templateTerm;
      for (var name in nameValueMap) {
        if (nameValueMap.hasOwnProperty(name)) {
          modTerm = modTerm.replace('{{' + name + '}}', nameValueMap[name]);
          modTerm = modTerm.replace(/[ ]{2,}/g, ' ');
        }
      }
      return term === modTerm;
    }


    function applyTemplateToConcept(concept, stylesFlag) {
      var deferred = $q.defer();

      console.debug('apply template to concept', selectedTemplate, concept);

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
              if (stylesFlag) {
                r.templateStyle = 'bluehl darken-2';
              }
              r.targetSlot = rt.targetSlot;
            }

            // otherwise, check specified target concept id
            else if (r.target.conceptId === rt.target.conceptId) {

              matchFound = true;
              r.template = rt;
              if (stylesFlag) {
                r.templateStyle = 'tealhl';
              }
            }
          }
        });
        if (!matchFound) {

          var newRel = angular.copy(rt);
          if (stylesFlag) {
            newRel.templateStyle = 'tealhl';
          }
          newRel.template = rt;
          concept.relationships.push(newRel);

        }
      });


      angular.forEach(concept.relationships, function (r) {
        if (!r.templateStyle && stylesFlag) {
          r.templateStyle = 'redhl';
        }
      });

      // get values from target slots
      var nameValueMap = getTemplateValues(selectedTemplate, concept);

      // match descriptions
      for (var i = 0; i < selectedTemplate.conceptTemplate.descriptions.length; i++) {
        var dt = selectedTemplate.conceptTemplate.descriptions[i];

        var matchFound = false;
        for (var j = 0; j < concept.descriptions.length; j++) {
          var d = concept.descriptions[j];

          //    console.debug('  against existing description', d.term);
          // check by active/type/acceptability
          // TODO Add acceptability
          if (d.active && d.type === dt.type) {
            // check exact term match first
            if (d.term === dt.term) {
              matchFound = true;
              d.template = dt;
              if (stylesFlag) {
                d.templateStyle = 'tealhl';
              }
            }

            // otherwise, check by pattern matching
            else {
              var exp = dt.term.replace(/\{\{.*}}/, '.*');
              exp = exp.replace(/([()[{$^\\|?])/g, '\\$1');
              exp = '^' + exp + '$';

              // if match found
              if (d.term.match(exp)) {
                matchFound = true;
                d.template = dt;
                if (stylesFlag) {
                  d.templateStyle = termMatchesTemplate(d.term, dt.term, nameValueMap) ? 'tealhl' : 'bluehl';
                }
              }
            }
          }
        }

        if (!matchFound) {
          var newDesc = angular.copy(dt);
          newDesc.templateStyle = 'bluehl lighten-2';
          newDesc.template = dt;
          concept.descriptions.push(newDesc);
        }
      }

      // cycle over all descriptions -- no style flag means not in template

      // otherwise, flag as outside template
      angular.forEach(concept.descriptions, function (d) {
        if (!d.templateStyle) {
          console.debug('  Description not tagged, marking as erroneous');
          d.templateStyle = 'redhl';
        }
      });

      console.debug('*******************************');
      console.debug('*******************************');
      console.debug('*******************************');
      componentAuthoringUtil.setDefaultFields(concept);

      console.debug('after default fields', concept);

      concept = replaceTemplateValues(concept, nameValueMap);

      console.debug('applied template to concept', concept);
      deferred.resolve(concept);

      return deferred.promise;
    }

    function selectTemplate(template) {
      selectedTemplate = template;
    };

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
      removeTemplateFromConcept: removeTemplateFromConcept,
      isTemplateComplete: isTemplateComplete
    };

  })
;
