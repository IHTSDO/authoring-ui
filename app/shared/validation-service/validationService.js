'use strict';

////////////////////////////////////////////////////////////////////////////
// RVF Validation Report Handler
//
// Parses assertion errors returned by the RVF service into a standard
// form that can be used by the validation report display at task and
// project level.
////////////////////////////////////////////////////////////////////////////
angular.module('singleConceptAuthoringApp')
  .service('validationService' [function () {

    /////////////////////////////////////
    // Public Methods
    /////////////////////////////////////

    // parse the instance
    // arguments
    // * concepts:  the list of concepts associated with this validation report
    // * assertionText:  the text for the assertionType
    // * instance:  the actual assertion error instance
    //
    // Returns:  map of id to
    function parseInstance(concepts, assertionText, instance) {

      if (!concepts || !assertionText || !instance) {
        console.error('Must specify all parameters for parseInstance');
        return {};
      }

      var componentFieldMap = [];

      // attempt to extract SCTID



      /*
       INITIAL SWITCH STATEMENTSW -- MAY FLESH OUT TEMPORAQRILY
       BUT THIS ShOULD BE MOVED TO BACKEND SERVICES

      switch (assertionText) {

        case 'All active definitions are preferred.':
          break;
        case 'All active FSNs for a given concept have the same semantic tag.':
          break;
        case 'All active FSNs have a semantic tag.':
          break;
        case 'All concepts have at least one inferred is-a relationship.':
          break;
        case 'All concepts have at least one stated is-a relationship.':
          break;
        case 'All definitions are case sensitive.':
          break;
        case 'All destination ids found in the Inferred Relationship snapshot file exist in the Concept snapshot file.':
          break;
        case 'All destination ids found in the Stated Relationship snapshot file exist in the Concept snapshot file.':
          break;

        // SAMPLE: "DESC: Term=fsn:Fully Specified Name not ending with closing
        // parantheses."
        case 'All FSNs end in closing parentheses.':
        /!*  var arr = phrase.match(/phrase=(.*)/);
         if (arr != null) { // Did it match?
         alert(arr[1]);
         } *!/
          // extract the term
          var term = instance.match(/Term=(.*)/);

          if (!term) {
            console.error('Failed to match term regexp');
          } else {

            // No element id constructed, find it
            angular.forEach(concepts, function (concept) {
              angular.forEach(concept.descriptions, function (description) {
                if (description.type && description.type === 'FSN' && description.term && description.term === term) {
                  var mapEntry = {
                    'displayText': 'FSN ' + term + ' does not end in closing parentheses',
                    'type': 'description',
                    'id': description.descriptionId,
                    'field': 'term',
                    'error': error
                  };
                  componentFieldMap.push(mapEntry);
                }
              });
            });
          }

          // construct text

          break;
        case 'All FSNs have a space before the semantic tag.':
          break;
        case 'All inactive concepts have definition status of PRIMITIVE.':
          break;
        case 'All inferred is-a relationships have relationship group of 0.':
          break;
        case 'All inferred relationships in which the concept associated is inactive are inactive relationships.':
          break;
        case 'All stated is-a relationships have relationship group of 0.':
          break;
        case 'All stated relationships in which the source concept is inactive are inactive relationships.':
          break;
        case 'Case-sensitive terms have appropriate caseSignificanceId.':
          break;
        case 'Case-sensitive terms that share initial words also share caseSignificanceId value.':
          break;

        // SAMPLE: "DESC: Id=54772598008: non-unique term within concept.",
        case 'For a given concept all description terms are unique.':
          break;
        case 'For each active FSN there is a synonym that has the same text.':
          break;
        case 'Inferred relationship modifier is always SOME.':
          break;
        case 'No active definitions contain double spaces.':
          break;
        case 'No active definitions contain leading or trailing spaces.':
          break;
        case 'No active term matches that of an inactive Description.':
          break;
        case 'No active Terms contain double spaces.':
          break;
        case 'No active Terms contain leading or trailing spaces.':
          break;
        case 'No synonyms have semantic tags.':
          break;
        case 'Relationship groups contain at least 2 relationships.':
          break;
        case 'Stated relationship modifier is always SOME.':
          break;
        case 'Terms contains balanced parentheses.':
          break;
        case 'The definition status is PRIMITIVE for concepts having only one defining relationship.':
          break;

        // SAMPLE:  "DESC: id=8698772017:First letter of the active FSN of
        // active concept not capitalized.",
        case 'The first letter of the FSN should be capitalized.':
          break;
        default:
          break;
      }*/

      return componentFieldMap;

    }

    ////////////////////////////////////////////
    // Method Visibility
    ////////////////////////////////////////////
    return {
      parseInstance: parseInstance
    };
  }]);