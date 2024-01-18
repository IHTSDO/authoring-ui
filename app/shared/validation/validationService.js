'use strict';

/**
 * Promotion Service
 * Provides validation and prerequisite testing for task and project promotion
 */
angular.module('singleConceptAuthoringApp')
  .service('validationService', ['scaService', 'notificationService', '$q', '$http', function (scaService, notificationService, $q, $http) {

    //
    // Validation Failure Exclusion getter, setter, and cached values
    // NOTE: This is initialized in app.js
    //
    var rvfEndpoint = null;
    var validationFailureExclusions = null;

    function setRvfEndpoint(endpoint) {
      rvfEndpoint = endpoint;
    }

    // exposed below, used for other validation failure exclusion functions
    function getValidationFailureExclusions() {
      var deferred = $q.defer();

      scaService.getSharedUiStateForTask('validation', 'exclusions', 'failures').then(function (response) {

        validationFailureExclusions = response ? response : {};
        deferred.resolve(validationFailureExclusions);
      }, function (error) {
        validationFailureExclusions = {};
        deferred.resolve({});
      });
      return deferred.promise;

    }


    // Commit function to update the stored exclusions
    function updateValidationFailureExclusions() {
      console.log(validationFailureExclusions);
      var deferred = $q.defer();
      scaService.saveSharedUiStateForTask('validation', 'exclusions', 'failures', validationFailureExclusions).then(function (response) {
        deferred.resolve(response);
      }, function (error) {
        deferred.reject('Unexpected error updating validation failure exclusions');
      });
      return deferred.promise;
    }

    function getAllAssertions() {
      return $http.get(rvfEndpoint + 'assertions?includeDroolsRules=true&includeTraceabilityAssertions=false&ignoreResourceType=true').then(
        function (response) {
          return response.data;
        }, function (error) {
          return null;
        }
      );
    }


    //
    // Validation exclusion/whitelisting
    //

    return {
      setRvfEndpoint: setRvfEndpoint,
      getAllAssertions: getAllAssertions,


      isValidationFailureExcluded: function (assertionUuid, conceptId, failureText) {
        if (!validationFailureExclusions) {
          return false;
        }

        return validationFailureExclusions[conceptId] && validationFailureExclusions[conceptId].filter(function (failure) {
            return failure.conceptId === conceptId && failure.failureText === failureText;
          }).length > 0;
      },

      // clears the exclusions for a concept id
      clearValidationFailureExclusionsForConceptId: function (conceptId) {
        if (validationFailureExclusions && validationFailureExclusions.hasOwnProperty(conceptId)) {
          delete validationFailureExclusions[conceptId];
        }
      },

      addValidationFailureExclusion: function (assertionUuid, assertionText, conceptId, conceptFsn, failureText, user, branchRoot) {

        var deferred = $q.defer();

        // create the exclusion
        var exclusion = {
          assertionUuid: assertionUuid,
          assertionText: assertionText,
          conceptId: conceptId,
          conceptFsn: conceptFsn,
          failureText: failureText,
          user: user,
          timestamp: new Date().getTime(),
          branchRoot: branchRoot
        };
        if (!validationFailureExclusions[conceptId]) {
          validationFailureExclusions[conceptId] = new Array();
        }

        // doublecheck this assertion does not already exist
        if (validationFailureExclusions[conceptId].filter(function (failure) {
            return failure.conceptId === conceptId && failure.failureText === failureText;
          }).length === 0) {

          // add and set the exclusions
          validationFailureExclusions[conceptId].push(exclusion);
        }

        updateValidationFailureExclusions().then(function () {
          deferred.resolve();
        }, function () {
          deferred.reject();
        });

        return deferred.promise;
      },

      addValidationFailuresExclusion: function (assertionUuid, assertionText, failures, user, branchRoot) {

        var deferred = $q.defer();

        angular.forEach(failures, function (failure) {                
          // create the exclusion
          var exclusion = {
            assertionUuid: assertionUuid,
            assertionText: assertionText,
            conceptId: failure.conceptId,
            conceptFsn: failure.conceptFsn,
            failureText: failure.detailUnmodified,
            user: user,
            timestamp: new Date().getTime(),
            branchRoot: branchRoot
          };

          // if no assertions for this uuid, create container
          if (!validationFailureExclusions[failure.conceptId]) {
            validationFailureExclusions[failure.conceptId] = new Array();
          }

          // doublecheck this assertion does not already exist
          if (validationFailureExclusions[failure.conceptId].filter(function (item) {
              return item.conceptId === failure.conceptId && item.failureText === failure.failureText;
            }).length === 0) {

            // add and set the exclusions
            validationFailureExclusions[failure.conceptId].push(exclusion);
          }
        });        

        updateValidationFailureExclusions().then(function () {
          deferred.resolve();
        }, function () {
          deferred.reject();
        });

        return deferred.promise;
      },

      removeValidationFailureExclusion: function (assertionUuid, conceptId, failureText) {

        var deferred = $q.defer();
        // find and remove the assertion
        if (validationFailureExclusions && validationFailureExclusions[conceptId]) {
          for (var i = 0; i < validationFailureExclusions[conceptId].length; i++) {
            if (validationFailureExclusions[conceptId][i].assertionUuid === assertionUuid &&
              validationFailureExclusions[conceptId][i].failureText === failureText) {
              validationFailureExclusions[conceptId].splice(i, 1);
              if (validationFailureExclusions[conceptId].length === 0) {
                delete validationFailureExclusions[conceptId];
              }
              break;
            }

          }
        }
        updateValidationFailureExclusions().then(function () {
          deferred.resolve();
        }, function () {
          deferred.reject();
        });

        return deferred.promise;
      },

      // Expose retrieval function to allow initialization
      getValidationFailureExclusions: getValidationFailureExclusions

    };
  }]);
