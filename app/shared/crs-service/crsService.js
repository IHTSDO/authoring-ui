'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles all functionality surrounding CRS tickets
 */
  .factory('crsService', function ($http, $rootScope, $q, scaService, snowowlService, $timeout, notificationService) {

      var currentTask;

      var currentTaskConcepts = null;

      function getJsonAttachmentsForTask() {
        var deferred = $q.defer();

        scaService.getTaskAttachments(currentTask.projectKey, currentTask.key).then(function (response) {

          // parse JSON

          deferred.resolve(response);
        }, function (error) {
          notificationService.sendError(error);
          deferred.reject(error);
        });
        return deferred.promise;
      }


      //
      // TODO Move this into endpoint config
      //
      function getRequestUrl(issueId) {
        if ($rootScope.development) {
          return 'https://dev-request.ihtsdotools.org/#/requests/view/' + issueId;
        } else if ($rootScope.uat) {
          return 'https://uat-request.ihtsdotools.org/#/requests/view/' + issueId;
        } else {
          return '';
        }
      }

      //
      // Helper retrieval functions
      //

      function getRelationshipForId(concept, id) {
        if (!id) {
          return null;
        }
        for (var i = 0; i < concept.relationships.length; i++) {
          if (concept.relationships[i].relationshipId === id) {
            return concept.relationships[i];
          }
        }
        return null;
      }

      function getDescriptionForId(concept, id) {
        if (!id) {
          return null;
        }
        for (var i = 0; i < concept.descriptions.length; i++) {
          if (concept.descriptions[i].descriptionId === id) {
            return concept.descriptions[i];
          }
        }
        return null;
      }

      function updateConceptFromCrsRequest(concept, crsConcept) {

        // apply the definition of changes to the concept itself
        concept.definitionOfChanges = crsConcept.definitionOfChanges;

        // apply definition of changes to descriptions
        angular.forEach(crsConcept.descriptions, function (crsDescription) {
          var desc = getDescriptionForId(concept, crsDescription.descriptionId);

          // if new (no id), add to the concept
          if (desc === null) {
            concept.descriptions.push(angular.copy(crsDescription));
          }

          // otherwise, append the definition of changes to the retrieved concept
          else {
            desc.definitionOfChanges = crsDescription.definitionOfChanges;
          }

        });

        // apply definition of changes to relationships
        angular.forEach(crsConcept.relationships, function (crsRelationship) {
          var rel = getRelationshipForId(concept, crsRelationship.relationshipId);

          // if new (no id), add to the concept
          if (rel === null) {
            concept.relationships.push(angular.copy(crsRelationship));
          }

          // otherwise, append the definition of changes to the retrieved concept
          else {
            rel.definitionOfChanges = crsRelationship.definitionOfChanges;
          }
        });
      }

      //
      // Retrieve the full concept representation of a CRS concept from branch
      //
      function prepareCrsConcept(crsRequest) {

        var deferred = $q.defer();

        // if no crsRequest present, treat as Other Request (no attachment content)
        if (!crsRequest) {
          deferred.resolve({fsn : 'Request without proposed concept'});
        }

        // if no concept id specified or NEW_CONCEPT specified, new concept, generate GUID and return
        else if (!crsRequest.conceptId) {
          var copy = angular.copy(crsRequest);
          copy.conceptId = snowowlService.createGuid();
          deferred.resolve(copy);
        }

        // otherwise, if NEW_CONCEPT specified, simply return the request
        else if (crsRequest.definitionOfChanges && crsRequest.definitionOfChanges.changeType === 'NEW_CONCEPT') {
          deferred.resolve(angular.copy(crsRequest));
        }

        // otherwise, get the concept as it exists on this branch
        else {
          snowowlService.getFullConcept(crsRequest.conceptId, currentTask.branchPath).then(function (concept) {

              // apply the CRS request to the latest version of the concept
              updateConceptFromCrsRequest(concept, crsRequest);
              deferred.resolve(concept);
            },
            // If rejected, assume external id has been assigned for a new concept
            function (error) {
              deferred.reject(error);
            });
        }
        return deferred.promise;
      }

//
// Create a new CRS Concept Container from a JSON object url
//
      function getNewCrsConcept(attachment) {

        // console.debug('getNewCrsConcept', attachment);

        var deferred = $q.defer();

        prepareCrsConcept(attachment.content).then(function (preparedConcept) {

          deferred.resolve({
            // the id fields (for convenience)
            conceptId: preparedConcept.conceptId,
            fsn: preparedConcept.fsn,
            preferredSynonym: preparedConcept.preferredSynonym,

            // the request url
            requestUrl: getRequestUrl(attachment.issueKey),

            // the freshly retrieved concept with definition changes appended
            concept: preparedConcept,

            // the original JSON
            conceptJson: attachment,

            // flags & error
            emptyContent: attachment.emptyContent,
            error: attachment.error,
            saved: false,
            requiresCreation: preparedConcept && preparedConcept.definitionOfChanges && preparedConcept.definitionOfChanges.changeType === 'NEW_CONCEPT'

          });
        }, function (error) {
          deferred.reject(error);
        });


        return deferred.promise;
      }

//
// Clear the CRS Concept list for a task
//
// TODO Wire this to "reset" button if desired later
      function clearCrsConceptsUiState(task) {
        scaService.deleteUiStateForTask(task.projectKey, task.key, 'crs-concepts');
      }


//
// Stores the CRS Concept list in UI State
//
      function saveCrsConceptsUiState() {
        scaService.saveUiStateForTask(currentTask.projectKey, currentTask.key, 'crs-concepts', currentTaskConcepts);
      }

// initialize ui states for a CRS task
      function initializeCrsTask() {
        var deferred = $q.defer();

        // retrieve attachments (if any) -- must be done first
        getJsonAttachmentsForTask().then(function (attachments) {

          currentTaskConcepts = [];

          angular.forEach(attachments, function (attachment) {

            getNewCrsConcept(attachment).then(function (crsConcept) {
              currentTaskConcepts.push(crsConcept);

              if (currentTaskConcepts.length === attachments.length) {

                // save the initialized state into the UI State
                saveCrsConceptsUiState();

                console.debug('crs result', currentTaskConcepts);
                // resolve
                deferred.resolve(currentTaskConcepts);
              }
            }, function (error) {
              console.error('Error creating CRS concept container: ', error);
              deferred.reject('Error creating CRS concept container');
            });

          });
        }, deferred.reject('Could not load attachments'));
        return deferred.promise;
      }


//
// Gets the CRS concepts for task, initializing UI states on first attempt
// NOTE: This function MUST resolve to avoid blocking edit-view initialization
      function setTask(task) {
        var deferred = $q.defer();

        // set the local task variable for use by other functions
        currentTask = task;

        // clear the concepts list
        currentTaskConcepts = null;

        // PREREQUISITE: Task must have CRS label
        if (!task.labels || task.labels.indexOf('CRS') === -1) {
          deferred.resolve('Not a CRS task');
        } else {

          // TODO Remove later -- Time delay for DEV to prevent header-access errors
          //console.debug('IS DEV', $rootScope.development);
          var timeDelay = $rootScope.development === null || $rootScope.development === undefined ? 2000 : 0;
          $timeout(function () {

            // check if this task has previously been initialized
            scaService.getUiStateForTask(task.projectKey, task.key, 'crs-concepts').then(function (concepts) {

              // if already initialized, simply return
              if (concepts) {
                currentTaskConcepts = concepts;

                console.debug('crs result', currentTaskConcepts);
                deferred.resolve(concepts);
              } else {
                initializeCrsTask().then(function () {

                  console.debug('crs result', currentTaskConcepts);
                  deferred.resolve(currentTaskConcepts);
                }, function () {
                  // NOTE: Must resolve to prevent blocking in edit.js
                  deferred.resolve([]);
                });
              }
            });
          }, timeDelay);
        }
        return deferred.promise;
      }

      function requiresCreation(id) {

        if (!currentTaskConcepts) {
          return false;
        }

        for (var i = 0; i < currentTaskConcepts.length; i++) {
          console.debug('checking ', id, currentTaskConcepts[i].conceptId, currentTaskConcepts[i].requiresCreation)
          if (id === currentTaskConcepts[i].conceptId && currentTaskConcepts[i].requiresCreation) {
            console.debug('match found');
            return true;
          }
        }
        return false;
      }

      function isCrsConcept(id) {

        if (!currentTaskConcepts) {
          return false;
        }

        //  console.debug('  checking crs concept for ', id, currentTaskConcepts);
        for (var i = 0; i < currentTaskConcepts.length; i++) {
          if (currentTaskConcepts[i].conceptId === id) {
            return true;
          }
        }
        return false;
      }

      function getCrsConcept(id) {
        for (var i = 0; i < currentTaskConcepts.length; i++) {
          if (currentTaskConcepts[i].conceptId === id) {
            return currentTaskConcepts[i];
          }
        }
        return null;
      }

      function getCrsConcepts() {
        if (!currentTaskConcepts) {
          return [];
        }
        return currentTaskConcepts.filter(function(concept) {
          return !concept.emptyContent;
        });
      }

      function getCrsEmptyRequests() {
        if (!currentTaskConcepts) {
          return [];
        }
        return currentTaskConcepts.filter(function(concept) {
          return concept.emptyContent;
        });
      }


//
// Save a concept against the stored id
// NOTE: crsId required because snowowl may assign a new id
//
      function saveCrsConcept(crsId, concept) {
        for (var i = 0; i < currentTaskConcepts.length; i++) {
          if (currentTaskConcepts[i].conceptId === crsId) {

            // overwrite the concept id, concept, and set to saved
            currentTaskConcepts[i].conceptId = concept.conceptId;
            currentTaskConcepts[i].concept = concept;
            currentTaskConcepts[i].saved = true;
            currentTaskConcepts[i].isNewConcept = false;
            saveCrsConceptsUiState();
            break;
          }
        }
      }

      var hiddenCrsKeys = ['changeId', 'changeType', 'changed', 'topic', 'summary', 'notes', 'reference', 'reasonForChange', 'namespace', 'currentFsn'];

      function crsFilter(definitionOfChanges) {
        var result = {};
        angular.forEach(definitionOfChanges, function (v, k) {
          if (hiddenCrsKeys.indexOf(k) === -1) {
            result[k] = v;
          }
        });
        return result;
      }

//
// Function exposure
//
      return {
        setTask: setTask,
        isCrsConcept: isCrsConcept,
        requiresCreation: requiresCreation,
        getCrsConcept: getCrsConcept,
        getCrsConcepts: getCrsConcepts,
        getCrsEmptyRequests: getCrsEmptyRequests,
        saveCrsConcept: saveCrsConcept,

        crsFilter: crsFilter

      };
    }
  )
;
