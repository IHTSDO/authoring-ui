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
        'conceptId': conceptId,
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
      angular.forEach(concept.descriptions, function (description) {
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
      angular.forEach(concept.descriptions, function (description) {
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
      angular.forEach(concept.relationships, function (relationship) {
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
      angular.forEach(concept.descriptions, function (description) {
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
      angular.forEach(concept.descriptions, function (description) {
        if (description.type === 'SYNONYM' && description.active) {
          elementFound = true;
        }
      });
      if (!elementFound) {
        return 'Concept does not have an active Synonym';
      }

      // check one IsA relationship exists
      elementFound = false;
      angular.forEach(concept.relationships, function (relationship) {
        if (relationship.type.conceptId === '116680003' && relationship.active) {
          elementFound = true;
        }
      });
      if (!elementFound) {
        return 'Concept does not have an active IsA relationship';
      }

      return concept;

    }

    function isConceptsEqual(c1, c2) {

      var i, j;

      // TODO Implement concept fields

      for (i = 0; i < c1.descriptions.length; i++) {
        for (j = 0; j < c2.descriptions.length; j++) {
          if (!isDescriptionsEqual(c1.descriptions[i], c2.descriptions[i])) {
            return false;
          }
        }
      }
      for (i = 0; i < c1.relationships.length; i++) {
        for (j = 0; j < c2.relationships.length; j++) {
          if (!isRelationshipsEqual(c1.relationships[i], c2.relationships[i])) {
            return false;
          }
        }
      }
    }

    function isDescriptionsEqual(d1, d2) {
      if (d1.descriptionId !== d2.descriptionId) {
        // console.debug('ids not equal');
        return false;
      }
      if (d1.active !== d2.active) {
        // console.debug('active not equal');
        return false;
      }
      if (d1.term !== d2.term) {
        // console.debug('term not equal');
        return false;
      }
      if (d1.type !== d2.type) {
        // console.debug('type not equal');
        return false;
      }
      // TODO Equality check needs improvement
      /*if (d1.acceptabilityMap !== d2.acceptabilityMap) {
        // console.debug('acceptabilityMap not equal');
        return false;
      }*/
      // console.debug('equal');
      return true;

      // TODO Check other fields, e.g. moduleId
    }

    function isRelationshipsEqual(r1, r2) {
      if (r1.relationshipId !== r2.relationshipId) {
        console.debug('id not equal');
        return false;
      }
      if (r1.active !== r2.active) {
        console.debug('active not equal');
        return false;
      }
      if (r1.groupId !== r2.groupId) {
        console.debug('groupId not equal');
        return false;
      }
      if (r1.type && !r2.type) {
        console.debug('type not equal');
        return false;
      }
      if (r2.type && !r1.type) {
        console.debug('type not equal');
        return false;
      }
      if (r1.type.conceptId !== r2.type.conceptId) {
        console.debug('type not equal');
        return false;
      }
      if (r1.target && !r2.target) {
        console.debug('target not equal');
        return false;
      }
      if (r2.target && !r1.target) {
        console.debug('target not equal');
        return false;
      }
      if (r1.target.conceptId !== r2.target.conceptId) {
        console.debug('target not equal');
        return false;
      }
      console.debug('equal');
      return true;

      // TODO Check other fields, e.g. moduleId

    }

    function isComponentsEqual(c1, c2) {
      console.debug('checking component equality', c1, c2);
      // determine type by id
      // NOTE descriptions have 'conceptId' field, must be checked first
      if (c1.hasOwnProperty('descriptionId') && c2.hasOwnProperty('descriptionId')) {
        console.debug('type -> description');
        return isDescriptionsEqual(c1, c2);
      } else if (c1.hasOwnProperty('relationshipId') && c2.hasOwnProperty('relationshipId')) {
        console.debug('type -> relationship');
        return isRelationshipsEqual(c1, c2);
      } else if (c1.hasOwnProperty('conceptId') && c2.hasOwnProperty('conceptId')) {
        console.debug('type -> concept');
        return isConceptsEqual(c1, c2);
      } else {
        console.debug('type -> UNKNOWN');
        return false;
      }
    }

    return {
      getNewConcept: getNewConcept,
      getNewDescription: getNewDescription,
      getNewFsn: getNewFsn,
      getNewPt: getNewPt,
      getNewIsaRelationship: getNewIsaRelationship,
      getNewAttributeRelationship: getNewAttributeRelationship,
      applyMinimumFields: applyMinimumFields,
      hasMinimumFields: hasMinimumFields,
      isComponentsEqual: isComponentsEqual,
      isConceptsEqual: isConceptsEqual,
      isDescriptionsEqual: isDescriptionsEqual,
      isRelationshipsEqual: isRelationshipsEqual
    };

  });
