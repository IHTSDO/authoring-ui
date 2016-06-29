'use strict';

angular.module('singleConceptAuthoringApp')
  .service('metadataService', ['$http', '$rootScope', function ($http, $rootScope) {

    // TODO Wire this to endpoint service, endpoint config
    var apiEndpoint = '../snowowl/ihtsdo-sca/';

    // branch and branch root
    var branch = null;
    var branchRoot = null;

    // relationship metadata
    var isaRelationshipId = '116680003';

    // component inactivation metadata
    var conceptInactivationReasons = [];
    // var inactivationParent = '900000000000481005';

    var associationInactivationReasons = [];
    // var associationInactivationParent = '900000000000522004';

    // description inactivation metadata
    var descriptionInactivationReasons = [];

    /**
     * Sets the static array of concept inactivation reasons
     */
    function setConceptInactivationReasons() {


      // set the inactivation reasons with combination of enum values and
      // preferred terms
      conceptInactivationReasons = [
        {id: 'AMBIGUOUS', text: 'Ambiguous component', display : [4]},
        {id: 'MOVED_ELSEWHERE', text: 'Component moved elsewhere', display : [3]},
        {id: 'DUPLICATE', text: 'Duplicate component', display : [7]},
        {id: 'ERRONEOUS', text: 'Erroneous component', display : [6, 9]},
        {id: 'LIMITED', text: 'Limited component', display : [9]},
        {id: 'OUTDATED', text: 'Outdated component', display : [6, 9]},
        {id: 'PENDING_MOVE', text: 'Pending move', display : [3]},
        {id: 'RETIRED', text: 'Reason not stated' , display : [6, 9]}
      ];
    }

    /**
     * Sets th e static array of description inactivation reasons
     */
    function setDescriptionInactivationReasons() {

      /**
       * [DUPLICATE, OUTDATED, ERRONEOUS, LIMITED, MOVED_ELSEWHERE, PENDING_MOVE, INAPPROPRIATE, CONCEPT_NON_CURRENT]
       * @type {*[]}
       */
      descriptionInactivationReasons = [
        {id: 'MOVED_ELSEWHERE', text: 'Component moved elsewhere'},
        {id: 'CONCEPT_NON_CURRENT', text: 'Concept non-current'},
        {id: 'DUPLICATE', text: 'Duplicate component'},
        {id: 'ERRONEOUS', text: 'Erroneous component'},
        {id: 'INAPPROPRIATE', text: 'Inappropriate component'},
        {id: 'LIMITED', text: 'Limited component'},
        {id: 'OUTDATED', text: 'Outdated component'},
        {id: 'PENDING_MOVE', text: 'Pending move'},
        {id: 'RETIRED', text: 'Reason not stated'}

      ];
    }

    /**
     * Sets the static array of association inactivation reasons
     */
    function setAssociationInactivationReasons() {

      associationInactivationReasons =
        [
          {
            id: 'ALTERNATIVE',
            text: 'ALTERNATIVE association reference set',
            display: 1
          },
          {
            id: 'MOVED_FROM',
            text: 'MOVED FROM association reference set',
            display: 2
          },
          {
            id: 'MOVED_TO',
            text: 'MOVED TO association reference set',
            display: 3
          },
          {
            id: 'POSSIBLY_EQUIVALENT_TO',
            text: 'POSSIBLY EQUIVALENT TO association reference set',
            display: 4
          },
          {
            id: 'REFERS_TO',
            text: 'REFERS TO concept association reference set',
            display: 5
          },
          {
            id: 'REPLACED_BY',
            text: 'REPLACED BY association reference set',
            display: 6
          },
          {
            id: 'SAME_AS',
            text: 'SAME AS association reference set',
            display: 7
          },
          {
            id: 'SIMILAR_TO',
            text: 'SIMILAR TO association reference set',
            display: 8
          },
          {
            id: 'WAS_A',
            text: 'WAS A association reference set',
            display: 9
          }
        ];
    }

    var projects = [];

    return {

      setBranch: function(branchName) {
        if (!branchName) {
          console.error('Fatal error: metadata branch root cannot be null');
          return;
        }
        branch = branchName;
        branchRoot = branchName.split('/')[0];

        // console.debug('new branch root', branchRoot);
      },

      getBranch : function() {
        return branch;
      },

      getBranchRoot : function() {
        return branchRoot;
      },

      /**
       * Returns true if typeId matches that specified for IsA relationship.
       * @param typeId the typeId
       * @returns {boolean} true if equal, false if not
       */
      isIsaRelationship: function (typeId) {
        return typeId === isaRelationshipId;
      },

      /**
       * Gets the concept inactivation reasons.
       * @returns {Array} the concept inactivation reasons
       */
      getConceptInactivationReasons: function () {
        return conceptInactivationReasons;
      },

      /**
       * Gets the association inactivation reasons.
       * @returns {Array} the association inactivation reasons
       */
      getAssociationInactivationReasons: function () {
        return associationInactivationReasons;
      },

      /**
       * Get the description inactivation reasons
       * @returns {Array}
       */
      getDescriptionInactivationReasons: function () {
        return descriptionInactivationReasons;
      },

      getProjects: function () {
        return projects;
      },

      setProjects: function (projectsList) {
        projects = projectsList;
      },

      /**
       * Initializes all required metadata for a specified branch. Run at
       * application start.
       * @param branch the branch from which metadata is retrieved (e.g.
       *   'MAIN')
       */
      initialize: function () {
        setConceptInactivationReasons();
        setAssociationInactivationReasons();
        setDescriptionInactivationReasons();
      }

    };

  }])
;
