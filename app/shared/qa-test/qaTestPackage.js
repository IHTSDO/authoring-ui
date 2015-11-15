/**
 * Instantiable factory for running concept validation/QA checks
 */

'use strict';
angular.module('singleConceptAuthoringApp')
  .factory('QaTestPackage', function ($q, $interval, qaTestGroupCharacterSpacing) {


    ////////////////////////////////////
    // Private Elements
    ////////////////////////////////////
    var testGroups = [
      qaTestGroupCharacterSpacing
    ];
    var results = {};
    var project, task;

    function runTestsHelper(testGroups, index) {
      if (index >= testGroups.length) {
        return;
      }
      var testGroup = testGroups[index];
      return testGroup.runTests(project, task).then(function(response) {
        results[testGroup.getName()] = response;

        // run the next test
        return runTestsHelper(testGroups, ++index);
      });

    }

    ////////////////////////////////////
    // Public Elements
    ////////////////////////////////////
    var QaTest = {};

    QaTest.name = 'Concept QA Tests';
    QaTest.status = 'Not run';


    QaTest.runTests = function (projectKey, taskKey) {
      console.debug('QaTest: Running tests',  projectKey, taskKey);
      project = projectKey;
      task = taskKey;

      QaTest.status = 'Running';
      runTestsHelper(testGroups, 0).then(function() {
        QaTest.status = 'Complete';
      });
     
    };


    QaTest.getResults = function () {

      // get latest results for each package
      angular.forEach(testGroups, function (testGroup) {
        //console.debug('QaTest getResults', testGroup.getResults());
        results[testGroup.getName()] = testGroup.getResults();
      });
      //console.debug('returning results', results);
      return results;
    };

    return QaTest;

  });