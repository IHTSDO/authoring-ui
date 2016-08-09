'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles all functionality surrounding CRS tickets
 */
  .factory('crsService', function ($http, $rootScope, $q, scaService, snowowlService, $timeout) {

      var currentTask;

      var currentTaskConcepts = null;

      var devConcepts = [
        {
          "effectiveTime": null,
          "moduleId": "900000000000207008",
          "active": true,
          "conceptId": null,
          "fsn": "Automation_FSN",
          "definitionStatus": "PRIMITIVE",
          "preferredSynonym": null,
          "descriptions": [{
            "effectiveTime": null,
            "moduleId": "900000000000207008",
            "active": true,
            "descriptionId": null,
            "conceptId": null,
            "type": "FSN",
            "lang": "en",
            "term": "Automation_FSN",
            "caseSignificance": "INITIAL_CHARACTER_CASE_INSENSITIVE",
            "additionalFields": null,
            "acceptabilityMap": {
              "900000000000509007": "PREFERRED",
              "900000000000508004": "PREFERRED"
            },
            "definitionOfChanges": null
          }, {
            "effectiveTime": null,
            "moduleId": "900000000000207008",
            "active": true,
            "descriptionId": null,
            "conceptId": null,
            "type": "SYNONYM",
            "lang": "en",
            "term": "Automation_PT",
            "caseSignificance": "INITIAL_CHARACTER_CASE_INSENSITIVE",
            "additionalFields": null,
            "acceptabilityMap": {
              "900000000000509007": "PREFERRED",
              "900000000000508004": "PREFERRED"
            },
            "definitionOfChanges": null
          }, {
            "effectiveTime": null,
            "moduleId": "900000000000207008",
            "active": true,
            "descriptionId": null,
            "conceptId": null,
            "type": "SYNONYM",
            "lang": "en",
            "term": "No synonym",
            "caseSignificance": "INITIAL_CHARACTER_CASE_INSENSITIVE",
            "additionalFields": null,
            "acceptabilityMap": {
              "900000000000509007": "ACCEPTABLE",
              "900000000000508004": "ACCEPTABLE"
            },
            "definitionOfChanges": null
          }, {
            "effectiveTime": null,
            "moduleId": "900000000000207008",
            "active": true,
            "descriptionId": null,
            "conceptId": null,
            "type": "TEXT_DEFINITION",
            "lang": "en",
            "term": "This is the definition of the new concept, will be added later",
            "caseSignificance": "ENTIRE_TERM_CASE_SENSITIVE",
            "additionalFields": null,
            "acceptabilityMap": {
              "900000000000509007": "PREFERRED",
              "900000000000508004": "PREFERRED"
            },
            "definitionOfChanges": null
          }],
          "relationships": [{
            "effectiveTime": null,
            "moduleId": "900000000000207008",
            "active": true,
            "relationshipId": null,
            "type": {
              "conceptId": "116680003",
              "fsn": "Is a (attribute)"
            },
            "target": {
              "effectiveTime": null,
              "moduleId": null,
              "active": null,
              "conceptId": "119295008",
              "fsn": "Specimen obtained by aspiration (specimen)",
              "definitionStatus": null
            },
            "sourceId": null,
            "groupId": 0,
            "characteristicType": "STATED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }],
          "additionalFields": null,
          "definitionOfChanges": {
            "changeId": null,
            "changeType": "NEW_CONCEPT",
            "changed": true,
            "topic": "Automation_Topic",
            "notes": "New notes will be created later",
            "reference": "Articles from Internet",
            "reasonForChange": "New modification",
            "namespace": "New namespace",
            "currentFsn": null
          }
        },
        {
          "effectiveTime": "20040731",
          "moduleId": "900000000000207008",
          "active": false,
          "conceptId": "257495001",
          "fsn": "New concept of organism topic",
          "definitionStatus": "PRIMITIVE",
          "preferredSynonym": "Organism",
          "descriptions": [{
            "effectiveTime": null,
            "moduleId": "900000000000207008",
            "active": true,
            "descriptionId": null,
            "conceptId": "257495001",
            "type": "FSN",
            "lang": "en",
            "term": "New concept of organism topic",
            "caseSignificance": "INITIAL_CHARACTER_CASE_INSENSITIVE",
            "additionalFields": null,
            "acceptabilityMap": {
              "900000000000509007": "PREFERRED",
              "900000000000508004": "PREFERRED"
            },
            "definitionOfChanges": {
              "changeId": null,
              "changeType": "NEW_DESCRIPTION",
              "changed": true
            }
          }, {
            "effectiveTime": "20020131",
            "moduleId": "900000000000207008",
            "active": true,
            "descriptionId": "383345014",
            "conceptId": "257495001",
            "type": "SYNONYM",
            "lang": "en",
            "term": "Organism",
            "caseSignificance": "INITIAL_CHARACTER_CASE_INSENSITIVE",
            "additionalFields": null,
            "acceptabilityMap": {
              "900000000000508004": "PREFERRED",
              "900000000000509007": "PREFERRED"
            },
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20020131",
            "moduleId": "900000000000207008",
            "active": false,
            "descriptionId": "648796018",
            "conceptId": "257495001",
            "type": "FSN",
            "lang": "en",
            "term": "Organism (organism)",
            "caseSignificance": "INITIAL_CHARACTER_CASE_INSENSITIVE",
            "additionalFields": null,
            "acceptabilityMap": {
              "900000000000508004": "PREFERRED",
              "900000000000509007": "PREFERRED"
            },
            "definitionOfChanges": {
              "changeId": null,
              "changeType": "CHANGE_DESCRIPTION",
              "changed": true,
              "descriptionStatus": "Retired"
            }
          }],
          "relationships": [{
            "effectiveTime": "20040731",
            "moduleId": "900000000000207008",
            "active": false,
            "relationshipId": "144496025",
            "type": {
              "conceptId": "116680003",
              "fsn": "Is a (attribute)"
            },
            "target": {
              "effectiveTime": "20020131",
              "moduleId": "900000000000207008",
              "active": true,
              "conceptId": "138875005",
              "fsn": "SNOMED CT Concept (SNOMED RT+CTV3)",
              "definitionStatus": "PRIMITIVE"
            },
            "sourceId": "257495001",
            "groupId": 0,
            "characteristicType": "INFERRED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }],
          "additionalFields": null,
          "definitionOfChanges": {
            "changeId": null,
            "changeType": "CHANGE_RETIRE_CONCEPT",
            "changed": true,
            "topic": "Automation_Topic",
            "summary": "Summary for request",
            "notes": "New notes for request",
            "reference": "Articles from Internet",
            "reasonForChange": "New modification",
            "namespace": "New namespace",
            "currentFsn": "New concept of organism topic",
            "proposedStatus": "Duplicate",
            "historyAttribute": "Maybe a",
            "historyAttributeValue": "A new attribute value"
          }
        },
        {
          "effectiveTime": "20020131",
          "moduleId": "900000000000207008",
          "active": false,
          "conceptId": "155574008",
          "fsn": "Asthma (disorder)",
          "definitionStatus": "PRIMITIVE",
          "preferredSynonym": "Asthma",
          "descriptions": [{
            "effectiveTime": "20080731",
            "moduleId": "900000000000207008",
            "active": true,
            "descriptionId": "2724893013",
            "conceptId": "155574008",
            "type": "FSN",
            "lang": "en",
            "term": "Asthma (disorder)",
            "caseSignificance": "INITIAL_CHARACTER_CASE_INSENSITIVE",
            "additionalFields": null,
            "acceptabilityMap": {
              "900000000000508004": "PREFERRED",
              "900000000000509007": "PREFERRED"
            },
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20020131",
            "moduleId": "900000000000207008",
            "active": true,
            "descriptionId": "242335016",
            "conceptId": "155574008",
            "type": "SYNONYM",
            "lang": "en",
            "term": "Asthma",
            "caseSignificance": "INITIAL_CHARACTER_CASE_INSENSITIVE",
            "additionalFields": null,
            "acceptabilityMap": {
              "900000000000508004": "PREFERRED",
              "900000000000509007": "PREFERRED"
            },
            "definitionOfChanges": null
          }, {
            "effectiveTime": null,
            "moduleId": "900000000000207008",
            "active": true,
            "descriptionId": null,
            "conceptId": "155574008",
            "type": "SYNONYM",
            "lang": "en",
            "term": "Lots of asthma",
            "caseSignificance": "INITIAL_CHARACTER_CASE_INSENSITIVE",
            "additionalFields": null,
            "acceptabilityMap": {
              "900000000000509007": "ACCEPTABLE",
              "900000000000508004": "ACCEPTABLE"
            },
            "definitionOfChanges": {
              "changeId": null,
              "changeType": "NEW_DESCRIPTION",
              "changed": true
            }
          }, {
            "effectiveTime": "20080731",
            "moduleId": "900000000000207008",
            "active": false,
            "descriptionId": "535919016",
            "conceptId": "155574008",
            "type": "FSN",
            "lang": "en",
            "term": "Asthma",
            "caseSignificance": "INITIAL_CHARACTER_CASE_INSENSITIVE",
            "additionalFields": null,
            "acceptabilityMap": null,
            "definitionOfChanges": null
          }],
          "relationships": null,
          "additionalFields": null,
          "definitionOfChanges": {
            "changeId": null,
            "changeType": "CHANGE_RETIRE_CONCEPT",
            "changed": true,
            "topic": "Disorder",
            "notes": null,
            "reference": null,
            "reasonForChange": null,
            "currentFsn": "Asthma (disorder)"
          }
        },
        {
          "effectiveTime": "20020131",
          "moduleId": "900000000000207008",
          "active": true,
          "conceptId": "119707005",
          "fsn": "Nose implantation (procedure)",
          "definitionStatus": "FULLY_DEFINED",
          "preferredSynonym": "Nose implantation",
          "descriptions": [{
            "effectiveTime": "20020131",
            "moduleId": "900000000000207008",
            "active": true,
            "descriptionId": "710391017",
            "conceptId": "119707005",
            "type": "FSN",
            "lang": "en",
            "term": "Nose implantation (procedure)",
            "caseSignificance": "INITIAL_CHARACTER_CASE_INSENSITIVE",
            "additionalFields": null,
            "acceptabilityMap": {
              "900000000000508004": "PREFERRED",
              "900000000000509007": "PREFERRED"
            },
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20020131",
            "moduleId": "900000000000207008",
            "active": true,
            "descriptionId": "183900017",
            "conceptId": "119707005",
            "type": "SYNONYM",
            "lang": "en",
            "term": "Nose implantation",
            "caseSignificance": "INITIAL_CHARACTER_CASE_INSENSITIVE",
            "additionalFields": null,
            "acceptabilityMap": {
              "900000000000508004": "PREFERRED",
              "900000000000509007": "PREFERRED"
            },
            "definitionOfChanges": null
          }, {
            "effectiveTime": null,
            "moduleId": "900000000000207008",
            "active": true,
            "descriptionId": null,
            "conceptId": null,
            "type": "SYNONYM",
            "lang": "en",
            "term": "Painful Nose Implantation",
            "caseSignificance": "INITIAL_CHARACTER_CASE_INSENSITIVE",
            "additionalFields": null,
            "acceptabilityMap": {
              "900000000000509007": "ACCEPTABLE",
              "900000000000508004": "ACCEPTABLE"
            },
            "definitionOfChanges": {
              "changeId": null,
              "changeType": "NEW_DESCRIPTION",
              "changed": true
            }
          }],
          "relationships": [{
            "effectiveTime": null,
            "moduleId": "900000000000207008",
            "active": true,
            "relationshipId": null,
            "type": {
              "conceptId": "116680003",
              "fsn": "Is a (attribute)"
            },
            "target": {
              "effectiveTime": null,
              "moduleId": null,
              "active": null,
              "conceptId": "38866009",
              "fsn": "Body part structure (body structure)",
              "definitionStatus": null
            },
            "sourceId": null,
            "groupId": 0,
            "characteristicType": "STATED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": {
              "changeId": null,
              "changeType": "NEW_RELATIONSHIP",
              "changed": true,
              "characteristicType": "Qualifying relationship"
            }
          }, {
            "effectiveTime": "20020731",
            "moduleId": "900000000000207008",
            "active": false,
            "relationshipId": "141112022",
            "type": {
              "conceptId": "116680003",
              "fsn": "Is a (attribute)"
            },
            "target": {
              "effectiveTime": "20020731",
              "moduleId": "900000000000207008",
              "active": true,
              "conceptId": "11688007",
              "fsn": "Implant of inert material into nose (procedure)",
              "definitionStatus": "PRIMITIVE"
            },
            "sourceId": "119707005",
            "groupId": 0,
            "characteristicType": "INFERRED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20020731",
            "moduleId": "900000000000207008",
            "active": true,
            "relationshipId": "1665386020",
            "type": {
              "conceptId": "116680003",
              "fsn": "Is a (attribute)"
            },
            "target": {
              "effectiveTime": "20020731",
              "moduleId": "900000000000207008",
              "active": true,
              "conceptId": "71861002",
              "fsn": "Implantation (procedure)",
              "definitionStatus": "FULLY_DEFINED"
            },
            "sourceId": "119707005",
            "groupId": 0,
            "characteristicType": "INFERRED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20070131",
            "moduleId": "900000000000207008",
            "active": false,
            "relationshipId": "141111026",
            "type": {
              "conceptId": "116680003",
              "fsn": "Is a (attribute)"
            },
            "target": {
              "effectiveTime": "20020131",
              "moduleId": "900000000000207008",
              "active": true,
              "conceptId": "172775003",
              "fsn": "Nasal prosthesis operation (procedure)",
              "definitionStatus": "FULLY_DEFINED"
            },
            "sourceId": "119707005",
            "groupId": 0,
            "characteristicType": "INFERRED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20070131",
            "moduleId": "900000000000207008",
            "active": true,
            "relationshipId": "2996304020",
            "type": {
              "conceptId": "116680003",
              "fsn": "Is a (attribute)"
            },
            "target": {
              "effectiveTime": "20020131",
              "moduleId": "900000000000207008",
              "active": true,
              "conceptId": "118781003",
              "fsn": "Procedure on nose (procedure)",
              "definitionStatus": "FULLY_DEFINED"
            },
            "sourceId": "119707005",
            "groupId": 0,
            "characteristicType": "INFERRED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20080731",
            "moduleId": "900000000000207008",
            "active": true,
            "relationshipId": "3954737029",
            "type": {
              "conceptId": "116680003",
              "fsn": "Is a (attribute)"
            },
            "target": {
              "effectiveTime": "20020131",
              "moduleId": "900000000000207008",
              "active": true,
              "conceptId": "118781003",
              "fsn": "Procedure on nose (procedure)",
              "definitionStatus": "FULLY_DEFINED"
            },
            "sourceId": "119707005",
            "groupId": 0,
            "characteristicType": "STATED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20080731",
            "moduleId": "900000000000207008",
            "active": false,
            "relationshipId": "3033174025",
            "type": {
              "conceptId": "405814001",
              "fsn": "Procedure site - Indirect (attribute)"
            },
            "target": {
              "effectiveTime": "20020131",
              "moduleId": "900000000000207008",
              "active": true,
              "conceptId": "45206002",
              "fsn": "Nasal structure (body structure)",
              "definitionStatus": "PRIMITIVE"
            },
            "sourceId": "119707005",
            "groupId": 1,
            "characteristicType": "INFERRED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20080731",
            "moduleId": "900000000000207008",
            "active": false,
            "relationshipId": "1917913025",
            "type": {
              "conceptId": "260686004",
              "fsn": "Method (attribute)"
            },
            "target": {
              "effectiveTime": "20020131",
              "moduleId": "900000000000207008",
              "active": true,
              "conceptId": "257867005",
              "fsn": "Insertion - action (qualifier value)",
              "definitionStatus": "PRIMITIVE"
            },
            "sourceId": "119707005",
            "groupId": 1,
            "characteristicType": "INFERRED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20070131",
            "moduleId": "900000000000207008",
            "active": false,
            "relationshipId": "676812020",
            "type": {
              "conceptId": "363699004",
              "fsn": "Direct device (attribute)"
            },
            "target": {
              "effectiveTime": "20020131",
              "moduleId": "900000000000207008",
              "active": true,
              "conceptId": "272248005",
              "fsn": "Nasal prosthesis (physical object)",
              "definitionStatus": "PRIMITIVE"
            },
            "sourceId": "119707005",
            "groupId": 0,
            "characteristicType": "INFERRED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20080731",
            "moduleId": "900000000000207008",
            "active": true,
            "relationshipId": "3380921020",
            "type": {
              "conceptId": "260686004",
              "fsn": "Method (attribute)"
            },
            "target": {
              "effectiveTime": "20020131",
              "moduleId": "900000000000207008",
              "active": true,
              "conceptId": "257867005",
              "fsn": "Insertion - action (qualifier value)",
              "definitionStatus": "PRIMITIVE"
            },
            "sourceId": "119707005",
            "groupId": 1,
            "characteristicType": "INFERRED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20080731",
            "moduleId": "900000000000207008",
            "active": true,
            "relationshipId": "4330801025",
            "type": {
              "conceptId": "260686004",
              "fsn": "Method (attribute)"
            },
            "target": {
              "effectiveTime": "20020131",
              "moduleId": "900000000000207008",
              "active": true,
              "conceptId": "257867005",
              "fsn": "Insertion - action (qualifier value)",
              "definitionStatus": "PRIMITIVE"
            },
            "sourceId": "119707005",
            "groupId": 1,
            "characteristicType": "STATED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20020731",
            "moduleId": "900000000000207008",
            "active": false,
            "relationshipId": "676816023",
            "type": {
              "conceptId": "363704007",
              "fsn": "Procedure site (attribute)"
            },
            "target": {
              "effectiveTime": "20020131",
              "moduleId": "900000000000207008",
              "active": true,
              "conceptId": "321667001",
              "fsn": "Respiratory tract structure (body structure)",
              "definitionStatus": "PRIMITIVE"
            },
            "sourceId": "119707005",
            "groupId": 0,
            "characteristicType": "INFERRED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20070131",
            "moduleId": "900000000000207008",
            "active": false,
            "relationshipId": "676814021",
            "type": {
              "conceptId": "363704007",
              "fsn": "Procedure site (attribute)"
            },
            "target": {
              "effectiveTime": "20020131",
              "moduleId": "900000000000207008",
              "active": true,
              "conceptId": "45206002",
              "fsn": "Nasal structure (body structure)",
              "definitionStatus": "PRIMITIVE"
            },
            "sourceId": "119707005",
            "groupId": 1,
            "characteristicType": "INFERRED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20080731",
            "moduleId": "900000000000207008",
            "active": true,
            "relationshipId": "3380922029",
            "type": {
              "conceptId": "405814001",
              "fsn": "Procedure site - Indirect (attribute)"
            },
            "target": {
              "effectiveTime": "20020131",
              "moduleId": "900000000000207008",
              "active": true,
              "conceptId": "45206002",
              "fsn": "Nasal structure (body structure)",
              "definitionStatus": "PRIMITIVE"
            },
            "sourceId": "119707005",
            "groupId": 1,
            "characteristicType": "INFERRED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20080731",
            "moduleId": "900000000000207008",
            "active": true,
            "relationshipId": "4330802021",
            "type": {
              "conceptId": "405814001",
              "fsn": "Procedure site - Indirect (attribute)"
            },
            "target": {
              "effectiveTime": "20020131",
              "moduleId": "900000000000207008",
              "active": true,
              "conceptId": "45206002",
              "fsn": "Nasal structure (body structure)",
              "definitionStatus": "PRIMITIVE"
            },
            "sourceId": "119707005",
            "groupId": 1,
            "characteristicType": "STATED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20070131",
            "moduleId": "900000000000207008",
            "active": false,
            "relationshipId": "676813026",
            "type": {
              "conceptId": "260686004",
              "fsn": "Method (attribute)"
            },
            "target": {
              "effectiveTime": "20020131",
              "moduleId": "900000000000207008",
              "active": true,
              "conceptId": "129377008",
              "fsn": "Reconstruction - action (qualifier value)",
              "definitionStatus": "PRIMITIVE"
            },
            "sourceId": "119707005",
            "groupId": 1,
            "characteristicType": "INFERRED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20030131",
            "moduleId": "900000000000207008",
            "active": false,
            "relationshipId": "676815022",
            "type": {
              "conceptId": "260686004",
              "fsn": "Method (attribute)"
            },
            "target": {
              "effectiveTime": "20030131",
              "moduleId": "900000000000207008",
              "active": false,
              "conceptId": "129336009",
              "fsn": "Implantation - action (qualifier value)",
              "definitionStatus": "PRIMITIVE"
            },
            "sourceId": "119707005",
            "groupId": 2,
            "characteristicType": "INFERRED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }, {
            "effectiveTime": "20030131",
            "moduleId": "900000000000207008",
            "active": false,
            "relationshipId": "1752435022",
            "type": {
              "conceptId": "260686004",
              "fsn": "Method (attribute)"
            },
            "target": {
              "effectiveTime": "20030131",
              "moduleId": "900000000000207008",
              "active": false,
              "conceptId": "129342008",
              "fsn": "Surgical repair - action (qualifier value)",
              "definitionStatus": "PRIMITIVE"
            },
            "sourceId": "119707005",
            "groupId": 2,
            "characteristicType": "INFERRED_RELATIONSHIP",
            "modifier": "EXISTENTIAL",
            "additionalFields": null,
            "definitionOfChanges": null
          }],
          "additionalFields": null,
          "definitionOfChanges": {
            "changeId": null,
            "changeType": "CHANGE_RETIRE_CONCEPT",
            "changed": true,
            "currentFsn": "Nose implantation (procedure)",
            "topic": "Disorder",
            "notes": "some notres",
            "reference": "ref1",
            "reasonForChange": "It's wrong"
          }
        }
      ];

      var devConceptIndex = 0;

      //
      // Retrieves the JSON attachment given a url
      //
      function getJsonAttachment(url) {
        var deferred = $q.defer();

        // TODO For testing only -- local host can't access dev jira
        if ($rootScope.development) {

          console.debug('*** Using development JSON concept object');
          if (devConceptIndex === devConcepts.length) {
            devConceptIndex = 0;
          }
          deferred.resolve(devConcepts[devConceptIndex++]);
        } else {

          $http.get(url).then(function (response) {
            deferred.resolve(response.data);
          }, function (error) {
            deferred.reject(error.message);
          });
        }
        return deferred.promise;
      }

      //
      // TODO Move this into endpoint config
      //
      function getRequestUrl(issueId) {
        if ($rootScope.development) {
          return 'https://dev-request.ihtsdotools.org/#/requests/view/' + issueId;
        } else if ($rootScope.uat) {
          return 'https://uat-request.ihtsdotools.org/#/requests/view/' + issueId;
        } else {
          return '';
        }
      }


      //
      // Create a new CRS Concept Container from a JSON object url
      //
      function getNewCrsConcept(issueId, url) {

        var deferred = $q.defer();

        console.debug('getting new crs concept', url);

        getJsonAttachment(url).then(function (conceptJson) {

          // create a crsGuid for this concept
          // Motivation: new concepts do not have an SCTID, and there may be multiple
          var crsGuid = snowowlService.createGuid();

          deferred.resolve({
            // the id fields
            conceptId: conceptJson.conceptId ? conceptJson.conceptId : snowowlService.createGuid(),
            fsn: conceptJson.fsn,
            preferredSynonym: conceptJson.preferredSynonym,

            // the request url
            requestUrl: getRequestUrl(issueId),

            // the concept, with definition changes
            concept: angular.copy(conceptJson),

            // the original JSON
            conceptJson: conceptJson,

            // flags
            saved: false

          });
        }, function (error) {
          console.debug('Failed to construct CRS concept container from url: ' + url);
          deferred.reject(error);
        });

        return deferred.promise;
      }

      //
      // Clear the CRS Concept list for a task
      //
      function clearCrsConceptsUiState(task) {
        scaService.deleteUiStateForTask(task.projectKey, task.key, 'crs-concepts');
      }


      //
      // Stores the CRS Concept list in UI State
      //
      function saveCrsConceptsUiState() {
        scaService.saveUiStateForTask(currentTask.projectKey, currentTask.key, 'crs-concepts', currentTaskConcepts);
      }

      // initialize ui states for a CRS task
      function initializeCrsTask() {
        var deferred = $q.defer();

        console.debug('initializing from task', currentTask);

        currentTaskConcepts = [];
        // cycle over each linked CRS issue
        for (var issueId in currentTask.issueLinkAttachments) {

          var urls = currentTask.issueLinkAttachments[issueId];

          // TODO Handle multiple attachments per link
          // expect only one url per issue link
          if (urls && urls[0]) {
            console.debug('adding attachment for', urls[0]);
            getNewCrsConcept(issueId, urls[0]).then(function (crsConcept) {
              currentTaskConcepts.push(crsConcept);

              // TODO Again, support multiple attachments
              // TODO Figure out why $q.all wasn't working with promise array
              console.debug('Length check', currentTaskConcepts.length, Object.keys(currentTask.issueLinkAttachments).length)
              if (currentTaskConcepts.length === Object.keys(currentTask.issueLinkAttachments).length) {
                deferred.resolve(currentTaskConcepts);
              }
            });
          }
        }
        return deferred.promise;
      }


      //
      // Gets the CRS concepts for task, initializing UI states on first attempt
      //
      function setTask(task) {
        var deferred = $q.defer();

        // set the local task variable for use by other functions
        currentTask = task;

        // clear the concepts list
        currentTaskConcepts = null;

        // PREREQUISITE: Task must have CRS label
        if (task.labels.indexOf('CRS') === -1) {
          deferred.resolve('Not a CRS task');
        } else {

          // TODO Remove later -- Time delay for DEV to prevent header-access errors
          console.debug('IS DEV', $rootScope.development);
          var timeDelay = $rootScope.development === null || $rootScope.development === undefined ? 2000 : 0;
          $timeout(function () {

            // check if this task has previously been initialized
            scaService.getUiStateForTask(task.projectKey, task.key, 'crs-concepts').then(function (concepts) {

              console.debug('crs ui-state', concepts);

              // if already initialized, simply return
              if (concepts) {
                console.debug('--> Already initialized, resolving');
                currentTaskConcepts = concepts;
                deferred.resolve(concepts);
              } else {
                console.debug('--> Not initialized, initializing');
                initializeCrsTask().then(function (crsConcepts) {
                  console.debug('--> Initialization complete, returning', currentTaskConcepts)
                  deferred.resolve(currentTaskConcepts);
                }, function (error) {
                  deferred.reject('Error initializing CRS content');
                });
              }
            });
          }, timeDelay);
        }
        return deferred.promise;
      }

      function isCrsConcept(id) {

        if (!currentTaskConcepts) {
          return false;
        }

        console.debug('  checking crs concept for ', id, currentTaskConcepts);
        for (var i = 0; i < currentTaskConcepts.length; i++) {
          if (currentTaskConcepts[i].conceptId === id) {
            console.debug('    -> is crs concept');
            return true;
          }
        }
        return false;
      }

      function getCrsConcept(id) {
        for (var i = 0; i < currentTaskConcepts.length; i++) {
          if (currentTaskConcepts[i].conceptId === id) {
            return currentTaskConcepts[i];
          }
        }
        return null;
      }

      function getCrsConcepts(taskKey) {
        return currentTaskConcepts;
      }


      //
      // Save a concept against the stored id
      // NOTE: crsId required because snowowl may assign a new id
      //
      function saveCrsConcept(crsId, concept) {
        console.debug('saveCrsConcept', crsId, concept);
        for (var i = 0; i < currentTaskConcepts.length; i++) {
          if (currentTaskConcepts[i].conceptId === crsId) {

            // overwrite the concept id, concept, and set to saved
            currentTaskConcepts[i].conceptId = concept.conceptId
            currentTaskConcepts[i].concept = concept;
            currentTaskConcepts[i].saved = true;
            saveCrsConceptsUiState();
            break;
          }
        }
      }

//
// Function exposure
//
      return {
        setTask: setTask,
        isCrsConcept: isCrsConcept,
        getCrsConcept: getCrsConcept,
        getCrsConcepts: getCrsConcepts,
        saveCrsConcept: saveCrsConcept

      };
    }
  )
;
