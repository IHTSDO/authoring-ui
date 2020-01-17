'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles IMS authentication, user roles, and user settings
 */
  .factory('reviewService', function ($http, $rootScope, $q, scaService, terminologyServerService) {

    //
    // Helper function to mark the task for review
    //
    function submitForReview(task) {
      var deferred = $q.defer();
      // create the request body
      var updateObj = {
        'reviewers': [],
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
      scaService.markTaskInProgress(task.projectKey, task.key).then(function () {
        $rootScope.$broadcast('reloadTask');
        deferred.resolve();
      }, function (error) {
        deferred.reject();
      });
      return deferred.promise;
    }

    function unclaimReview(task) {
      var deferred = $q.defer();
      var reviewers = task.reviewers ? task.reviewers : [];
      if (reviewers.length !== 0) {
        var i = reviewers.length;
        while (i--) {              
          if (reviewers[i].username === $rootScope.accountDetails.login) { 
            reviewers.splice(i, 1);
          } 
        }
      }
      scaService.unassignReview(task.projectKey, task.key, reviewers).then(function () {
        $rootScope.$broadcast('reloadTask');
        deferred.resolve();
      }, function (error) {
        deferred.reject();
      });
      return deferred.promise;
    }

    function checkTraceability(task, results) {
      var deferred = $q.defer();
      // first, check if traceability returns changes on this task
      terminologyServerService.getTraceabilityForBranch(task.branchPath).then(function (traceability) {

        // first check -- does traceability exist?
        if (traceability && traceability.numberOfElements > 0) {
          results.hasChangedContent = true;
        }

        deferred.resolve();

      }, function (error) {
        // RESOLVE -- assume no changed content, and not an error
        // TODO Revisit this, terminology server service should really resolve on 404s instead of rejecting
        deferred.resolve();
      });
      return deferred.promise;
    }

    function checkModifiedConcepts(task, results) {
      var deferred = $q.defer();


      // retrieve the modified concepts for this task
      scaService.getModifiedConceptIdsForTask(task.projectKey, task.key).then(function (conceptIds) {

        var conceptCt = 0;

        if (!conceptIds || conceptIds.length === 0) {
          deferred.resolve();
        }

        angular.forEach(conceptIds, function (conceptId) {

          // only check for unsaved content on SCTID-marked content
          if (terminologyServerService.isSctid(conceptId)) {
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
                  });
                }
                if (!concept.fsn) {
                  concept.fsn = 'Could not determine FSN';
                }
                results.unsavedConcepts.push(concept);
              }
              // if no concepts survive processing, proceed with submission
              if (++conceptCt === conceptIds.length) {
                deferred.resolve(results);
              }

            }, function (error) {
              deferred.reject('Unexpected error getting modified concept ' + conceptId + ': ' + error);
            });
          }

          // otherwise, increment counter and continue
          else {
            // if no concepts survive processing, proceed with submission
            if (++conceptCt === conceptIds.length) {
              deferred.resolve(results);
            }
          }
        });


      }, function (error) {
        deferred.reject(results);
      });

      return deferred.promise;
    }

    function checkReviewPrerequisites(task) {
      var deferred = $q.defer();

      // initialize the unsaved concept array
      var results = {
        unsavedConcepts: [],
        hasChangedContent: false,
        messages: []
      };

      var promises = [checkModifiedConcepts(task, results),checkTraceability(task, results)];
      $q.all(promises).then(function () {
        deferred.resolve(results);
      }, function (error) {
        deferred.reject('Error checking review prerequisites: ' + error);
      });

      return deferred.promise;
    }

    function getLatestReview(branch, projectKey, taskKey) {
      var deferred = $q.defer();
      terminologyServerService.getTraceabilityForBranch(branch).then(function (traceability) {
        var review = {};

        review.traceability = traceability;
        review.concepts = [];
        review.conceptsClassified = [];
        var idList = [];
        angular.forEach(traceability.content, function (change) {
          if (change.activityType === 'CONTENT_CHANGE') {
            angular.forEach(change.conceptChanges, function (concept) {
              if (review.concepts.filter(function (obj) {
                  return obj.conceptId === concept.conceptId.toString();
                }).length === 0 && concept.componentChanges.filter(function (obj) {
                  return obj.componentSubType !== 'INFERRED_RELATIONSHIP';
                }).length !== 0) {

                concept.conceptId = concept.conceptId.toString();
                concept.lastUpdatedTime = change.commitDate;
                review.concepts.push(concept);
                idList.push(concept.conceptId);
              }
              else if (review.conceptsClassified.filter(function (obj) {
                  return obj.conceptId === concept.conceptId.toString();
                }).length === 0 && concept.componentChanges.filter(function (obj) {
                  return obj.componentSubType === 'INFERRED_RELATIONSHIP';
                }).length !== 0) {
                concept.conceptId = concept.conceptId.toString();
                concept.lastUpdatedTime = change.commitDate;
                review.conceptsClassified.push(concept);
              }
              else if (concept.componentChanges.filter(function (obj) {
                    return obj.componentSubType !== 'INFERRED_RELATIONSHIP';
                  }).length !== 0) {
                var updateConcept = review.concepts.filter(function (obj) {
                  return obj.conceptId === concept.conceptId.toString();
                })[0];
                angular.forEach(concept.componentChanges, function (componentChange) {
                  updateConcept.componentChanges.push(componentChange);
                });
                updateConcept.lastUpdatedTime = change.commitDate;
              }
            });
          }
          else if (change.activityType === 'CLASSIFICATION_SAVE') {
            angular.forEach(change.conceptChanges, function (concept) {
              if (review.conceptsClassified.filter(function (obj) {
                  return obj.conceptId === concept.conceptId.toString();
                }).length === 0) {
                concept.conceptId = concept.conceptId.toString();
                review.conceptsClassified.push(concept);
              }
              else {
                var updateConcept = review.conceptsClassified.filter(function (obj) {
                  return obj.conceptId === concept.conceptId.toString();
                })[0];
                angular.forEach(concept.componentChanges, function (componentChange) {
                  updateConcept.componentChanges.push(componentChange);
                });
                updateConcept.lastUpdatedTime = change.commitDate;
              }
            });
          }

        });

        fetchFsnAndFeedback(projectKey, taskKey, branch, idList, review).then(function(response) {
          deferred.resolve(response ? response : {});
        });
      }, function (error) {
        deferred.reject(error);        
      });

      return deferred.promise;
    }

    function fetchFsnAndFeedback(projectKey, taskKey, branch, idList, review) {
      var deferred = $q.defer();
      scaService.getReviewForTask(projectKey, taskKey).then(function (feedback) {

        var getConceptsForReview = function (branch, idList, review, feedbackList) {
          var deferred = $q.defer();
          terminologyServerService.bulkRetrieveFullConcept(idList, branch).then(function (response) {
            angular.forEach(response, function (concept) {
              angular.forEach(review.concepts, function (reviewConcept) {
                if (concept.conceptId === reviewConcept.conceptId) {
                  reviewConcept.term = concept.fsn;
                  angular.forEach(feedbackList, function (feedback) {
                    if (reviewConcept.conceptId === feedback.id) {
                      reviewConcept.messages = feedback.messages;
                      reviewConcept.viewDate = feedback.viewDate;
                    }
                  });
                }
              });
              angular.forEach(review.conceptsClassified, function (reviewConcept) {
                if (concept.conceptId === reviewConcept.conceptId) {                  
                  angular.forEach(feedbackList, function (feedback) {
                    if (reviewConcept.conceptId === feedback.id) {
                      reviewConcept.messages = feedback.messages;
                      reviewConcept.viewDate = feedback.viewDate;
                    }
                  });
                }
              });
            });
            deferred.resolve();
          });

          return deferred.promise;
        };

        var i, j, temparray, chunk = 50;
        var promises = [];
        for (i = 0, j = idList.length; i < j; i += chunk) {
          temparray = idList.slice(i, i + chunk);
          promises.push(getConceptsForReview(branch, temparray, review, feedback));            ;
        }

        // on resolution of all promises
        $q.all(promises).then(function () {
            deferred.resolve(review);
        });
      });      

      return deferred.promise;
    }

    return {

      // transition functions
      // NOTE: Not complete functionality, developed for sidebar menu initially
      submitForReview: submitForReview,
      cancelReview: cancelReview,
      unclaimReview: unclaimReview,
      getLatestReview: getLatestReview,

      // utility functions
      checkReviewPrerequisites: checkReviewPrerequisites
    };

  })
;
