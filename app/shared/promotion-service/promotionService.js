'use strict';

/**
 * Promotion Service
 * Provides validation and prerequisite testing for task and project promotion
 */
angular.module('singleConceptAuthoringApp')
  .service('promotionService', ['scaService', 'snowowlService', '$q', 'crsService', function (scaService, snowowlService, $q, crsService) {

    /**
     * Checks if a branch is eligible for promotion
     * @param branch the branch, e.g. MAIN/WRPAS/WRPAS-1, MAIN/WRPAS, etc.
     * @param classificationJson the latestClassificationJson of the project or
     *   task being promoted
     * @returns {*|promise} a list of eligibility errors or warnings
     */
    function checkClassificationPrerequisites(branch, latestClassificationJson, project, task) {

      console.log('Checking Promotion requirements', branch, latestClassificationJson);
      var deferred = $q.defer();

      // the set of warning flags returned after checking requirements
      var flags = [];

      ////////////////////////////
      // Items Blocking Promotion
      ////////////////////////////

      // if task not defined, cannot promote
      if (!branch) {
        flags.push({
          checkTitle: 'Branch Not Provided ',
          checkWarning: 'Branch not provided to promotion verification service. This is a fatal error: contact an administrator',
          blocksPromotion: true
        });
        deferred.resolve(flags);

      } else {
        console.log('here');
        console.log(task);
        if (!latestClassificationJson) {
          flags.push({
            checkTitle: 'Classification Not Run',
            checkWarning: 'No classifications were run on this branch. Promote only if you are sure your changes will not affect future classification.',
            blocksPromotion: false
          });
          if (task !== undefined) {
            scaService.getTaskForProject(project, task).then(function (branchStatus) {
              console.log(branchStatus);
              ////////////////////////////////////////////////////////////
              // CHECK:  Has the Task been reviewed?
              ////////////////////////////////////////////////////////////
              if (!branchStatus.feedbackMessagesStatus || branchStatus.feedbackMessagesStatus === 'none') {
                flags.push({
                  checkTitle: 'No review completed',
                  checkWarning: 'No review has been completed on this task, are you sure you would like to promote?',
                  blocksPromotion: false
                });
              }

              ////////////////////////////////////////////////////////////
              // CHECK:  Is the task still in Review?
              ////////////////////////////////////////////////////////////
              if (branchStatus.status === 'In Review') {
                flags.push({
                  checkTitle: 'Task is still in review',
                  checkWarning: 'The task review has not been marked as complete.',
                  blocksPromotion: false
                });
              }

              deferred.resolve(flags);
            });
          }
          else {
            deferred.resolve(flags);
          }
        } else {

          // get the ui state for classiifcation saving timestamp and status
          // information


          // get the branch details
          snowowlService.getBranch(branch).then(function (branchStatus) {
            snowowlService.getTraceabilityForBranch(branch).then(function (activities) {
              if (!branchStatus) {
                flags.push({
                  checkTitle: 'Could Not Retrieve Branch Details',
                  checkWarning: 'Could not retrieve branch details for branch: ' + branch + '.  This is a fatal error; contact an administrator',
                  blocksPromotion: true
                });

                deferred.resolve(flags);
              }

              ////////////////////////////////////////////////////////////
              // CHECK: Was classification run?
              ////////////////////////////////////////////////////////////

              if (latestClassificationJson.status === 'COMPLETED' || latestClassificationJson.status === 'SAVING_IN_PROGRESS' || latestClassificationJson.status === 'SAVED') {

                flags.push({
                  checkTitle: 'Classification Run',
                  checkWarning: null,
                  blocksPromotion: false
                });
              } else {
                flags.push({
                  checkTitle: 'Classification Not Completed',
                  checkWarning: 'Classification was started for this branch, but either failed or has not completed.',
                  blocksPromotion: false
                });
              }

              ////////////////////////////////////////////////////////////
              // CHECK:  Is the classification current?
              ////////////////////////////////////////////////////////////

              // Case 1: if classification report is completed, but not
              // accepted, check that results are current relative to task
              // modification does not require ui state, can use timestamp on
              // classification status
              if (latestClassificationJson.status === 'COMPLETED') {

                if ((new Date(latestClassificationJson.creationDate)).getTime() >= branchStatus.headTimestamp) {
                  flags.push({
                    checkTitle: 'Classification Current',
                    checkWarning: null,
                    blocksPromotion: false
                  });
                } else {
                  if (task) {
                    flags.push({
                      checkTitle: 'Classification Not Current',
                      checkWarning: 'Classification was run, but modifications were made after the classifier was initiated.  Promote only if you are sure any changes will not affect future classification.',
                      blocksPromotion: false
                    });
                  } else {
                    flags.push({
                      checkTitle: 'Classification Not Current',
                      checkWarning: 'Promotion is disabled as the classification is not current. Please return to project and start a new classification.',
                      blocksPromotion: false
                    });
                  }
                }
              }

              // Case 2: if classification results were accepted, use the
              // stored ui-state to check that the results are current
              // relative to task modifications
              else if (latestClassificationJson.status === 'SAVED') {

                // if no classification status saved or saved state was not
                // captured by application
                if (!latestClassificationJson.saveDate) {
                  flags.push({
                    checkTitle: 'Classification May Not Be Current',
                    checkWarning: 'Could not determine whether modifications were made after saving the classification. Promote only if you sure any changes will not affect future classification.',
                    blocksPromotion: false
                  });
                }

                // otherwise compare the head timestamp of the branch to the
                // saved timestamp of classification results acceptance
                else if (isClassificationSavedCurrent(activities)) {
                  flags.push({
                    checkTitle: 'Classification Current',
                    checkWarning: null,
                    blocksPromotion: false
                  });
                }
                else {
                  if (task) {
                    flags.push({
                      checkTitle: 'Classification Not Current',
                      checkWarning: 'Classification was run, but modifications were made to the task afterwards.  Promote only if you are sure those changes will not affect future classifications.',
                      blocksPromotion: false
                    });
                  } else {
                    flags.push({
                      checkTitle: 'Classification Not Current',
                      checkWarning: 'Promotion is disabled as the classification is not current. Please return to project and start a new classification.',
                      blocksPromotion: false
                    });
                  }
                }
              }

              ////////////////////////////////////////////////////////////
              // CHECK:  Was classification saved?
              ////////////////////////////////////////////////////////////

              // check if saved
              if (latestClassificationJson.status === 'SAVED') {

                flags.push({
                  checkTitle: 'Classification Accepted',
                  checkWarning: null,
                  blocksPromotion: false
                });
              }

              // check if classification has results
              else if (latestClassificationJson.equivalentConceptsFound ||
                latestClassificationJson.inferredRelationshipChangesFound ||
                latestClassificationJson.redundantStatedRelationshipsFound) {
                flags.push({
                  checkTitle: 'Classification Not Accepted',
                  checkWarning: 'Classification results were not accepted to this branch',
                  blocksPromotion: false
                });
              }

              // if no results, put up a display message
              else {
                flags.push({
                  checkTitle: 'Classification Has No Results to Accept',
                  checkWarning: null,
                  blocksPromotion: null
                });
              }


              ////////////////////////////////////////////////////////////
              // CHECK:  Does the classification report equivalencies?
              ////////////////////////////////////////////////////////////
              if (latestClassificationJson.equivalentConceptsFound) {
                flags.push({
                  checkTitle: 'Equivalencies Found',
                  checkWarning: 'Classification reports equivalent concepts on this branch. You may not promote until these are resolved',
                  blocksPromotion: true
                });
              }
              if (task !== undefined) {
                scaService.getTaskForProject(project, task).then(function (branchStatus) {
                  console.log(branchStatus);
                  ////////////////////////////////////////////////////////////
                  // CHECK:  Has the Task been reviewed?
                  ////////////////////////////////////////////////////////////
                  if (branchStatus.status !== 'In Review' && branchStatus.status !== 'Review Completed') {
                    flags.push({
                      checkTitle: 'No review completed',
                      checkWarning: 'No review has been completed on this task, are you sure you would like to promote?',
                      blocksPromotion: false
                    });
                  }

                  ////////////////////////////////////////////////////////////
                  // CHECK:  Is the task still in Review?
                  ////////////////////////////////////////////////////////////
                  if (branchStatus.status === 'In Review') {
                    flags.push({
                      checkTitle: 'Task is still in review',
                      checkWarning: 'The task review has not been marked as complete.',
                      blocksPromotion: false
                    });
                  }

                  deferred.resolve(flags);
                });
              }
              else {
                deferred.resolve(flags);
              }           

            },
            function (error) {
              deferred.reject('Could not get traceability for branch');
            });
          },
          function (error) {
            deferred.reject('Could not determine branch state');
          });
        }

      }
      return deferred.promise;
    }

    function isClassificationSavedCurrent(activities) {    
      var lastClassificationSaved = 0;
      var lastModifiedTime = (new Date(activities.content[activities.content.length - 1].commitDate)).getTime();
      angular.forEach(activities.content, function(activity) {
        if (activity.activityType === 'CLASSIFICATION_SAVE')
          lastClassificationSaved = (new Date(activity.commitDate)).getTime();
      });
      return lastClassificationSaved === lastModifiedTime;
    }

    function checkPrerequisitesForTask(projectKey, taskKey) {
      var deferred = $q.defer();

      scaService.getTaskForProject(projectKey, taskKey).then(function (task) {

        var branch = task.branchPath;

        if (task.branchState === 'BEHIND' || task.branchState === 'DIVERGED' || task.branchState === 'STALE') {
          deferred.resolve([{
            checkTitle: 'Task and Project Diverged',
            checkWarning: 'The task and project are not synchronized. Pull in changes from the project before promotion.',
            blocksPromotion: true
          }]);
        }

        if (task.branchState === 'UP_TO_DATE') {
          deferred.resolve([{
            checkTitle: 'No Changes To Promote',
            checkWarning: 'The task is up to date with respect to the project. No changes to promote.',
            blocksPromotion: true
          }]);
        }

        checkClassificationPrerequisites(branch, task.latestClassificationJson, projectKey, taskKey).then(function (flags) {
          flags = checkCrsConceptsPrerequisites(projectKey, taskKey, flags);         
          deferred.resolve(flags);
        }, function (error) {
          deferred.reject(error);
        });
      }, function (error) {
        deferred.reject('Could not retrieve task details: ' + error);
      });

      return deferred.promise;
    }

    function checkCrsConceptsPrerequisites (projectKey, taskKey, flags) {
      var crsConcepts = crsService.getCrsConcepts();
      var deletedCRSConceptFound = false;
      angular.forEach(crsConcepts, function(concept, key) {
        if (concept.deleted) {
          deletedCRSConceptFound = true;
          return;
        }
      });
      if(deletedCRSConceptFound) {
        flags.push({
                    checkTitle: 'Deleted CRS concept',
                    checkWarning: 'A CRS concept has been deleted on this task, please verify that the request was rejected',
                    blocksPromotion: false
                  });
      }
      return flags;
    }

    function checkPrerequisitesForProject(projectKey) {
      var deferred = $q.defer();

      scaService.getProjectForKey(projectKey).then(function (project) {

        var branch = project.branchPath;

        if (project.branchState === 'BEHIND' || project.branchState === 'DIVERGED' || project.branchState === 'STALE') {
          deferred.resolve([{
            checkTitle: 'Project and Mainline Diverged',
            checkWarning: 'The project and mainline content are not synchronized. Pull in changes from the mainline content before promotion.',
            blocksPromotion: true
          }]);
          return;
        }

        if (project.branchState === 'UP_TO_DATE') {
          deferred.resolve([{
            checkTitle: 'No Changes To Promote',
            checkWarning: 'The project is up to date with respect to the mainline content. No changes to promote.',
            blocksPromotion: true
          }]);

          return;
        }

        checkClassificationPrerequisites(branch, project.latestClassificationJson, projectKey).then(function (flags) {
          deferred.resolve(flags);
        }, function (error) {
          deferred.reject(error);
        });
      }, function (error) {
        deferred.reject('Could not retrieve task details: ' + error);
      });

      return deferred.promise;
    }

    function promoteTask(projectKey, taskKey) {
      var deferred = $q.defer();

      scaService.promoteTask(projectKey, taskKey).then(function (response) {
        // invoke crs service to leave comment if appropriate
        crsService.getCrsTaskComment().then(function (comment) {
          if (comment && comment.length > 0) {
            scaService.leaveCommentForTask(projectKey, taskKey, comment).then(function (response) {
              // do nothing
            }, function (error) {
              // do nothing
            })
          }
        }, function (error) {
          // do nothing
        });

        deferred.resolve(response);
        return;
      }, function (error) {
        deferred.reject('Error promoting task: ' + error);
      });
      return deferred.promise;
    }

    function proceedAutomatePromotion(projectKey, taskKey) {
      var deferred = $q.defer();
      if (!projectKey || !taskKey) deferred.resolve(null);
      scaService.proceedAutomatePromotion(projectKey, taskKey).then(function (response) {
        deferred.resolve();
      }, function (error) {
        deferred.reject('Error promoting project automation: ' + error);
      });
      return deferred.promise;
    }

    function getAutomatePromotionStatus (projectKey, taskKey) {
      var deferred = $q.defer();
      scaService.getAutomatePromotionStatus(projectKey, taskKey).then(function (response) {
        deferred.resolve(response);
      }, function (error) {
        deferred.reject('Error getting Automate Promotion status: ' + error);
      });
      return deferred.promise;
    }

    function promoteProject(projectKey) {
      var deferred = $q.defer();

      // NOTE: No extra steps, simply promote via scaService

      scaService.promoteProject(projectKey).then(function (response) {
        deferred.resolve();
      }, function (error) {
        deferred.reject('Error promoting project: ' + error);
      });
      return deferred.promise;
    }

    return {

      checkPrerequisitesForTask: checkPrerequisitesForTask,
      checkPrerequisitesForProject: checkPrerequisitesForProject,

      promoteTask: promoteTask,
      promoteProject: promoteProject,
      proceedAutomatePromotion: proceedAutomatePromotion,
      getAutomatePromotionStatus: getAutomatePromotionStatus
    };
  }]);
