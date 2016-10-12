'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles Authoring Template retrieval and functionality
 */
  .service('templateUtility', function ($http, $rootScope, $q, scaService, snowowlService, componentAuthoringUtil, templateUtility) {

    // declare the various template functions
    var templateFns = {
      replaceTargetNameFromFsn: function (template, templateConcept, fromConcept) {
        var deferred = $q.defer();

        if (!template || !templateConcept || !fromConcept) {
          deferred.reject('Invalid arguments');
        }

        // surround in try/catch for unexpected error reporting
        try {
          var fsn = fromConcept.descriptions.filter(function (desc) {
            return desc.active && desc.type === 'FSN';
          });
          if (!fsn) {
            deferred.reject('FSN could not be determined');
          } else {

            var match = fsn[0].term.match(/(.*)\s\(.*\)/i);
            if (!match || !match[1] || match[1].length == 0) {
              deferred.reject('Could not determine target name from fsn ' + fsn[0].term);
            } else {
              var targetName = match[1].substring(0, 1).toLowerCase() + match[1].substring(1);

              angular.forEach(templateConcept.descriptions, function (tcDesc) {
                tcDesc.term = tcDesc.term.replace(/%TARGETNAME%/g, targetName);
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
          return function () {
          };
        }
      }
    };

  })
;
