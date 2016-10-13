'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles Authoring Template retrieval and functionality
 */
  .service('templateUtility', function ($q) {

    var PATTERN_PT_FROM_FSN = /(.+)\s\(.*\)/i;
    var PATTERN_SEMANTIC_TAG = /.+\s\((.*)\)/i;

    /**
     * Declare the various template functions
     * Method signature:
     * - template:  the template to be applied
     * - templateConcept: the concept to which the template is applied
     * - fromConcept: the concept from which the template derives content
     * - params (currently unused): optional parameters
     */

    var templateFns = {

      // sets template concept %TARGET_ID% and %TARGET_NAME% from concept
      setRelationshipTargetFromConcept: function (template, templateConcept, fromConcept, params) {
        var deferred = $q.defer();

        if (!template || !templateConcept || !fromConcept) {
          deferred.reject('Invalid arguments');
        }

        // surround in try/catch for unexpected error reporting
        try {
          var fsn = fromConcept.descriptions.filter(function (desc) {
            return desc.active && desc.type === 'FSN';
          });
          if (!fsn || fsn.length == 0) {
            deferred.reject('FSN description not found');
          } else {

            angular.forEach(templateConcept.relationships, function (tcRel) {
              tcRel.target.id = fromConcept.conceptId;
              tcRel.target.fsn = fsn[0].term;
            });
            deferred.resolve();

          }
        } catch (err) {
          deferred.reject('Unexpected error -- ' + err);
        }
        return deferred.promise;

      },

      // sets template concept %TARGET_NAME% on all descriptions from term without semantic tags derived from concept's FSN
      setTargetNameFromConceptFsn: function (template, templateConcept, fromConcept, params) {
        var deferred = $q.defer();

        if (!template || !templateConcept || !fromConcept) {
          deferred.reject('Invalid arguments');
        }

        // surround in try/catch for unexpected error reporting
        try {
          var fsn = sourceConcept.descriptions.filter(function (desc) {
            return desc.active && desc.type === 'FSN';
          });
          if (!fsn) {
            deferred.reject('FSN description not found');
          } else {

            var match = fsn[0].term.match(PATTERN_PT_FROM_FSN);
            if (!match || !match[1] || match[1].length == 0) {
              deferred.reject('Could not determine target name from fsn ' + fsn[0].term);
            } else {
              var targetName = match[1].substring(0, 1).toLowerCase() + match[1].substring(1);

              angular.forEach(templateConcept.descriptions, function (tcDesc) {
                tcDesc.term = tcDesc.term.replace(/%TARGET_NAME%/g, targetName);
              });
              deferred.resolve();
            }
          }
        } catch (err) {
          deferred.reject('Unexpected error -- ' + err);
        }
        return deferred.promise;
      }
    };

    return {
      getTemplateFunctions: function () {
        return templateFns;
      },
      getTemplateFunction: function (name) {
        if (templateFns.hasOwnProperty(name)) {
          return templateFns[name];
        } else {
          return null;
        }
      }
    };

  })
;
