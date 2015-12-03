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

        // set isa relationship to body structure
        concept.relationships[0].target.conceptId = '123037004';
        concept.relationships[0].target.fsn = 'Body structure (body structure)';
        return concept;
      }

      tests = [
        {
          name: 'PASS',
          expectedError: null,
          testFn: function test() {
            var concept = getTestConcept('WSP Test01 concept (body structure)', 'WSP Test01 concept');
            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Is-a relationships should not be grouped
        {
          name: 'IsA relationship is grouped',
          expectedError: 'The system has detected a contradiction of the following convention: an "Is-a" relationships must not be grouped.',
          testFn: function test() {
            var concept = getTestConcept('Rel Test02 concept (body structure)', 'Rel Test02 concept');
            var rel = objectService.getNewIsaRelationship();
            rel.groupId = 1;
            rel.target.conceptId = '900000000000487009';
            rel.target.fsn = 'Component moved elsewhere (foundation metadata concept)';
            // isa relationship
            concept.relationships.push(rel);

            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };

            });
          }
        },

        // A role group should have at least 2 relationships
        {
          name: 'Role group only has one relationship',
          expectedError: 'The system has detected a contradiction of the following convention: a role group must have at least two relationships.',
          testFn: function test() {

            var concept = getTestConcept('Rel Test03 concept (body structure)', 'Rel Test03 concept');

            // change IsA target to something that will allow domain attributes
            concept.relationships[0].target.conceptId = '123037004'; // body
                                                                     // structure
            concept.relationships[0].target.fsn = 'Body structure (body structure)';

            // add Laterality domain attribute
            var rel = objectService.getNewAttributeRelationship();
            rel.type.conceptId = '272741003';
            rel.type.fsn = 'Laterality (attribute)';
            rel.target.conceptId = '24028007';
            rel.target.fsn = 'Right (qualifier value)';
            rel.groupId = '1';

            concept.relationships.push(rel);

            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Active Concepts should not have two relationships with the same
        // type, target and group
        // TODO Consider adding identical attribute
        // relationships
        {
          name: 'Two relationships with same type, target, and group (IsA relationships)',
          expectedError: 'The system has detected a contradiction of the following convention: an active concepts must not have two relationships with the same type, target and group.',
          testFn: function test() {
            var concept = getTestConcept('Rel Test04 concept (body structure)', 'Rel Test04 concept');

            var rel = angular.copy(concept.relationships[0]);
            concept.relationships.push(rel);

            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };

            });
          }
        },

        // Similar  WRP-1700, WRP-1701	Active concepts' Semantic Tags are
        // compatible with those of the active parents.]; TODO Get examples

        {
          name: 'Two relationships with same type, target, and group (attribute relationships)',
          notes: [
            'Test should return errors -- known bug, fix in development (as of 12/3/2015)'
          ],
          expectedError: 'The system has detected a contradiction of the following convention: an active concepts must not have two relationships with the same type, target and group.',
          testFn: function test() {
            var concept = getTestConcept('Rel Test05 concept (body structure)', 'Rel Test05 concept');

            var rel = objectService.getNewAttributeRelationship();
            rel.type.conceptId = '272741003';
            rel.type.fsn = 'Laterality (attribute)';
            rel.target.conceptId = '24028007';
            rel.target.fsn = 'Right (qualifier value)';
            rel.groupId = '1';
            concept.relationships.push(rel);
            concept.relationships.push(rel);

            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };

            });
          }
        },

        // WRP-1534 matches but contradicts WRP-1535	Active Concepts should
        // have at least one ISA
        {
          name: 'Concept must have one active IsA relationship',
          expectedError: 'The system has detected a contradiction of the following convention: an active concepts must have at least one ISA relationship.',
          testFn: function test() {
            var concept = getTestConcept('Rel Test06 concept (body structure)', 'Rel Test06 concept');

            concept.relationships[0].active = false;

            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };

            });
          }
        },

        // Similar  WRP-1700, WRP-1701	Active concepts' Semantic Tags are
        // compatible with those of the active parents.
        {
          name: 'Concept\'s semantic tag not compatible with that of parents',
          expectedError: 'The system has detected a contradiction of the following convention: A concept\'s semantic tags should be compatible with those of the active parents.',
          testFn: function test() {
            var concept = getTestConcept('Rel Test07 concept (body structure)', 'Rel Test07 concept');

            concept.relationships[0].target.conceptId = '133928008';
            concept.relationships[0].target.fsn = 'Community (social concept)';

            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };

            });
          }
        }
      ];

      // reset results
      results = {
        status: 'Running',
        nTestsTotal: tests.length,
        nTestsRun: 0,
        nTestsPassed: 0,
        nTestsFailed: 0,
        nTestsError: 0,
        tests: []
      };

      function countResults() {
        // update the results counts
        results.nTestsTotal = tests.length;
        angular.forEach(tests, function (test) {
          results.nTestsRun++;
          if (test.status === 'PASSED') {
            results.nTestsPassed++;
          } else if (test.status === 'FAILED') {
            results.nTestsFailed++;
          } else {
            results.nTestsError++;
          }
        });
      }

      function runHelper(tests, index) {

        if (index >= tests.length) {
          return;
        } else {
        }
        var test = tests[index];

        test.status = 'Running';

        // call the test's test function
        return (test.testFn.call()).then(function (response) {


          // append results of test function to the test
          //console.debug('runHelper response', response);
          test.results = response;

          console.log(test.name, Array.isArray(test.results.errorsReceived), test.results, test.results.errorsReceived);

          // check error condition
          if (!Array.isArray(test.results.errorsReceived)) {
            test.status = 'ERROR';
          }

          // check fail condition
          else if (test.expectedError) {
            var errorFound = false;
            angular.forEach(test.results.errorsReceived, function (receivedError) {

              // replace unicode characters
              receivedError.message = receivedError.message.replace(/\u2019/g, '\'').replace(/[\u201C\u201d]/g, '"');

              console.debug(test.name, test.results, test.expectedError);

              /*      console.debug('comparing errors');
               console.debug(test.expectedError);
               console.debug(receivedError.message);*/
              if (test.expectedError === receivedError.message) {
                /*                console.debug('--> Match Found');*/
                errorFound = true;
              }
            });
            if (!errorFound) {
              test.status = 'FAILED';
            } else {
              test.status = 'PASSED';
            }

          }

          // check pass condition
          else if (!test.expectedError && test.results.errorsReceived.length > 0) {
            test.status = 'FAILED';
          } else {
            // default to passed
            test.status = 'PASSED';
          }

          console.debug('Test complete', test.status);

          // run next test
          return runHelper(tests, ++index);
        });
      }

      function runSingleTest(testName, projectKey, taskKey) {

        var deferred = $q.defer();

        project = projectKey;
        task = taskKey;

        var testFound = false;
        // find the matching test by name
        angular.forEach(tests, function (test) {

          if (test.name === testName) {
            testFound = true;
            test.status = 'Pending';
            runHelper([test], 0).then(function () {
              console.debug('test complete', test);
              deferred.resolve(test);
            });
          }
        });

        if (!testFound) {
          console.error('Could not find test with name ' + testName);
          deferred.reject();
        }

        return deferred.promise;
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

        // set all tests to Pending status
        angular.forEach(tests, function (test) {
          test.status = 'Pending';
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
        runSingleTest: runSingleTest,
        cancel: cancel,
        getResults: getResults,
        getName: getName
      };

    }])
;