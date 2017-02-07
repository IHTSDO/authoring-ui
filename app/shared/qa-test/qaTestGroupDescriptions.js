/**
 * Service for running concept validation/QA checks
 * Package Details:
 * (WSP) Checks white space and parentheses
 */
'use strict';
angular.module('singleConceptAuthoringApp')
  .service('qaTestGroupDescriptions', ['$q', 'snowowlService', 'scaService', 'objectService',
    function ($q, snowowlService, scaService, objectService) {

      // test package name
      var name = 'Descriptions';

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
            var concept = getTestConcept('Desc Test01 concept (body structure)', 'Desc Test01 concept');
            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Similar  to WRP-1685, WRP-1682	Active concepts have one active
        // Preferred Synonym in each dialect
        {
          name: 'en-us preferred term not specified',

          expectedError: 'The system has detected a contradiction of the following convention: concepts may only have one Preferred Synonym in each dialect',
          testFn: function test() {
            var concept = getTestConcept('Desc Test03 concept (body structure)', 'Desc Test03 concept');
            angular.forEach(concept.descriptions, function (description) {
              // find the PT descriptioon and set en-us acceptability to
              // Acceptable
              if (description.type === 'SYNONYM') {
                description.acceptabilityMap['900000000000509007'] = 'ACCEPTABLE';
              }
            });
            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Similar  to WRP-1685, WRP-1682	Active concepts have one active
        // Preferred Synonym in each dialect
        {
          name: 'en-gb preferred term not specified',

          expectedError: 'The system has detected a contradiction of the following convention: concepts may only have one Preferred Synonym in each dialect',
          testFn: function test() {
            var concept = getTestConcept('Desc Test04 concept (body structure)', 'Desc Test04 concept');
            angular.forEach(concept.descriptions, function (description) {
              // find the PT descriptioon and set en-us acceptability to
              // Acceptable
              if (description.type === 'SYNONYM') {
                description.acceptabilityMap['900000000000508004'] = 'ACCEPTABLE';
              }
            });
            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Similar  to WRP-1685, WRP-1682	Active concepts have one active
        // Preferred Synonym in each dialect
        {
          name: 'two preferred terms specified for a dialect',

          expectedError: 'The system has detected a contradiction of the following convention: concepts may only have one Preferred Synonym in each dialect',

          testFn: function test() {
            var concept = getTestConcept('Desc Test05 concept (body structure)', 'Desc Test05 concept');
            var description = objectService.getNewPt();
            description.term = 'Desc Test03 concept duplicate';
            concept.descriptions.push(description);
            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // TODO Wait for verification on WRP-1669 authors
        // indicate possible revision

        //WRP-1661	Active Descriptions must be unique in concept

        {
          name: 'Active descriptions must be unique in concept',
          expectedError: 'The system has detected a contradiction of the following convention: active descriptions must be unique in a concept.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test1661 concept (body structure)', 'Desc Test1661 concept');

            // add two identical descriptions
            var description = objectService.getNewDescription();
            description.term = "Duplicate definition";
            concept.descriptions.push(description);
            concept.descriptions.push(description);
            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Active descriptions do not have spaces, either before or after,
        // hyphens.
        {
          name: 'term has space before hyphen',

          expectedError: 'The system has detected a contradiction of the following convention: active descriptions must not have spaces, either before or after, hyphens.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test07 -concept (body structure)', 'Desc Test07-concept');

            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Active descriptions do not have spaces, either before or after,
        // hyphens.
        {
          name: 'term has space after hyphen',

          expectedError: 'The system has detected a contradiction of the following convention: active descriptions must not have spaces, either before or after, hyphens.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test08- concept (body structure)', 'Desc Test08 concept');

            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Where an active fully specified name includes the word �pre-filled�
        // change to prefilled

        // WRP-1546	Active FSNs must end in closing parentheses
        {
          name: 'FSN contains the word "pre-filled"',

          expectedError: 'The system has detected a contradiction of the following convention: FSNs containing the word "pre-filled" must be changed to prefilled.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test09 pre-filled concept (test', 'Desc Test09 concept');

            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // WRP-1546	Active FSNs must end in closing parentheses
        {
          name: 'FSN does not end in closing parenthesis',

          expectedError: 'The system has detected a contradiction of the following convention: FSNs must end in closing parentheses.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test09- concept (test', 'Desc Test09 concept');

            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Active Fully Specified Names will not include commas
        {
          name: 'FSN contains commas',

          expectedError: 'The system has detected a contradiction of the following convention: FSNs must not include commas.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test10, concept (body structure)', 'Desc Test10 concept');

            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        //

        // Similar to WRP-1696	Each active concept has at least one active
        // Fully Specified Name per dialect Active Fully Specified Names will
        // not include commas
        {
          name: 'Active concept does not have FSN for en-US',

          expectedError: 'The system has detected a contradiction of the following convention: an active concept must have one active preferred FSN per dialect.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test10 concept (body structure)', 'Desc Test10 concept');

            // cleaer descriptions
            concept.descriptions = [];

            // add en-us FSN
            var fsn = objectService.getNewFsn();
            fsn.term = 'Desc Test93 concept (body structure)';
            fsn.acceptabilityMap['900000000000509007'] = 'ACCEPTABLE';

            // add PT
            var pt = objectService.getNewPt();
            pt.term = 'Desc Test93 concept';

            concept.descriptions = [fsn, pt];

            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Similar to WRP-1696	Each active concept has at least  one active
        // Fully Specified Name per dialect Active Fully Specified Names will
        // not include commas
        {
          name: 'Active concept does not have FSN for en-GB',

          expectedError: 'The system has detected a contradiction of the following convention: an active concept must have one active preferred FSN per dialect.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test10 concept (body structure)', 'Desc Test10 concept');

            // cleaer descriptions
            concept.descriptions = [];

            // add en-us FSN
            var fsn = objectService.getNewFsn();
            fsn.term = 'Desc Test93 concept (body structure)';
            fsn.acceptabilityMap['900000000000508004'] = 'ACCEPTABLE';

            // add PT
            var pt = objectService.getNewPt();
            pt.term = 'Desc Test93 concept';

            concept.descriptions = [fsn, pt];

            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // TODO 'Each active concept has at least one active Fully Specified
        // Name per dialect' - authors indicate policy decision required

        // Similair to WRP-1544	Active Descriptions or FSNs text should not be
        // longer than 255 bytes TODO Find out if we need to change this to
        // 32Kb limit instead of length limit, authors indicate RF1/RF2
        // considerations
        {
          name: 'Active description with greater than 255 characters',

          expectedError: 'The system has detected a contradiction of the following convention: an active description must not be longer than 255 characters.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test11 concept (body structure)', 'Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept');

            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Similiar to WRP-1672, WRP-1673, WRP-1673, WRP-1674,WRP-1675	Active
        // Text definitions should be case-sensitive TODO Some confusion about
        // whether this is only for text definitions, confirm
        {
          name: 'Text definition is not case sensitive',

          expectedError: 'The system has detected a contradiction of the following convention: text definitions must be case-sensitive.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test12 concept (body structure)', 'Desc Test12 concept');
            var textDefinition = objectService.getNewTextDefinition();
            textDefinition.term = 'Text Definition';
            textDefinition.caseSignificance = 'CASE_INSENSITIVE';
            concept.descriptions.push(textDefinition);
            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Active Text Definitions' first characters should be upper case
        // TODO Again, confusion between text definitions and all descriptions?
        {
          name: 'Text definition does not start with upper-case character',

          expectedError: 'The system has detected a contradiction of the following convention: the first character of a text definition must be upper case.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test13 concept (body structure)', 'Desc Test13 concept');
            var textDefinition = objectService.getNewTextDefinition();
            textDefinition.term = 'text Definition';
            concept.descriptions.push(textDefinition);
            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Where an active fully specified name includes a + symbol a space
        // will be placed either side of the plus symbol e.g. ibuprofen +
        // oxycodone (product)
        {
          name: 'FSN contains + character without space before it',
          expectedError: 'The system has detected a contradiction of the following convention: an active FSN containing a + symbol, must include a single space placed at either side of the symbol e.g. Ibuprofen + oxycodone (product)',
          testFn: function test() {
            var concept = getTestConcept('Desc Test14+ concept (body structure)', 'Desc Test14+ concept');
            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Where an active fully specified name includes a + symbol a space
        // will be placed either side of the plus symbol e.g. ibuprofen +
        // oxycodone (product)
        {
          name: 'FSN contains + character without space after it',
          expectedError: 'The system has detected a contradiction of the following convention: an active FSN containing a + symbol, must include a single space placed at either side of the symbol e.g. Ibuprofen + oxycodone (product)',
          testFn: function test() {
            var concept = getTestConcept('Desc Test14 +concept (body structure)', 'Desc Test14 +concept');
            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Similiar  to WRP-1546	Active FSNs cannot start with open parentheses
        {
          name: 'FSN starts with open parenthesis',
          expectedError: 'The system has detected a contradiction of the following convention: FSNs must not start with open parentheses.',
          testFn: function test() {
            var concept = getTestConcept('(Desc Test15 concept (body structure)', 'Desc Test15 concept');

            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // WRP-1547	Active FSNs must have a space before semantic tag
        {
          name: 'FSN does not have space before semantic tag',

          expectedError: 'The system has detected a contradiction of the following convention: a single space must be included before a semantic tag.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test16 concept(test)', 'Desc Test16 concept');

            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Not Found	Active Fully Specified Names are represented in at least
        // one dialect
        {
          name: 'FSN represented in zero dialects',

          expectedError: 'The system has detected a contradiction of the following convention: an FSN must be represented in at least one dialect.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test17 concept (body structure)', 'Desc Test17 concept');
            angular.forEach(concept.descriptions, function (description) {
              if (description.type === 'FSN') {
                description.acceptabilityMap = {};
              }
            });
            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // WRP-1547	Active Fully Specified Names end with Semantic Tags
        {
          name: 'FSN does not end in semantic tag',

          expectedError: 'The system has detected a contradiction of the following convention: an FSN must end with a semantic tag.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test18 concept', 'Desc Test18 concept');
            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // TODO 'In an active description, use a colon for ratio
        // representations' authors indicate clarification neeeded

        // Active Fully Specified Names do not contain dashes
        // TODO See KK's notes on all forms of dashes, only testing the one
        // here without further clarification
        {
          name: 'FSN does not contain dashes',
          notes: [
            'Test written, but back-end implementation deferred by request of authors'
          ],
          expectedError: 'The system has detected a contradiction of the following convention: an FSN must end with Semantic Tags.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test19-concept', 'Desc Test19 concept');
            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Active Fully Specified Names are not in the plural form (warning)
        {
          name: 'FSN is in plural form',
          notes: [
            'Test written, but back-end implementation deferred by request of authors'
          ],
          expectedError: 'The system has detected a contradiction of the following convention: an FSNs must not be in a plural form.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test20 concepts', 'Desc Test20 concept');
            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Active Fully Specified Names for Techniques must include the word
        // "technique" in their FSN; for example, "Microbial culture technique
        // (qualifier value)".
        {
          name: 'FSN For Technique Concept does not include the term "technique"',
          notes: [
            'Test written, but back-end implementation deferred by request of authors'
          ],
          expectedError: 'The system has detected a contradiction of the following convention: an FSN for techniques must include the word "technique"',
          testFn: function test() {
            var concept = getTestConcept('Desc Test21 concepts', 'Desc Test21 concept');
            concept.relationships[0].target.conceptId = '272394005';
            concept.relationships[0].target.fsn = 'Technique (qualifier value)';
            return snowowlService.validateConcept(project, task, concept).then(function (response) {

              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Similiar to WRP-1688	Active Fully Specified Names starting with
        // lowercase characters have case sensitivity id "sensitive" Authors
        // request to put on hold for Editorial Panel

        // All active Fully Specified Names names which include the term
        // product or preparation other than as part of the semantic tag will
        // be retired and the new name will not include product or preparation.
        // E.g. formaldehyde product (product) to formaldehyde (product);
        // acetylcholine preparation (product) to acetylcholine (product)
        // AUthors indicate removal

        // 'Active concepts must have active synonyms that have the same text
        // as the active Fully Specified Names excluding the semantic tags
        // (warning)' authors indicate review needed before implementation
        {
          name: 'FSN does not have matching synonym (without semantic tag)',
          notes: [
            'Test written, but back-end implementation deferred by request of authors'
          ],
          expectedError: 'The system has detected a contradiction of the following convention: concepts\' must have an active synonym that has the same text as the active FSN.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test24 concept (body structure)', 'Desc Test24 diferent concept');
            return snowowlService.validateConcept(project, task, concept).then(function (response) {

              return {
                data: concept,
                errorsReceived: response
              };
            });
          }
        },

        // Active text definitions have acceptability Preferred in the en-GB
        // dialect
        {
          name: 'Text definition has en-GB acceptability of ACCEPTABLE)',

          expectedError: 'The system has detected a contradiction of the following convention: active text definitions must have an acceptability of Preferred in the en-GB dialect.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test24 concept (body structure)', 'Desc Test24 diferent concept');
            var textDefinition = objectService.getNewTextDefinition();
            textDefinition.term = 'Text definition for testing';
            textDefinition.acceptabilityMap['900000000000508004'] = 'ACCEPTABLE';
            concept.descriptions.push(textDefinition);
            return snowowlService.validateConcept(project, task, concept).then(function (response) {

              return {
                data: concept,
                errorsReceived: response
              };
            }, function (error) {
              return {
                data: concept,
                errorsReceived: null
              };
            });
          }
        },

        // Active text definitions have acceptability Preferred in the en-US
        // dialect
        {
          name: 'Text definition has en-US acceptability of ACCEPTABLE)',

          expectedError: 'The system has detected a contradiction of the following convention: active text definitions must have an acceptability of Preferred in the en-US dialect.',
          testFn: function test() {
            var concept = getTestConcept('Desc Test24 concept (body structure)', 'Desc Test24 diferent concept');
            var textDefinition = objectService.getNewTextDefinition();
            textDefinition.term = 'Text definition for testing';
            textDefinition.acceptabilityMap['900000000000509007'] = 'ACCEPTABLE';
            concept.descriptions.push(textDefinition);
            return snowowlService.validateConcept(project, task, concept).then(function (response) {
              return {
                data: concept,
                errorsReceived: response
              };
            }, function (error) {
              return {
                data: concept,
                errorsReceived: null
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

    }

  ])
;
