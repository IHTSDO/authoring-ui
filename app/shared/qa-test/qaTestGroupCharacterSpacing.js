/**
 * Service for running concept validation/QA checks
 * Package Details:
 * (WSP) Checks white space and parentheses
 */
'use strict';
angular.module('singleConceptAuthoringApp')
  .service('qaTestGroupCharacterSpacing', ['$q', 'snowowlService', 'scaService', 'objectService',
    function ($q, snowowlService, scaService, objectService) {

      // test package name
      var name = 'Character Spacing';

      // the project to run this task against
      var project = null;

      // the task to run this test against
      var task = null;

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

      var tests = [
        {
          name: 'White space scenario - PASS',
          action: 'Create concept',
          expectedError: null,
          results: {
            status: 'Pending'
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
              }
            });
          }
        }, {
          name: 'White space scenario - double space',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: {{field.type}} must not contain double, leading or trailing spaces.',
          results: {
            status: 'Pending'
          },
          testFn: function test() {
            var concept = getTestConcept('WSP Test01  concept (test)', 'WSP Test01 concept');
            return snowowlService.createConcept(project, task, concept).then(function (response) {
              return {
                status: 'FAILED',
                data: concept,
                response: response
              }
            }, function (error) {
              return {
                status: 'PASSED',
                data: concept,
                response: error
              };

            });
          }
        }, {
          name: 'White space scenario - leading space',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: {{field.type}} must not contain double, leading or trailing spaces.',
          results: {
            status: 'Pending'
          },
          testFn: function test() {
            var concept = getTestConcept(' WSP Test01 concept (test)', 'WSP Test01 concept');
            return snowowlService.createConcept(project, task, concept).then(function (response) {
              return {
                status: 'FAILED',
                data: concept,
                response: response
              }
            }, function (error) {
              return {
                status: 'PASSED',
                data: concept,
                response: error
              };
            });
          }
        }, {
          name: 'White space scenario - trailing space',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: {{field.type}} must not contain double, leading or trailing spaces.',
          results: {
            status: 'Pending'
          },
          testFn: function test() {
            var concept = getTestConcept('WSP Test01 concept (test) ', 'WSP Test01 concept');
            return snowowlService.createConcept(project, task, concept).then(function (response) {
              return {
                status: 'FAILED',
                data: concept,
                response: response
              }
            }, function (error) {
              return {
                status: 'PASSED',
                data: concept,
                response: error
              };
            });
          }
        }, {
          name: 'White space scenario - no space before parenthesis',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: a space must be placed in front of an opening parenthesis and after a closing parenthesis (unless it is at the end of the product\'s name), but not within parentheses e.g. aaaa (bbbb) cccc.',
          results: {
            status: 'Pending'
          },
          testFn: function test() {
            var concept = getTestConcept('WSP(Test01)concept (test)', 'WSP Test01 concept');
            return snowowlService.createConcept(project, task, concept).then(function (response) {
              return {
                status: 'FAILED',
                data: concept,
                response: response
              }
            }, function (error) {
              return {
                status: 'PASSED',
                data: concept,
                response: error
              };

            });
          }
        }, {
          name: 'White space scenario - no space after non-terminating parenthesis',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: a space must be placed in front of an opening parenthesis and after a closing parenthesis (unless it is at the end of the product\'s name), but not within parentheses e.g. aaaa (bbbb) cccc.',
          results: {
            status: 'Pending'
          },
          testFn: function test() {
            var concept = getTestConcept('WSP (Test01)concept (test)', 'WSP (Test01) concept');
            return snowowlService.createConcept(project, task, concept).then(function (response) {
              return {
                status: 'FAILED',
                data: concept,
                response: response
              }
            }, function (error) {
              return {
                status: 'PASSED',
                data: concept,
                response: error
              };
            });
          }
        }, {
          name: 'White space scenario - space after beginning parenthesis',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: a space must be placed in front of an opening parenthesis and after a closing parenthesis (unless it is at the end of the product\'s name), but not within parentheses e.g. aaaa (bbbb) cccc.',
          results: {
            status: 'Pending'
          },
          testFn: function test() {
            var concept = getTestConcept('WSP ( Test01) concept (test)', 'WSP Test01 concept');
            return snowowlService.createConcept(project, task, concept).then(function (response) {
              return {
                status: 'FAILED',
                data: concept,
                response: response
              }
            }, function (error) {
              return {
                status: 'PASSED',
                data: concept,
                response: error
              };
            });
          }
        }, {
          name: 'White space scenario - space before terminating parenthesis',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: a space must be placed in front of an opening parenthesis and after a closing parenthesis (unless it is at the end of the product\'s name), but not within parentheses e.g. aaaa (bbbb) cccc.',
          results: {
            status: 'Pending'
          },
          testFn: function test() {
            var concept = getTestConcept('WSP (Test01 ) concept (test)', 'WSP Test01 concept');
            return snowowlService.createConcept(project, task, concept).then(function (response) {
              return {
                status: 'FAILED',
                data: concept,
                response: response
              }
            }, function (error) {
              return {
                status: 'PASSED',
                data: concept,
                response: error
              };
            });
          }
        }];


      function runHelper(tests, index) {

        if (index >= tests.length) {
          return;
        } else {
        }
        var test = tests[index];

        // call the test's test function
        return (test.testFn.call()).then(function (response) {

          // append results of test function to the test
          console.debug('runHelper response', response);
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
      }

      /**
       * Run the test package against specified task
       */
      function runTests(projectKey, taskKey) {

        console.debug('qaPackageCharacterSpacing: run test', projectKey, taskKey);

        var deferred = $q.defer();

        // set the project and task
        project = projectKey;
        task = taskKey;

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
      }

    }])
;