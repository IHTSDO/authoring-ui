'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles IMS authentication, user roles, and user settings
 */
  .factory('reviewService', function ($http, $rootScope, $q, scaService, snowowlService) {

    //
    // Helper function to mark the task for review
    //
    function submitForReview(task) {
      var deferred = $q.defer();
      // create the request body
      var updateObj = {
        'reviewer': {
          'username': ''
        },
        'status': 'IN_REVIEW'
      };

      // update the task
      scaService.updateTask(task.projectKey, task.key, updateObj).then(function (response) {
        scaService.saveUiStateForReviewTask(task.projectKey, task.key, 'reviewed-list', []);
        $rootScope.$broadcast('reloadTask');
        deferred.resolve(response);
      }, function (error) {
        deferred.reject(error.message);
      });
      return deferred.promise;
    }

    function cancelReview(task) {
      var deferred = $q.defer();
      scaService.markTaskInProgress(task.projectKey, task.key).then(function() {
        $rootScope.$broadcast('reloadTask');
        deferred.resolve();
      }, function(error) {
        deferred.reject();
      });
      return deferred.promise;
    }

    function unclaimReview(task) {
      var deferred = $q.defer();
      scaService.unassignReview(task.projectKey, task.key).then(function() {
        $rootScope.$broadcast('reloadTask');
        deferred.resolve();
      }, function(error) {
        deferred.reject();
      });
      return deferred.promise;
    }

    function getUnsavedContent(task) {
      var deferred = $q.defer();

      console.debug('get unsaved content');

      // initialize the unsaved concept array
      var unsavedConcepts = [];

      // first, check if traceability returns changes on this task
      snowowlService.getTraceabilityForBranch(task.branchPath).then(function (traceability) {

        console.debug('traceability', traceability);

        if (!traceability || !traceability.numberOfElements || traceability.numberOfElements === 0) {
          deferred.resolve(unsavedConcepts);
        } else {

          console.debug('getting modified concept ids');

          // retrieve the modified concepts for this task
          scaService.getModifiedConceptIdsForTask(task.projectKey, task.key).then(function (conceptIds) {

            console.debug('modified concept ids', conceptIds);
            var conceptCt = 0;

            if (!conceptIds || conceptIds.length == 0) {
              deferred.resolve([]);
            }

            angular.forEach(conceptIds, function (conceptId) {
              console.debug('checking ', conceptId);

              // only check for unsaved content on SCTID-marked content
              if (snowowlService.isSctid(conceptId)) {
                scaService.getModifiedConceptForTask(task.projectKey, task.key, conceptId).then(function (concept) {

                  // Account for case where new concepts are marked 'current' in UI State
                  if (concept) {

                    if (!concept.conceptId) {
                      concept.conceptId = '(New concept)';
                    }
                    // find the FSN for display
                    if (!concept.fsn) {
                      angular.forEach(concept.descriptions, function (d) {
                        if (d.type === 'FSN') {
                          concept.fsn = d.term;
                        }
                      })
                    }
                    if (!concept.fsn) {
                      concept.fsn = 'Could not determine FSN';
                    }
                    unsavedConcepts.push(concept);
                  }
                  // if no concepts survive processing, proceed with submission
                  if (++conceptCt === conceptIds.length) {
                    deferred.resolve(unsavedConcepts);
                  }

                }, function (error) {
                  deferred.reject('Unexpected error getting modified concept ' + conceptId + ': ' + error);
                });
              }

              // otherwise, increment counter and continue
              else {
                // if no concepts survive processing, proceed with submission
                if (++conceptCt === conceptIds.length) {
                  deferred.resolve(unsavedConcepts);
                }
              }
            });


          }, function (error) {
            console.debug('ERROR getting modified conceptIds', error);
            deferred.resolve([]);
          });
        }
      }, function (error) {
        console.error('Could not retrieve traceability when submitting for review', error);

        // empty array for unsaved concepts to bypass null check
        deferred.resolve([]);
      });

      return deferred.promise;
    }

    return {

      // transition functions
      // NOTE: Not complete functionality, developed for sidebar menu initially
      submitForReview : submitForReview,
      cancelReview : cancelReview,
      unclaimReview : unclaimReview,

      // utility functions
      getUnsavedContent: getUnsavedContent
    }

  })
;
