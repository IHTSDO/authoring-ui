'use strict';

angular.module('singleConceptAuthoringApp')
  .service('metadataService', ['$http', '$rootScope', 'snowowlService', function ($http, $rootScope, snowowlService) {

    // TODO Wire this to endpoint service, endpoint config
    var apiEndpoint = '../snowowl/ihtsdo-sca/';

    // root branch for metadata computations
    var branch = null;

    // relationship metadata
    var isaRelationshipId = '116680003';

    // component inactivation metadata
    var componentInactivationReasons = [];
    // var inactivationParent = '900000000000481005';
    var associationInactivationReasons = [];
    // var associationInactivationParent = '900000000000522004';

    /**
     * Sets the static array of concept inactivation reasons
     */
    function setInactivationReasons() {


      // set the inactivation reasons with combination of enum values and
      // preferred terms
      componentInactivationReasons = [
        {id: 'AMBIGUOUS', text: 'Ambiguous component'},
        {id: 'MOVED_ELSEWHERE', text: 'Component moved elsewhere'},
        {id: 'DUPLICATE', text: 'Duplicate component'},
        {id: 'ERRONEOUS', text: 'Erroneous component'},
        {id: 'LIMITED', text: 'Limited component'},
        {id: 'OUTDATED', text: 'Outdated component'},
        {id: 'PENDING_MOVE', text: 'Pending move'},
        {id: 'RETIRED', text: 'Reason not stated'}
      ];

      /*
       NOTE: Cannot use this, as SnowOwl does not use SNOMEDCT concept, but rather abbreviation
       snowowlService.getConceptRelationshipsInbound(inactivationParent, branch, 0, -1).then(function (items) {
       items.inboundRelationships.filter(function (item) {
       return item.characteristicType === 'STATED_RELATIONSHIP' && item.type.id === isaRelationshipId;
       }).map(function(item) {
       componentInactivationReasons.push({conceptId : item.source.id, fsn : item.source.fsn});
       })
       }); */
    }

    /**
     * Sets the static array of association inactivation reasons
     */
    function setAssociationInactivationReasons() {

      associationInactivationReasons =
        [
          {
            id: 'ALTERNATIVE',
            text: 'ALTERNATIVE association reference set'
          },
          {
            id: 'MOVED_FROM',
            text: 'MOVED FROM association reference set'
          },
          {
            id: 'MOVED_TO',
            text: 'MOVED TO association reference set'
          },
          {
            id: 'POSSIBLY_EQUIVALENT_TO',
            text: 'POSSIBLY EQUIVALENT TO association reference set'
          },
          {
            id: 'REFERS_TO',
            text: 'REFERS TO concept association reference set'
          },
          {
            id: 'REPLACED_BY',
            text: 'REPLACED BY association reference set'
          },
          {
            id: 'SAME_AS',
            text: 'SAME AS association reference set'
          },
          {
            id: 'SIMILAR_TO',
            text: 'SIMILAR TO association reference set'
          },
          {
            id: 'WAS_A',
            text: 'WAS A association reference set'
          }
        ];

      /*
       NOTE: Cannot use this, as SnowOwl does not use SNOMEDCT concept, but rather abbreviation

       snowowlService.getConceptRelationshipsInbound(associationInactivationParent, branch, 0, -1).then(function (items) {
       items.inboundRelationships.filter(function (item) {
       return item.characteristicType === 'STATED_RELATIONSHIP' && item.type.id === isaRelationshipId;
       }).map(function(item) {
       associationInactivationReasons.push({conceptId : item.source.id, fsn : item.source.fsn});
       })
       });*/
    }

    return {

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
      getComponentInactivationReasons: function () {
        return componentInactivationReasons;
      },

      /**
       * Gets the association inactivation reasons.
       * @returns {Array} the association inactivation reasons
       */
      getAssociationInactivationReasons: function () {
        return associationInactivationReasons;
      },

      /**
       * Initializes all required metadata for a specified branch. Run at
       * application start.
       * @param branch the branch from which metadata is retrieved (e.g.
       *   'MAIN')
       */
      initialize: function (branchName) {
        branch = branchName;
        setInactivationReasons();
        setAssociationInactivationReasons();
      }

    };

  }])
;
