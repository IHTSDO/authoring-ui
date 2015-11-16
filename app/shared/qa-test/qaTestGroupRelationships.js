/**
 * Service for running concept validation/QA checks
 * Package Details:
 * (WSP) Checks white space and parentheses
 */
'use strict';
angular.module('singleConceptAuthoringApp')
  .service('qaTestGroupRelationships', ['$q', 'snowowlService', 'scaService', 'objectService',
    function ($q, snowowlService, scaService, objectService) {

      // test package name
      var name = 'Relationships';

      // the project to run this task against
      var project = null;

      // the task to run this test against
      var task = null;

      // the branch corresponding to this project & task (computed)
      var branch = null;

      // the tests to be run in this package
      var tests = null;

      // results array, with validation errors/warnings, and global test errors
      var results = null;

      /**
       * Function to get a test concept given a fsn and pt
       * @param fsn the fsn
       * @param pt the pt
       * @returns the test concept
       */
      function getTestConcept(fsn, pt) {
        var concept = objectService.getNewConcept();

        // clear descriptions and reset
        concept.descriptions = [];
        var fsnDesc = objectService.getNewFsn(null);
        fsnDesc.term = fsn;
        concept.descriptions.push(fsnDesc);

        var ptDesc = objectService.getNewPt(null);
        ptDesc.term = pt;
        concept.descriptions.push(ptDesc);

        // set isa relationship to root
        concept.relationships[0].target.conceptId = '138875005';

        return concept;
      }

      tests = [
        {
          name: 'PASS',
          action: 'Create concept',
          expectedError: null,
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('WSP Test01 concept (test)', 'WSP Test01 concept');
            return snowowlService.createConcept(project, task, concept).then(function (response) {
              return {
                status: 'PASSED',
                data: concept,
                response: response
              };
            }, function (error) {
              return {
                status: 'FAILED',
                error: 'Valid concept could not be created (message: ' + error + ' )',
                data: concept
              };
            });
          }
        },

        // Is-a relationships should not be grouped
        {
          name: 'IsA relationship is grouped',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: an “Is-a” relationships must not be grouped.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Rel Test02 concept (test)', 'Rel Test02 concept');
            var rel = objectService.getNewIsaRelationship();
            rel.groupId = 1;
            rel.target.conceptId = '900000000000487009'; // random concept for
            // isa relationship
            concept.relationships.push(rel);

            return snowowlService.createConcept(project, task, concept).then(function (response) {
              return {
                status: 'FAILED',
                data: concept,
                response: response
              };
            }, function (error) {
              return {
                status: 'PASSED',
                data: concept,
                response: error
              };

            });
          }
        },

        // A role group should have at least 2 relationships
        {
          name: 'Role group only has one relationship',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: a role group must have at least two relationships.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var deferred = $q.defer();

            var concept = getTestConcept('Rel Test03 concept (test)', 'Rel Test03 concept');

            // change IsA target to something that will allow domain attributes
            concept.relationships[0].target.conceptId = '123037004'; // body structure

            var attrRel = objectService.getNewAttributeRelationship();

            // get a legal attribute type
            snowowlService.getDomainAttributes(branch, [concept.relationships[0].target.conceptId]).then(function (attrTypes) {
              if (attrTypes.length === 0) {
                deferred.resolve({
                  status: 'ERROR',
                  data: concept,
                  attrTypes: 'No legal domain attributes found for test concept'
                });
              }

              console.debug(attrTypes);

              // get the first relationship that is not IsA
              // NOTE the MRCM endpoint returns field 'id', not 'conceptId'
              for (var i = 0; i < attrTypes.items.length; i++) {
                if (attrTypes.items[i].id !== '116680003') {
                  attrRel.type.conceptId = attrTypes.items[i].id;
                  break;
                }
              }

              console.debug(attrRel);

              // get the first valid target from the MRCM rules
              snowowlService.getAttributeValues(branch, attrRel.type.conceptId, null).then(function (attrValues) {
                if (attrValues.length === 0) {
                  deferred.resolve({
                    status: 'ERROR',
                    data: concept,
                    attrTypes: 'No legal attribute valuess found for test concept'
                  });
                }

                attrRel.target.conceptId = attrValues[0].id;

                // finally, actually test the darn concept
                attrRel.groupId = 1;

                concept.relationships.push(attrRel);

                snowowlService.createConcept(project, task, concept).then(function (response) {
                  deferred.resolve({
                    status: 'FAILED',
                    data: concept,
                    response: response
                  });
                }, function (error) {
                  deferred.resolve({
                    status: 'PASSED',
                    data: concept,
                    response: error
                  });

                });
              })

            });

            return deferred.promise;
          }
        },

        // Active Concepts should not have two relationships with the same
        // type, target and group
        // TODO Consider adding identical attribute
        // relationships
        {
          name: 'Two relationships with same type, target, and group',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: an active concepts must not have two relationships with the same type, target and group.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Rel Test02 concept (test)', 'Rel Test02 concept');

            var rel = angular.copy(concept.relationships[0]);
            concept.relationships.push(rel);

            return snowowlService.createConcept(project, task, concept).then(function (response) {
              return {
                status: 'FAILED',
                data: concept,
                response: response
              };
            }, function (error) {
              return {
                status: 'PASSED',
                data: concept,
                response: error
              };

            });
          }
        },

        // Similar  WRP-1700, WRP-1701	Active concepts' Semantic Tags are
        // compatible with those of the active parents.]; TODO Get examples

        {
          name: 'Two relationships with same type, target, and group',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: an active concepts must not have two relationships with the same type, target and group.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Rel Test02 concept (test)', 'Rel Test02 concept');

            var rel = angular.copy(concept.relationships[0]);
            concept.relationships.push(rel);

            return snowowlService.createConcept(project, task, concept).then(function (response) {
              return {
                status: 'FAILED',
                data: concept,
                response: response
              };
            }, function (error) {
              return {
                status: 'PASSED',
                data: concept,
                response: error
              };

            });
          }
        },

        // WRP-1534 matches but contradicts WRP-1535	Active Concepts should
        // have at least one ISA
        {
          name: 'Concept must have one active IsA relationship',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: an active concepts must have at least one ISA relationship.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Rel Test02 concept (test)', 'Rel Test02 concept');

            concept.relationships[0].active = false;

            return snowowlService.createConcept(project, task, concept).then(function (response) {
              return {
                status: 'FAILED',
                data: concept,
                response: response
              };
            }, function (error) {
              return {
                status: 'PASSED',
                data: concept,
                response: error
              };

            });
          }
        }

      ];

      // initialize results
      results = {
        status: 'Running',
        nTestsTotal: tests.length,
        nTestsRun: 0,
        nTestsPassed: 0,
        nTestsFailed: 0,
        nTestsError: 0,
        tests: tests
      };

      function runHelper(tests, index) {

        if (index >= tests.length) {
          return;
        } else {
        }
        var test = tests[index];

        test.results.status = 'Running';

        try {

          // call the test's test function
          return (test.testFn.call()).then(function (response) {

            // append results of test function to the test
            //console.debug('runHelper response', response);
            test.results = response;

            // update the results counts
            results.nTestsRun++;
            if (test.results.status === 'PASSED') {
              results.nTestsPassed++;
            } else if (test.results.status === 'FAILED') {
              results.nTestsFailed++;
            } else {
              results.nTestsError++;
            }

            // run next test
            return runHelper(tests, ++index);

          });
        } catch(err) {
          test.results.status === 'ERROR';
          test.response = err;
        }
      }

      /**
       * Run the test package against specified task
       */
      function runTests(projectKey, taskKey) {

        //console.debug('qaPackageCharacterSpacing: run test', projectKey,
        // taskKey);

        var deferred = $q.defer();

        // set the project and task
        project = projectKey;
        task = taskKey;
        branch = 'MAIN/' + projectKey + '/' + taskKey;

        // set all tests to Pending status
        angular.forEach(tests, function (test) {
          test.results = {
            status: 'Pending'
          }
        });

        // reset results
        results = {
          status: 'Running',
          nTestsTotal: tests.length,
          nTestsRun: 0,
          nTestsPassed: 0,
          nTestsFailed: 0,
          nTestsError: 0,
          tests: tests
        };

        // start the sequential test helper
        runHelper(tests, 0).then(function () {

          // on completion, set status to complete
          results.status = 'Complete';
          deferred.resolve(results);
        });

        return deferred.promise;
      }

      /**
       * Retrieve the results
       * @returns {{errors: Array, warnings: Array, testErrors: Array}}
       */
      function cancel() {
        // interrupt tests
      }

      /**
       * Function to retrieve results on demand, if set
       * @returns {*}
       */
      function getResults() {
        // update results tests from current status
        results.tests = tests;
        return results;
      }

      /**
       * Get the name of this package
       * @returns {string}
       */
      function getName() {
        return name;
      }

      return {
        runTests: runTests,
        cancel: cancel,
        getResults: getResults,
        getName: getName
      };

    }])
;