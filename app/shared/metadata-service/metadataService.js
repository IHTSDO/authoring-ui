'use strict';

angular.module('singleConceptAuthoringApp')
  .service('metadataService', ['$http', '$rootScope', function ($http, $rootScope) {

    // TODO Wire this to endpoint service, endpoint config
    var apiEndpoint = '../snowowl/ihtsdo-sca/';

    // project cache (still used?)
    var projects = [];

    // relationship metadata
    var isaRelationshipId = '116680003';

    // component inactivation metadata
    var conceptInactivationReasons = [
      {id: 'AMBIGUOUS', text: 'Ambiguous component', display: [4]},
      {id: 'MOVED_ELSEWHERE', text: 'Component moved elsewhere', display: [3]},
      {id: 'DUPLICATE', text: 'Duplicate component', display: [7]},
      {id: 'ERRONEOUS', text: 'Erroneous component', display: [6, 9]},
      {id: 'LIMITED', text: 'Limited component', display: [9]},
      {id: 'OUTDATED', text: 'Outdated component', display: [6, 9]},
      {id: 'PENDING_MOVE', text: 'Pending move', display: [3]},
      {id: 'RETIRED', text: 'Reason not stated', display: [6, 9]}
    ];
    // var inactivationParent = '900000000000481005';

    var associationInactivationReasons =
      [
        {
          id: 'ALTERNATIVE',
          conceptId: '900000000000530003',
          text: 'ALTERNATIVE association reference set',
          display: 1
        },
        {
          id: 'MOVED_FROM',
          conceptId: '900000000000525002',
          text: 'MOVED FROM association reference set',
          display: 2
        },
        {
          id: 'MOVED_TO',
          conceptId: '900000000000524003',
          text: 'MOVED TO association reference set',
          display: 3
        },
        {
          id: 'POSSIBLY_EQUIVALENT_TO',
          conceptId: '900000000000523009',
          text: 'POSSIBLY EQUIVALENT TO association reference set',
          display: 4
        },
        {
          id: 'REFERS_TO',
          conceptId: '900000000000531004',
          text: 'REFERS TO concept association reference set',
          display: 5
        },
        {
          id: 'REPLACED_BY',
          conceptId: '900000000000526001',
          text: 'REPLACED BY association reference set',
          display: 6
        },
        {
          id: 'SAME_AS',
          conceptId: '900000000000527005',
          text: 'SAME AS association reference set',
          display: 7
        },
        {
          id: 'SIMILAR_TO',
          conceptId: '900000000000529008',
          text: 'SIMILAR TO association reference set',
          display: 8
        },
        {
          id: 'WAS_A',
          conceptId: '900000000000528000',
          text: 'WAS A association reference set',
          display: 9
        }
      ];
    // var associationInactivationParent = '900000000000522004';

    // description inactivation metadata
    var descriptionInactivationReasons = [
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

    //
    // International SNOMEDCT metadata
    //

    var internationalMetadata = {
      modules: [{
        id: '900000000000207008',
        name: 'SNOMED CT core module (core metadata concept)'
      }, {
        id: '900000000000012004',
        name: 'SNOMED CT model component module (core metadata concept)'
      }],
      defaultLanguage: 'en',
      languages: ['en'],
      dialects: {
        '900000000000509007': 'en-us', '900000000000508004': 'en-gb'
      }
    };

    //
    // Extension metadata
    // TODO Chris Swires: this is the format expected by setting extensionMetadata
    // in home.js, project.js, and review-tasks.js
    // TODO Hard-coded Swedish language module for dev/demo purposes
    var extensionMetadata = null;

    /**

     // modules as id/name object array
     modules: [{
        id: '45991000052106',
        name: 'SNOMED CT Sweden NRC maintained module (core metadata concept)'
      }],

     // languages as string array
     languages: ['sv', 'en'],

     // dialects as id->name map
     dialects: {
        '900000000000509007': 'en-us',
        '46011000052107': 'sv'

      }
     };
     */

      // Branch/Task-level metadata
      // Task level information
      // and should be automatically set by edit.js
      // and similar views
    var branchMetadata = {};


    //
    // Metadata setters
    //

    // Extension metadata
    // TODO Chris Swires, this is the setter for use
    // by home.js, review-tasks.js, and project.js
    function setExtensionMetadata(metadata) {

      console.debug('Setting extension metadata', metadata);

      // only set extension metadata if defaultModuleId is present
      if (!metadata || !metadata.hasOwnProperty('defaultModuleId')) {
        extensionMetadata = null;
      } else {

        // default dialect and language always includes en-us
        var dialects = {'900000000000509007': 'en-us'};
        var languages = ['en'];
        var defaultLanguage = '';

        // extract the default language and dialect
        var language, dialect = null;
        for (var key in metadata) {
          // console.debug('Checking property', key, metadata[key])
          if (metadata.hasOwnProperty(key)) {
            var match = key.match(/requiredLanguageRefset\.(.+)/);
            //console.debug('  Checking match', match);
            if (match && match[1]) {
              // console.debug('    Found match', match[1]);
              languages.push(match[1]);
              dialects[metadata[key]] = match[1];


              // set the default language if not already set
              if (!defaultLanguage) {
                defaultLanguage = match[1];
              }
            }
          }
        }

        if (languages.length === 1) {
          console.error('Error setting extension metadata: module was specified but no languages/dialects found');
        }


        extensionMetadata = {
          modules: [
            {
              id: metadata.defaultModuleId,
              name: metadata.defaultModuleName
            }
          ],
          defaultLanguage: defaultLanguage,
          languages: languages,
          dialects: dialects
        };
        console.debug('Set extension metadata', extensionMetadata, metadata);
        $rootScope.$broadcast('extensionMetadataChange');
      }
    }

    // Branch metadata
    // TODO Chris Swires, this is the setter for use
    // by views like edit.js, and should already be
    // fully functional. Shouldn't need to worry about this.
    function setBranchMetadata(branchMetadataObj) {
      console.debug('Setting branch metadata', branchMetadataObj);
      branchMetadata = branchMetadataObj;
    }

    //
    // Module retrieval functions
    //

    // retrieves the first extension module id if in extension
    // returns the first international module id if not
    // used by componentAuthoringUtil to set module on new components
    function getCurrentModuleId() {
      console.debug(extensionMetadata, internationalMetadata);
      return extensionMetadata ?
        extensionMetadata.modules[0].id : internationalMetadata.modules[0].id;
    }

    // checks if specified module is part of extension
    function isExtensionModule(moduleId) {
      if (!extensionMetadata || !Array.isArray(extensionMetadata.modules)) {
        return false;
      }
      return extensionMetadata.modules.filter(function (module) {
          return module.id === moduleId;
        }).length > 0;
    }

    // checks if specified dialect belongs to extension
    function isExtensionDialect(dialectId) {
      if (!extensionMetadata || !extensionMetadata.dialects) {
        return false;
      } else {
        return dialectId !== '900000000000509007' && extensionMetadata.dialects.hasOwnProperty(dialectId);
      }
    }

    // checks if specified module is locked to editing
    function isLockedModule(moduleId) {
      if (!extensionMetadata) {
        return false;
      }
      return !isExtensionModule(moduleId);
    }


    // if released, return international edition, if not released
    function getModulesForModuleId(moduleId) {
      if (isExtensionModule(moduleId)) {

        return extensionMetadata.modules;
      } else {

        return internationalMetadata.modules;
      }
    }

    function clearBranchMetadata() {
      extensionMetadata = null;
      branchMetadata = null;
    }

    //
    // Branch functions -- only used for branchPath resolution
    //

    function getBranch() {
      return branchMetadata.branchPath;
    }

    function getBranchRoot() {
      // if branch metadata has a project key, match for task: BRANCH_ROOT/pkey/tkey
      if (branchMetadata.projectKey) {
        return branchMetadata.branchPath.match(/(.*)\/[^\/]+\/[^\/]+$/)[1];
      }

      // otherwise, match for project: BRANCH_ROOT/pKey
      else {
        return branchMetadata.branchPath.match(/(.*)\/[^\/]+$/)[1];
      }
    }

    // returns extension dialects plus international dialects
    // NOTE: Extension dialects override international
    function getAllDialects() {
      // get the test branch dialects
      var dialects = angular.copy(internationalMetadata.dialects);
      if (extensionMetadata && extensionMetadata.dialects) {
        for (var key in extensionMetadata.dialects) {
          dialects[key] = extensionMetadata.dialects[key];
        }
      }
      return dialects;
    }

    function getDialectsForModuleId(moduleId, FSN) {
      // TODO Confirm this behavior (WRP-2808)
      // Always return the extension dialects if available
      // even for non-extension content, in order to allow
      // authors to add acceptabilities for existing descriptions
      // if (isExtensionModule(moduleId)) {
      if (extensionMetadata && !FSN) {
        return extensionMetadata.dialects;
      } else {
        return internationalMetadata.dialects;
      }
    }

    function getLanguagesForModuleId(moduleId) {

      if (isExtensionModule(moduleId)) {
        return extensionMetadata.languages;
      } else {
        return internationalMetadata.languages;
      }
    }

    function getDefaultLanguageForModuleId(moduleId) {
      if (isExtensionModule(moduleId)) {
        return extensionMetadata.defaultLanguage ? extensionMetadata.defaultLanguage : extensionMetadata.languages[0];
      } else {
        return internationalMetadata.defaultLanguage ? internationalMetadata.defaultLanguage : internationalMetadata.languages[0];
      }
    }


    //
    // Relationship metadata functions
    //
    function isIsaRelationship(typeId) {
      return typeId === isaRelationshipId;
    }

    //
    // Inactivation reason retrieval functions
    //

    function getConceptInactivationReasons() {
      return conceptInactivationReasons;
    }


    function getAssociationInactivationReasons() {
      return associationInactivationReasons;
    }

    function getDescriptionInactivationReasons() {
      return descriptionInactivationReasons;
    }

    //
    // Cached project retrieval functions
    //

    function getProjects() {
      return projects;
    }

    function getProjectForKey(key) {
      for (var i = 0; i < projects ? projects.length : -1; i++) {
        if (projects[i].key === key) {
          return projects[i];
        }
      }
      return null;
    }

    function setProjects(projectsList) {
      projects = projectsList;
    }

    return {

      // relationship functions
      isIsaRelationship: isIsaRelationship,

      // project cache getters/setters
      setProjects: setProjects,
      getProjects: getProjects,
      getProjectForKey: getProjectForKey,

      // inactivation reason retrieval
      getConceptInactivationReasons: getConceptInactivationReasons,
      getDescriptionInactivationReasons: getDescriptionInactivationReasons,
      getAssociationInactivationReasons: getAssociationInactivationReasons,

      // boolean checks exposed for use
      isLockedModule: isLockedModule,
      isExtensionDialect: isExtensionDialect,

      // extension module-dependent retrieval functions
      getCurrentModuleId: getCurrentModuleId,
      getModulesForModuleId: getModulesForModuleId,
      getDefaultLanguageForModuleId: getDefaultLanguageForModuleId,
      getLanguagesForModuleId: getLanguagesForModuleId,
      getDialectsForModuleId: getDialectsForModuleId,
      getAllDialects: getAllDialects,
      isExtensionSet: function () {
        return extensionMetadata !== null;
      },

      // module and branch metadata setters
      setExtensionMetadata: setExtensionMetadata,
      setBranchMetadata: setBranchMetadata,
      clearBranchMetadata: clearBranchMetadata,

      // branch/task fupath retrieval functions
      getBranch: getBranch,
      getBranchRoot: getBranchRoot,

      // TODO Functions exposed for dev work, remove when complete

      getInternationalMetadata: function () {
        return internationalMetadata;
      },

      getExtensionMetadata: function () {
        console.debug('extension metadata', extensionMetadata);
        return extensionMetadata;
      },
      getBranchMetadata: function () {
        return branchMetadata;
      }


    };

  }])
;
