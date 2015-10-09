'use strict';

angular.module('singleConceptAuthoringApp')
  .service('objectService', function () {

    /////////////////////////////////////
    // calls to return JSON objects
    /////////////////////////////////////

    /**
     * Get a default blank description (acceptable Synonym)
     * @param conceptId
     * @returns {{active: boolean, moduleId: string, type: string, term: null,
     *   lang: string, caseSignificance: string, conceptId: *,
     *   acceptabilityMap: {900000000000509007: string, 900000000000508004:
     *   string}}}
     */
    function getNewDescription(conceptId) {
      return {
        'active': true,
        'moduleId': '900000000000207008',
        'type': 'SYNONYM',
        'term': null,
        'lang': 'en',
        'caseSignificance': 'INITIAL_CHARACTER_CASE_INSENSITIVE',
        'conceptId' : conceptId,
        'acceptabilityMap': {
          '900000000000509007': 'ACCEPTABLE',
          '900000000000508004': 'ACCEPTABLE'
        }
      };
    }

    /**
     * Get a blank Fully Specified Name description
     * @param conceptId
     * @returns {{active, moduleId, type, term, lang, caseSignificance,
     *   conceptId, acceptabilityMap}|*}
     */
    function getNewFsn(conceptId) {
      // add FSN acceptability and type
      var desc = getNewDescription(conceptId);
      desc.type = 'FSN';
      desc.acceptabilityMap = {
        '900000000000509007': 'PREFERRED',
        '900000000000508004': 'PREFERRED'
      };

      return desc;
    }

    /**
     * Get a blank Preferred Term description
     * @param conceptId
     * @returns {{active, moduleId, type, term, lang, caseSignificance,
     *   conceptId, acceptabilityMap}|*}
     */
    function getNewPt(conceptId) {
      // add PT acceptability and type
      var desc = getNewDescription(conceptId);
      desc.type = 'SYNONYM';
      desc.acceptabilityMap = {
        '900000000000509007': 'PREFERRED',
        '900000000000508004': 'PREFERRED'
      };

      return desc;
    }




    // creates a blank relationship linked to specified source concept
    function getNewIsaRelationship(conceptId) {
      return {
        'active': true,
        'characteristicType': 'STATED_RELATIONSHIP',
        'effectiveTime': null,
        'groupId': 0,
        'modifier': 'EXISTENTIAL',
        'moduleId': '900000000000207008',
        'sourceId': conceptId,
        'target': {
          'conceptId': null
        },
        'type': {
          'conceptId': '116680003',
          'fsn': 'Is a (attribute)'
        }
      };
    }

    // creates a blank relationship linked to specified source concept
    function getNewAttributeRelationship(conceptId) {
      return {
        'active': true,
        'characteristicType': 'STATED_RELATIONSHIP',

        'effectiveTime': null,
        'groupId': 0,
        'modifier': 'EXISTENTIAL',
        'moduleId': '900000000000207008',
        'sourceId': conceptId,
        'target': {
          'conceptId': null
        },
        'type': {
          'conceptId': null
        }
      };
    }

    // creats a blank concept with one each of a blank
    // description, relationship, attribute
    function getNewConcept() {
      var concept = {
        'conceptId': null,
        'descriptions': [],
        'relationships': [],
        'fsn': null,
        'definitionStatus': 'PRIMITIVE',
        'active': true,
        'moduleId': '900000000000207008'
      };

      // add FSN description
      concept.descriptions.push(getNewFsn(null));

      // add a Preferred Term
      concept.descriptions.push(getNewPt(null));

      // add IsA relationship
      concept.relationships.push(getNewIsaRelationship(null));

      return concept;
    }


    /**
     * Checks if concept has basic fields required and adds them if not
     * Specifically checks one FSN, one SYNONYM, one IsA relationship
     * @param concept
     * @returns {*}
     */
    function applyMinimumFields(concept) {

      console.debug('Checking minimum fields', concept);

      var elementFound;

      // check one FSN exists
      elementFound = false;
      angular.forEach(concept.descriptions, function(description) {
        if (description.type === 'FSN' && description.active) {
          elementFound = true;
        }
      });
      if (!elementFound) {
        console.debug('Concept does not have FSN');
        concept.descriptions.push(getNewFsn());
      }

      // check one SYNONYM exists
      // TODO Consider whether to check acceptability map
      // currently left out because user can modify, and seems undesirable
      // to force a check for dialect
      elementFound = false;
      angular.forEach(concept.descriptions, function(description) {
        if (description.type === 'SYNONYM' && description.active) {
          elementFound = true;
        }
      });
      if (!elementFound) {
        console.debug('Concept does not have SYNONYM');
        concept.descriptions.push(getNewPt());
      }

      // check one IsA relationship exists
      elementFound = false;
      angular.forEach(concept.relationships, function(relationship) {
        if (relationship.type.conceptId === '116680003' && relationship.active) {
          elementFound = true;
        }
      });
      if (!elementFound) {
        console.debug('Concept does not have IsA relationship');
        concept.relationships.push(getNewIsaRelationship());
      }

      return concept;

    }

    /**
     * Function to check if a concept has minimum fields
     * @param concept
     * @returns string specifying missing field, or null if none
     */
    function hasMinimumFields(concept) {

      var elementFound;

      // check one FSN exists
      elementFound = false;
      angular.forEach(concept.descriptions, function(description) {
        if (description.type === 'FSN' && description.active) {
          elementFound = true;
        }
      });
      if (!elementFound) {
        return 'Concept does not have an active FSN';
      }

      // check one SYNONYM exists
      // TODO Consider whether to check acceptability map
      // currently left out because user can modify, and seems undesirable
      // to force a check for dialect
      elementFound = false;
      angular.forEach(concept.descriptions, function(description) {
        if (description.type === 'SYNONYM' && description.active) {
          elementFound = true;
        }
      });
      if (!elementFound) {
        return 'Concept does not have an active Synonym';
      }

      // check one IsA relationship exists
      elementFound = false;
      angular.forEach(concept.relationships, function(relationship) {
        if (relationship.type.conceptId === '116680003' && relationship.active) {
          elementFound = true;
        }
      });
      if (!elementFound) {
        return 'Concept does not have an active IsA relationship';
      }

      return concept;

    }


    return {
      getNewConcept: getNewConcept,
      getNewDescription: getNewDescription,
      getNewFsn: getNewFsn,
      getNewPt: getNewPt,
      getNewIsaRelationship: getNewIsaRelationship,
      getNewAttributeRelationship: getNewAttributeRelationship,
      applyMinimumFields: applyMinimumFields,
      hasMinimumFields: hasMinimumFields
    };

  });
