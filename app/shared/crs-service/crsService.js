'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles all functionality surrounding CRS tickets
 */
  .factory('crsService', function ($http, $rootScope, $q, scaService, snowowlService) {

    var currentTask;

    var currentTaskConcepts = null;

    function getNewCrsConcept(conceptJson, guid) {
      return {
        // the id fields
        guid: guid,
        conceptId: conceptJson.conceptId,
        fsn: conceptJson.fsn,
        preferredSynonym: conceptJson.preferredSynonym,

        // the original concept Json from the CRT ticket
        conceptJson: conceptJson,

        // flags
        saved: false,
        finished: false

      }
    }

    function getJsonAttachment(url) {
      var deferred = $q.defer();
      $http.get(url).then(function (response) {
        deferred.resolve(response.data);
      }, function (error) {
        deferred.reject(error.message);
      });
      return deferred.promise;
    }

    //
    // Stores the CRS Concept list in two UI-States
    // - modified-list : used for initial display to author, will be modified
    // - crs-concepts-list : used to store the list of concepts, unchanging
    //
    function storeCrsConcepts(concepts) {
      scaService.getUiStateForTask(currentTask.projectKey, task.key, 'crs-concepts').then(function (existingList) {
        var newList = existingList ? existingList : [];
        angular.forEach(containers, function (container) {
          if (newList.indexOf(container.guid) === -1) {
            newList.push(container);
          }
        });
        scaService.saveUiStateForTask(task.projectKey, task.key, 'crs-concepts', newList);
      })
    }

    function initializeFromTask(task) {
      var deferred = $q.defer();

      // the list of containers to storea nd return
      var containers = [];

      // cycle over each linked issue attachment
      angular.forEach(task.issueLinkAttachments, function (url) {

        var promise = $q.defer();
        containers.push(promise);

        // retrieve the JSON attachments
        getJsonAttachment(url).then(function (jsonAttachment) {

          // cycle over each concept in the attachment
          angular.forEach(jsonAttachment, function (concept) {

            // create a GUID for this concept
            var guid = snowowlService.createGuid();

            // store the concept against its guid
            var crsContainer = storeCrsConcept(concept, guid);

            // add the container to the list
            promise.resolve(crsContainer);
          });
        })
      });

      // after all promises complete, store and return the container list
      $q.all(containers, function () {
        storeCrsConcepts(containers);
        deferred.resolve(containers);
      }, function (error) {
        deferred.reject(error)
      });

      return deferred.promise;
    }

    //
    // Clear the CRS Concept list for a task
    //
    function clearCrsConceptsForTask(task) {
      var deferred = $q.defer();
      scaService.deleteUiStateForTask(task.projectKey, task.key, 'crs-concepts').then(function () {
        currentTaskConcepts = null;
        deferred.resolve();
      }, function (error) {
        deferred.reject('Error deleting crs-concepts ui state');
      })
    }

      //
      // Gets the CRS concepts for task, initializing UI states on first attempt
      //
      function getCrsConceptsForTask(task) {
        var deferred = $q.defer();

        // PREREQUISITE: Task must have CRS label
        if (task.labels.indexOf('CRS') === -1) {
          currentTask = null;
          currentTaskConcepts = null;
          deferred.reject('Not a CRS task');
        }

        // set the local task variable for use by other functions
        currentTask = task;

        // check if this task has previously been initialized
        scaService.getUiStateForTask(task.projectKey, task.key, 'crs-concepts').then(function (concepts) {

          // if already initialized, simply return
          if (concepts) {
            currentTaskConcepts = concepts;
            deferred.resolve(concepts);
          } else {
            initializeFromTask().then(function (concepts) {
              currentTaskConcepts = concepts;
              deferred.resolve(concepts);
            });
          }

          return deferred.promise;
        });
      }

      //
      // Function exposure
      //
      return {
        getCrsConceptsForTask: getCrsConceptsForTask,
        clearCrsConceptsForTask : clearCrsConceptsForTask
      }
    }

    )
;
