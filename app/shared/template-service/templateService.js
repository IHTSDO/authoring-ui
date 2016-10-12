'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles Authoring Template retrieval and functionality
 */
  .factory('templateService', function ($http, $rootScope, $q, scaService, snowowlService, componentAuthoringUtil) {

    var templateCache = [];

    // TODO Wire this to BE, using JSON temporary file for dev purposes
    $http.get('shared/template-service/templates.json').then(function (response) {
      console.debug('http templates', response);
      templateCache = response.data;
    });

    var templateFns = {
      replaceTargetName: function (templateConcept, fromConcept) {
        console.debug('replaceTargetName function invoked', templateConcept, fromConcept);
        try {
          var fsn = fromConcept.descriptions.filter(function (desc) {
            return desc.active && desc.type === 'FSN';
          });
          if (!fsn) {
            return 'Could not determine fsn';
          }

          var match = fsn[0].term.match(/(.*)\s\(.*\)/i);
          if (!match || !match[1] || match[1].length == 0) {
            return 'Could not determine target name from fsn ' + fsn[0].term;
          }
          var targetName = match[1].substring(0, 1).toLowerCase() + match[1].substring(1);

          angular.forEach(templateConcept.descriptions, function (tcDesc) {
            tcDesc.term = tcDesc.term.replace(/%TARGETNAME%/g, targetName);
            return tcDesc;
          });
          return templateConcept
        } catch (err) {
          return err;
        }
      }
    };


    //
    // END HARDCODED TEMPLATE FOR CT
    //

    function getTemplates(refreshCache) {
      var deferred = $q.defer();
      console.debug('get templates');
      if (!templateCache || refreshCache) {
        console.debug('returning retrieved templates', []);
        // TODO Wire to BE
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

    function applyTemplate(template, existingConcepts, params) {
      var deferred = $q.defer();
      var templateConcepts = [];

      console.debug('Applying template', template, existingConcepts, params);

      angular.forEach(existingConcepts, function (ec) {
        console.debug(' Existing concept ' + ec.conceptId + ' | ' + ec.fsn);
        var tc = angular.copy(template.type === 'CREATE' ? template.conceptJson : ec);
        tc.templateVersion = template.version;
        if (!tc.conceptId) {
          tc.conceptId = snowowlService.createGuid();
        }

        for (var fnName in templateFns) {
          console.debug('executing template update function', fnName);
          if (templateFns.hasOwnProperty(fnName)) {
            var response = templateFns[fnName](tc, ec);
            console.debug(' response', response);
          }
        }
        templateConcepts.push(tc);
      });

      deferred.resolve(templateConcepts);
      return deferred.promise;
    }

    return {
      getTemplates: getTemplates,
      getTemplateForName: getTemplateForName,
      applyTemplate: applyTemplate
    };

  })
;
