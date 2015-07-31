'use strict';

angular.module('singleConceptAuthoringApp')
  .service('snowowlService', ['$http', '$q', function ($http, $q, $watch) {
    var apiEndpoint = '../snowowl/snomed-ct/v2/';

    /////////////////////////////////////
    // Snowowl Concept Retrieval Methods
    /////////////////////////////////////

    // Create New Concept
    // POST /browser/{path}/concepts
    function createConcept(project, task, concept) {
      return $http.post(apiEndpoint + 'browser/MAIN/' + project + '/' + task + '/concepts/', concept).then(function (response) {
        return response.data;
      }, function (error) {
        return error.data;
      });

    }

    // Update Existing Concept
    // PUT /browser/{path}/concepts/{conceptId}
    function updateConcept(project, task, concept) {
      return $http.put(apiEndpoint + 'browser/MAIN/' + project + '/' + task + '/concepts/' + concept.conceptId, concept).then(function (response) {
        return response.data;
      }, function (error) {
        return error.data;
      });
    }

    // Get Concept
    // GET /browser/{path}/concepts/{conceptId}
    function getConcept(conceptId, branch) {
      return $http.get(apiEndpoint + 'browser/' + branch + '/concepts/' + conceptId).then(function (response) {
        return response.data;
      }, function (error) {
        // TODO Handle error
      });
    }

    // function to remove disallowed elements from a concept
    function cleanConcept(concept) {
      // strip unknown tags
      var allowableProperties = [
        'fsn', 'conceptId', 'definitionStatus', 'active', 'moduleId',
        'isLeafInferred', 'effectiveTime', 'descriptions',
        'preferredSynonym', 'relationships'];

      for (var key in concept) {
        if (allowableProperties.indexOf(key) === -1) {
          delete concept[key];
        }
      }
    }

    //////////////////////////////////////////////
    // Classification functions
    //////////////////////////////////////////////

    function startClassification(taskId, branch) {
      var JSON = '{"reasonerId": "au.csiro.snorocket.owlapi3.snorocket.factory"}';
      return $http.post(apiEndpoint + branch + '/tasks/' + taskId + '/classifications', JSON, {
        headers: {'Content-Type': 'application/json; charset=UTF-8'}
      }).then(function (response) {
        return response;
      });
    }

    // get a specific classification result for projectId, taskId, and
    // classifierId
    function getClassificationResult(projectId, taskId, classifierId, branch) {
      return $http.get(apiEndpoint + branch + '/' + projectId + '/' + taskId + '/classifications/' + classifierId).then(function (response) {
        return response;
      });
    }

    // get all classification results for a project (as of 7/21, snowowl
    // functionality not complete)
    function getClassificationResultsForProject(projectId, branch) {
      return $http.get(apiEndpoint + branch + '/' + projectId + '/classifications/').then(function (response) {
        return response.data.items;
      });
    }

    // get all classification results for a project and task
    function getClassificationResultsForTask(projectId, taskId, branch) {
      return $http.get(apiEndpoint + 'MAIN/' + projectId + '/' + taskId + '/classifications').then(function (response) {
        return response.data.items;
      });
    }

    // get equivalent concepts reported for a classifier id
    function getEquivalentConcepts(classifierId, projectId, taskId, branch) {
      return $http.get(apiEndpoint + branch + '/' + '/classifications/' + classifierId + '/equivalent-concepts').then(function (response) {
        return response.data.items;
      });
    }

    // GET /{path}/classifications/{classificationId}/relationship-changes
    // get relationship changes reported for a classifier id
    function getRelationshipChanges(classifierId, projectId, taskId, branch) {
      return $http.get(apiEndpoint + branch + '/' + '/classifications/' + classifierId + '/relationship-changes').then(function (response) {
        return response.data.items;
      });
    }

    // GET
    // /{path}/classifications/{classificationId}/concept-preview/{conceptId}
    // get preview of model
    function getModelPreview(classifierId, branch, id) {
      return $http.get(apiEndpoint + branch + '/classifications/' + classifierId + '/concept-preview/' + id).then(function (response) {
        var temp = response.data;
        temp.conceptId = 'After: ' + temp.conceptId;
        return temp;
      });
    }

    function saveClassification(branch, classificationId) {
      var JSON = '{ "status" : "SAVED"}';
      return $http.put(apiEndpoint + branch + '/classifications/' + classificationId, JSON, {
        headers: {'Content-Type': 'application/json; charset=UTF-8'}
      }).then(function (response) {
        return response;
      });
    }

    //////////////////////////////////////////////
    // Concept element retrieval functions
    //////////////////////////////////////////////

    // Retrieve Concept properties
    // GET {path}/concepts/{conceptId}
    function getConceptProperties(conceptId, branch) {
      return $http.get(apiEndpoint + branch + '/concepts/' + conceptId).then(function (response) {
        return response.data;
      }, function (error) {
        // TODO Handle error
      });

    }

    // Retrieve Concept preferred term
    // GET {path}/concepts/{conceptId}
    function getConceptPreferredTerm(conceptId, branch) {
      return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/pt').then(function (response) {
        return response.data;
      }, function (error) {
        // TODO Handle error
      });

    }

    // Retrieve ancestors of a concept
    // GET /{path}/concepts/{conceptId}/ancestors
    function getConceptAncestors(conceptId, branch) {
      // TODO Test call
      return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/ancestors').then(function (response) {
        return response.data.ancestors;
      }, function (error) {
        // TODO Handle error
      });
    }

    // Retrieve descendants of a concept
    // GET /{path}/concepts/{conceptId}/descendants
    function getConceptDescendants(conceptId, branch) {
      return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/descendants').then(function (response) {
        return response.data.descendants;
      }, function (error) {
        // TODO Handle error
      });

    }

    ////////////////////////////////////////////////////
    // Description functions
    ////////////////////////////////////////////////////

    // Retrieve descriptions of a concept
    // GET /{path}/concepts/{conceptId}/descriptions
    function getConceptDescriptions(conceptId, branch) {
      return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/descriptions').then(function (response) {

        // if zero-count, return empty array (no blank array returned)
        if (response.data.total === 0) {
          return [];
        }

        // otherwise, return the passed array
        return response.data.conceptDescriptions;
      }, function (error) {
        // TODO Handle error
      });
    }

    function updateDescription(description, branch) {
      return $http.get(apiEndpoint + branch + '/descriptions/' + description.descriptionId + '/updates').then(function (response) {

        // if zero-count, return empty array (no blank array returned)
        if (response.data.total === 0) {
          return [];
        }

        // otherwise, return the passed array
        return response.data.conceptDescriptions;
      }, function (error) {
        // TODO Handle error
      });
    }

    // Retrieve inbound relationships of a concept
    // GET /{path}/concepts/{conceptId}/inbound-relationships
    function getConceptRelationshipsInbound(conceptId, branch) {
      return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/inbound-relationships').then(function (response) {

        // if zero-count, return empty array (no blank array returned)
        if (response.data.total === 0) {
          return [];
        }

        // otherwise, return the passed array
        return response.data.inboundRelationships;
      }, function (error) {
        // TODO Handle error
      });
    }

    // Retrieve outbound relationships of a concept
    // GET /{path}/concepts/{conceptId}/outbound-relationships
    // UNUSED
    function getConceptRelationshipsOutbound(conceptId, branch) {
      return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/outbound-relationships').then(function (response) {
        return response.data.outboundRelationships;
      }, function (error) {
        // TODO Handle error
      });
    }

    // helper call to populate relationship display names
    function getRelationshipDisplayNames(relationship, branch) {
      var deferred = $q.defer();

      var targetDone = false;
      var typeDone = false;

      // get the target

      getConceptPreferredTerm(relationship.target.conceptId, branch).then(function (response) {
        if (response && response.term) {
          relationship.target.fsn = response.term;
        }
        targetDone = true;
        if (typeDone) {
          deferred.resolve(relationship);
        }
      });

      getConceptPreferredTerm(relationship.type.conceptId, branch).then(function (response) {
        if (response && response.term) {
          relationship.type.fsn = response.term;
        }
        typeDone = true;
        if (targetDone) {
          deferred.resolve(relationship);
        }
      });

      return deferred.promise;

    }

    // Helper call to retrieve a concept with all elements
    // Puts all elements in save-ready format
    function getFullConcept(conceptId, branch) {

      var deferred = $q.defer();
      var concept = {};
      getConcept(conceptId, branch).then(function (response) {
        concept = response;
        deferred.resolve(concept);
      });
      return deferred.promise;
      //return concept;
    }

    /////////////////////////////////////
    // Static metadata methods
    ////////////////////////////////////

    // TODO Discuss with Chris
    // Perhaps we want to have a single getMetadata call
    // that returns modules, languages, dialects, case sensitivities, etc.
    // with add methods only?  This is beginning to get cumbersome
    // what with requiring all get methods to be called in conceptEdit.js

    var modules = [];
    var languages = [];
    var dialects = [];

    // function to initialize/add to stored module names
    // arg: moduleIds, array of module SCTIDs
    // arg: branch, module branch
    function addModules(moduleIds, branch) {
      moduleIds.map(function(moduleId) {
        var module = {};

        // get the term, then add the module
        getFullConcept(moduleId, branch).then(function (response) {
          module.id = moduleId;
          module.branch = branch;
          module.name = response.fsn;

          console.log('Added module', module);

          modules.push(module);
        });

      });
    }

    // function to retrieve all module id/name pairs
    function getModules() {
      return modules;
    }

    // add new language options
    // TODO:  Currently unused, language options are extracted from dialects
    function addLanguages(newLanguages) {
      languages = languages.concat(newLanguages);
      console.log('Language Options set to', languages);
    }

    // get language options
    // TODO:  Currently unused, language options are extracted from dialects
    function getLanguages() {
      return languages;
    }

    // add new dialect options
    function addDialects(newDialects) {
      dialects = dialects.concat(newDialects);
      console.debug('Dialect options set to: ', dialects);
    }

    // get dialect options
    function getDialects() {
      return dialects;
    }
    ////////////////////////////////////////////
    // Method Visibility
    // TODO All methods currently visible!
    ////////////////////////////////////////////
    return {

      getConceptProperties: getConceptProperties,
      getConceptPreferredTerm: getConceptPreferredTerm,
      updateConcept: updateConcept,
      createConcept: createConcept,
      getConceptAncestors: getConceptAncestors,
      getConceptDescendants: getConceptDescendants,
      getConceptDescriptions: getConceptDescriptions,
      getConceptRelationshipsInbound: getConceptRelationshipsInbound,
      getConceptRelationshipsOutbound: getConceptRelationshipsOutbound,
      getRelationshipDisplayNames: getRelationshipDisplayNames,
      getFullConcept: getFullConcept,
      updateDescription: updateDescription,
      startClassification: startClassification,
      getClassificationResult: getClassificationResult,
      getClassificationResultsForTask: getClassificationResultsForTask,
      getClassificationResultsForProject: getClassificationResultsForProject,
      getEquivalentConcepts: getEquivalentConcepts,
      getRelationshipChanges: getRelationshipChanges,
      cleanConcept: cleanConcept,
      getModelPreview: getModelPreview,
      saveClassification: saveClassification,
      addModules: addModules,
      getModules: getModules,
      addLanguages: addLanguages,
      getLanguages: getLanguages,
      addDialects: addDialects,
      getDialects: getDialects

    };
  }

  ])
;