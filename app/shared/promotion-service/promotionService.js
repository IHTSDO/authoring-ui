'use strict';

/**
 * Promotion Service
 * Provides validation and prerequisite testing for task and project promotion
 */
angular.module('singleConceptAuthoringApp')
  .service('promotionService', ['scaService', 'snowowlService', '$q', function (scaService, snowowlService, $q) {

    /**
     * Checks if a branch is eligible for promotion
     * @param branch the branch, e.g. MAIN/WRPAS/WRPAS-1, MAIN/WRPAS, etc.
     * @param classificationJson the latestClassificationJson of the project or
     *   task being promoted
     * @returns {*|promise} a list of eligibility errors or warnings
     */
    function checkClassificationPrerequisites(branch, latestClassificationJson) {

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

        if (!latestClassificationJson) {
          flags.push({
            checkTitle: 'Classification Not Run',
            checkWarning: 'No classifications were run on this branch. Promote only if you are sure your changes will not affect future classification.',
            blocksPromotion: false
          });

          deferred.resolve(flags);
        } else {

          // get the ui state for classiifcation saving timestamp and status
          // information
          scaService.getUiStateForUser('classification-' + latestClassificationJson.id).then(function (classificationStatus) {

            console.debug('saved classification status', classificationStatus);

            // get the branch details
            snowowlService.getBranch(branch).then(function (branchStatus) {

                console.debug('branch', branchStatus);

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

                  console.debug('classification run -- YES');
                  flags.push({
                    checkTitle: 'Classification Run',
                    checkWarning: null,
                    blocksPromotion: false
                  });
                } else {
                  console.debug('classification run -- NO');
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
                    flags.push({
                      checkTitle: 'Classification Not Current',
                      checkWarning: 'Classification was run, but modifications were made after the classifier was initiated.  Promote only if you are sure any changes will not affect future classification.',
                      blocksPromotion: false
                    });
                  }
                }

                // Case 2: if classification results were accepted, use the
                // stored ui-state to check that the results are current
                // relative to task modifications
                else if (latestClassificationJson.status === 'SAVED') {

                  // if no classification status saved or saved state was not
                  // captured by application
                  if (!classificationStatus || classificationStatus.status === 'SAVING_IN_PROGRESS') {
                    flags.push({
                      checkTitle: 'Classification May Not Be Current',
                      checkWarning: 'Could not determine whether modifications were made after saving the classification. Promote only if you sure any changes will not affect future classification.',
                      blocksPromotion: false
                    });
                  }

                  // otherwise compare the head timestamp of the branch to the
                  // saved timestamp of classification results acceptance
                  else if (classificationStatus.timestamp > branchStatus.headTimestamp) {
                    flags.push({
                      checkTitle: 'Classification Current',
                      checkWarning: null,
                      blocksPromotion: false
                    });
                  }
                  else if (classificationStatus.timestamp <= branchStatus.headTimestamp) {
                    flags.push({
                      checkTitle: 'Classification Not Current',
                      checkWarning: 'Classification was run, but modifications were made to the task afterwards.  Promote only if you are sure those changes will not affect future classifications.',
                      blocksPromotion: false
                    });
                  }
                }

                ////////////////////////////////////////////////////////////
                // CHECK:  Was classification saved?
                ////////////////////////////////////////////////////////////

                if (latestClassificationJson.status === 'SAVED') {

                  flags.push({
                    checkTitle: 'Classification Accepted',
                    checkWarning: null,
                    blocksPromotion: false
                  });
                } else {
                  flags.push({
                    checkTitle: 'Classification Not Accepted',
                    checkWarning: 'Classification results were not accepted to this branch',
                    blocksPromotion: false
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

                console.debug('resolving');

                deferred.resolve(flags);
              },
              function (error) {
                deferred.reject('Could not determine branch state');
              });
          });
        }

      }
      return deferred.promise;
    }

    function checkPrerequisitesForTask(projectKey, taskKey) {
      var deferred = $q.defer();

      var branch = 'MAIN/' + projectKey + '/' + taskKey;
      scaService.getTaskForProject(projectKey, taskKey).then(function (task) {

        console.debug('Task', task);

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

        checkClassificationPrerequisites(branch, task.latestClassificationJson).then(function (flags) {
          deferred.resolve(flags);
        }, function (error) {
          deferred.reject(error);
        });
      }, function (error) {
        deferred.reject('Could not retrieve task details: ' + error);
      });

      return deferred.promise;
    }

    function checkPrerequisitesForProject(projectKey) {
      var deferred = $q.defer();

      var branch = 'MAIN/' + projectKey;
      scaService.getProjectForKey(projectKey).then(function (project) {

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

        checkClassificationPrerequisites(branch, project.latestClassificationJson).then(function (flags) {
          deferred.resolve(flags);
        }, function (error) {
          deferred.reject(error);
        });
      }, function (error) {
        deferred.reject('Could not retrieve task details: ' + error);
      });

      return deferred.promise;
    }

    return {

      checkPrerequisitesForTask: checkPrerequisitesForTask,
      checkPrerequisitesForProject: checkPrerequisitesForProject

    };
  }]);