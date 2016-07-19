'use strict';

/**
 * Promotion Service
 * Provides validation and prerequisite testing for task and project promotion
 */
angular.module('singleConceptAuthoringApp')
  .service('validationService', ['scaService', 'snowowlService', 'notificationService', '$q', function (scaService, snowowlService, notificationService, $q) {

    //
    // Validation Failure Exclusion getter, setter, and cached values
    // NOTE: This is initialized in app.js
    //

    var validationFailureExclusions = null;

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
      var deferred = $q.defer();
      scaService.saveSharedUiStateForTask('validation', 'exclusions', 'failures', validationFailureExclusions).then(function (response) {
        deferred.resolve(response);
      }, function (error) {
        deferred.reject('Unexpected error updating validation failure exclusions');
      });
      return deferred.promise;
    }


    //
    // Validation exclusion/whitelisting
    //

    return {

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
        if (validationFailureExclusions.hasOwnProperty(conceptId)) {
          delete validationFailureExclusions[conceptId];
        }
      },

      addValidationFailureExclusion: function (assertionUuid, assertionText, conceptId, conceptFsn, failureText, user) {
        console.debug('add exclusion', assertionUuid, assertionText, conceptId, failureText, 'to', validationFailureExclusions);

        var deferred = $q.defer();

        // create the exclusion
        var exclusion = {
          assertionUuid: assertionUuid,
          assertionText: assertionText,
          conceptId: conceptId,
          conceptFsn: conceptFsn,
          failureText: failureText,
          user: user,
          timestamp: new Date().getTime()
        };

        // if no assertions for this uuid, create container
        if (!validationFailureExclusions[conceptId]) {
          validationFailureExclusions[conceptId] = new Array();
        }

        console.debug(validationFailureExclusions, 'vfe');

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

      removeValidationFailureExclusion: function (assertionUuid, conceptId, failureText) {

        var deferred = $q.defer();

        console.debug('remove exclusion', assertionUuid, conceptId, failureText);
        // find and remove the assertion
        if (validationFailureExclusions && validationFailureExclusions[conceptId]) {
          for (var i = 0; i < validationFailureExclusions[conceptId].length; i++) {
            if (validationFailureExclusions[conceptId][i].assertionUuid === assertionUuid &&
              validationFailureExclusions[conceptId][i].failureText === failureText) {
              console.debug('  removing exclusion');
              validationFailureExclusions[conceptId].splice(i, 1);
              if (validationFailureExclusions[conceptId].length === 0) {
                delete validationFailureExclusions[conceptId];
              }
              break;
            }
            if (i === validationFailureExclusions[conceptId].length - 1) {
              console.debug('  could not find exclusion to remove');
            }
          }
        } else {
          console.debug('  object empty, no need for removal');
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
