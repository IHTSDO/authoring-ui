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

    function createTemplate(template) {
      // TODO Wire to BE
    }

    function updateTemplate(template) {
      // TODO Wire to BE
    }

    function removeTemplate(templateName) {
      // TODO Wire to BE
    }


    function applyTemplate(template, existingConcepts, params) {
      var deferred = $q.defer();
      var templateConcepts = [];

      console.debug('Applying template', template, existingConcepts, params);

      // check required arguments
      if (!template || !existingConcepts) {
        deferred.reject('Template error: invalid arguments');
      } else {

        // log all errors encountered during application of template
        var errors = '';

        angular.forEach(existingConcepts, function (ec) {
          console.debug(' Existing concept ' + ec.conceptId + ' | ' + ec.fsn);
          var tc = angular.copy(template.type === 'CREATE' ? template.conceptJson : ec);

          // append template fields to concept
          tc.template = {
            version: template.version,
            templateName: template.name
          };

          // assign a temporary id for new concepts
          if (!tc.conceptId) {
            tc.conceptId = snowowlService.createGuid();
          }

          // execute each function requested by the template
          angular.forEach(template.functions, function (fnName) {
            console.debug('executing template update function', fnName);
            var fn = templateUtility.getTemplateFunction(fnName);

            if (!fn) {
              errors += 'Template error for concept' + ec.conceptId + ' | ' + ec.fsn + ': Requested template function ' + fnName + ' not found\n';
            } else {
              // params currently unused
              fn(template, tc, ec, {}).then(function () {
                // on success, do nothing
              }, function (error) {
                errors += 'Template function error in ' + fnName + ' for concept ' + ec.conceptId + ' | ' + ec.fsn + ':' + error + '\n';
              })
            }
          });

          templateConcepts.push(tc);

        });

        if (errors.length > 0) {
          deferred.reject(errors);
        } else {
          deferred.resolve(templateConcepts);
        }
      }
      return deferred.promise;
    }

    return {
      getTemplates: getTemplates,
      getTemplateForName: getTemplateForName,
      createTemplate : createTemplate,
      updateTemplate : updateTemplate,
      removeTemplate : removeTemplate,
      applyTemplate: applyTemplate
    };

  })
;
