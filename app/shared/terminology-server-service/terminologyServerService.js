'use strict';

//
// This generic service can be used with either Snow Owl or Snowstorm terminology servers.
//
angular.module('singleConceptAuthoringApp')
  .service('terminologyServerService', ['$http', '$q', '$timeout', '$interval', 'notificationService', 'metadataService', '$rootScope',
    function ($http, $q, $timeout, $interval, notificationService, metadataService, $rootScope) {
      let apiEndpoint = null;

      /////////////////////////////////////
      // Methods to normalise the Snowstorm response formats
      /////////////////////////////////////
      // normaliseSnowstormConcepts(response.data);
      function normaliseSnowstormConcepts(items) {
        angular.forEach(items, function(concept) {
          normaliseSnowstormConcept(concept);
        });
      }

      function normaliseSnowstormMergeReviewConcepts(mergeReview, mergeReviewId){
        angular.forEach(mergeReview, function(review){
          if (review.autoMergedConcept) {
            normaliseSnowstormConcept(review.autoMergedConcept);
          }
          if (review.sourceConcept) {
            normaliseSnowstormConcept(review.sourceConcept);
          }
          if (review.targetConcept) {
            normaliseSnowstormConcept(review.targetConcept);
          }
        })
        mergeReview.id = mergeReviewId;
        return mergeReview
      }

      function normaliseSnowstormConcept(concept) {
        normaliseSnowstormTerms(concept);
        if (typeof concept.relationships == "object") {
          normaliseSnowstormRelationships(concept.relationships);
        }
        if (typeof concept.classAxioms == "object") {
          normaliseSnowstormAxioms(concept.classAxioms);
        }
        if (typeof concept.gciAxioms == "object") {
          normaliseSnowstormAxioms(concept.gciAxioms);
        }
      }

      function normaliseSnowstormAxioms(items) {
        angular.forEach(items, function(axiom) {
          normaliseSnowstormRelationships(axiom.relationships)
        });
      }

      function normaliseSnowstormRelationships(items) {
        angular.forEach(items, function(relationship) {
            if(!relationship.target){
                relationship.target = {};
            }
            if (typeof relationship.source == "object") {
              normaliseSnowstormTerms(relationship.source);
            }
            if (typeof relationship.type == "object") {
              normaliseSnowstormTerms(relationship.type);
              relationship.type.pt = relationship.type.fsn.substr(0, relationship.type.fsn.lastIndexOf('(')).trim();
            }
            if (typeof relationship.target == "object") {
              normaliseSnowstormTerms(relationship.target);
            }
        });
      }

      function normaliseSnowstormTerms(component) {
        if (typeof component.fsn == "object") {
          // Flatten Snowstorm FSN data structure
          component.fsn = component.fsn.term;
        }
        if (typeof component.pt == "object") {
          // Flatten Snowstorm PT data structure
          component.pt = component.pt.term;
          component.preferredSynonym = component.pt;
        }
      }

      /////////////////////////////////////
      // Terminology Server Branch Metadata Methods
      /////////////////////////////////////

      function updateBranchMetadata(branch, metadata) {
        var deferred = $q.defer();
        $http.put(apiEndpoint + 'branches/' + branch + '/metadata-upsert', metadata).then(function (response) {          
          deferred.resolve(response.metadata);
        }, function (error) {          
          deferred.reject(error);
        });
        return deferred.promise;
      }

      /////////////////////////////////////
      // Terminology Server Concept Retrieval Methods
      /////////////////////////////////////

      // Create New Concept
      // POST /browser/{path}/concepts
      function createConcept(project, task, concept, validate) {
        var queryParams = '';
        if (validate) {
          queryParams += 'validate=' + validate;
        }
        var deferred = $q.defer();
        $http.post(apiEndpoint + 'browser/' + metadataService.getBranchRoot() + '/' + project + '/' + task + '/concepts/' + (queryParams ? '?' + queryParams : ''), concept).then(function (response) {
          var validationResults = response.data && response.data.hasOwnProperty("validationResults") ? response.data.validationResults : [];
          delete response.data.validationResults;

          normaliseSnowstormConcept(response.data);

          deferred.resolve({concept: response.data, validationResults: validationResults});
        }, function (error) {
          if (error && error.status === 400) {
            var validationResults = [];
            if (error.data && error.data.hasOwnProperty("validationResults")) {
              validationResults = error.data.validationResults;

              deferred.resolve({concept: concept, validationResults: validationResults});
            } else {
              deferred.reject(error);
            }            
          }
          deferred.reject(error);
        });
        return deferred.promise;
      }

      // Update Existing Concept
      // PUT /browser/{path}/concepts/{conceptId}
      function updateConcept(project, task, concept, validate) {
        var queryParams = '';
        if (validate) {
          queryParams += 'validate=' + validate;
        }
        var deferred = $q.defer();
        $http.put(apiEndpoint + 'browser/' + metadataService.getBranchRoot() + '/' + project + '/' + task + '/concepts/' + concept.conceptId + (queryParams ? '?' + queryParams : ''), concept).then(function (response) {
          var validationResults = response.data && response.data.hasOwnProperty("validationResults") ? response.data.validationResults : [];
          delete response.data.validationResults;

          normaliseSnowstormConcept(response.data);

          deferred.resolve({concept: response.data, validationResults: validationResults});
        }, function (error) {
          if (error && error.status === 400) {
            var validationResults = [];
            if (error.data && error.data.hasOwnProperty("validationResults")) {
              validationResults = error.data.validationResults;             

              deferred.resolve({concept: concept, validationResults: validationResults});
            } else {
              deferred.reject(error);
            }            
          }
          deferred.reject(error);
        });
        return deferred.promise;
      }

      //Update array of concepts
      //PUT /browser/{path}/concepts/{conceptId}
      function bulkUpdateConcept(branch, conceptArray, allowCreate) {
        var deferred = $q.defer();
        $http.post(apiEndpoint + 'browser/' + branch + '/concepts/bulk' + (allowCreate ? '?allowCreate=' + allowCreate : ''), conceptArray).then(function (response) {
          pollForBulkUpdate(response.headers('Location'), 1000).then(function (result) {
            deferred.resolve(result);
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
              if (typeof response.data.message !== 'undefined') {
                deferred.reject(response.data.message);
              }
              else {
                deferred.reject('Bulk concept update failed');
              }              
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

      //Validate array of concepts
      //POST /browser/{path}/validate/concepts
      function bulkValidateConcepts(branch, conceptArray) {
        var deferred = $q.defer();
        $http.post(apiEndpoint + 'browser/' + branch + '/validate/concepts', conceptArray).then(function (response) {
          normaliseSnowstormConcepts(response.data);
          deferred.resolve(response);
        }, function (error) {
          normaliseSnowstormConcepts(response.data);
          deferred.reject(error);
        });
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
          'active', 'released', 'moduleId', 'target', 'relationshipId', 'effectiveTime', 'characteristicType', 'sourceId', 'modifier', 'type', 'groupId', 'concreteValue'
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
        console.log(description);
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
        console.log(description);
      }

      function cleanAxiom(axiom) {
        var allowableAxiomRelationshipProperties = ['axiomId', 'definitionStatus', 'effectiveTime', 'active', 'released', 'moduleId', 'relationships'];

        for (var key in axiom) {
          if (allowableAxiomRelationshipProperties.indexOf(key) === -1) {
            delete axiom[key];
          }

          if (key === 'relationships') {
            angular.forEach(axiom[key], function (relationship) {
              cleanRelationship(relationship);
            });
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
          'active', 'released', 'moduleId', 'target', 'relationshipId', 'effectiveTime', 'characteristicType', 'sourceId', 'modifier', 'type', 'groupId', 'concreteValue'
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
        if(relationship.type){
            cleanRelationshipType(relationship.type);
        }
        if(relationship.target){
            cleanRelationshipType(relationship.target);
        }
      }
        
      function cleanRelationshipType(relationship) {

        var allowableRelationshipProperties = [
          'conceptId', 'fsn', 'pt', 'active', 'definitionStatus', 'effectiveTime', 'moduleId', 'released'
        ];
        for (var key in relationship) {
          if (allowableRelationshipProperties.indexOf(key) === -1) {
            delete relationship[key];
          }
        }
        if(relationship.pt !== null && typeof relationship.pt == "object"){
            relationship.pt = relationship.pt.term;
        }
      }
        
      function cleanRelationshipTarget(relationship) {

        var allowableRelationshipProperties = [
          'conceptId', 'fsn', 'pt'
        ];
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
          'preferredSynonym', 'relationships', 'inactivationIndicator', 'associationTargets', 'classAxioms', 'gciAxioms'];

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

          // Terminology Server require source id set
          relationship.sourceId = concept.conceptId;

        });
          
        //Loop through and remove any axioms that have been added during feedback axiom comparions
        if(concept.classAxioms){
            for (var i = concept.classAxioms.length - 1; i >= 0; i--) {
                if (concept.classAxioms[i].deleted) {
                    concept.classAxioms.splice(i, 1);
                }
            }
        }
        
        if(concept.gciAxioms){
            for (var i = concept.gciAxioms.length - 1; i >= 0; i--) {
                if (concept.gciAxioms[i].deleted) {
                    concept.gciAxioms.splice(i, 1);
                }
            }
        }
          
        //Loop through and remove any axiom relationships that have been added during feedback axiom comparions
          
        angular.forEach(concept.classAxioms, function(axiom){
            for (var i = axiom.relationships.length - 1; i >= 0; i--) {
                if (axiom.relationships[i].deleted) {
                    axiom.relationships.splice(i, 1);
                }
            }
        });
        angular.forEach(concept.gciAxioms, function(axiom){
            for (var i = axiom.relationships.length - 1; i >= 0; i--) {
                if (axiom.relationships[i].deleted) {
                    axiom.relationships.splice(i, 1);
                }
            }
        });

        if (concept.classAxioms) {
          angular.forEach(concept.classAxioms, function (axiom) {
            cleanAxiom(axiom);
          });
        }

        if (concept.gciAxioms) {
          angular.forEach(concept.gciAxioms, function (axiom) {
            cleanAxiom(axiom);
          });
        }
      }

      // function to remove disallowed elements from a concept
      function getConceptDescendants(conceptId, branch, offset, limit) {
        var deferred = $q.defer();
        // default values
        if (!limit) {
          limit = 50;
        }
        if (limit > 200) {
          limit = 200;
        }
        $http.get(apiEndpoint + branch + '/concepts/' + conceptId + '?expand=descendants(form:"inferred",direct:false,limit:200,expand(fsn()))').then(function (response) {
          deferred.resolve(response.data.descendants);
        }).then(function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      //////////////////////////////////////////////
      // Classification functions
      //////////////////////////////////////////////      

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
        
      // get all classification results for a branchroot
      function getClassificationsForBranchRoot(branchroot) {
        return $http.get(apiEndpoint + branchroot + '/classifications').then(function (response) {
          return response.data.items;
        });
      }

      // get all classification results for a project or task based on specific branch path
      function getClassifications(branchPath) {
        return $http.get(apiEndpoint + branchPath + '/classifications').then(function (response) {
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
          'url': apiEndpoint + branch + '/classifications/' + classifierId + '/relationship-changes?expand=source.fsn,type.fsn,destination.fsn&limit=' + (limit ? limit : '1000'),
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
          normaliseSnowstormConcept(response.data);
          return response.data;
        });
      }

      function saveClassification(branch, classificationId) {
        var JSON = '{ "status" : "SAVED"}';
        return $http.put(apiEndpoint + branch + '/classifications/' + classificationId, JSON, {
          headers: {'Content-Type': 'application/json; charset=UTF-8'}
        }).then(function (response) {
          return response;
        }, function (response) {
          console.error('Saving classification failed', response);
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
          normaliseSnowstormConcepts(response.data);
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
          normaliseSnowstormConcepts(response.data);
          return response.data;
        }, function (error) {
          // TODO Handle error
        });

      }

      // Retrieve stated children of a concept
      // GET /{path}/concepts/{conceptId}/children?form=stated
      function getStatedConceptChildren(conceptId, branch) {
        let deferred = $q.defer();
        let params = {};
        params.statedEclFilter = '<< ' + conceptId;
        doSearch(branch, params, null, null).then(function (response) {
            deferred.resolve(response);
          }, function (error) {
            deferred.reject(error);
          });
        return deferred.promise;
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
          'conceptId': conceptId,
          'commitComment': 'Inactivation',
          'inactivationIndicator': inactivationIndicator,
          'active': false,
          'associationTargets': associationTargets
        };

        $http.put(apiEndpoint + 'browser/' + branch + '/concepts/' + conceptId, propertiesObj).then(function (response) {
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
          // TODO: is this dead code? This is not implemented in Snowstorm
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

      /**
       * Get the properties for a specified member
       * @param memberId the memberId
       * @param branch the member's branch
       * @returns the member properties object
       */
      function getMemberProperties(memberId, branch) {
        return $http.get(apiEndpoint + branch + 'members/' + memberId).then(function (response) {
          return response.data;
        }, function (error) {
          return null;
        });
      }      

      // Retrieve inbound relationships of a concept
      // GET /{path}/concepts/{conceptId}/inbound-relationships
      function getConceptRelationshipsInbound(conceptId, branch, offset, limit, active) {

        var deferred = $q.defer();

        if (!limit) {
          limit = 10000;
        }

        var params = 'destination=' + conceptId + '&expand=source(expand(fsn())),type(expand(fsn()))&limit=' + limit;

        if (active) {
          params += '&active=' + active;
        }

        $http.get(apiEndpoint + branch + '/relationships?' + params).then(function (response) {

          // if zero-count, return empty array (no blank array returned)
          if (response.data.total === 0) {
            deferred.resolve({total: 0, inboundRelationships: []});
          } else {
            // otherwise, return the passed array
            normaliseSnowstormRelationships(response.data.items);
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
            normaliseSnowstormRelationships(response.data.outboundRelationships);
            deferred.resolve(response.data.outboundRelationships);
          }
        }, function (error) {
          // TODO Handle error
        });

      }

      // Retrieve historical association references to a concept
      // GET /{path}/concepts/{conceptId}/members
      function getHistoricalAssociationMembers(conceptId, branch) {
        // Fetch members from any reference set which is a descendant of 900000000000522004 |Historical association reference set (foundation metadata concept)|.
        return getMembersByTargetComponent(conceptId, branch, '<900000000000522004');
      }

      // Retrieve members which have a targetComponent of a concept
      // GET /{path}/concepts/{conceptId}/members
      function getMembersByTargetComponent(conceptId, branch, referenceSet) {
        var deferred = $q.defer();
        $http.get(apiEndpoint + branch + '/members?referenceSet=' + referenceSet + '&targetComponent=' + conceptId + '&limit=1000&active=true&expand=referencedComponent(expand(fsn()))').then(function (response) {
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

      function getReferenceSetMembersForBranch(branch) {
        var deferred = $q.defer();
        $http.get(apiEndpoint + 'browser/'+ branch + '/members?active=true&limit=1').then(function (response) {
          if (response.data.referenceSets) {
            deferred.resolve(response.data.referenceSets);
          } else {
            deferred.resolve(null);
          }
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }
        
        
      // Retrieve members where the type is GCI and the provided conceptId is referenced
      // GET /{path}/members
      function getGciExpressionsFromTarget(conceptId, branch) {
        var deferred = $q.defer();
        $http.get(apiEndpoint + branch + '/members?owlExpression.conceptId=' + conceptId + '&owlExpression.gci=true&limit=1000&active=true&expand=referencedComponent(expand(fsn()))').then(function (response) {
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

      // GET /{path}/concepts/{conceptId}/members
      function getMembersByReferencedComponent(referencedComponentId, branch, active) {
        var deferred = $q.defer();
        var params = '&limit=1000';
        if (typeof active !== 'undefined') {
          params += '&active=' + active;
        }
        $http.get(apiEndpoint + branch + '/members?referencedComponentId=' + referencedComponentId + params).then(function (response) {
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

      function getReferenceSetsByReferencedComponent(conceptId, branch) {
        var deferred = $q.defer();
        $http.get(apiEndpoint + 'browser/' + branch + '/members?referencedComponentId=' + conceptId + '&limit=1000').then(function (response) {
          if (response.data.totalElements === 0) {
            deferred.resolve(null);
          } else {
            deferred.resolve(response.data);
          }
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      function getMrcmAttributeDomainMembers(branch) {
        var deferred = $q.defer();
        $http.get(apiEndpoint + branch + '/members?referenceSet=723561005&offset=0&limit=500&active=true&expand=referencedComponent(expand(fsn()))').then(function (response) {
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
          normaliseSnowstormConcept(response.data);
          deferred.resolve(response.data);
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      // Helper call to retrieve a concept with all elements
      // Puts all elements in save-ready format
      function findConcept(conceptId, branch, acceptLanguageValue) {

        var deferred = $q.defer();
        var config = {};
        if (acceptLanguageValue) {
          config.headers = {'Accept-Language': acceptLanguageValue};
        }

        $http.get(apiEndpoint +  branch + '/concepts/' + conceptId, config).then(function (response) {
          normaliseSnowstormConcept(response.data);
          deferred.resolve(response.data);
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }
        
      // Helper call to retrieve a concept with all elements at a point in time
      // Puts all elements in save-ready format
      function getFullConceptAtDate(conceptId, branch, acceptLanguageValue, date) {
        let param = null;
        if(apiEndpoint.includes('snowowl')){
            param = '^';
        }
        else{
            param = '@' + date;
        }

        var deferred = $q.defer();
        var config = {};
        if (acceptLanguageValue) {
          config.headers = {'Accept-Language': acceptLanguageValue};
        }

        $http.get(apiEndpoint + 'browser/' + branch + param + '/concepts/' + conceptId, config).then(function (response) {
          normaliseSnowstormConcept(response.data);
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
      function bulkGetConceptUsingPOST(conceptIdList, branch) {
        var deferred = $q.defer();
        if (conceptIdList.length === 0) {
          deferred.resolve({"items": []});
          return deferred.promise;
        }
        var body = {
            "conceptIds": conceptIdList,
            "limit": 1000
        }
        $http.post(apiEndpoint + branch + '/concepts/search', body).then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }

      //Function to bulk get full concepts via POST
      function bulkRetrieveFullConcept(conceptIdList, branch, acceptLanguageValue) {
        var deferred = $q.defer();
        // Return empty array if no concepts requested
        if (conceptIdList.length === 0) {
          deferred.resolve([]);
          return deferred.promise;
        }
        var body = {
            "conceptIds":conceptIdList
        }
        var config = {};
        
        // if accept language value set, set header
        if (acceptLanguageValue) {
          // declare headers if not specified
          if (!config.headers) {
            config.headers = {};
          }
          // set the accept language header
          config.headers['Accept-Language'] = acceptLanguageValue;
        }

        $http.post(apiEndpoint + 'browser/' + branch + '/concepts/bulk-load', body, config).then(function (response) {
          normaliseSnowstormConcepts(response.data)
          deferred.resolve(response.data);
        }, function (error) {
          if(error.data.status === 404){
              deferred.resolve([]);
          }
          else{
            deferred.reject(error);
          }
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
        return {
          active: data.active,
          concept: {
            active: data.active,
            conceptId: data.id,
            definitionStatus: data.definitionStatus,
            fsn: data.fsn ? data.fsn.term : data.fsn,
            preferredSynonym: data.pt ? data.pt.term : data.pt,
            moduleId: data.moduleId,
            term: data.pt ? data.pt.term : data.pt
          }
        };
      }

      function searchAllConcepts(branch, termFilter, escgExpr, offset, limit, syn, lang, activeFilter, tsv, definitionStatus, view, conceptIdList, searchAfter, searchTimestamp, termActive, preferredOrAcceptableIn) {
        let deferred = $q.defer();
        let config = {};
        let params = {
          //offset: offset ? offset : '0',
          limit: limit ? limit : '50',
          //expand: 'fsn()'
        };
        if (searchAfter !== null){
            params.searchAfter = searchAfter;
        }

        if (!config.headers) {
          config.headers = {};
        }

        if (lang) {
          if(typeof lang === "string"){
              config.headers['Accept-Language'] = lang;
          }
        }

        // if (syn) {
        //   params.expand = 'pt()';
        // }

        if (activeFilter !== null) {
          params.activeFilter = activeFilter;
        }

        if (escgExpr && termActive) {
          params.termActive = termActive === 'active' ? true : false;
        }

        if (tsv) {
          config.headers['Accept'] = 'text/csv';
          //params.offset = 0;
          params.limit = 10000;
          //params.expand = 'pt(),fsn()';
        }

        if (definitionStatus && escgExpr || definitionStatus && conceptIdList) {
          params.definitionStatusFilter = definitionStatus;
        }

        if (preferredOrAcceptableIn) {
          params.preferredOrAcceptableIn = preferredOrAcceptableIn;
        }

        // if the user is searching with a refsetId
        if (termFilter.substr(8, 1) === '-' && termFilter.substr(13, 1) === '-') {
          doRefsetSearch(branch, params, config, termFilter).then(function (response) {
            deferred.resolve(response);
          }, function (error) {
            deferred.reject(error);
          });
        }
        // if the user is searching with some form of numerical ID
        else if (!isNaN(parseFloat(termFilter)) && isFinite(termFilter) || Array.isArray(conceptIdList)) {
          // if user is searching with a conceptID
          if (conceptIdList || termFilter.substr(-2, 1) === '0') {
            if (!Array.isArray(conceptIdList)) {
              params.conceptIds = [termFilter];
              doSearch(branch, params, config, tsv, searchTimestamp).then(function (response) {
                // If no concept found, then search by normal text
                if (response.total === 0) {
                  delete params.conceptIds;
                  params.termFilter = termFilter;
                  doSearch(branch, params, config, tsv, searchTimestamp).then(function (response) {
                    deferred.resolve(response);
                  }, function (error) {
                    deferred.reject(error);
                  });
                } else {
                  deferred.resolve(response);
                }
              }, function (error) {
                deferred.reject(error);
              });
            }
            else {
              params.termFilter = termFilter;
              params.conceptIds = conceptIdList;

              doSearch(branch, params, config, tsv, searchTimestamp).then(function (response) {
                deferred.resolve(response);
              }, function (error) {
                deferred.reject(error);
              });
            }
          }
          // if user is searching with a descriptionID
          else if (termFilter.substr(-2, 1) === '1') {
            $http.get(apiEndpoint + branch + '/descriptions/' + termFilter).then(function(response) {
              params.conceptIds = [response.data.conceptId];
              doSearch(branch, params, config, tsv, searchTimestamp).then(function (response) {
                // If no concept found, then search by normal text
                if (response.total === 0) {
                  delete params.conceptIds;
                  params.termFilter = termFilter;
                  doSearch(branch, params, config, tsv, searchTimestamp).then(function (response) {
                    deferred.resolve(response);
                  }, function (error) {
                    deferred.reject(error);
                  });
                } else {
                  deferred.resolve(response);
                }
              }, function (error) {
                deferred.reject(error);
              });
            }, function(error) {
              deferred.reject(error);
            });
          }
          // if user is searching with a relationshipID
          else if (termFilter.substr(-2, 1) === '2') {
            $http.get(apiEndpoint + branch + '/relationships/' + termFilter, { params : params }).then(function(response) {
              params.conceptIds = [response.data.sourceId, response.data.destinationId];
              doSearch(branch, params, config, tsv, searchTimestamp).then(function (response) {
                // If no concept found, then search by normal text
                if (response.total === 0) {
                  delete params.conceptIds;
                  params.termFilter = termFilter;
                  doSearch(branch, params, config, tsv, searchTimestamp).then(function (response) {
                    deferred.resolve(response);
                  }, function (error) {
                    deferred.reject(error);
                  });
                } else {
                  deferred.resolve(response);
                }
              }, function (error) {
                deferred.reject(error);
              });

            }, function(error) {
              deferred.reject(error);
            });
          }
          // if the id is unrecognised
          else {
            console.error('unrecognised ID');
            params.termFilter = termFilter;

            doSearch(branch, params, config, tsv, searchTimestamp).then(function (response) {
              deferred.resolve(response);
            }, function (error) {
              deferred.reject(error);
            });
          }
        }

        // if the user is doing an ecl search
        else if (escgExpr) {
          params.termFilter = termFilter;

          if (view === 'stated') {
            params.statedEclFilter = escgExpr;
          } else {
            params.eclFilter = escgExpr;
          }

          doSearch(branch, params, config, tsv, searchTimestamp).then(function (response) {
            deferred.resolve(response);
          }, function (error) {
            deferred.reject(error);
          });
        }

        // if the user is searching for text
        else {
          params.termFilter = termFilter;

          doSearch(branch, params, config, tsv, searchTimestamp).then(function (response) {
            deferred.resolve(response);
          }, function (error) {
            deferred.reject(error);
          });
        }

        return deferred.promise;
      }

      function doSearch (branch, params, config, tsv, searchTimestamp) {
        let deferred = $q.defer();
        if (params.termFilter && params.termFilter.includes(',')){
          let conceptArray = params.termFilter.split(',').map(function(item) {
            return item.trim();
          }).filter(function(item) {
            return item != '';
          });
          if (conceptArray.filter(function(item) {return item.substr(-2, 1) !== '0';}).length === 0) {
            params.conceptIds = conceptArray;
            delete params.termFilter;
          }
        }
        $http.post(apiEndpoint + branch + '/concepts/search', params, config).then(function (response) {
            if (tsv) {
              deferred.resolve(response);
            }
            else {
              let results = [];
              angular.forEach(response.data.items, function(item) {
                let obj = browserStructureConversion(item);
                results.push(obj);
              });
              if (results.length !== 0) {
                response.data.items = results;
              }
              else {
                response.data = {items: [], total: 0}
              }              
              if (searchTimestamp) {
                response.data.searchTimestamp = searchTimestamp;
              }
              deferred.resolve(response.data);
            }
          }, function (error) {
            deferred.reject(error);
          });

        return deferred.promise;
      }

      function doRefsetSearch (branch, params, config, axiomId) {
        let deferred = $q.defer();

        $http.get(apiEndpoint + branch + '/members/' + axiomId).then(function (response) {
              let results = [];
              if(response.data.refsetId === '733073007'){
                  params.conceptIds = [response.data.referencedComponentId];
                  doSearch(branch, params, config, false).then(function (concept){
                      deferred.resolve(concept);
                  });
              }
          }, function (error) {
            deferred.reject(error);
          });

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
          $http.get(apiEndpoint + 'browser/' + metadataService.getBranchRoot() + '/' + projectKey + '/' + taskKey + '/descriptions?query=' + searchStr + '&limit=' + maxResults + descTypeStr, config).then(function (response) {
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
      function getTraceabilityForBranch(branch, conceptId, activityType, brief) {
        console.log(brief);
        var deferred = $q.defer();
        var params = 'size=50000';
        if(branch) {
          params += '&onBranch=' + branch;
        }
        if(conceptId) {
          params += '&conceptId=' + conceptId;
        }
        if(activityType) {
          params += '&activityType=' + activityType;
        }
        if(brief){
          params += '&brief=true'
        }

        $http.get('/traceability-service/activities?' + params).then(function (response) {
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

      // Get last promotion for branch
      // GET /traceability-service/activities/promotions?page=0&size=1&sort=commitDate,desc&sourceBranch=
      function getLastPromotionTimeToMain(branchRoot) {
        if(!branchRoot) {
          console.error('Error retrieving last promotion time: Branh root is missing');
          return null;
        }
        var params = 'page=0&size=1&sort=commitDate%2Cdesc&sourceBranch=' + encodeURIComponent(branchRoot);
        return $http.get('/traceability-service/activities/promotions?' + params).then(function (response) {
          return response.data && response.data.content && response.data.content[0] ? response.data.content[0].commitDate : null;
        }, function (error) {
          return null;
        });
      }

      // Get last promotion for branch
      // GET /traceability-service/activities/promotions?page=0&size=1&sort=commitDate,desc&sourceBranch=
      function getLastTaskPromotionTime(branchRoot) {
        if(!branchRoot) {
          console.error('Error retrieving last promotion time: Branh root is missing');
          return null;
        }
        var params = 'page=0&size=1&sort=commitDate%2Cdesc&onBranch=' + encodeURIComponent(branchRoot);
        return $http.get('/traceability-service/activities?' + params).then(function (response) {
          return response.data && response.data.content && response.data.content[0] ? response.data.content[0].commitDate : null;
        }, function (error) {
          return null;
        });
      }

      // Get last active for branchs
      function getLastActivityOnBranches(branches) {
        if(!branches) {
          console.error('Error retrieving last activity for branches. No such branch is provided');
          return null;
        }

        return $http.post('/traceability-service/activities/branches/last', branches).then(function (response) {
          return response.data;
        }, function (error) {
          return null;
        });
      }

      ////////////////////////////////
      // Terminology Server Administrative Services
      ////////////////////////////////
      function getAllCodeSystemVersionsByShortName (codeSystemShortName) {
        if(!codeSystemShortName) {
          console.error('Error retrieving versions: code system is not defined');
          return null;
        }
          
        let url = '';
        
        if(apiEndpoint.includes('snowowl')){
            url = 'snowowl/admin/codesystems/';
        }
        else{
            url = apiEndpoint + 'codesystems/';
        }
          
        return $http.get(url + codeSystemShortName + '/versions').then(function (response) {
          return response;
        }, function (error) {
          return null;
        });
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
        return $http.get(apiEndpoint + 'mrcm/' + branch + '/domain-attributes?parentIds=' + parentIds + '&expand=pt(),fsn()&limit=50').then(function (response) {
          return response.data ? response.data : [];
        }, function (error) {
          return null;
        });
      }

      function getAttributeValues(branch, attributeId, searchStr) {
        return $http.get(apiEndpoint + 'mrcm/' + branch + '/attribute-values/' + attributeId + '?' + (searchStr ? 'termPrefix=' + encodeURIComponent(searchStr) : '') + '&expand=fsn()&limit=50').then(function (response) {
          return response.data.items ? response.data.items : [];
        }, function (error) {
          return null;
        });
      }

      function getAttributeValuesByConcept(branch, attributeId, searchStr) {
        return $http.get(apiEndpoint + 'mrcm/' + branch + '/attribute-values/' + attributeId + '?' + 'termPrefix=' + encodeURIComponent(searchStr) + '&expand=fsn()&limit=50').then(function (response) {
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
          intervalTime = 5000;
        }

        $timeout(function () {
          $http.get(apiEndpoint + 'merge-reviews/' + mergeReviewId).then(function (response) {

            // if review is ready, get the details
            if (response && response.data && response.data.status === 'CURRENT') {
              $http.get(apiEndpoint + 'merge-reviews/' + mergeReviewId + '/details').then(function (response) {
                deferred.resolve(normaliseSnowstormMergeReviewConcepts(response.data, mergeReviewId));
              }, function (error) {
                deferred.reject('Could not retrieve details of reported current review');
              });
            } else {
              pollForReview(mergeReviewId, intervalTime).then(function (pollResults) {
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
      function generateMergeReview(parentBranch, childBranch) {
        var deferred = $q.defer();
        $http.post(apiEndpoint + 'merge-reviews', {
          source: parentBranch,
          target: childBranch
        }).then(function (response) {

          // extract the merge-review id from the location header
          var locHeader = response.headers('Location');
          var mergeReviewId = locHeader.substr(locHeader.lastIndexOf('/') + 1);

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
        var deferred = $q.defer();
        $http.get(apiEndpoint + 'merge-reviews/' + mergeReviewId).then(function (response) {
          console.log(response);
          if (response && response.data && response.data.status === 'CURRENT') {
            $http.get(apiEndpoint + 'merge-reviews/' + mergeReviewId + '/details').then(function (response2) {
              deferred.resolve(normaliseSnowstormMergeReviewConcepts(response2.data, mergeReviewId));
            }, function (error) {
              deferred.reject(null);
            });
          }
          else{
              deferred.resolve(null);
          }
        }, function (error) {
          deferred.reject(null);
        });
        return deferred.promise;
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

      function synchronousMerge(sourceBranch, targetBranch, mergeReviewId) {
        var deferred = $q.defer();

        $http.post(apiEndpoint + 'merges', {
          source: sourceBranch,
          target: targetBranch,
          reviewId: mergeReviewId
        }).then(function (response) {
          // Extract the merge id from the location header
          var locHeader = response.headers('Location');
          var mergeId = locHeader.substr(locHeader.lastIndexOf('/') + 1);
          pollUntilStatusComplete(apiEndpoint + 'merges/' + mergeId, ['SCHEDULED', 'IN_PROGRESS']).then(function(merge) {
              deferred.resolve(merge);
            }, function(merge) {
              deferred.reject(merge);
            });
        });

        return deferred.promise;
      }

      function pollUntilStatusComplete(url, runningStatuses) {
        var deferred = $q.defer();

        var statusPoll = null;
        function stopStatusPolling() {
          if (statusPoll) {
            console.log('Stopping status polling of ' + url);
            $interval.cancel(statusPoll);
          }
        }

        statusPoll = $interval(function () {
          $http.get(url).then(function (response) {
            if (response && response.data){
              if (runningStatuses.indexOf(response.data.status) === -1){
                stopStatusPolling();
                deferred.resolve(response.data);
              }
            }
          }, function(error) {
            stopStatusPolling();
            console.error(error);
            deferred.reject(error);            
          });
        }, 2000)

        return deferred.promise;
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
            if (error.data && error.data.message) {
              var errorMsg = error.data.message;

              var errorConflictMsg = '';
              if (error.data.conflicts) {
                angular.forEach(error.data.conflicts, function(conflict) {
                  errorConflictMsg += '\n' + conflict.message;
                });
              }

              if (errorConflictMsg.length > 0) {
                errorMsg = errorMsg + ' : ' + errorConflictMsg;
              }
              notificationService.sendError(errorMsg);

              return null;
            }
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

      /**
       * Branch integrity check - if available on this terminology server
       */
      function branchIntegrityCheck(branch) {
        var deferred = $q.defer();
        
        $http.post(apiEndpoint + branch + '/integrity-check').then(function (response) {
          deferred.resolve(response.data);
        }, function(error) {
          deferred.reject(error.message);
        });
        return deferred.promise;
      }

       /**
       * Branch upgrade integrity check - if available on this terminology server
       */
      function branchUpgradeIntegrityCheck(branch, extensionMainBranchPath) {
        var deferred = $q.defer();
        
        $http.post(apiEndpoint + branch + '/upgrade-integrity-check' + (extensionMainBranchPath ? '?extensionMainBranchPath=' + extensionMainBranchPath : '')).then(function (response) {
          deferred.resolve(response.data);
        }, function(error) {
          if (error && error.data && error.data.message) {
            deferred.reject(error.data.message);
          }
          else {
            deferred.reject(error);
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
        angular.forEach(concept.classAxioms, function (axiom) {
          if (!axiom.axiomId) {
            axiom.axiomId = createGuid();
          }
        });
        angular.forEach(concept.gciAxioms, function (axiom) {
          if (!axiom.axiomId) {
            axiom.axiomId = createGuid();
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
      function searchConcepts(branch, termFilter, escgExpr, offset, limit, syn, acceptLanguageValue, stated) {
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
          // offset: offset ? offset : '0',
          limit: limit ? limit : '50',
          expand: 'fsn()'
        };

        if(syn){
          params.expand = 'pt()'
        }
        if(termFilter) {
          params.termFilter = termFilter;
        }
        if(escgExpr && !stated){
          params.eclFilter = escgExpr;
        }
        if(escgExpr && stated) {
          params.statedEclFilter = escgExpr;
        }

        $http.post(apiEndpoint + branch + '/concepts/search', params, config).then(function (response) {
          deferred.resolve(response.data ? response.data : {items: [], total: 0});
        }, function (error) {
          deferred.reject(error);
        });

        return deferred.promise;
      }
        
      //Config service instatiates endpoint after config load
      function setEndpoint(url){
          apiEndpoint = url;
      }

      function getEndpoint() {
        var defer = $q.defer();        
        if (!apiEndpoint) {                  
          setTimeout(function waitForTerminologyServerURL() {                              
            if (!apiEndpoint) {                      
              setTimeout(waitForTerminologyServerURL, 10);
            } 
            else {                  
              defer.resolve(apiEndpoint);
            }
          }, 10);
        }
        else {              
          defer.resolve(apiEndpoint);
        }
        
        return defer.promise;
      }

      function fetchConflictMessage(merge) {
        var generalMessage = 'There are content conflicts. Please contact technical support. ';
        if (merge.apiError && merge.apiError.additionalInfo && merge.apiError.additionalInfo.integrityIssues) {
          // Snowstorm gives us this.
          var deferred = $q.defer();
          deferred.resolve(generalMessage + JSON.stringify(merge.apiError.additionalInfo.integrityIssues));
          return deferred.promise;
        } else {
          return $http.get(apiEndpoint + 'merges?' + 'source=' + encodeURIComponent(source) + '&target=' + encodeURIComponent(target) + '&status=' + status).then(function (response) {
            if (response && response.data && response.data.items && response.data.items.length > 0) {
              var msg = '';
              angular.forEach(response.data.items, function (item) {
                if (item.id == merge.id) {
                  angular.forEach(item.conflicts, function (conflict) {
                    if (msg.length > 0) {
                      msg = msg + ' \n';
                    }
                    msg += conflict.message;
                  });
                }
              });
              return generalMessage + msg;
            }
          }, function (error) {
            return null;
          });
        }
      }

      function findClosestActiveAncestor(inactiveConceptId, branch) {
        var defer = $q.defer();
        var findingConcept =  function(conceptId, branch, defer) {          
          getFullConcept(conceptId, branch).then(function (response) {
            if (response.active) {
              defer.resolve(response);
            } else {
              for (let i = 0; i < response.classAxioms[0].relationships.length; i++) {
                let rel = response.classAxioms[0].relationships[i];
                if (rel.active && rel.type.conceptId === '116680003') {
                  findingConcept(rel.target.conceptId, branch, defer);
                  break;
                }
              }
            }
          });  
        }
        findingConcept(inactiveConceptId, branch, defer);
        return defer.promise;
      }
        
      // Mark branch as complex
      // POST /branches/{branchPath}/actions/set-author-flag
      function markBranchAsComplex(branch, value) {
        let body = {
          "name": "complex",
          "value": value
        };
        return $http.post(apiEndpoint + 'branches/' + branch + '/actions/set-author-flag', body).then(function (response) {
          return response.data;
        }, function (error) {
        });
      }

      function retrieveSemanticTags() {
        var deferred = $q.defer();        
        $http.get(apiEndpoint + 'validation-maintenance/semantic-tags').then(function (response) {
          deferred.resolve(response.data);
        }).then(function (error) {
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
        getMemberProperties: getMemberProperties,
        getConceptPreferredTerm: getConceptPreferredTerm,
        updateConcept: updateConcept,
        updateBranchMetadata: updateBranchMetadata,
        bulkUpdateConcept: bulkUpdateConcept,
        bulkValidateConcepts: bulkValidateConcepts,
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
        findConcept: findConcept,
        getFullConceptAtDate: getFullConceptAtDate,
        updateDescription: updateDescription,
        getClassificationForTask: getClassificationForTask,
        getClassificationForProject: getClassificationForProject,        
        getClassificationsForBranchRoot: getClassificationsForBranchRoot,
        getClassifications: getClassifications,
        getClassificationsForProject: getClassificationsForProject,
        getEquivalentConcepts: getEquivalentConcepts,
        getRelationshipChanges: getRelationshipChanges,
        getModelPreview: getModelPreview,
        saveClassification: saveClassification,
        addModules: addModules,
        bulkGetConceptUsingPOST: bulkGetConceptUsingPOST,
        bulkRetrieveFullConcept: bulkRetrieveFullConcept,
        getModules: getModules,
        addLanguages: addLanguages,
        getLanguages: getLanguages,
        addDialects: addDialects,
        getDialects: getDialects,
        downloadClassification: downloadClassification,
        findConceptsForQuery: findConceptsForQuery,
        findClosestActiveAncestor: findClosestActiveAncestor,
        searchConcepts: searchConcepts,
        searchAllConcepts: searchAllConcepts,
        getReview: getReview,
        getHistoricalAssociationMembers: getHistoricalAssociationMembers,
        getMembersByTargetComponent: getMembersByTargetComponent,
        getReferenceSetMembersForBranch: getReferenceSetMembersForBranch,
        getMembersByReferencedComponent: getMembersByReferencedComponent,
        getReferenceSetsByReferencedComponent: getReferenceSetsByReferencedComponent,
        getGciExpressionsFromTarget: getGciExpressionsFromTarget,

        // attribute retrieval
        getDomainAttributes: getDomainAttributes,
        getMrcmAttributeDomainMembers: getMrcmAttributeDomainMembers,
        getAttributeValues: getAttributeValues,
        getAttributeValuesByConcept: getAttributeValuesByConcept,
        getAttributeValuesFromEcl: getAttributeValuesFromEcl,

        // branch functionality
        getBranch: getBranch,
        createBranch: createBranch,
        getTraceabilityForBranch: getTraceabilityForBranch,
        getLastActivityOnBranches: getLastActivityOnBranches,
        isBranchPromotable: isBranchPromotable,
        setBranchPreventPromotion: setBranchPreventPromotion,
        getLastPromotionTimeToMain: getLastPromotionTimeToMain,
        getLastTaskPromotionTime: getLastTaskPromotionTime,
        synchronousMerge: synchronousMerge,
        markBranchAsComplex: markBranchAsComplex,

        // Terminology Server Administrative Services
        getAllCodeSystemVersionsByShortName: getAllCodeSystemVersionsByShortName,

        // merge-review functionality
        getMergeReview: getMergeReview,
        getMergeReviewForBranches: getMergeReviewForBranches,
        getMergeReviewDetails: getMergeReviewDetails,
        generateMergeReview: generateMergeReview,
        storeConceptAgainstMergeReview: storeConceptAgainstMergeReview,
        mergeAndApply: mergeAndApply,
        branchIntegrityCheck: branchIntegrityCheck,
        branchUpgradeIntegrityCheck: branchUpgradeIntegrityCheck,
        fetchConflictMessage: fetchConflictMessage,

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
        cleanRelationship: cleanRelationship,
        setEndpoint: setEndpoint,
        getEndpoint: getEndpoint,
        retrieveSemanticTags: retrieveSemanticTags
      };
    }

  ])
;
