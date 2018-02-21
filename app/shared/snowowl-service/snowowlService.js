'use strict';

angular.module('singleConceptAuthoringApp')
  .service('snowowlService', ['$http', '$q', '$timeout', 'notificationService', 'metadataService',
    function ($http, $q, $timeout, notificationService, metadataService) {
      var apiEndpoint = '../snowowl/snomed-ct/v2/';

      /////////////////////////////////////
      // Snowowl Concept Retrieval Methods
      /////////////////////////////////////

      // Create New Concept
      // POST /browser/{path}/concepts
      function createConcept(project, task, concept) {
        var deferred = $q.defer();
        $http.post(apiEndpoint + 'browser/' + metadataService.getBranchRoot() + '/' + project + '/' + task + '/concepts/', concept).then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      // Update Existing Concept
      // PUT /browser/{path}/concepts/{conceptId}
      function updateConcept(project, task, concept) {
        var deferred = $q.defer();
        $http.put(apiEndpoint + 'browser/' + metadataService.getBranchRoot() + '/' + project + '/' + task + '/concepts/' + concept.conceptId, concept).then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      //Update array of concepts
      //PUT /browser/{path}/concepts/{conceptId}
      function bulkUpdateConcept(branch, conceptArray) {
        var deferred = $q.defer();
        $http.post(apiEndpoint + 'browser/' + branch + '/concepts/bulk', conceptArray).then(function (response) {
          pollForBulkUpdate(response.headers('Location'), 1000).then(function (result) {
            deferred.resolve(response.data);
          }, function (error) {
            deferred.reject(error);
          });
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      function pollForBulkUpdate(url, intervalTime) {

        var deferred = $q.defer();
        if (!intervalTime) {
          intervalTime = 1000;
        }

        $timeout(function () {
          $http.get(url).then(function (response) {

            // if review is ready, get the details
            if (response && response.data && response.data.status === 'COMPLETED') {
              deferred.resolve(response.data);
            } else if (response && response.data && response.data.status === 'FAILED') {
              deferred.reject('Bulk concept update failed');
            } else {
              pollForBulkUpdate(url, intervalTime).then(function (pollResults) {
                deferred.resolve(pollResults);
              }, function (error) {
                deferred.reject(error);
              });
            }
          }, function (error) {
            deferred.reject();
          });
        }, intervalTime);

        return deferred.promise;
      }

      function isSctid(id) {
        if (!id) {
          return false;
        }
        var match = id.match(/^[0-9]+$/);
        return match ? true : false;
      }

      function cleanRelationship(relationship) {

        var allowableRelationshipProperties = [
          'active', 'released', 'moduleId', 'target', 'relationshipId', 'effectiveTime', 'characteristicType', 'sourceId', 'modifier', 'type', 'groupId'
        ];

        // if a locally assigned UUID, strip
        if (relationship.relationshipId && relationship.relationshipId.indexOf('-') !== -1) {
          delete relationship.relationshipId;
        }

        for (var key in relationship) {
          if (allowableRelationshipProperties.indexOf(key) === -1) {
            delete relationship[key];
          }
        }
      }

      function cleanDescription(description) {
        var allowableDescriptionProperties = [
          'conceptId', 'released', 'active', 'moduleId', 'term', 'lang', 'caseSignificance', 'effectiveTime', 'descriptionId', 'type', 'acceptabilityMap', 'inactivationIndicator', 'associationTargets',
        ];

        // if a locally assigned UUID, strip
        if (description.descriptionId && description.descriptionId.indexOf('-') !== -1) {
          delete description.descriptionId;
        }
        if (description.inactivationIndicator && description.inactivationIndicator === 'Reason not stated') {
          delete description.inactivationIndicator;
        }
        for (var key in description) {
          if (allowableDescriptionProperties.indexOf(key) === -1) {
            delete description[key];
          }
        }

        if (description.term) {
          // strip invalid characters from term
          //description.term = description.term.replace(/[@|$|#|\\]/g, ' ');

          //replace any non-space whitespace characters (tab, newline, etc.)
          description.term = description.term.replace(/[^\S ]/g, ' ');

          // replace any 2+ sequences of space with single space
          description.term = description.term.replace(/[ ]{2,}/g, ' ');
        }
      }

      function cleanAxiom(axiom) {
        var allowableAxiomRelationshipProperties = ['axiomId', 'definitionStatus', 'effectiveTime', 'active', 'released', 'moduleId', 'relationships'];

        for (var key in axiom) {
          if (allowableAxiomRelationshipProperties.indexOf(key) === -1) {
            delete axiom[key];
          }
        }
      }

      function removeInvalidCharacters(term) {
        if (term) {
          // strip invalid characters from term
          //term = term.replace(/[@|$|#|\\]/g, ' ');

          //replace any non-space whitespace characters (tab, newline, etc.)
          term = term.replace(/[^\S ]/g, ' ');

          // replace any 2+ sequences of space with single space
          term = term.replace(/[ ]{2,}/g, ' ');

          // replace any leading or trailing whitespace
          term = term.trim();
        }
        return term;
      }

      function cleanRelationship(relationship, keepTempIds) {

        var allowableRelationshipProperties = [
          'active', 'released', 'moduleId', 'target', 'relationshipId', 'effectiveTime', 'characteristicType', 'sourceId', 'modifier', 'type', 'groupId'
        ];

        // if a locally assigned UUID, strip
        if (relationship.relationshipId && relationship.relationshipId.indexOf('-') !== -1 && !keepTempIds) {
          delete relationship.relationshipId;
        }

        for (var key in relationship) {
          if (allowableRelationshipProperties.indexOf(key) === -1) {
            delete relationship[key];
          }
        }
      }

      function cleanDescription(description, keepTempIds) {
        var allowableDescriptionProperties = [
          'conceptId', 'released', 'active', 'moduleId', 'term', 'lang', 'caseSignificance', 'effectiveTime', 'descriptionId', 'type', 'acceptabilityMap', 'inactivationIndicator', 'associationTargets',
        ];

        // if a locally assigned UUID, strip
        if (description.descriptionId && description.descriptionId.indexOf('-') !== -1 && !keepTempIds) {
          delete description.descriptionId;
        }
        if (description.inactivationIndicator && description.inactivationIndicator === 'Reason not stated') {
          delete description.inactivationIndicator;
        }
        for (var key in description) {
          if (allowableDescriptionProperties.indexOf(key) === -1) {
            delete description[key];
          }
        }

        if (description.term) {
          // strip invalid characters from term
          //description.term = description.term.replace(/[@|$|#|\\]/g, ' ');

          //replace any non-space whitespace characters (tab, newline, etc.)
          description.term = description.term.replace(/[^\S ]/g, ' ');

          // replace any 2+ sequences of space with single space
          description.term = description.term.replace(/[ ]{2,}/g, ' ');
        }
      }

      // function to remove disallowed elements from a concept
      function cleanConcept(concept, keepTempIds) {

        // strip unknown tags
        var allowableProperties = [
          'fsn', 'released', 'conceptId', 'definitionStatus', 'active', 'moduleId',
          'isLeafInferred', 'effectiveTime', 'descriptions',
          'preferredSynonym', 'relationships', 'inactivationIndicator', 'associationTargets', 'additionalAxioms', 'gciAxioms'];

        // if a locally assigned UUID, strip
        if (!isSctid(concept.conceptId) && !keepTempIds) {
          concept.conceptId = null;
        }

        for (var key in concept) {
          if (allowableProperties.indexOf(key) === -1) {
            delete concept[key];
          }
        }

        angular.forEach(concept.descriptions, function (description) {
          cleanDescription(description, keepTempIds);
        });

        angular.forEach(concept.relationships, function (relationship) {
          cleanRelationship(relationship, keepTempIds);

          // snowowl require source id set
          relationship.sourceId = concept.conceptId;

        });

        angular.forEach(concept.additionalAxioms, function (axiom) {
          cleanAxiom(axiom);
        });

        angular.forEach(concept.gciAxioms, function (axiom) {
          cleanAxiom(axiom);
        });
      }

      // function to remove disallowed elements from a concept
      function getConceptDescendants(conceptId, branch, offset, limit) {
        var deferred = $q.defer();
        // default values
        if (!offset) {
          offset = 0;
        }
        if (!limit) {
          limit = 50;
        }
        if (limit > 200) {
          limit = 200;
        }
        $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '?expand=descendants(form:"inferred",direct:false,offset:0,limit:200,expand(fsn()))').then(function (response) {
          deferred.resolve(response.data.descendants);
        }).then(function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
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
      function getClassificationForTask(projectKey, taskKey, classifierId) {
        return $http.get(apiEndpoint + metadataService.getBranchRoot() + '/' + projectKey + '/' + taskKey + '/classifications/' + classifierId).then(function (response) {
          return response.data;
        });
      }

      // get a specific classification result for project id, classifier id, and
      // branch
      function getClassificationForProject(projectKey, classifierId) {
        return $http.get(apiEndpoint + metadataService.getBranchRoot() + '/' + projectKey + '/classifications/' + classifierId).then(function (response) {
          return response.data;
        });
      }

      // get all classification results for a project (as of 7/21, snowowl
      // functionality not complete)
      function getClassificationsForProject(projectKey) {
        return $http.get(apiEndpoint + metadataService.getBranchRoot() + '/' + projectKey + '/classifications/').then(function (response) {
          return response.data.items;
        });
      }

      // get all classification results for a project and task
      function getClassificationsForTask(projectKey, taskKey) {
        return $http.get(apiEndpoint + metadataService.getBranchRoot() + '/' + projectKey + '/' + taskKey + '/classifications').then(function (response) {
          return response.data.items;
        });
      }

      // get equivalent concepts reported for a classifier id
      function getEquivalentConcepts(classifierId, branch) {
        var deferred = $q.defer();
        $http.get(apiEndpoint + branch + '/classifications/' + classifierId + '/equivalent-concepts').then(function (response) {
          deferred.resolve(response.data.items);
        }, function (error) {
          deferred.reject('Classification details could not be retrieved');
        });
        return deferred.promise;
      }

      // GET /{path}/classifications/{classificationId}/relationship-changes
      // get relationship changes reported for a classifier id
      function getRelationshipChanges(classifierId, branch, limit) {
        var deferred = $q.defer();
        $http.get(apiEndpoint + branch + '/classifications/' + classifierId + '/relationship-changes?expand=source.fsn,type.fsn,destination.fsn&limit=' + (limit ? limit : '1000')).then(function (response) {
          // NOTE: Return the full object to get the total count
          deferred.resolve(response.data);
        }, function (error) {
          deferred.reject('Classification details could not be retrieved');
        });
        return deferred.promise;
      }

      // get relationship changes as csv results
      function downloadClassification(classifierId, branch, limit) {
        return $http({
          'method': 'GET',
          'url': apiEndpoint + branch + '/classifications/' + classifierId + '/relationship-changes?limit=' + (limit ? limit : '1000'),
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
          return response.data;
        });
      }

      function saveClassification(branch, classificationId) {
        var JSON = '{ "status" : "SAVED"}';
        return $http.put(apiEndpoint + branch + '/classifications/' + classificationId, JSON, {
          headers: {'Content-Type': 'application/json; charset=UTF-8'}
        }).then(function (response) {
          return response;
        }, function (error) {
          console.error('Saving classification failed', error);
          return null;
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

      // Retrieve Concept Short Normal Form
      // GET {path}/concepts/{conceptId}?representationalForm=short-normal
      function getConceptSNF(conceptId, branch) {
        return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/authoring-form?normaliseAttributeValues=false').then(function (response) {
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
          return {term: 'Could not determine preferred term'};
        });

      }

      function getConceptFsn(conceptId, branch, count) {
        return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/fsn').then(function (response) {
          return {data : response.data, count: count};
        }, function (error) {
          return {term: 'Could not determine preferred term'};
        });

      }

      // Retrieve parents of a concept
      // GET /{path}/concepts/{conceptId}/parents
      function getConceptParents(conceptId, branch, acceptLanguageValue, synonymFlag, statedFlag) {
        var config = {};
        var queryParams = '';

        // construct header values
        console.log(acceptLanguageValue);
        if (acceptLanguageValue && !acceptLanguageValue.includes('null')) {
          // declare headers if not specified
          if (!config.headers) {
            config.headers = {};
          }

          // set the accept language header
          config.headers['Accept-Language'] = acceptLanguageValue;
        }

        // construct query params
        if (synonymFlag) {
          queryParams += (queryParams.length > 0 ? '&' : '') + 'preferredDescriptionType=SYNONYM';
        }
        if (statedFlag) {
          queryParams += (queryParams.length > 0 ? '&' : '') + 'form=stated';
        }

        // call and return promise
        return $http.get(apiEndpoint + 'browser/' + branch + '/concepts/' + conceptId + '/parents' + (queryParams ? '?' + queryParams : ''), config).then(function (response) {
          return response.data;
        }, function (error) {
          // TODO Handle error
        });
      }

      // Delete an unpublished concept
      // DELETE /{path}/concepts/{conceptId}
      function deleteConcept(conceptId, branch) {
        // call and return promise
        return $http.delete(apiEndpoint + branch + '/concepts/' + conceptId).then(function (response) {
          return response.data;
        }, function (error) {
          // TODO Handle error
        });
      }

      // Retrieve children of a concept
      // GET /{path}/concepts/{conceptId}/children
      function getConceptChildren(conceptId, branch, acceptLanguageValue, synonymFlag, statedFlag) {

        var config = {};
        var queryParams = '';

        // construct header values
          console.log(acceptLanguageValue);
        if (acceptLanguageValue) {
          // declare headers if not specified
          if (!config.headers) {
            config.headers = {};
          }
          // set the accept language header
          config.headers['Accept-Language'] = acceptLanguageValue;
        }

        // construct query params
        if (synonymFlag) {
          queryParams += (queryParams.length > 0 ? '&' : '') + 'preferredDescriptionType=SYNONYM';
        }
        if (statedFlag) {
          queryParams += (queryParams.length > 0 ? '&' : '') + 'form=stated';
        }

        // call and return promise
        return $http.get(apiEndpoint + 'browser/' + branch + '/concepts/' + conceptId + '/children' + (queryParams ? '?' + queryParams : ''), config).then(function (response) {
          return response.data;
        }, function (error) {
          // TODO Handle error
        });

      }

      // Retrieve stated children of a concept
      // GET /{path}/concepts/{conceptId}/children?form=stated
      function getStatedConceptChildren(conceptId, branch) {
        // TODO Need to apply MS/extension parameters here eventually?
        return $http.get(apiEndpoint + 'browser/' + branch + '/concepts/' + conceptId + '/children?form=stated').then(function (response) {
          return response.data;
        }, function (error) {
          // TODO Handle error
        });

      }


      function getHistoricalAssociationsForConcept(branch, conceptId) {
        var reasons = metadataService.getAssociationInactivationReasons();
      }

      /**
       * Inactivate a concept
       * @param conceptId the SCTID of the concept
       * @param branch the branch of the concept, e.g. MAIN/WRPAS/WRPAS-1
       * @param inactivationIndicator the inactivation reason, e.g. 'Ambiguous
       *   concept (inactive concept'
       * @param associationTargets association refset references, currently
       *   unused (optional) TODO Implement association targets on support from
       *   back-end
       */
      function inactivateConcept(branch, conceptId, inactivationIndicator, associationTargets) {

        var deferred = $q.defer();

        if (!conceptId) {
          deferred.reject('No conceptId specified');
        }
        if (!branch) {
          deferred.reject('Branch not specified');
        }
        if (!inactivationIndicator) {
          deferred.reject('Inactivation indicator not specified');
        }
        // construct the properties object
        var propertiesObj = {
          'commitComment': 'Inactivation',
          'inactivationIndicator': inactivationIndicator,
          'active': false,
          'associationTargets': associationTargets
        };

        $http.post(apiEndpoint + branch + '/concepts/' + conceptId + '/updates', propertiesObj).then(function (response) {
          deferred.resolve(true);
        }, function (error) {
          deferred.reject(error.statusMessage);
        });

        return deferred.promise;

      }

      ////////////////////////////////////////////////////
      // Description functions
      ////////////////////////////////////////////////////

      function getDescriptionProperties(descriptionId, branch) {
        return $http.get(apiEndpoint + branch + '/descriptions/' + descriptionId + '?expand=inactivationProperties()').then(function (response) {
          return response.data;
        }, function (error) {
          return null;
        });
      }

      function inactivateDescription(branch, descriptionId, inactivationIndicator) {

        var deferred = $q.defer();

        if (!descriptionId) {
          deferred.reject('No descriptionId specified');
        }
        if (!branch) {
          deferred.reject('Branch not specified');
        }
        if (!inactivationIndicator) {
          deferred.reject('Inactivation indicator not specified');
        }
        // construct the properties object
        var propertiesObj = {
          'commitComment': 'Inactivation',
          'inactivationIndicator': inactivationIndicator,
          'active': false,
          'associationTargets': {}
        };

        $http.post(apiEndpoint + branch + '/descriptions/' + descriptionId + '/updates', propertiesObj).then(function (response) {
          deferred.resolve(true);
        }, function (error) {
          deferred.reject(error.statusMessage);
        });

        return deferred.promise;

      }

      // Retrieve descriptions of a concept
      // GET /{path}/concepts/{conceptId}/descriptions
      function getConceptDescriptions(conceptId, branch) {
        return $http.get(apiEndpoint + branch + '/descriptions?concept=' + conceptId + '&limit=10000').then(function (response) {

          // if zero-count, return empty array (no blank array returned)
          if (response.data.total === 0) {
            return [];
          }

          // otherwise, return the passed array
          return response.data.items;
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
        return $http.get(apiEndpoint + branch + 'relationships/' + relationshipId).then(function (response) {
          return response.data;
        }, function (error) {
          return null;
        });
      }

      // Retrieve inbound relationships of a concept
      // GET /{path}/concepts/{conceptId}/inbound-relationships
      function getConceptRelationshipsInbound(conceptId, branch, offset, limit) {

        var deferred = $q.defer();

        if (!offset) {
          offset = 0;
        }

        if (!limit) {
          limit = 10000;
        }

        $http.get(apiEndpoint + branch + '/relationships?destination=' + conceptId + '&expand=source(expand(fsn())),type(expand(fsn()))&offset=' + offset +'&limit=' + limit).then(function (response) {

          // if zero-count, return empty array (no blank array returned)
          if (response.data.total === 0) {
            deferred.resolve({total: 0, inboundRelationships: []});
          } else {

            // otherwise, return the passed array
            deferred.resolve(response.data);
          }
        }, function (error) {
          deferred.reject(error);
        });

        return deferred.promise;
      }

      // Retrieve outbound relationships of a concept
      // GET /{path}/concepts/{conceptId}/outbound-relationships
      // UNUSED
      function getConceptRelationshipsOutbound(conceptId, branch) {
        var deferred = $q.defer();

        return $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '/outbound-relationships').then(function (response) {

          // if zero-count, return empty array (no blank array returned)
          if (response.data.total === 0) {
            deferred.resolve([]);
          } else {

            // otherwise, return the passed array
            deferred.resolve(response.data.outboundRelationships);
          }
        }, function (error) {
          // TODO Handle error
        });

      }

      // Retrieve historical association references to a concept
      // GET /{path}/concepts/{conceptId}/members
      function getMembersByTargetComponent(conceptId, branch) {
        var deferred = $q.defer();
        $http.get(apiEndpoint + branch + '/members?targetComponent=' + conceptId + '&limit=1000&active=true&expand=referencedComponent(expand(fsn()))').then(function (response) {
          if (response.data.total === 0) {
            deferred.resolve([]);
          } else {
            deferred.resolve(response.data);
          }
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
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
      function getFullConcept(conceptId, branch, acceptLanguageValue) {

        var deferred = $q.defer();
        var config = {};
        if (acceptLanguageValue) {
          config.headers = {'Accept-Language': acceptLanguageValue};
        }

        $http.get(apiEndpoint + 'browser/' + branch + '/concepts/' + conceptId, config).then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
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

            modules.push(module);
          });

        });
      }

      //Function to bulk get concepts
      function bulkGetConcept(conceptIdList, branch, expandPt) {
        var deferred = $q.defer();
        var queryString = '';
        angular.forEach(conceptIdList, function (concept, key) {
          if (key + 1 !== conceptIdList.length) {
            queryString += concept + '%20UNION%20';
          }
          else {
            queryString += concept;
          }
        });
        $http.get(apiEndpoint + branch + '/concepts?offset=0&limit=200&expand=fsn()' + (expandPt ? ',pt()' : '') + '&escg=' + queryString).then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      //Function to bulk get full concepts via POST
      function bulkRetrieveFullConcept(conceptIdList, branch, expandPt) {
          var body = {
              "conceptIds":conceptIdList
          }
        var deferred = $q.defer();
        var queryString = '';
        $http.post(apiEndpoint + 'browser/' + branch + '/concepts/bulk-load', body).then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      // function to retrieve all module id/name pairs
      function getModules() {
        return modules;
      }

      // add new language options
      // TODO:  Currently unused, language options are extracted from dialects
      function addLanguages(newLanguages) {
        languages = languages.concat(newLanguages);
      }

      // get language options
      // TODO:  Currently unused, language options are extracted from dialects
      function getLanguages() {
        return languages;
      }

      // add new dialect options
      function addDialects(newDialects) {
        dialects = dialects.concat(newDialects);
      }

      // get dialect options
      function getDialects() {
        return dialects;
      }

      //////////////////////////
      // Browser Functions
      //////////////////////////
      function browserStructureConversion(data) {

        let result = {
          active: data.active,
          concept: {
            active: data.active,
            conceptId: data.conceptId,
            definitionStatus: data.definitionStatus,
            fsn: data.fsn,
            preferredSynonym: data.preferredSynonym,
            moduleId: data.moduleId
          }
        };

        return result;
      }

      function searchAllConcepts(branch, termFilter, escgExpr, offset, limit, syn, lang, activeFilter) {
        let deferred = $q.defer();
        var config = {};

        let params = {
          offset: offset ? offset : '0',
          limit: limit ? limit : '50',
          expand: 'fsn()'
        };
        
        if (lang) {
          // declare headers if not specified
          if (!config.headers) {
            config.headers = {};
          }
          // set the accept language header
          if(typeof lang === "string"){
              config.headers['Accept-Language'] = lang;
          }
        }

        if(syn){
          params.expand = 'pt()';
        }

        if(activeFilter !== null) {
          params.activeFilter = activeFilter;
        }

        // if the user is searching with some form of numerical ID
        if(!isNaN(parseFloat(termFilter)) && isFinite(termFilter)) {

          // if user is searching with a conceptID
          if(termFilter.substr(-2, 1) === '0') {
            $http.get(apiEndpoint + 'browser/' + branch + '/concepts/' + termFilter, { params : params }).then(function(response) {

              let item = browserStructureConversion(response.data);

              deferred.resolve(response.data ? [item] : {items: [], total: 0});
            }, function(error) {
              deferred.reject(error);
            });
          }

          // if user is searching with a descriptionID
          else if(termFilter.substr(-2, 1) === '1') {
            $http.get(apiEndpoint + branch + '/descriptions/' + termFilter).then(function(response) {

              $http.get(apiEndpoint + 'browser/' + branch + '/concepts/' + response.data.conceptId, { params : params }).then(function(response2) {

                let item = browserStructureConversion(response2.data);

                deferred.resolve(response2.data ? [item] : {items: [], total: 0});
              }, function(error) {
                deferred.reject(error);
              });

            }, function(error) {
              deferred.reject(error);
            });
          }

          // if user is searching with a relationshipID
          else if(termFilter.substr(-2, 1) === '2') {
            $http.get(apiEndpoint + branch + '/relationships/' + termFilter, { params : params }).then(function(response) {

              let source = null;
              let target = null;

              $http.get(apiEndpoint + 'browser/' + branch + '/concepts/' + response.data.sourceId, { params : params }).then(function(sourceResponse) {

                source = browserStructureConversion(sourceResponse.data);

                if (source && target) {
                  deferred.resolve([source, target]);
                }

              }, function(error) {
                deferred.reject(error);
              });

              $http.get(apiEndpoint + 'browser/' + branch + '/concepts/' + response.data.destinationId).then(function(targetResponse) {

                target = browserStructureConversion(targetResponse.data);

                if (source && target) {
                  deferred.resolve([source, target]);
                }
              }, function(error) {
                deferred.reject(error);
              });

            }, function(error) {
              deferred.reject(error);
            });
          }

          // if the id is unrecognised
          else {
            console.error('unrecognised ID');
          }
        }

        // if the user is doing an ecl search
        else if(escgExpr){
          params.termFilter = termFilter;
          params.eclFilter = escgExpr;

          $http.post(apiEndpoint + branch + '/concepts/search', params, config).then(function (response) {

            let results = [];

            angular.forEach(response.data.items, function(item) {
              let obj = browserStructureConversion(item);

              if(syn) {
                obj.concept.conceptId = item.pt.conceptId;
                obj.concept.preferredSynonym = item.pt.term;
              }

              else {
                obj.concept.conceptId = item.fsn.conceptId;
                obj.concept.fsn = item.fsn.term;
              }

              results.push(obj);
            });

            response.data.items = results;

            deferred.resolve(response.data ? response.data : {items: [], total: 0});
          }, function (error) {
            deferred.reject(error);
          });
        }

        // if the user is searching for text
        else {
          params.termFilter = termFilter;

          $http.post(apiEndpoint + branch + '/concepts/search', params, config).then(function (response) {

            let results = [];

            angular.forEach(response.data.items, function(item) {
              let obj = browserStructureConversion(item);

              if(syn) {
                obj.concept.conceptId = item.pt.conceptId;
                obj.concept.preferredSynonym = item.pt.term;
              }

              else {
                obj.concept.conceptId = item.fsn.conceptId;
                obj.concept.fsn = item.fsn.term;
              }

              results.push(obj);
            });


            response.data.items = results;

            deferred.resolve(response.data ? response.data : {items: [], total: 0});
          }, function (error) {
            deferred.reject(error);
          });
        }

        return deferred.promise;
      }

      /**
       * Search for concepts by id or description term query
       * @param projectKey the project key
       * @param taskKey the task key
       * @param searchStr the component id or query text
       * @param offset the start index
       * @param maxResults the number of results to return
       * @param acceptLanguagesMap value of the Accept-Language header
       * @param synonymFlag whether to return synonyms (true) or fsns (false, default behavior)
       * @returns {*|promise} a single result or list of results
       */
      function findConceptsForQuery(projectKey, taskKey, searchStr, offset, maxResults, acceptLanguageValue, synonymFlag) {
        var deferred = $q.defer();

        // construct headers based on options
        var config = {};
        var descTypeStr = '';

        // if accept language value set, set header
        if (acceptLanguageValue) {
          // declare headers if not specified
          if (!config.headers) {
            config.headers = {};
          }
          // set the accept language header
          config.headers['Accept-Language'] = acceptLanguageValue;
        }

        // set preferred description type to synonym if indicated (note: blank defaults to FSN)
        if (synonymFlag) {
          descTypeStr = '&preferredDescriptionType=SYNONYM';
        }

        // ensure & not present in search string, to prevent bad requests
        // TODO Decide how we want to handle validation of user search requests
//        if (searchStr.indexOf('&') !== -1) {
//          deferred.reject('Character "&" cannot appear in search terms; please remove and try again.');
//        }



        // if a numeric value, search by component id
        if (!isNaN(parseFloat(searchStr)) && isFinite(searchStr)) {

          // if concept id
          if (searchStr.substr(-2, 1) === '0') {

            // use browser/{path}/concepts/{id} call
            $http.get(apiEndpoint + 'browser/' + metadataService.getBranchRoot() + '/' + projectKey + '/' + taskKey + '/concepts/' + searchStr, config).then(function (response) {

              // convert to browser search form
              var item = {
                active: response.data.active,
                term: response.data.preferredSynonym,
                concept: {
                  active: response.data.active,
                  conceptId: response.data.conceptId,
                  definitionStatus: response.data.definitionStatus,
                  fsn: response.data.fsn,
                  preferredSynonym: response.data.preferredSynonym,
                  moduleId: response.data.moduleId
                }
              };

              deferred.resolve([item]);
            }, function (error) {
              deferred.reject(error);
            });
          }

          // if description id
          else if (searchStr.substr(-2, 1) === '1') {

            // use {path}/descriptions/id call
            $http.get(apiEndpoint + metadataService.getBranchRoot() + '/' + projectKey + '/' + taskKey + '/descriptions/' + searchStr).then(function (response) {

              // descriptions endpoint returns different format, which does not
              // include definitionStatus, recall browser
              $http.get(apiEndpoint + 'browser/' + metadataService.getBranchRoot() + '/' + projectKey + '/' + taskKey + '/concepts/' + response.data.conceptId, config).then(function (response2) {

                // convert to browser search form
                var item = {
                  active: response2.data.active,
                  term: response2.data.preferredSynonym,
                  concept: {
                    active: response2.data.active,
                    conceptId: response2.data.conceptId,
                    definitionStatus: response2.data.definitionStatus,
                    fsn: response2.data.fsn,
                    preferredSynonym: response2.data.preferredSynonym,
                    moduleId: response2.data.moduleId
                  }
                };

                deferred.resolve([item]);
              }, function (error) {
                deferred.reject('Secondary call to retrieve concept failed: ', error);
              });

            }, function (error) {
              deferred.reject(error);
            });
          }

          // if relationship id
          else if (searchStr.substr(-2, 1) === '2') {

            // use {path}/descriptions/id call
            $http.get(apiEndpoint + metadataService.getBranchRoot() + '/' + projectKey + '/' + taskKey + '/relationships/' + searchStr).then(function (response) {

              var source = null;
              var target = null;

              // descriptions endpoint returns different format, which does not
              // include definitionStatus, recall browser
              $http.get(apiEndpoint + 'browser/' + metadataService.getBranchRoot() + '/' + projectKey + '/' + taskKey + '/concepts/' + response.data.sourceId, config).then(function (sourceResponse) {

                // convert to browser search form
                source = {
                  active: sourceResponse.data.active,
                  term: sourceResponse.data.preferredSynonym,
                  concept: {
                    active: sourceResponse.data.active,
                    conceptId: sourceResponse.data.conceptId,
                    definitionStatus: sourceResponse.data.definitionStatus,
                    fsn: sourceResponse.data.fsn,
                    preferredSynonym: sourceResponse.data.preferredSynonym,
                    moduleId: sourceResponse.data.moduleId
                  }
                };

                if (source && target) {
                  deferred.resolve([source, target]);
                }
              }, function (error) {
                deferred.reject('Secondary call to retrieve concept failed: ', error);
              });

              // descriptions endpoint returns different format, which does not
              // include definitionStatus, recall browser
              $http.get(apiEndpoint + 'browser/' + metadataService.getBranchRoot() + '/' + projectKey + '/' + taskKey + '/concepts/' + response.data.destinationId).then(function (targetResponse) {

                // convert to browser search form
                target = {
                  active: targetResponse.data.active,
                  term: targetResponse.data.preferredSynonym,
                  concept: {
                    active: targetResponse.data.active,
                    conceptId: targetResponse.data.conceptId,
                    definitionStatus: targetResponse.data.definitionStatus,
                    fsn: targetResponse.data.fsn,
                    preferredSynonym: targetResponse.data.preferredSynonym,
                    moduleId: targetResponse.data.moduleId
                  }
                };

                if (source && target) {
                  deferred.resolve([source, target]);
                }
              }, function (error) {
                deferred.reject('Secondary call to retrieve concept failed: ', error);
              });

            }, function (error) {
              deferred.reject(error);
            });

          }

          // otherwise, unsupported component type
          else {
            deferred.reject('Could not parse numeric value (not a concept, description, or relationship SCTID)');
          }
        }

        // otherwise, a text value, search by query
        else {
            searchStr = encodeURIComponent(searchStr);

          // use browser/{path}/descriptions?{options} call
          $http.get(apiEndpoint + 'browser/' + metadataService.getBranchRoot() + '/' + projectKey + '/' + taskKey + '/descriptions?query=' + searchStr + '&limit=' + maxResults + '&offset=' + offset + descTypeStr, config).then(function (response) {
            deferred.resolve(response.data);
          }, function (error) {
            if (error.status === 500) {
              deferred.reject('Unexpected server error.  Please check your search terms and try again.');
            } else {
              deferred.reject(error.data.message + ' (Status ' + error.status + ')');
            }
          });

        }

        return deferred.promise;

      }

      ////////////////////////////////
      // Review Functions
      ////////////////////////////////

      // Get a single review (for conflict purposes)
      // GET /reviews/{id}
      function getReview(id) {
        return $http.get(apiEndpoint + 'reviews/' + id).then(function (response) {
          return response.data;
        }, function (error) {
          return null;
        });
      }

      ////////////////////////////////
      // Traceability Functions
      ////////////////////////////////

      // Get traceability log for branch
      // GET /traceability-service/activities?onBranch=
      function getTraceabilityForBranch(branch) {
        var deferred = $q.defer();
        $http.get('/traceability-service/activities?onBranch=' + branch + '&size=50000').then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          if (error.status === 404) {
            deferred.reject('Traceability does not exist for branch');
          }
          else {
            deferred.reject('Unexpected error retrieving traceability for branch');
          }
        });
        return deferred.promise;
      }

      //////////////////////////////////////////////////////
      // Branch Functions
      //////////////////////////////////////////////////////

//    https://dev-term.ihtsdotools.org/snowowl/snomed-ct/v2/branches/MAIN/WRPAS/WRPAS-72/
      function getBranch(branch) {
        return $http.get(apiEndpoint + 'branches/' + branch).then(function (response) {
          return response.data;
        }, function (response) {
          return response;
        });
      }

      function createBranch(parent, task) {
        return $http.post(apiEndpoint + 'branches', {
          parent: parent,
          name: task
        }).then(function (response) {
          return response.data;
        }, function (error) {
          return null;
        });
      }

      function isBranchPromotable(branchPath) {
        var deferred = $q.defer();
        getBranch(branchPath).then(function (branch) {
          if (!branch) {
            deferred.resolve('Branch is null');
          }
          else if (branch.metadata && branch.metadata.preventPromotion) {
            deferred.resolve(false);
          } else {
            deferred.resolve(true);
          }
        }, function (error) {
          notificationService.sendError('Unexpected error retrieving branch for checking promotion eligibility');
          deferred.reject('Unexpected errror');
        });
        return deferred.promise;
      }

      function setBranchPreventPromotion(branchPath, preventPromotion) {
        var deferred = $q.defer();
        getBranch(branchPath).then(function (branch) {
          if (!branch) {
            deferred.reject('Branch is null');
          }
          else {
            if (!branch.metadata) {
              branch.metadata = {};
            }
            branch.metadata.preventPromotion = preventPromotion;
            $http.put(apiEndpoint + 'branches/' + branch, branch).then(function (updatedBranch) {
              deferred.resolve(updatedBranch);
            });
          }
        }, function (error) {
          notificationService.sendError('Unexpected error retrieving branch while setting promotion eligibility');
          deferred.reject('Unexpected error');
        });
      }

      ///////////////////////////////////////////////////
      // MRCM functions
      //////////////////////////////////////////////////

      function getDomainAttributes(branch, parentIds) {
        return $http.get(apiEndpoint + 'mrcm/' + branch + '/domain-attributes?parentIds=' + parentIds + '&expand=fsn()&offset=0&limit=50').then(function (response) {
          return response.data ? response.data : [];
        }, function (error) {
          return null;
        });
      }

      function getAttributeValues(branch, attributeId, searchStr) {
        return $http.get(apiEndpoint + 'mrcm/' + branch + '/attribute-values/' + attributeId + '?' + (searchStr ? 'termPrefix=' + encodeURIComponent(searchStr) + (!isNaN(parseFloat(searchStr) && isFinite(searchStr)) ? '' : '*') : '') + '&expand=fsn()&offset=0&limit=50').then(function (response) {
          return response.data.items ? response.data.items : [];
        }, function (error) {
          return null;
        });
      }

      function getAttributeValuesByConcept(branch, attributeId, searchStr) {
        return $http.get(apiEndpoint + 'mrcm/' + branch + '/attribute-values/' + attributeId + '?' + 'termPrefix=' + encodeURIComponent(searchStr) + '&expand=fsn()&offset=0&limit=50').then(function (response) {
          return response.data.items ? response.data.items : [];
        }, function (error) {
          return null;
        });
      }

      function getAttributeValuesFromEcl(branch, searchStr, ecl) {
        return $http.get(apiEndpoint + branch + '/concepts?active=true&expand=fsn()&term=' + searchStr + '&ecl=' + encodeURIComponent(ecl)).then(function (response) {
          return response.data.items ? response.data.items : [];
        }, function (error) {
          return null;
        });
      }

      //////////////////////////////////////////////////////////
      // Merge Review functions
      /////////////////////////////////////////////////////////

      function pollForReview(mergeReviewId, intervalTime) {

        var deferred = $q.defer();

        if (!mergeReviewId) {
          console.error('Cannot poll for merge details, id required');
          deferred.reject('Cannot poll for merge details, id required');
        }
        if (!intervalTime) {
          intervalTime = 1000;
        }

        $timeout(function () {
          $http.get(apiEndpoint + 'merge-reviews/' + mergeReviewId).then(function (response) {

            // if review is ready, get the details
            if (response && response.data && response.data.status === 'CURRENT') {
              $http.get(apiEndpoint + 'merge-reviews/' + mergeReviewId + '/details').then(function (response) {
                deferred.resolve(response.data);
              }, function (error) {
                deferred.reject('Could not retrieve details of reported current review');
              });
            } else {
              pollForReview(mergeReviewId, intervalTime * 1.5).then(function (pollResults) {
                deferred.resolve(pollResults);
              }, function (error) {
                deferred.reject(error);
              });
            }
          }, function (error) {
            deferred.reject('Cannot retrieve review information');
          });
        }, intervalTime);

        return deferred.promise;
      }

      /**
       * Generates a new merge review for a specified source and target branch
       * Polls for details and returns details once available
       * @param parentBranch the parent branch
       * @param childBranch the child branch
       * @returns {*}
       */
      function generateMergeReview(parentBranch, childBranch, projectKey, taskKey) {
        var deferred = $q.defer();
        $http.post(apiEndpoint + 'merge-reviews', {
          source: parentBranch,
          target: childBranch
        }).then(function (response) {

          // extract the merge-review id from the location header
          var locHeader = response.headers('Location');
          var mergeReviewId = locHeader.substr(locHeader.lastIndexOf('/') + 1);

          if (taskKey) {
            $http.post('../authoring-services/' + 'ui-state/' + projectKey + '-' + taskKey + '-merge-review-id', '"' + mergeReviewId + '"');
          } else {
            $http.post('../authoring-services/' + 'ui-state/' + projectKey + '-merge-review-id', '"' + mergeReviewId + '"');
          }
          pollForReview(mergeReviewId, 1000).then(function (response) {
            response.id = mergeReviewId;
            deferred.resolve(response);
          }, function (error) {
            deferred.reject(error);
          });
        }, function (error) {
          deferred.reject('Could not create merge review');
        });

        return deferred.promise;
      }

      /**
       * Function to get details of a current merge review by id
       * Returns null if review does not exist or is not current
       */
      function getMergeReviewDetails(mergeReviewId) {
        return $http.get(apiEndpoint + 'merge-reviews/' + mergeReviewId).then(function (response) {
          if (response && response.data && response.data.status === 'CURRENT') {
            return $http.get(apiEndpoint + 'merge-reviews/' + mergeReviewId + '/details').then(function (response2) {
              var mergeReview = response2.data;
              mergeReview.id = mergeReviewId; // re-append id for convenience
              return mergeReview;
            }, function (error) {
              return null;
            });
          }
        }, function (error) {
          return null;
        });
      }

      /**
       * Function to get the basic merge-review object without details
       */
      function getMergeReview(mergeReviewId) {
        return $http.get(apiEndpoint + 'merge-reviews/' + mergeReviewId).then(function (response) {
          var mergeReview = response.data;
          mergeReview.id = mergeReviewId; // re-append id for convenience
          return mergeReview;
        }, function (error) {
          return null;
        });
      }

      function getMerge(mergeId) {
        return $http.get(apiEndpoint + 'merges/' + mergeId).then(function (response) {
          var merge = response.data;
          merge.id = mergeId; // re-append id for convenience
          return merge;
        }, function (error) {
          return null;
        });
      }

      function getMergeReviewForBranches(parentBranch, childBranch) {
        return $http.post(apiEndpoint + 'merge-reviews', {
          source: parentBranch,
          target: childBranch
        }).then(function (response) {
          // extract the merge-review id from the location header
          var locHeader = response.headers('Location');
          var mergeReviewId = locHeader.substr(locHeader.lastIndexOf('/') + 1);

          return getMergeReview(mergeReviewId);
        });
      }

      function rebaseBranches(parentBranch, childBranch, id) {
        return $http.post(apiEndpoint + 'merges', {
          source: parentBranch,
          target: childBranch,
          reviewId: id
        }).then(function (response) {
          // extract the merge-review id from the location header
          var locHeader = response.headers('Location');
          var mergeId = locHeader.substr(locHeader.lastIndexOf('/') + 1);

          return {locHeader: locHeader};
        });
      }

      /**
       * Save a concept against its merge review for later playback
       * @param id the merge review id
       * @param conceptId
       * @param concept
       * @returns {status}
       */
      function storeConceptAgainstMergeReview(id, conceptId, concept) {
        return $http.post(apiEndpoint + 'merge-reviews/' + id + '/' + conceptId, concept).then(function (response) {
          return response.data;
        }, function (error) {
          return error.data;
        });
      }

      /**
       * Merge and apply stored changes
       */
      function mergeAndApply(mergeReviewId) {
        var deferred = $q.defer();
        $http.post(apiEndpoint + 'merge-reviews/' + mergeReviewId + '/apply').then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          if (error.status === 504) {
            notificationService.sendWarning('Your rebase operation is taking longer than expected, and is still running. You may work on other tasks while this runs and return to the dashboard to check the status in a few minutes.');
            return 1;
          }
          else if (error.status === 409) {
            notificationService.sendWarning('Another operation is in progress on this Project. Please try again in a few minutes.');
            return null;

          }
          else {
            notificationService.sendError('Error rebasing Task: ' + mergeReviewId);
            return null;
          }
        });
        return deferred.promise;
      }

      ////////////////////////////////////////////////////
      // Concept Validation
      ////////////////////////////////////////////////////

      function createGuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }

      function validateConcept(projectKey, taskKey, concept, keepTempIds) {


        cleanConcept(concept, keepTempIds);

        // assign UUIDs to elements without an SCTID
        if (!concept.conceptId) {
          concept.conceptId = createGuid();
        }
        angular.forEach(concept.descriptions, function (description) {
          if (!description.descriptionId) {
            description.descriptionId = createGuid();
          }
        });
        angular.forEach(concept.relationships, function (relationship) {
          if (!relationship.relationshipId) {
            relationship.relationshipId = createGuid();
          }
        });

        // Clone concept and remove property "display" in relationship if any
        // This is used for preventing any update on the cloned concept while the original one could be changed concurrently
        var copy = angular.copy(concept);
        cleanConcept(copy, true);

        var deferred = $q.defer();
        $http.post(apiEndpoint + 'browser/' + metadataService.getBranchRoot() + '/' + projectKey + (taskKey ? '/' + taskKey : '') + '/validate/concept', copy).then(function (response) {

          // TODO Remove this once WRP-2912 addressed
          // remove any duplicate values
          var items = response.data;
          for (var i = 0; i < items.length; i++) {
            for (var j = i + 1; j < items.length; j++) {
              if (items[i].componentId === items[j].componentId &&
                items[i].severity === items[j].severity &&
                items[i].conceptId === items[j].conceptId &&
                items[i].message === items[j].message) {
                items.splice(j, 1);
              }
            }
          }

          deferred.resolve(items);
        }, function (error) {
          deferred.reject(error.message);
        });
        return deferred.promise;
      }

      function isConceptId(id) {
        var idStr = String(id);
        return isSctid(idStr) && idStr.substring(idStr.length - 2, idStr.length - 1) === '0';
      }

      function isDescriptionId(id) {
        var idStr = String(id);
        return isSctid(idStr) && idStr.substring(idStr.length - 2, idStr.length - 1) === '1';
      }

      function isRelationshipId(id) {
        var idStr = String(id);
        return isSctid(idStr) && idStr.substring(idStr.length - 2, idStr.length - 1) === '2';
      }

      // search concepts by branch, filter, and escgExpr
      function searchConcepts(branch, termFilter, escgExpr, offset, limit, syn, acceptLanguageValue) {
        var deferred = $q.defer();
        var config = {};
        
        if (acceptLanguageValue) {
          // declare headers if not specified
          if (!config.headers) {
            config.headers = {};
          }
          // set the accept language header
          config.headers['Accept-Language'] = acceptLanguageValue;
        }

        // paging/filtering/sorting with defaults applied
        var params = {
          offset: offset ? offset : '0',
          limit: limit ? limit : '50',
          expand: 'fsn()'
        };

        if(syn){
            params.expand = 'pt()'
        }
        if (termFilter) {
          params.termFilter = termFilter;
        }
        if (escgExpr) {
          params.eclFilter = escgExpr;
        }

        $http.post(apiEndpoint + branch + '/concepts/search', params, config).then(function (response) {
          deferred.resolve(response.data ? response.data : {items: [], total: 0});
        }, function (error) {
          deferred.reject(error);
        });

        return deferred.promise;
      }

      ////////////////////////////////////////////
      // Method Visibility
      // TODO All methods currently visible!
      ////////////////////////////////////////////
      return {

        getConceptProperties: getConceptProperties,
        getConceptSNF: getConceptSNF,
        getDescriptionProperties: getDescriptionProperties,
        getRelationshipProperties: getRelationshipProperties,
        getConceptPreferredTerm: getConceptPreferredTerm,
        getConceptFsn: getConceptFsn,
        updateConcept: updateConcept,
        bulkUpdateConcept: bulkUpdateConcept,
        createConcept: createConcept,
        inactivateConcept: inactivateConcept,
        inactivateDescription: inactivateDescription,
        deleteConcept: deleteConcept,
        getConceptParents: getConceptParents,
        getConceptChildren: getConceptChildren,
        getStatedConceptChildren: getStatedConceptChildren,
        getConceptDescriptions: getConceptDescriptions,
        getConceptRelationshipsInbound: getConceptRelationshipsInbound,
        getConceptRelationshipsOutbound: getConceptRelationshipsOutbound,
        getConceptDescendants: getConceptDescendants,
        getRelationshipDisplayNames: getRelationshipDisplayNames,
        getFullConcept: getFullConcept,
        updateDescription: updateDescription,
        startClassificationForTask: startClassificationForTask,
        getClassificationForTask: getClassificationForTask,
        getClassificationForProject: getClassificationForProject,
        getClassificationsForTask: getClassificationsForTask,
        getClassificationsForProject: getClassificationsForProject,
        getEquivalentConcepts: getEquivalentConcepts,
        getRelationshipChanges: getRelationshipChanges,
        getModelPreview: getModelPreview,
        saveClassification: saveClassification,
        addModules: addModules,
        bulkGetConcept: bulkGetConcept,
        bulkRetrieveFullConcept: bulkRetrieveFullConcept,
        getModules: getModules,
        addLanguages: addLanguages,
        getLanguages: getLanguages,
        addDialects: addDialects,
        getDialects: getDialects,
        downloadClassification: downloadClassification,
        findConceptsForQuery: findConceptsForQuery,
        searchConcepts: searchConcepts,
        searchAllConcepts: searchAllConcepts,
        getReview: getReview,
        getMembersByTargetComponent: getMembersByTargetComponent,

        // attribute retrieval
        getDomainAttributes: getDomainAttributes,
        getAttributeValues: getAttributeValues,
        getAttributeValuesByConcept: getAttributeValuesByConcept,
        getAttributeValuesFromEcl: getAttributeValuesFromEcl,

        // branch functionality
        getBranch: getBranch,
        createBranch: createBranch,
        getTraceabilityForBranch: getTraceabilityForBranch,
        isBranchPromotable: isBranchPromotable,
        setBranchPreventPromotion: setBranchPreventPromotion,

        // merge-review functionality
        getMergeReview: getMergeReview,
        getMergeReviewForBranches: getMergeReviewForBranches,
        getMergeReviewDetails: getMergeReviewDetails,
        generateMergeReview: generateMergeReview,
        storeConceptAgainstMergeReview: storeConceptAgainstMergeReview,
        mergeAndApply: mergeAndApply,

        // validation
        validateConcept: validateConcept,

        // utility
        createGuid: createGuid,
        isSctid: isSctid,
        isConceptId: isConceptId,
        isDescriptionId: isDescriptionId,
        isRelationshipId: isRelationshipId,
        cleanConcept: cleanConcept,
        cleanDescription: cleanDescription,
        cleanRelationship: cleanRelationship
      };
    }

  ])
;
