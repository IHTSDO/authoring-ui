'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles Authoring Template retrieval and functionality
 */
  .factory('templateService', function ($http, $rootScope, $q, scaService, componentAuthoringUtil) {

    var templates = [];

    // Hard-coded template for development purposes
    var templateCt = {
      name : 'CT of X',
      type : 'CREATE',
      updateFns : {
        replaceTargetName : function(concept) {
          try {
            var targetName = concept.descriptions.filter(function(desc) {
              return desc.active && desc.type === 'FSN';
            })[0].term.match(/(.*)\s\(.*\)]/i)[1];
            angular.forEach(this.concept.descriptions, function(desc) {
              desc.term.replace('%TARGETNAME%', targetName);
            })
          } catch(err) {
            // do nothing
          }
        }
      },

      conceptModel : componentAuthoringUtil.getNewConcept()
    };

    // setup the descriptions
    angular.forEach(templateCt.concept.descriptions, function(desc) {
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
      'conceptId' : '',
      'fsn' : ''
    };
    var attr = componentAuthoringUtil.getNewAttributeRelationship();
    attr.type = {
      'conceptId' : '',
      'fsn' : ''
    };
    attr.target = {
      'conceptId' : '',
      'fsn': ''
    };
    templates.push(templateCt);

    function getTemplates() {
      var deferred = $q.defer();
      // TODO Wire to BE
      deferred.resolve([]);
      return deferred.promise;
    }
    function getTemplate(id) {
      var deferred = $q.defer();
      // TODO Wire to BE
      deferred.resolve([]);
      return deferred.promise;
    }
    function applyTemplate(template, existingConcepts, params) {
      var deferred = $q.defer();
      var templateConcepts = [];

      angular.forEach(existingConcepts, function(existingConcept) {
        var templateConcept;
        if (template.type === 'CREATE') {
          templateConcept = angular.copy(template.conceptModel);
        } else {
          templateConcept = existingConcept;
        }
        for (var fn in template.updateFns) {
          fn(templateConcept);
        }
        templateConcepts.push(templateConcept);
      });

      deferred.resolve(templateConcepts);
      return deferred.promise;
    }

    return {
      getTemplates : getTemplates,
      getTemplate : getTemplate,
      applyTemplate : applyTemplate
    };

  })
;
