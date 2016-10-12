'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles Authoring Template retrieval and functionality
 */
  .factory('templateService', function ($http, $rootScope, $q, scaService, componentAuthoringUtil) {

    var templateCache = [];

    // Hard-coded template for development purposes
    // NOTE: Developed for initial display use only, NOT meant to be descriptive
    // of eventual BE templates
    var templateCt = {
      name: 'CT of X',
      type: 'CREATE',
      updateFns: {
        replaceTargetName: function (concept) {
          try {
            var targetName = concept.descriptions.filter(function (desc) {
              return desc.active && desc.type === 'FSN';
            })[0].term.match(/(.*)\s\(.*\)]/i)[1];
            angular.forEach(this.concept.descriptions, function (desc) {
              desc.term.replace('%TARGETNAME%', targetName);
            })
          } catch (err) {
            // do nothing
          }
        }
      },

      conceptModel: componentAuthoringUtil.getNewConcept()
    };

    // setup the descriptions
    angular.forEach(templateCt.concept.descriptions, function (desc) {
      if (desc.type === 'FSN') {
        desc.term = 'Computerized tomography of %TARGETNAME% (procedure)';
      } else if (desc.type === 'SYNONYM') {
        desc.term = 'Computerized tomography of %TARGETNAME%';
      }
    });
    var def = componentAuthoringUtil.getNewTextDefinition();
    def.term = 'CT Definition or something';
    templateCt.concept.descriptions.add(def);

    // setup the relationships
    templateCt.conceptModel.relationships[0].target = {
      'conceptId': '',
      'fsn': ''
    };
    var attr = componentAuthoringUtil.getNewAttributeRelationship();
    attr.type = {
      'conceptId': '',
      'fsn': ''
    };
    attr.target = {
      'conceptId': '',
      'fsn': ''
    };
    templates.push(templateCt);

    function getTemplates(refreshCache) {
      var deferred = $q.defer();
      if (!templateCache|| refreshCache) {
        // TODO Wire to BE
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
        } else {
          deferred.reject('No template for name: ' + name);
        }
      }, function(error) {
        deferred.reject('Could not get templates: ' + error);
      });
      return deferred.promise;
    }

    function applyTemplate(template, existingConcepts, params) {
      var deferred = $q.defer();
      var templateConcepts = [];

      console.debug('Applying template', template, existingConcepts, params);

      angular.forEach(existingConcepts, function (existingConcept) {
        console.debug(' Existing concept ' + existingConcept.conceptId + ' | ' + existingConcept.fsn);
        var tc = angular.copy(template.type === 'CREATE' ? template.conceptModel : existingConcept);

        for (var fnName in template.updateFns) {
          if (template.updateFns.hasOwnProperty(fnName)) {
            template.updateFns[fnName](tc);
          }
        }

        // debug content
        var tcFsn = componentAuthoringUtil.getFsnForConcept(tc);

        console.debug(' Template concept ' + (tc.conceptId ? tc.conceptId : 'New Concept') + ' | ' + (tcFsn ? tcFsn.term : 'Cannot determine FSN'));
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
