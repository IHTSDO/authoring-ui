'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles all functionality surrounding CRS tickets
 */
  .factory('crsService', function ($http, $rootScope, $q, scaService, metadataService, terminologyServerService, $timeout, notificationService, componentAuthoringUtil) {

      var currentTask;

      var currentTaskConcepts = null;

      var crsRequestStatuses = [];

      var crsEndpoint = null;

      var usCrsEndpoint = null;

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

      function getRequestUrl() {
        return (currentTask.branchPath.indexOf('-US') !== -1) ? usCrsEndpoint : crsEndpoint;
      }

      /**
       * Parses a content promotion summary and returns all concepts.
       * Example: "Content promotion of 11 |term 1| and dependency: 22 |term 2|, 33 |term 3|"
       * Returns: ['11', '22', '33', ...]
       */
      function getConceptIdsFromPromotionSummary(summary) {
        if (!summary || typeof summary !== 'string') {
          return [];
        }
        var result = [];
        var re = /(\d+)\s+\|([^|]*)\|/g;
        var match;
        while ((match = re.exec(summary)) !== null) {
          result.push(match[1]);
        }
        return result;
      }

      function getApiEndPoint() {
        return '../' + ((currentTask.branchPath.indexOf('-US') !== -1) ? 'us-ihtsdo-crs' : 'ihtsdo-crs') + '/api/request/';
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
          if (crsRelationship.characteristicType === 'STATED_RELATIONSHIP') {
            let found = false;
            angular.forEach(concept.classAxioms, function(axiom){
                angular.forEach(axiom.relationships, function (axiomRel){
                  if(axiomRel.type.conceptId === crsRelationship.type.conceptId
                    && ((axiomRel.target && crsRelationship.target && axiomRel.target.conceptId === crsRelationship.target.conceptId)
                        || (axiomRel.concreteValue && crsRelationship.concreteValue && axiomRel.concreteValue.valueWithPrefix === crsRelationship.concreteValue.valueWithPrefix))
                    && axiomRel.groupId === crsRelationship.groupId){
                      found = true;
                      axiomRel.definitionOfChanges = crsRelationship.definitionOfChanges;
                  }
                });
            })

            // if not found, add to the concept
            if (!found && crsRelationship.active) {
              var copiedConcept = angular.copy(crsRelationship);
              let fsn = copiedConcept.type.fsn;
              copiedConcept.type.pt = fsn.substr(0, fsn.lastIndexOf('(') - 1).trim();
              concept.classAxioms[0].relationships.push(copiedConcept);
            }
          }
        });

        concept.definitionStatus = crsConcept.definitionStatus;
        let fullyDefinedDefinitionFound = false;
        concept.classAxioms.forEach(function(item, index) {
          if (crsConcept.definitionStatus === 'PRIMITIVE') {
            item.definitionStatus = 'PRIMITIVE';
          }
          else {
            if (!fullyDefinedDefinitionFound && item.definitionStatus === 'FULLY_DEFINED') {
              fullyDefinedDefinitionFound = true;
            }
          }
        });
        if (!fullyDefinedDefinitionFound && crsConcept.definitionStatus === 'FULLY_DEFINED') {
          concept.classAxioms[0].definitionStatus = crsConcept.definitionStatus;
        }
      }

      //
      // Retrieve the full concept representation of a CRS concept from branch
      //
      function prepareCrsConcept(crsRequest) {

        var deferred = $q.defer();

        // if no crsRequest present, treat as Other Request (no attachment content)
        if (!crsRequest) {
          deferred.resolve({fsn: 'Request without proposed concept'});
        }

        // if no concept id specified or NEW_CONCEPT specified, new concept, generate GUID and return
        else if (!crsRequest.conceptId) {
          var copy = angular.copy(crsRequest);
          copy.conceptId = terminologyServerService.createGuid();
          copy.classAxioms = [];
          copy.classAxioms.push(componentAuthoringUtil.getNewAxiom());
          copy.classAxioms[0].relationships = angular.copy(copy.relationships);
          if (crsRequest.definitionStatus === 'FULLY_DEFINED') {
            copy.classAxioms[0].definitionStatus = 'FULLY_DEFINED';
          }
          angular.forEach(copy.classAxioms[0].relationships, function (rel){
              rel.type.pt =  rel.type.fsn.substr(0, rel.type.fsn.lastIndexOf('(')).trim();
          })
          delete copy.relationships;
          deferred.resolve(copy);
        }

        // otherwise, if NEW_CONCEPT specified, simply return the request
        else if (crsRequest.definitionOfChanges && crsRequest.definitionOfChanges.changeType === 'NEW_CONCEPT') {

          var copy = angular.copy(crsRequest);

          //  if id provided, trim any erroneous whitespace
          if (copy.conceptId) {
            copy.conceptId = copy.conceptId.trim();
          }

          copy.classAxioms = [];
          copy.classAxioms.push(componentAuthoringUtil.getNewAxiom());
          copy.classAxioms[0].relationships = angular.copy(copy.relationships);
          if (crsRequest.definitionStatus === 'FULLY_DEFINED') {
            copy.classAxioms[0].definitionStatus = 'FULLY_DEFINED';
          }
          angular.forEach(copy.classAxioms[0].relationships, function (rel){
              rel.type.pt =  rel.type.fsn.substr(0, rel.type.fsn.lastIndexOf('(')).trim();
          });
          delete copy.relationships;
          deferred.resolve(angular.copy(copy));
        }

        // otherwise, get the concept as it exists on this branch
        else {
          terminologyServerService.getFullConcept(crsRequest.conceptId, currentTask.branchPath).then(function (concept) {

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

          var promises = [];
          angular.forEach(preparedConcept.descriptions, function(description) {
            if (description.active && !description.effectiveTime && !description.released && description.type === 'SYNONYM') {
              promises.push(componentAuthoringUtil.runDescriptionAutomations(preparedConcept, description, false));
            }
          });

          if (promises.length !== 0) {
            $q.all(promises).then(function () {
              deferred.resolve({
                // the id fields (for convenience)
                conceptId: preparedConcept.conceptId,
                fsn: preparedConcept.fsn,
                preferredSynonym: preparedConcept.preferredSynonym,

                // the request url
                requestUrl: getRequestUrl() + '#/requests/view/' + attachment.issueKey,

                // the ticket ids
                crsId: attachment.issueKey,
                scaId: attachment.ticketKey,

                // the freshly retrieved concept with definition changes appended
                concept: preparedConcept,

                // the original JSON
                conceptJson: attachment,

                // flags & error
                emptyContent: attachment.emptyContent,
                error: attachment.error,
                saved: false,

                // duplicate flags -- isNewConcept is static, requiresCreation changes
                isNewConcept: preparedConcept && preparedConcept.definitionOfChanges && preparedConcept.definitionOfChanges.changeType === 'NEW_CONCEPT',
                requiresCreation: preparedConcept && preparedConcept.definitionOfChanges && preparedConcept.definitionOfChanges.changeType === 'NEW_CONCEPT'

              });
            });
          }
          else {
            deferred.resolve({
              // the id fields (for convenience)
              conceptId: preparedConcept.conceptId,
              fsn: preparedConcept.fsn,
              preferredSynonym: preparedConcept.preferredSynonym,

              // the request url
              requestUrl: getRequestUrl() + '#/requests/view/' + attachment.issueKey,

              // the ticket ids
              crsId: attachment.issueKey,
              scaId: attachment.ticketKey,

              // the freshly retrieved concept with definition changes appended
              concept: preparedConcept,

              // the original JSON
              conceptJson: attachment,

              // flags & error
              emptyContent: attachment.emptyContent,
              error: attachment.error,
              saved: false,

              // duplicate flags -- isNewConcept is static, requiresCreation changes
              isNewConcept: preparedConcept && preparedConcept.definitionOfChanges && preparedConcept.definitionOfChanges.changeType === 'NEW_CONCEPT',
              requiresCreation: preparedConcept && preparedConcept.definitionOfChanges && preparedConcept.definitionOfChanges.changeType === 'NEW_CONCEPT'

            });
          }
        }, function (error) {
          deferred.reject(error);
        });


        return deferred.promise;
      }

      function findExistingConceptsInResponse(items, conceptIdsToCopy, donatedConceptId) {
        var foundDonatedConcept = null;
        var foundDependentConcepts = [];
        angular.forEach(items, function (item) {
          if (!conceptIdsToCopy.includes(item.conceptId)) { return; }
          if (item.conceptId === donatedConceptId) {
            foundDonatedConcept = item.idAndFsnTerm;
          } else {
            foundDependentConcepts.push(item.idAndFsnTerm);
          }
        });
        return { foundDonatedConcept: foundDonatedConcept, foundDependentConcepts: foundDependentConcepts };
      }

      function buildDependentConceptsRejectMessage(foundDependentConcepts, destinationBranch) {
        var base = ' in this task (' + destinationBranch + ') and can not be created again. The request should be submitted again without dependencies.';
        if (foundDependentConcepts.length === 1) {
          return 'The dependent concept ' + foundDependentConcepts[0] + ' already exists' + base;
        }
        if (foundDependentConcepts.length === 2) {
          return 'The dependent concepts ' + foundDependentConcepts[0] + ' and ' + foundDependentConcepts[1] + ' already exist' + base;
        }
        var last = foundDependentConcepts.slice(-1)[0];
        var rest = foundDependentConcepts.slice(0, -1);
        return 'The dependent concepts ' + rest.join(', ') + ', and ' + last + ' already exist' + base;
      }

      function intializeConceptDonation(attachment, destinationBranch) {
        var deferred = $q.defer();
        var donatedConceptIds = [];
        var donatedConcepts = [];
        var organization = JSON.parse(attachment.organization);
        var codeSystem = metadataService.getCodeSystenForGivenShortname(organization.value);
        if (!codeSystem) {
          let message = 'Could not find code system for ' + organization.value;
          notificationService.sendError(message);
          deferred.reject(message);
        }
        if (!codeSystem.latestVersion) {
          let message = 'The latest version not found against code system ' + organization.value;
          notificationService.sendError(message);
          deferred.reject(message);
        }
        // Set author flag - batch-change: true
        terminologyServerService.setAuthorFlag(destinationBranch, {name: 'batch-change', value: true}).then(function (response) {
          var branchMetadata = metadataService.getBranchMetadata();
          branchMetadata.metadata = response.metadata;
          metadataService.setBranchMetadata(branchMetadata);

          let summary = attachment.content.definitionOfChanges && attachment.content.definitionOfChanges.summary;
          
          let conceptIdsToCopy = getConceptIdsFromPromotionSummary(summary);
          if (conceptIdsToCopy.length > 0) {

            // Check if any of the concepts already exist on the destination branch
            terminologyServerService.bulkGetConceptUsingPOST(conceptIdsToCopy, destinationBranch).then(function (conceptResponse) {
              var existing = findExistingConceptsInResponse(
                conceptResponse.items,
                conceptIdsToCopy,
                attachment.content.conceptId
              );

              if (existing.foundDonatedConcept) {
                deferred.reject({type: 'ERROR', message: 'The donated concept ' + existing.foundDonatedConcept + ' already exists in this task (' + destinationBranch + ') and can not be created again. Please reject the request.'});
                return;
              }

              if (existing.foundDependentConcepts.length > 0) {
                deferred.reject({type: 'WARNING', message: buildDependentConceptsRejectMessage(existing.foundDependentConcepts, destinationBranch)});
                return;
              }

              // Proceed to copy
              terminologyServerService.copyConcept(destinationBranch, codeSystem.latestVersion.branchPath, attachment.content.conceptId, conceptIdsToCopy.length > 1).then(function(response) {
                angular.forEach(response, function (concept) {
                  donatedConceptIds.push(concept.conceptId);
                });
                terminologyServerService.bulkRetrieveFullConcept(donatedConceptIds, destinationBranch).then(function(concepts) {
                  angular.forEach(concepts, function (fullConcept) {                    
                    donatedConcepts.push({
                      // the id fields (for convenience)
                      conceptId: fullConcept.conceptId,
                      fsn: fullConcept.fsn,
                      preferredSynonym: fullConcept.preferredSynonym,

                      // the request url
                      requestUrl: getRequestUrl() + '#/requests/view/' + attachment.issueKey,

                      // the ticket ids
                      crsId: attachment.issueKey,
                      scaId: attachment.ticketKey,

                      // the freshly retrieved concept with definition changes appended
                      concept: fullConcept,

                      // the original JSON
                      conceptJson: attachment,
                      saved: true,

                      isNewConcept: true,
                      requiresCreation: false
                    });
                  });
                  deferred.resolve(donatedConcepts);
                });
              }, function (error) {
                deferred.reject(error.data.message);
              });
            }, function (error) {
              deferred.reject(error.data.message);
            });
          } else {
            deferred.reject('No conceps found in the content promotion summary.');
          }          
        }, function (error) {
          console.error('Failed to set author flag');
        });

        return deferred.promise;
      }

//
// Stores the CRS Concept list in UI State
//
      function saveCrsConceptsUiState() {
        scaService.saveSharedUiStateForTask(currentTask.projectKey, currentTask.key, 'crs-concepts', currentTaskConcepts);
      }

// Reject a CRS concept by Authoring user
      function rejectCrsConcept(projectKey, taskKey, scaId, crsId) {
        var deferred = $q.defer();
        var apiEndpoint = getApiEndPoint();        
        if (scaId) {
          scaService.removeCrsTaskForGivenRequestJiraKey(taskKey, scaId).then(function (response) {
            if (response == null || response.status !== 200) {
              deferred.reject();
              return;
            }
  
            $http.put(apiEndpoint + crsId + '/status?status=ACCEPTED', {"reason":"Rejected by Authoring User"}).then(function () {
              $http.put(apiEndpoint + 'unassignAuthoringTask?requestId=' + crsId).then(function () {
                angular.forEach(currentTaskConcepts, function(item, index){
                  if(item.crsId === crsId){
                    currentTaskConcepts.splice(index, 1);
                  }
                });
                saveCrsConceptsUiState();
                deferred.resolve(response);
              }, function (error) {
                deferred.reject(error.statusText);
              });
            }, function (error) {
                deferred.reject(error.statusText);
            });
          }, function (error) {
            deferred.reject(error.statusText);
          });
        } else {
          scaService.removeCrsTaskForGivenRequestId(projectKey, taskKey, crsId).then(function (response) {
            if (response == null || response.status !== 200) {
              deferred.reject();
              return;
            }
  
            $http.put(apiEndpoint + crsId + '/status?status=ACCEPTED', {"reason":"Rejected by Authoring User"}).then(function () {
              $http.put(apiEndpoint + 'unassignAuthoringTask?forceDeleteAuthoringTask=false&requestId=' + crsId).then(function () {
                angular.forEach(currentTaskConcepts, function(item, index){
                  if(item.crsId === crsId){
                    currentTaskConcepts.splice(index, 1);
                  }
                });
                saveCrsConceptsUiState();
                deferred.resolve(response);
              }, function (error) {
                deferred.reject(error.statusText);
              });
            }, function (error) {
                deferred.reject(error.statusText);
            });
          }, function (error) {
            deferred.reject(error.statusText);
          });
        }

        return deferred.promise;
      }

// initialize ui states for a CRS task
      function initializeCrsTask() {
        var deferred = $q.defer();

        // retrieve attachments (if any) -- must be done first
        getJsonAttachmentsForTask().then(function (attachments) {
          currentTaskConcepts = [];

          var promises = [];
          angular.forEach(attachments, function (attachment) {
            if (attachment && attachment.content && attachment.content.definitionOfChanges && attachment.content.definitionOfChanges.topic === 'Content Promotion') {
              notificationService.sendMessage('Initializing CRS concepts...');
              promises.push(intializeConceptDonation(attachment, currentTask.branchPath));
            } else {
              promises.push(getNewCrsConcept(attachment));
            }
          });

          $q.all(promises).then(function (responses) {
            angular.forEach(responses, function (response) {
              if (Array.isArray(response)) {
                currentTaskConcepts = currentTaskConcepts.concat(response);
              } else {
                currentTaskConcepts.push(response);
              }
            });

            // save the initialized state into the UI State
            saveCrsConceptsUiState();

            $rootScope.$broadcast('initialiseCrsConceptsComplete');

            // open all concepts in editing
            let conceptsToOpen = [];
            angular.forEach(currentTaskConcepts, function (concept) {
              if (concept.saved) {
                conceptsToOpen.push(concept.conceptId);
              }
            });
            if (conceptsToOpen.length !== 0) {
              $rootScope.$broadcast('editConcepts', {
                items : conceptsToOpen
              });
            }

            deferred.resolve(currentTaskConcepts);
          }, function (error) {
            // Ensure we surface the failure and reset state if initialization fails
            currentTaskConcepts = [];
            deferred.reject(error);
          });
        }, function() {
          deferred.reject('Could not load attachments');
        });
        return deferred.promise;
      }


//
// Gets the CRS concepts for task, initializing UI states on first attempt
// NOTE: This function MUST resolve to avoid blocking edit-view initialization
      function setTask(task, isTaskAuthor) {
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
            getCrsConceptsForTask(task.projectKey, task.key).then(function (concepts) {

              // if already initialized, simply return
              if (concepts) {
                currentTaskConcepts = concepts;
                deleteUnRequiredDialectsForConcepts(currentTaskConcepts);
                getBulkCrsRequestsStatus();
                deferred.resolve(concepts);
              } else {
                if (isTaskAuthor) {
                  initializeCrsTask().then(function () {
                    getBulkCrsRequestsStatus();
                    deleteUnRequiredDialectsForConcepts(currentTaskConcepts);
                    deferred.resolve(currentTaskConcepts);
                  }, function (error) {
                    deferred.reject(error);
                  });
                } else {
                  deferred.resolve();
                }
              }
            });
          }, timeDelay);
        }
        return deferred.promise;
      }

      function deleteUnRequiredDialectsForConcepts(taskConcepts) {
        var dialects = metadataService.getDialectsForModuleId(null, false);
        var dialectIds = [];
        if (dialects) {
          for (var key in dialects) {
            dialectIds.push(key);
          }
        }
        for (let i = 0; i < taskConcepts.length; i++) {
          var taksConcept = taskConcepts[i];
          if (taksConcept.concept && taksConcept.concept.descriptions) {
            for (let j = 0; j < taksConcept.concept.descriptions.length; j++) {
              var description = taksConcept.concept.descriptions[j];
              if (description.active && !description.effectiveTime && description.acceptabilityMap) {
                for (var key in description.acceptabilityMap) {
                  if (dialectIds.indexOf(key) === -1) {
                    delete description.acceptabilityMap[key];
                  }
                }
              }
            }
          }
        }
      }

      function getCrsConceptsForTask(projectKey, taskKey) {
        var deferred = $q.defer();
        scaService.getSharedUiStateForTask(projectKey, taskKey, 'crs-concepts').then(function (concepts) {
          if (concepts) {
            deferred.resolve(concepts);
          } else {
            scaService.getUiStateForTask(projectKey, taskKey, 'crs-concepts').then(function (response) {
              deferred.resolve(response);
            });
          }
        });
        return deferred.promise;
      }

      function requiresCreation(id) {

        if (!currentTaskConcepts) {
          return false;
        }

        for (var i = 0; i < currentTaskConcepts.length; i++) {
          if (id === currentTaskConcepts[i].conceptId && currentTaskConcepts[i].requiresCreation) {
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

      function requestClarification(list) {
        var def = $q.defer();
        if (!list) {
          def.reject('No CRS id set');
        }
        var apiEndpoint = getApiEndPoint();
        var udpateCrsStatus = function(crsId) {
          var deferred = $q.defer();
          $http.put(apiEndpoint + crsId + '/status?status=CLARIFICATION_NEEDED', {"reason":"Pending Clarification by Authoring User"}).then(function () {
            deferred.resolve();
          });
          return deferred.promise;
        };

        var promises = [];
        for (var i = 0; i < list.length; i++) {
          promises.push(udpateCrsStatus(list[i]));
        }
        // on resolution of all promises
        $q.all(promises).then(function (responses) {
          getBulkCrsRequestsStatus();
          notificationService.sendMessage("Pending clarification successfully.", 5000);
          def.resolve();
        });

        return def.promise;
      }

      function getBulkCrsRequestsStatus() {
        if (!currentTaskConcepts) {
          return;
        }
        var apiEndpoint = getApiEndPoint();
        var list = [];
        angular.forEach(currentTaskConcepts, function(crsRequest) {
          if (list.indexOf(crsRequest.crsId) === -1) {
            list.push(crsRequest.crsId);
          }
        });

        var getCrsStatus = function(crsId) {
          var deferred = $q.defer();
          $http.get(apiEndpoint + crsId + '/status').then(function (response) {
            deferred.resolve({'crsId' : crsId, 'status' : response.data});
          }, function(error) {
            console.error('Error while getting status of CRS request. Error message: '+ error.data.error.message);
          });
          return deferred.promise;
        };

        var promises = [];
        for (var i = 0; i < list.length; i++) {
          promises.push(getCrsStatus(list[i]));
        }
        // on resolution of all promises
        $q.all(promises).then(function (responses) {
          crsRequestStatuses = responses;
        });

      }

      function getCrsRequestsStatus() {
        return crsRequestStatuses;
      }

      function hasRequestPendingClarification() {
        if (crsRequestStatuses.length === 0) {
          return false;
        }
        for (var i= 0; i < crsRequestStatuses.length; i++) {
          if (crsRequestStatuses[i].status === 'CLARIFICATION_NEEDED') {
            return true;
          }
        }
        return false;
      }

      function getCrsRequest(crsId) {
        for (var i = 0; i < currentTaskConcepts.length; i++) {
          if (currentTaskConcepts[i].crsId === crsId) {
            return currentTaskConcepts[i];
          }
        }
        return null;
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
        return currentTaskConcepts.filter(function (concept) {
          return !concept.emptyContent;
        });
      }

      function getCrsEmptyRequests() {
        if (!currentTaskConcepts) {
          return [];
        }
        return currentTaskConcepts.filter(function (concept) {
          return concept.emptyContent;
        });
      }


//
// Save a concept against the stored id
// NOTE: crsId required because terminology server may assign a new id
//
      function saveCrsConcept(crsId, concept, warning) {
        for (var i = 0; i < currentTaskConcepts.length; i++) {
          if (currentTaskConcepts[i].conceptId === crsId) {

            // overwrite the concept id, concept, and set to saved
            currentTaskConcepts[i].conceptId = concept.conceptId;
            currentTaskConcepts[i].concept = concept;
            currentTaskConcepts[i].saved = true;
            currentTaskConcepts[i].requiresCreation = false;
            currentTaskConcepts[i].warning = warning;
            currentTaskConcepts[i].isNewConcept = false;
            saveCrsConceptsUiState();
            break;
          }
        }
      }

      function deleteCrsConcept(crsId) {
        if (currentTaskConcepts) {
          for (var i = 0; i < currentTaskConcepts.length; i++) {
            if (currentTaskConcepts[i].conceptId === crsId) {

              // Mark as deleted
              currentTaskConcepts[i].deleted = true;
              saveCrsConceptsUiState();
              break;
            }
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

      function getCrsTaskComment() {
        var deferred = $q.defer();
        if (!currentTask) {
          deferred.reject('No CRS task set');
        } else {
          var lines = [];

          // retrieve traceability to determine concept changes
          var changedConceptIds = [];

          terminologyServerService.getTraceabilityForBranch(currentTask.branchPath).then(function (traceability) {

            if (traceability) {
              angular.forEach(traceability.content, function (change) {
                if (change.activityType === 'CONTENT_CHANGE') {
                  angular.forEach(change.conceptChanges, function (conceptChange) {
                    changedConceptIds.push(conceptChange.conceptId);
                  });
                }
              });
            } else {
              deferred.reject('Empty traceability for branch ' + currentTask.branchPath);
            }


            angular.forEach(currentTaskConcepts, function (crsConcept) {

              // link to request of matching concept id; empty requests match all changed concepts
              if (crsConcept.saved && crsConcept.concept && changedConceptIds.indexOf(crsConcept.concept.conceptId !== -1)) {
                lines.push('CRS Request ' + crsConcept.crsId + ' (' + crsConcept.scaId + '): ' + crsConcept.concept.conceptId + ' | ' + crsConcept.concept.fsn);
              }
            });

            // sort lines
            lines.sort();

            // convert to new-line delimited comment
            var comment = '';
            angular.forEach(lines, function (line) {
              comment += line + '\n';
            });
            if (comment.length > 0) {
              // NOTE: This *must* match the expected text in AuthoringTaskStatusChangeHandler in Content Request Service
              comment = 'CRS_TASK_PROMOTION - CRS request concepts promoted to project level:\n' + comment;
            }
            deferred.resolve(comment);

          }, function (error) {
            deferred.reject('Could not retrieve traceability for branch ' + currentTask.branchPath);
          });
          /*
           scaService.leaveCommentForTask(task.projectKey, task.key, comment).then(function () {
           deferred.resolve();
           }, function (error) {
           deferred.reject('Error leaving comment: ' + error);
           })*/
        }
        return deferred.promise;
      }

      function setCrsEndpoint(endpoint) {
        crsEndpoint = endpoint;
      }

      function getCrsEndpoint() {
        return crsEndpoint;
      }

      function setUSCrsEndpoint(endpoint) {
        usCrsEndpoint = endpoint;
      }

      function getUSCrsEndpoint() {
        return usCrsEndpoint;
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
        getCrsRequest: getCrsRequest,
        getCrsEmptyRequests: getCrsEmptyRequests,
        saveCrsConcept: saveCrsConcept,
        getCrsTaskComment: getCrsTaskComment,
        getCrsRequestsStatus: getCrsRequestsStatus,
        getCrsConceptsForTask: getCrsConceptsForTask,

        crsFilter: crsFilter,
        rejectCrsConcept: rejectCrsConcept,
        deleteCrsConcept: deleteCrsConcept,
        requestClarification: requestClarification,
        hasRequestPendingClarification: hasRequestPendingClarification,
        setCrsEndpoint: setCrsEndpoint,
        getCrsEndpoint: getCrsEndpoint,
        setUSCrsEndpoint: setUSCrsEndpoint,
        getUSCrsEndpoint: getUSCrsEndpoint
      };
    }
  )
;
