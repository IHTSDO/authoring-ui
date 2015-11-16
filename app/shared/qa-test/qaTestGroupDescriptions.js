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
            var concept = getTestConcept('Desc Test01 concept (test)', 'Desc Test01 concept');
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

        // WRP-1541	Active Descriptions cannot match other description already committed
        {
          name: 'description matches already committed description',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: active descriptions must not match other description already committed.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test02 concept (test)', 'Desc Test02 concept');
            var tempDesc = concept.descriptions[0];
            return snowowlService.createConcept(project, task, concept).then(function (response) {
              concept = response;
              concept.descriptions.push(tempDesc);
              return snowowlService.updateConcept(project, task, concept).then(function (response) {

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
            }, function (error) {
              return {
                status: 'ERROR',
                data: concept,
                response: error
              };
            });
          }
        },

        // Similar  to WRP-1685, WRP-1682	Active concepts have one active Preferred Synonym in each dialect
        {
          name: 'en-us preferred term not specified',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: concepts may only have one Preferred Synonym in each dialect',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test03 concept (test)', 'Desc Test03 concept');
            angular.forEach(concept.descriptions, function (description) {
              // find the PT descriptioon and set en-us acceptability to
              // Acceptable
              if (description.type === 'SYNONYM') {
                description.acceptabilityMap['900000000000509007'] = 'ACCEPTABLE';
              }
            });
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

        // Similar  to WRP-1685, WRP-1682	Active concepts have one active Preferred Synonym in each dialect
        {
          name: 'en-gb preferred term not specified',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: concepts may only have one Preferred Synonym in each dialect',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test04 concept (test)', 'Desc Test04 concept');
            angular.forEach(concept.descriptions, function (description) {
              // find the PT descriptioon and set en-us acceptability to
              // Acceptable
              if (description.type === 'SYNONYM') {
                description.acceptabilityMap['900000000000508004'] = 'ACCEPTABLE';
              }
            });
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

        // Similar  to WRP-1685, WRP-1682	Active concepts have one active Preferred Synonym in each dialect
        {
          name: 'two preferred terms specified for a dialect',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: concepts may only have one Preferred Synonym in each dialect',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test05 concept (test)', 'Desc Test05 concept');
            var description = objectService.getNewPt();
            description.term = 'Desc Test03 concept duplicate';
            concept.descriptions.push(description);
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

        // TODO Wait for verification on WRP-1669 and WRP-1661, authors
        // indicate possible revision

        // Active descriptions do not have spaces, either before or after, hyphens.
        {
          name: 'term has space before hyphen',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: active descriptions must not have spaces, either before or after, hyphens.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test07 -concept (test)', 'Desc Test07-concept');

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

        // Active descriptions do not have spaces, either before or after, hyphens.
        {
          name: 'term has space after hyphen',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: active descriptions must not have spaces, either before or after, hyphens.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test08- concept (test)', 'Desc Test08 concept');

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

        // TODO 'Where an active fully specified name includes the word
        // “pre-filled” change to prefilled'
        // Authors indicate possible removal


        // WRP-1546	Active FSNs must end in closing parentheses
        {
          name: 'FSN does not end in closing parenthesis',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: FSNs must end in closing parentheses.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test09- concept (test', 'Desc Test09 concept');

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

        // Active Fully Specified Names will not include commas
        {
          name: 'FSN contains commas',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: FSNs must not include commas.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test10, concept (test)', 'Desc Test10 concept');

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

        // TODO 'Each active concept has at least one active Fully Specified
        // Name per dialect' - authors indicate policy decision required

        // Similair to WRP-1544	Active Descriptions or FSNs text should not be longer than 255 bytes
        // TODO Find out if we need to change this to 32Kb limit instead of length limit, authors indicate RF1/RF2 considerations
        {
          name: 'Active description with greater than 255 characters',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: an active descriptions must not be longer than 255 characters.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test11 concept(test)', 'Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept Desc Test11 Concept');

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

        // Similiar to WRP-1672, WRP-1673, WRP-1673, WRP-1674,WRP-1675	Active Text definitions should be case-sensitive
        // TODO Some confusion about whether this is only for text definitions, confirm
        {
          name: 'Text definition is not case sensitive',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: descriptions must be case-sensitive.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test12 concept(test)', 'Desc Test12 concept');
            var textDefinition = objectService.getNewTextDefinition();
            textDefinition.term = 'Text Definition';
            textDefinition.caseSignificance = 'CASE_INSENSITIVE';
            concept.descriptions.push(textDefinition);
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

        // Active Text Definitions' first characters should be upper case
        // TODO Again, confusion between text definitions and all descriptions?
        {
          name: 'Text definition does not start with upper-case character',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: the first character in a description field must be upper case.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test13 concept (test)', 'Desc Test13 concept');
            var textDefinition = objectService.getNewTextDefinition();
            textDefinition.term = 'text Definition';
            concept.descriptions.push(textDefinition);
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


        // TODO Where an active fully specified name includes a + symbol a space will be placed either side of the plus symbol e.g. ibuprofen + oxycodone (product) - author review indicated

        // Similiar  to WRP-1546	Active FSNs cannot start with open parentheses
        {
          name: 'FSN starts with open parenthesis',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: FSNs must not start with open parentheses.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('(Desc Test15 concept (test)', 'Desc Test15 concept');

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

        // WRP-1547	Active FSNs must have a space before semantic tag
        {
          name: 'FSN does not have space before semantic tag',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: a single space must be included before a semantic tag.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test16 concept(test)', 'Desc Test16 concept');

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

        // Not Found	Active Fully Specified Names are represented in at least one dialect
        {
          name: 'FSN represented in zero dialects',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: an FSN must be represented in at least one dialect.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test17 concept (test)', 'Desc Test17 concept');
            angular.forEach(concept.descriptions, function (description) {
              if (description.type === 'FSN') {
                description.acceptabilityMap = {};
              }
            });
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


        // WRP-1547	Active Fully Specified Names end with Semantic Tags
        {
          name: 'FSN does not end in semantic tag',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: an FSN must end with Semantic Tags.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test18 concept', 'Desc Test18 concept');
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

        // TODO 'In an active description, use a colon for ratio
        // representations' authors indicate clarification neeeded


        // Active Fully Specified Names do not contain dashes
        // TODO See KK's notes on all forms of dashes, only testing the one here without further clarification
        {
          name: 'FSN does not contain dashes',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: an FSN must end with Semantic Tags.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test19-concept', 'Desc Test19 concept');
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

        // Active Fully Specified Names are not in the plural form (warning)
        {
          name: 'FSN is in plural form',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: an FSNs must not be in a plural form.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test20 concepts', 'Desc Test20 concept');
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

        // Active Fully Specified Names for Techniques must include the word "technique" in their FSN; for example, "Microbial culture technique (qualifier value)".
        {
          name: 'FSN For Technique Concept does not include the term "technique"',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: an FSN for techniques must include the word "technique"',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test21 concepts', 'Desc Test21 concept');
            concept.relationships[0].target.conceptId = '272394005';
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

        // Similiar to WRP-1688	Active Fully Specified Names starting with lowercase characters have case sensitivity id "sensitive"
        // Authors request to put on hold for Editorial Panel

        // All active Fully Specified Names names which include the term product or preparation other than as part of the semantic tag will be retired and the new name will not include product or preparation. E.g. formaldehyde product (product) to formaldehyde (product); acetylcholine preparation (product) to acetylcholine (product)
        // AUthors indicate removal



        // 'Active concepts must have active synonyms that have the same text as the active Fully Specified Names excluding the semantic tags (warning)' authors indicate review needed before implementation
        {
          name: 'FSN does not have matching synonym (without semantic tag)',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: concepts’ must have an active synonym that has the same text as the active FSN.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test24 concept (test)', 'Desc Test24 diferent concept');
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

        // Active text definitions have acceptability Preferred in the en-GB dialect
        {
          name: 'Text definition has en-GB acceptability of ACCEPTABLE)',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: active text definitions must have an acceptability of Preferred in the en-GB dialect.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test24 concept (test)', 'Desc Test24 diferent concept');
            var textDefinition = objectService.getNewTextDefinition();
            textDefinition.acceptabilityMap['900000000000508004'] = 'ACCEPTABLE';
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

        // Active text definitions have acceptability Preferred in the en-US dialect
        {
          name: 'Text definition has en-US acceptability of ACCEPTABLE)',
          action: 'Create concept',
          expectedError: 'The system has detected a contraindication of the following convention: active text definitions must have an acceptability of Preferred in the en-US dialect.',
          results: {
            status: 'Not Started'
          },
          testFn: function test() {
            var concept = getTestConcept('Desc Test24 concept (test)', 'Desc Test24 diferent concept');
            var textDefinition = objectService.getNewTextDefinition();
            textDefinition.acceptabilityMap['900000000000509007'] = 'ACCEPTABLE';
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

      function runHelper(tests, index) {

        if (index >= tests.length) {
          return;
        } else {
        }
        var test = tests[index];

        test.results.status = 'Running';

        console.log('Running test: ', test.name);

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
        angular.forEach(tests, function(test) {
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