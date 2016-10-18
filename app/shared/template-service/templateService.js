'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles Authoring Template retrieval and functionality
 */
  .service('templateService', function ($http, $rootScope, $q, scaService, snowowlService, componentAuthoringUtil, templateUtility) {

    var templateCache = null;

    var selectedTemplate = null;


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


    function getNewConcept(template, params) {
      var deferred = $q.defer();

      // check required arguments
      if (!template) {
        deferred.reject('Template error: invalid arguments');
      } else {

        // log all errors encountered during application of template
        var errors = '';

        // create concept from the concept template
        var tc = angular.copy(template.conceptTemplate);

        // apply a UUID
        tc.conceptId = snowowlService.createGuid();

        // append the template for this concept
        tc.template = template;

        componentAuthoringUtil.setDefaultFields(tc);

        console.debug('template concept', tc);



        // error checking left in for possible later use
        if (errors.length > 0) {
          deferred.reject(errors);
        } else {
          deferred.resolve(tc);
        }
      }
      return deferred.promise;
    }

    //
    // Template functionality -- consider moving to templateUtility
    //

    var PATTERN_PT_FROM_FSN = /(.+)\s\(.*\)/i;
    var PATTERN_SEMANTIC_TAG = /.+\s\((.*)\)/i;

    function updateTemplateConcept(concept) {
      var deferred = $q.defer();

      console.debug('update tc', concept);
      // if concept not supplied or not emplate, resolve with no action
      if (!concept || !concept.template) {
        deferred.resolve(concept);
      } else {

        // cycle over lexical templates
        angular.forEach(concept.template.lexicalTemplates, function (lt) {

          console.debug(' checking lexical template', lt);
          // find the slot
          var slots = concept.relationships.filter(function (r) {
            return r.targetSlot && r.targetSlot.slotName === lt.takeFSNFromSlot;
          });

          console.debug('  eligible slots', slots);

          // // either slot not present or already filled, resolve
          if (slots && slots.length == 0) {
            deferred.resolve(concept);
          }

          // more than one slot -- invalid template
          else if (slots && slots.length > 1) {
            deferred.reject('Invalid template: two slots with same name');
          }

          // otherwise, continue
          else {

            var slot = slots[0];
            // check if slot has value
            if (slot.hasOwnProperty('target') && slot.target.conceptId) {
              // abstract these functions out once template use-cases arise
              var match = slot.target.fsn.match(PATTERN_PT_FROM_FSN);
              if (!match || !match[1] || match[1].length == 0) {
                deferred.reject('Could not determine target FSN');
              } else {
                var slotTerm = match[1].toLowerCase();

                console.debug('    slotTerm', slotTerm);

                // apply removal terms
                angular.forEach(lt.removeParts, function (rp) {
                  if (slotTerm.indexOf(rp) != -1) {
                    slotTerm = slotTerm.replace(rp, '');
                  }
                });

                console.debug('    slotTerm after removal', slotTerm);


                // replace any occurrences of {{name}} in description terms
                angular.forEach(concept.descriptions, function (description) {
                  if (description.term.indexOf('{{' + lt.name + '}}') != -1) {
                    description.term = description.term.replace('{{' + lt.name + '}}', slotTerm);

                    // invoke remove invalid characters to clean up whitespace
                    description.term = snowowlService.removeInvalidCharacters(description.term);

                  }
                });

                // remove the target slot appelation
                delete slot.targetSlot;
                deferred.resolve(concept);
              }
            }
          }

        });
      }

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
      angular.forEach(concept.relationships, function(relationship) {
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
      getNewConcept: getNewConcept,
      updateTemplateConcept: updateTemplateConcept,
      isTemplateComplete : isTemplateComplete
    };

  })
;
