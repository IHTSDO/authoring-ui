'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles Authoring Template retrieval and functionality
 */
  .service('templateService', function ($http, $rootScope, $q, scaService, snowowlService, componentAuthoringUtil, templateUtility) {

    var templateCache = [];

    // TODO Wire this to BE, using JSON temporary file for dev purposes
    $http.get('shared/template-service/templates.json').then(function (response) {
      console.debug('http templates', response);
      templateCache = response.data;
    });

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

        // append template fields to concept
        tc.templateVersion = template.version;
        tc.templateName = template.name;

        if (!tc.conceptId) {
          tc.conceptId = snowowlService.createGuid();
        }

        var errors = [];

        angular.forEach(template.functions, function (fnName) {
          console.debug('executing template update function', fnName);
          templateUtility.getTemplateFunction[fnName](template, tc, ec).then(function () {

          }, function (error) {
            errors.push('ERROR in ' + functionName + ' for ' + ec.conceptId + ' | ' + ec.fsn + ':' + error);
          })


        });
        if (errors.length == 0) {
          templateConcepts.push(tc);
        }
      });

      if (errors.length > 0) {
        deferred.reject(errors);
      } else {
        deferred.resolve(templateConcepts);
      }
      return deferred.promise;
    }

    return {
      getTemplates: getTemplates,
      getTemplateForName: getTemplateForName,
      applyTemplate: applyTemplate
    };

  })
;
