'use strict';

angular.module('singleConceptAuthoringApp')
  .service('snowowlService', ['$http', '$q', function ($http, $q) {
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

    function startClassificationForTask(taskKey, branch) {
      var JSON = '{"reasonerId": "au.csiro.snorocket.owlapi3.snorocket.factory"}';
      return $http.post(apiEndpoint + branch + '/tasks/' + taskKey + '/classifications', JSON, {
        headers: {'Content-Type': 'application/json; charset=UTF-8'}
      }).then(function (response) {
        return response;
      });
    }

    // get a specific classification result for projectKey, taskKey, and
    // classifierId
    function getClassificationForTask(projectKey, taskKey, classifierId, branch) {
      return $http.get(apiEndpoint + branch + '/' + projectKey + '/' + taskKey + '/classifications/' + classifierId).then(function (response) {
        return response;
      });
    }

    // get a specific classification result for project id, classifier id, and branch
    function getClassificationForProject(projectKey, classifierId, branch) {
      return $http.get(apiEndpoint + branch + '/' + projectKey + '/classifications/' + classifierId).then(function (response) {
        return response.data;
      });
    }

    // get all classification results for a project (as of 7/21, snowowl
    // functionality not complete)
    function getClassificationsForProject(projectKey, branch) {
      return $http.get(apiEndpoint + branch + '/' + projectKey + '/classifications/').then(function (response) {
        return response.data.items;
      });
    }

    // get all classification results for a project and task
    function getClassificationsForTask(projectKey, taskKey, branch) {
      return $http.get(apiEndpoint + 'MAIN/' + projectKey + '/' + taskKey + '/classifications').then(function (response) {
        return response.data.items;
      });
    }

    // get equivalent concepts reported for a classifier id
    function getEquivalentConcepts(classifierId, branch) {
      return $http.get(apiEndpoint + branch + '/' + '/classifications/' + classifierId + '/equivalent-concepts').then(function (response) {
        return response.data.items;
      });
    }

    // GET /{path}/classifications/{classificationId}/relationship-changes
    // get relationship changes reported for a classifier id
    function getRelationshipChanges(classifierId, branch) {
      return $http.get(apiEndpoint + branch + '/classifications/' + classifierId + '/relationship-changes').then(function (response) {
        return response.data.items;
      });
    }

    // get relationship changes as csv results
    function downloadClassification(classifierId, branch) {
      // console.debug('downloadClassification', classifierId, branch);
      return $http({
        'method': 'GET',
        'url': apiEndpoint + branch + '/' + '/classifications/' + classifierId + '/relationship-changes',
        'headers': {
          'Accept': 'text/csv'
        }
      }).then(function (response) {
        return response;
      });
    }

    // GET
    // /{path}/classifications/{classificationId}/concept-preview/{conceptId}
    // get preview of model
    function getModelPreview(classifierId, branch, id) {
      return $http.get(apiEndpoint + branch + '/classifications/' + classifierId + '/concept-preview/' + id).then(function (response) {
        var temp = response.data;
        temp.conceptId = 'After-' + temp.conceptId;
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
         return { term : 'Could not determine preferred term'};
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

    function getDescriptionProperties(descriptionId, branch) {
      return $http.get(apiEndpoint + branch + '/descriptions/' + descriptionId).then(function(response) {
        return response.data;
      }, function(error) {
        return null;
      });
    }

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

    ///////////////////////////////////////////////////
    // Relationship functions
    //////////////////////////////////////////////////

    /**
     * Get the properties for a specified relationship
     * @param relationshipId the relationshipId
     * @param branch the relationship's branch
     * @returns the relationship properties object
     */
    function getRelationshipProperties(relationshipId, branch) {
      return $http.get(apiEndpoint + branch + 'relationships/' + relationshipId).then(function(response) {
        return response.data;
      }, function(error) {
        return null;
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
      $http.get(apiEndpoint + 'browser/' + branch + '/concepts/' + conceptId).then(function (response) {
        concept = response.data;
        // console.debug('snowowl', response.data);
        deferred.resolve(concept);
      }, function (error) {
        deferred.reject(concept);
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
      moduleIds.map(function (moduleId) {
        var module = {};

        // get the term, then add the module
        getFullConcept(moduleId, branch).then(function (response) {
          module.id = moduleId;
          module.branch = branch;
          module.name = response.fsn;

          // console.log('Added module', module);

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
      // console.log('Language Options set to', languages);
    }

    // get language options
    // TODO:  Currently unused, language options are extracted from dialects
    function getLanguages() {
      return languages;
    }

    // add new dialect options
    function addDialects(newDialects) {
      dialects = dialects.concat(newDialects);
      // console.debug('Dialect options set to: ', dialects);
    }

    // get dialect options
    function getDialects() {
      return dialects;
    }

    //////////////////////////
    // Browser Functions
    //////////////////////////
    //http://local.ihtsdotools.org:8081/snowowl/snomed-ct/v2/browser
    // /MAIN/WRPAS/WRPAS-22/descriptions?query=test&limit=50
    // &searchMode=partialMatching&lang=english&statusFilter=activeOnly
    // &skipTo=0&returnLimit=100
    // Update Existing Concept
    // PUT /browser/{path}/concepts/{conceptId}
    function getDescriptionsForQuery(project, task, searchStr) {
      return $http.get(apiEndpoint + 'browser/MAIN/' + project + '/' + task + '/descriptions?query=' + searchStr + '&limit=50&searchMode=partialMatching&lang=english&statusFilter=activeOnly&skipTo=0&returnLimit=100').then(function(response) {
        return response.data;
      }, function (error) {
        return error.data;
      });
    }

    ////////////////////////////////
    // Review Functions
    ////////////////////////////////

    // Get a single review (for conflict purposes)
    // GET /reviews/{id}
    function getReview(id) {
      return $http.get(apiEndpoint + '/reviews/' + id).then(function(response) {
        return response.data;
      }, function(error) {
        return null;
      });
    }

    //////////////////////////////////////////////////////
    // Branch Functions
    //
    // NOTE: Intended for debugging ONLY
    //       Use scaService for true function
    //////////////////////////////////////////////////////

//    https://dev-term.ihtsdotools.org/snowowl/snomed-ct/v2/branches/MAIN/WRPAS/WRPAS-72/
    function getBranch(branch) {
      return $http.get(apiEndpoint + '/branches/' + branch).then(function(response) {
        return response.data;
      }, function(error) {
        return null;
      });
    }
    ////////////////////////////////////////////
    // Method Visibility
    // TODO All methods currently visible!
    ////////////////////////////////////////////
    return {

      getConceptProperties: getConceptProperties,
      getDescriptionProperties: getDescriptionProperties,
      getRelationshipProperties: getRelationshipProperties,
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
      startClassificationForTask: startClassificationForTask,
      getClassificationForTask: getClassificationForTask,
      getClassificationForProject : getClassificationForProject,
      getClassificationsForTask: getClassificationsForTask,
      getClassificationsForProject: getClassificationsForProject,
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
      getDialects: getDialects,
      downloadClassification: downloadClassification,
      getDescriptionsForQuery: getDescriptionsForQuery,
      getReview : getReview,
      getBranch : getBranch

    };
  }

  ])
;