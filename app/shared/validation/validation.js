'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('validation', ['$rootScope', '$filter', 'ngTableParams', '$routeParams', 'snowowlService', 'scaService', '$timeout',
    function ($rootScope, $filter, ngTableParams, $routeParams, snowowlService, scaService, $timeout) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {},
        templateUrl: 'shared/validation/validation.html',

        link: function (scope, element, attrs, linkCtrl) {

          scope.viewTop = true;

          // sample data -- to be replaced with api call
          scope.validation = {
            "executionStatus": "COMPLETED",
            "report": {
              "Status": "COMPLETE",
              "RVF Validation Result": {
                "ARCHIVE_STRUCTURAL test result": {
                  "totalTestsRun": 1.81192678E8,
                  "testType": "ARCHIVE_STRUCTURAL",
                  "executionId": 1.438380283882E12,
                  "timeTakenInSeconds": 147,
                  "totalFailures": 0
                },
                "End time": "Jul 31, 2015 10:30:47 PM",
                "Validation config": {
                  "testFileName": "TS_Daily_Build_20150731.zip",
                  "writeSucceses": false,
                  "prevIntReleaseVersion": "int_20150131",
                  "groupsList": [
                    "component-centric-scope.validation",
                    "file-centric-scope.validation",
                    "release-type-scope.validation"
                  ],
                  "firstTimeRelease": false,
                  "runId": 1.438380283882E12,
                  "storageLocation": "international/main_wrpas_wrpas22/2015-07-31T21:48:54"
                },
                "Start time": "Jul 31, 2015 10:04:54 PM",
                "SQL test result": {
                  "assertionsFailed": [
                    {
                      "testCategory": "component-centric-scope.validation",
                      "assertionText": "The first letter of the FSN should be capitalized.",
                      "failureCount": 5,
                      "runTimeInMilliSeconds": 13,
                      "firstNInstances": [
                        "DESC: id=8698772017:First letter of the active FSN of active concept not capitalized.",
                        "DESC: id=39628308019:First letter of the active FSN of active concept not capitalized.",
                        "DESC: id=53022099010:First letter of the active FSN of active concept not capitalized.",
                        "DESC: id=59487538015:First letter of the active FSN of active concept not capitalized.",
                        "DESC: id=59601537012:First letter of the active FSN of active concept not capitalized."
                      ],
                      "assertionUuid": "dd0d0406-7481-444a-9f04-b6fc7db49039"
                    },
                    {
                      "testCategory": "component-centric-scope.validation",
                      "assertionText": "All FSNs end in closing parentheses.",
                      "failureCount": 14,
                      "runTimeInMilliSeconds": 1179,
                      "firstNInstances": [
                        "DESC: Term=fsn:Fully Specified Name not ending with closing parantheses.",
                        "DESC: Term=FSN:Fully Specified Name not ending with closing parantheses.",
                        "DESC: Term=FSN!:Fully Specified Name not ending with closing parantheses.",
                        "DESC: Term=Testing FSN:Fully Specified Name not ending with closing parantheses.",
                        "DESC: Term=I'm an FSN:Fully Specified Name not ending with closing parantheses.",
                        "DESC: Term=lalala:Fully Specified Name not ending with closing parantheses.",
                        "DESC: Term=FSN:Fully Specified Name not ending with closing parantheses.",
                        "DESC: Term=FSN:Fully Specified Name not ending with closing parantheses.",
                        "DESC: Term=fsn:Fully Specified Name not ending with closing parantheses.",
                        "DESC: Term=FSN!:Fully Specified Name not ending with closing parantheses."
                      ],
                      "assertionUuid": "5a605c09-db1e-453f-aa4a-064faab2d310"
                    },
                    {
                      "testCategory": "component-centric-scope.validation",
                      "assertionText": "For a given concept, all description terms are unique.",
                      "failureCount": 3,
                      "runTimeInMilliSeconds": 19,
                      "firstNInstances": [
                        "DESC: Id=54772598008: non-unique term within concept.",
                        "DESC: Id=77208079002: non-unique term within concept.",
                        "DESC: Id=91419617004: non-unique term within concept."
                      ],
                      "assertionUuid": "2e0eb135-fd7d-4f24-83c1-0cba797ee766"
                    },
                    {
                      "testCategory": "component-centric-scope.validation",
                      "assertionText": "For each active FSN there is a synonym that has the same text.",
                      "failureCount": 11,
                      "runTimeInMilliSeconds": 52,
                      "firstNInstances": [
                        "5201776001 |FSN!|",
                        "13651972004 |FSN|",
                        "21844056005 |FSN!|",
                        "28887925008 |FSN|",
                        "32961698003 |FSN|",
                        "55222790002 |fsn|",
                        "83650816007 |FSN|",
                        "90918250004 |FSN|",
                        "92028688005 |Testing FSN|",
                        "96885130000 |I'm an FSN|"
                      ],
                      "assertionUuid": "19423070-7118-45bd-98ba-6d0dc18bc619"
                    },
                    {
                      "testCategory": "component-centric-scope.validation",
                      "assertionText": "All FSNs have a space before the semantic tag.",
                      "failureCount": 14,
                      "runTimeInMilliSeconds": 1487,
                      "firstNInstances": [
                        "DESCRIPTION: id=8698772017 : The FSN has no space before the semantic tag.",
                        "DESCRIPTION: id=9820835017 : The FSN has no space before the semantic tag.",
                        "DESCRIPTION: id=14680280012 : The FSN has no space before the semantic tag.",
                        "DESCRIPTION: id=30149554018 : The FSN has no space before the semantic tag.",
                        "DESCRIPTION: id=32062319011 : The FSN has no space before the semantic tag.",
                        "DESCRIPTION: id=39628308019 : The FSN has no space before the semantic tag.",
                        "DESCRIPTION: id=41679880014 : The FSN has no space before the semantic tag.",
                        "DESCRIPTION: id=42999976011 : The FSN has no space before the semantic tag.",
                        "DESCRIPTION: id=53022099010 : The FSN has no space before the semantic tag.",
                        "DESCRIPTION: id=56442839012 : The FSN has no space before the semantic tag."
                      ],
                      "assertionUuid": "32369add-8d9f-48de-a129-29b32c79a9d7"
                    },
                    {
                      "testCategory": "file-centric-scope.validation",
                      "assertionText": "Active Fully Specified Name associated with active concepts is unique in DESCRIPTION snapshot.",
                      "failureCount": 5,
                      "runTimeInMilliSeconds": 9378,
                      "firstNInstances": [
                        "DESC: Active FSN =FSN: is not unique in DESCRIPTION snapshot.",
                        "DESC: Active FSN =FSN!: is not unique in DESCRIPTION snapshot.",
                        "DESC: Active FSN =Honey Roast Ham (substance): is not unique in DESCRIPTION snapshot.",
                        "DESC: Active FSN =fsn: is not unique in DESCRIPTION snapshot.",
                        "DESC: Active FSN =test: is not unique in DESCRIPTION snapshot."
                      ],
                      "assertionUuid": "8ea2e5d9-5c35-4436-b67d-c5268b5da06c"
                    },
                    {
                      "testCategory": "component-centric-scope.validation",
                      "assertionText": "All active FSNs have a semantic tag.",
                      "failureCount": 14,
                      "runTimeInMilliSeconds": 1333,
                      "firstNInstances": [
                        "DESC: Term=fsn:Fully Specified Name without semantic tag.",
                        "DESC: Term=FSN:Fully Specified Name without semantic tag.",
                        "DESC: Term=FSN!:Fully Specified Name without semantic tag.",
                        "DESC: Term=Testing FSN:Fully Specified Name without semantic tag.",
                        "DESC: Term=I'm an FSN:Fully Specified Name without semantic tag.",
                        "DESC: Term=lalala:Fully Specified Name without semantic tag.",
                        "DESC: Term=FSN:Fully Specified Name without semantic tag.",
                        "DESC: Term=FSN:Fully Specified Name without semantic tag.",
                        "DESC: Term=fsn:Fully Specified Name without semantic tag.",
                        "DESC: Term=FSN!:Fully Specified Name without semantic tag."
                      ],
                      "assertionUuid": "a4ed3a89-170e-4d9c-995a-716447c4fe64"
                    },
                    {
                      "testCategory": "file-centric-scope.validation",
                      "assertionText": "There are no duplicate Definition terms in the DEFINITION snapshot file.",
                      "failureCount": 5,
                      "runTimeInMilliSeconds": 57,
                      "firstNInstances": [
                        "Definition id =2884622019: Term=[An immune system procedure that observes for evidence of hypersensitivity] is duplicate in the DEFINITION snapshot file.",
                        "Definition id =2884605016: Term=[An observation that generates a recording made from energy of the light spectrum] is duplicate in the DEFINITION snapshot file.",
                        "Definition id =2884805019: Term=[Disorder resulting from physical damage to the body] is duplicate in the DEFINITION snapshot file.",
                        "Definition id =3027632016: Term=[Intimate partner abuse is defined as physical, sexual or psychological harm perpetrated by a current or former partner. The abuse can occur among heterosexual or same-sex couples and does not require sexual intimacy.] is duplicate in the DEFINITION snapshot file.",
                        "Definition id =2884491012: Term=[Skin lesion, greater than 2 cm, flat, colored; differs from a macule only in size] is duplicate in the DEFINITION snapshot file."
                      ],
                      "assertionUuid": "3b2c1824-8445-410e-8ae2-d943be01c33f"
                    },
                    {
                      "testCategory": "file-centric-scope.validation",
                      "assertionText": "Reference componentId and valueId pair is unique in the ATTRIBUTE VALUE snapshot.",
                      "failureCount": 164,
                      "runTimeInMilliSeconds": 4298,
                      "firstNInstances": [
                        "Reference component id:2921327010 valueid=900000000000495008 pair is not unique in the Attribute Value snapshot",
                        "Reference component id:2922175013 valueid=900000000000495008 pair is not unique in the Attribute Value snapshot",
                        "Reference component id:2923148011 valueid=900000000000495008 pair is not unique in the Attribute Value snapshot",
                        "Reference component id:2923322011 valueid=900000000000495008 pair is not unique in the Attribute Value snapshot",
                        "Reference component id:2923327017 valueid=900000000000495008 pair is not unique in the Attribute Value snapshot",
                        "Reference component id:2923464010 valueid=900000000000495008 pair is not unique in the Attribute Value snapshot",
                        "Reference component id:2923647017 valueid=900000000000495008 pair is not unique in the Attribute Value snapshot",
                        "Reference component id:2951748012 valueid=900000000000495008 pair is not unique in the Attribute Value snapshot",
                        "Reference component id:2951860016 valueid=900000000000495008 pair is not unique in the Attribute Value snapshot",
                        "Reference component id:2955542016 valueid=900000000000495008 pair is not unique in the Attribute Value snapshot"
                      ],
                      "assertionUuid": "eff30fb0-7856-11e1-b0c4-0800200c9a60"
                    },
                    {
                      "testCategory": "component-centric-scope.validation",
                      "assertionText": "Active historical association refset members have active concepts as targets.",
                      "failureCount": 2,
                      "runTimeInMilliSeconds": 1224,
                      "firstNInstances": [
                        "AssociationRefset id=d8a72c8a-a747-51ed-81a3-f83151e773bb is active  but the target component is an inactive concept: 416972005",
                        "AssociationRefset id=67563fb7-a783-5305-b318-f7e00d834c0b is active  but the target component is an inactive concept: 6408001"
                      ],
                      "assertionUuid": "eb940ee0-7cd6-11e1-b0c4-0800200c9a66"
                    }
                  ],
                  "totalTestsRun": 157,
                  "testType": "SQL",
                  "executionId": 1.438380283882E12,
                  "timeTakenInSeconds": 1068,

                  "totalFailures": 10
                }
              }
            }
          };
          console.debug(scope.validation['report']);
          console.debug(scope.validation['report']['RVF Validation Result']);
          console.debug(scope.validation['report']['RVF Validation Result']['SQL test result']);

          var assertionsFailed = scope.validation['report']['RVF Validation Result']['SQL test result']['assertionsFailed']
          var failures = [];

          // declare table parameters
          scope.topTableParams = new ngTableParams({
              page: 1,
              count: 10,
              sorting: {failureCount: 'desc'},
              orderBy: 'failureCount'
            },
            {
              filterDelay: 50,
              total: assertionsFailed.length,
              getData: function ($defer, params) {

                console.debug('get main data', assertionsFailed);

                if (!assertionsFailed || assertionsFailed.length == 0) {
                  $defer.resolve([]);
                } else {

                  var orderedData = assertionsFailed;

                  params.total(orderedData.length);
                  orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;

                  $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
              }
            }
          );

          scope.$watch('assertionsFailed', function () {
            scope.topTableParams.reload();
          });

          // declare table parameters
          scope.failureTableParams = new ngTableParams({
              page: 1,
              count: 10,
              sorting: {concept: 'asc'},
              orderBy: 'concept'
            },
            {
              filterDelay: 50,
              total: failures.length,
              getData: function ($defer, params) {

                console.debug('get failure data', failures);

                if (!failures || failures.length == 0) {
                  $defer.resolve([]);
                } else {

                  var orderedData = failures;

                  params.total(orderedData.length);
                  orderedData = params.sorting() ? $filter('orderBy')(orderedData, params.orderBy()) : orderedData;

                  $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }

              }
            }
          );

          scope.$watch('failures', function () {
            console.debug('failures changed', failures);
            scope.failureTableParams.reload();
          });

          scope.viewFailures = function (assertionFailure) {

            console.debug('View failures', assertionFailure);

            scope.assertionFailureViewed = assertionFailure.assertionText;
            scope.viewTop = false;

            // convert instances into table objects
            var objArray = [];

            angular.forEach(assertionFailure.firstNInstances, function (instance) {
              var obj = {
                concept: null,
                errorMessage: instance,
                selected: false
              };
              objArray.push(obj);

            });

            // TODO Set edit enable/disable for edit panel loading

            // set failures to trigger watch
            failures = objArray;

            scope.failureTableParams.reload();
          };

          // TODO Make this respect paging
          scope.selectAll = function(selectAllActive) {
            angular.forEach(failures, function(failure) {
              failure.selected = selectAllActive;
            });
          };

          // TODO Decide how to represent concepts and implement
          scope.editConcept = function(concept) {

          };

        }

      };

    }])
;