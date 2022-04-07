'use strict';

angular.module('singleConceptAuthoringApp')
  .service('metadataService', ['$rootScope', '$q', function ($rootScope, $q) {

    // project cache (still used?)
    var projects = [];

    var topLevelConcepts = [];

    var namespaces = [];

    var ungroupedAttributes = [];

    var myProjects = [];

    var semanticTags = [];

    var codeSystems = [];

    // whether mrcm is currently enabled (default true)
    var mrcmEnabled = true;

    var templatesEnabled = false;

    var spellcheckDisabled = false;

    var taskPromotionDisabled = false;

    var projectsLoadCompleted = false;

    // relationship metadata
    var isaRelationshipId = '116680003';

    var snomedCtRootId = '138875005';

    $rootScope.extensionMetadataSet = false;

    function getSnomedCtRootId() {
      return snomedCtRootId;
    }

    // component inactivation metadata
    var conceptInactivationReasons = [
      {id: 'AMBIGUOUS', text: 'Ambiguous concept', display: [4]},
      //{id: 'MOVED_ELSEWHERE', text: 'Concept moved elsewhere', display: [12,1]},
      {id: 'DUPLICATE', text: 'Duplicate concept', display: [7]},
      {id: 'ERRONEOUS', text: 'Erroneous concept', display: [6]},
      //{id: 'LIMITED', text: 'Limited component', display: [9]},
      {id: 'OUTDATED', text: 'Outdated concept', display: [1,6,11]},
      {id: 'NONCONFORMANCE_TO_EDITORIAL_POLICY', text: 'Non-conformance to editorial policy', display: [1,6,12]},
      //{id: 'RETIRED', text: 'Reason not stated', display: [6, 9]}
      {id: 'CLASSIFICATION_DERIVED_COMPONENT', text: 'Classification derived concept', display: [6,10]},
      {id: 'MEANING_OF_COMPONENT_UNKNOWN', text: 'Meaning of concept unknown', display: [1]}
    ];
    // var inactivationParent = '900000000000481005';

    //
    // Historical Association Reference Set
    // Restriction notes:
    // type - CONCEPT, NAMESPACE; if null, any component permitted
    // activeOnly - if true, only active components
    var associationInactivationReasons =
      [
        {
          id: 'REPLACED_BY',
          conceptId: '900000000000526001',
          text: 'REPLACED BY association reference set',
          display: 6,
          restrict: {
            activeOnly: true
          }
        },        
        {
          id: 'MOVED_FROM',
          conceptId: '900000000000525002',
          text: 'MOVED FROM association reference set',
          display: 2,
          restrict: {}
        },
        {
          id: 'MOVED_TO',
          conceptId: '900000000000524003',
          text: 'MOVED TO association reference set',
          display: 3,
          restrict: {
            type: 'NAMESPACE'
          }
        },
        {
          id: 'POSSIBLY_EQUIVALENT_TO',
          conceptId: '900000000000523009',
          text: 'POSSIBLY EQUIVALENT TO association reference set',
          display: 4,
          restrict: {
            activeOnly: true
          }
        },
        {
          id: 'REFERS_TO',
          conceptId: '900000000000531004',
          text: 'REFERS TO concept association reference set',
          display: 5,
          restrict: {
            type: 'CONCEPT'
          }
        }
        ,
        {
          id: 'SAME_AS',
          conceptId: '900000000000527005',
          text: 'SAME AS association reference set',
          display: 7,
          restrict: {
            activeOnly: true
          }
        },
        {
          id: 'SIMILAR_TO',
          conceptId: '900000000000529008',
          text: 'SIMILAR TO association reference set',
          display: 8,
          restrict: {} // NOTE: Not currently used according to TIG
        },
        {
          id: 'WAS_A',
          conceptId: '900000000000528000',
          text: 'WAS A association reference set',
          display: 9,
          restrict: {
            type: 'CONCEPT',
            activeOnly: true
          }
        },
        {
          id: 'PARTIALLY_EQUIVALENT_TO',
          conceptId: '1186924009',
          text: 'PARTIALLY EQUIVALENT TO association reference set',
          display: 10,
          restrict: {
            type: 'CONCEPT',
            activeOnly: true
          }
        },
        {
          id: 'POSSIBLY_REPLACED_BY',
          conceptId: '1186921001',
          text: 'POSSIBLY REPLACED BY association reference set',
          display: 11,
          restrict: {
            type: 'CONCEPT',
            activeOnly: true
          }
        },
        {
          id: 'ALTERNATIVE',
          conceptId: '900000000000530003',
          text: 'ALTERNATIVE association reference set',
          display: 12,
          restrict: {
            type: 'CONCEPT',
            activeOnly: true
          }
        },
        {
          id: '',
          conceptId: '',
          text: 'No association required',
          display: 1,
          restrict: {
            type: 'CONCEPT',
            activeOnly: true
          }
        }
      ];
    // var associationInactivationParent = '900000000000522004';

    // description inactivation metadata
    var descriptionInactivationReasons = [
      //{id: 'MOVED_ELSEWHERE', text: 'Component moved elsewhere'},
      //{id: 'CONCEPT_NON_CURRENT', text: 'Concept non-current'},
      //{id: 'INAPPROPRIATE', text: 'Inappropriate component'},
      //{id: 'LIMITED', text: 'Limited component'},
      //{id: 'PENDING_MOVE', text: 'Pending move'},
      {id: 'NOT_SEMANTICALLY_EQUIVALENT', text: 'Not Semantically Equivalent', display: [5]},
      {id: 'OUTDATED', text: 'Outdated component', display: []},
      {id: 'GRAMMATICAL_DESCRIPTION_ERROR', text: 'Grammatical description error', display: []},
      {id: 'NONCONFORMANCE_TO_EDITORIAL_POLICY', text: 'Non-conformance to editorial policy', display: []}

    ];

    var drugsModelOrdering = [
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
      }, {
        id: '715515008',
        name: 'LOINC - SNOMED CT Cooperation Project module (core metadata concept)'
      }],
      acceptLanguageMap: 'en-us;q=0.8,en-gb;q=0.5',
      defaultLanguages: 'en',
      languages: ['en'],
      dialects: {
        '900000000000509007': 'en-us', '900000000000508004': 'en-gb'
      },
      dialectDefaults: {
        '900000000000509007': 'true', '900000000000508004': 'true'
      },
      readOnlyDialects:{}
    };

    //
    // Extension metadata
    //
    var extensionMetadata = null;


    // Branch/Task-level metadata
    // Task level information
    // and should be automatically set by edit.js
    // and similar views
    var branchMetadata = {};


    //function to remove duplicated languages (Ireland edge case)
    function parseLanguages(languages) {
            return Array.from(new Set(languages));
        }


    //
    // Metadata setters
    //

    // Extension metadata
    function setExtensionMetadata(metadata) {

      // only set extension metadata if defaultModuleId is present
      if (!metadata || !metadata.hasOwnProperty('defaultModuleId')) {
        extensionMetadata = null;
        $rootScope.extensionMetadataSet = false;
      } else {

        // temporary variables used in parsing metadata
        var dialects = {'900000000000509007': 'en-us'};
        var dialectDefaults = {};
        var readOnlyDialects = {};
        var languages = ['en'];
        var defaultLanguages = [];
        var defaultLanguageRefsetId = null;

        // extract the available language refset ids, dialect ids, language codes
        for (var key in metadata) {
          if (metadata.hasOwnProperty(key)) {
            var match = key.match(/requiredLanguageRefset\.(.+)/);
            if (match && match[1]) {
              languages.push(match[1]);
              dialects[metadata[key]] = match[1];

              // set the default refset id if not already set
              if (!defaultLanguageRefsetId) {
                defaultLanguageRefsetId = metadata[key];
              }

              // set the default language if not already set
              if (defaultLanguages.length === 0) {
                defaultLanguages.push(match[1]);
              }
            } else {
              match = key.match(/requiredLanguageRefsets/);
              if (match) {
                var requiredLanguageRefsets = metadata['requiredLanguageRefsets'];
                requiredLanguageRefsets.forEach(function(lang) {
                  let languageKey = null;
                  let languageValue = null;
                  for (var key in lang) {
                      if (key.length === 2){
                          languageKey = key;
                          languageValue = lang[key];
                      }
                  }
                  if(!languages.includes(languageKey)){
                      languages.push(languageKey);
                  }
                  if(lang.dialectName){
                      dialects[languageValue] = lang.dialectName;
                  }
                  else{
                    dialects[languageValue] = languageKey;
                  }

                  if(lang.default === "true" && !defaultLanguages.includes(languageKey)){
                      defaultLanguages.push(languageKey);
                  }
                  if(lang.default !== null && lang.default !== undefined){
                      //set dialect default for langauge refset value autogeneration
                      dialectDefaults[languageValue] = lang.default;
                  }
                  if(lang.readOnly !== null && lang.readOnly !== undefined){
                      //set dialect default for langauge refset value autogeneration
                      readOnlyDialects[languageValue] = lang.readOnly;
                  }
                });

                // set the default refset id if not already set
                if (!defaultLanguageRefsetId && languages.length === 2) {
                    for (var langRefSetId in dialects){
                      if(languages[1] === dialects[langRefSetId]) {
                        defaultLanguageRefsetId = langRefSetId;
                      }
                    }
                }
                if(!defaultLanguageRefsetId && Object.keys(dialects).length > 1){
                    requiredLanguageRefsets.forEach(function(lang) {
                        let languageValue = null;
                        for (var key in lang) {
                              if (key.length === 2){
                                  languageValue = lang[key];
                              }
                          }
                        if(lang.default && lang.default !== null && lang.default !== undefined && lang.default === "true")
                            {
                                defaultLanguageRefsetId = lang[Object.keys(lang)[0]];
                            }
                      });
                }
                if(!defaultLanguageRefsetId) {
                  defaultLanguageRefsetId = '900000000000509007';
                }
              }
            }
          }
        }

        // Add optional language refsets
        if (metadata.optionalLanguageRefsets) {
          for (let i = 0; i < metadata.optionalLanguageRefsets.length; i++) {
            dialects[metadata.optionalLanguageRefsets[i]['refsetId']] = metadata.optionalLanguageRefsets[i]['language'];
          }              
        } 

        languages = parseLanguages(languages);
        defaultLanguages = parseLanguages(defaultLanguages);

        //
        // Validate extracted values
        //
        if (!metadata.shortname) {
          console.warn('No country code (shortname) supplied for extension metadata');
        }

        if (defaultLanguages.length === 0) {
          defaultLanguages.push(languages[0]);
        }
          
        if (metadata.useInternationalLanguageRefsets) {
            dialects = internationalMetadata.dialects;
            dialectDefaults = internationalMetadata.dialectDefaults;
        }

        if (!defaultLanguageRefsetId && metadata.defaultModuleId !== '731000124108' /*US extension*/) {
          console.error('Could not determine language refset for extension metadata');
        }


        // populate the cached extension metadata from passed metadata and temporary variables
        extensionMetadata = {
          modules: [
            {
              id: metadata.defaultModuleId,
              name: metadata.defaultModuleName
            }
          ],
          additionalModules: [],
          shortname: metadata.shortname,
          acceptLanguageMap: defaultLanguages[0] + '-' + (metadata.shortname ? metadata.shortname.toUpperCase() : 'XX') + '-x-' + defaultLanguageRefsetId + ';q=0.8,en-US;q=0.5',
          defaultLanguages: defaultLanguages,
          languages: languages,
          dialects: dialects,
          dialectDefaults: dialectDefaults,
          readOnlyDialects: readOnlyDialects,
          dependencyRelease: metadata.dependencyRelease,
          codeSystemShortName : metadata.codeSystemShortName,
          useInternationalLanguageRefsets: (metadata.useInternationalLanguageRefsets ? true : false),
          optionalLanguageRefsets: metadata.optionalLanguageRefsets,
          additionalFSNs: metadata.additionalFSNs 
        };
        if(metadata.languageSearch){
            extensionMetadata.acceptLanguageMap = metadata.languageSearch;
        };
        if(metadata.languageEdit){
            console.log(metadata.languageEdit);

        };
        console.log(extensionMetadata);
        $rootScope.extensionMetadataSet = true;
        $rootScope.$broadcast('setExtensionMetadata');
      }

      if(getCurrentModuleId() !== '900000000000207008'){
        var found = false;
        for(var i = 0; i < descriptionInactivationReasons.length; i++) {
            if (descriptionInactivationReasons[i].id == 'DUPLICATE') {
                found = true;
            }
            if(i === descriptionInactivationReasons.length -1 && !found){
                descriptionInactivationReasons.push({id: 'DUPLICATE', text: 'Duplicate component', display: []});
            }
        }
      }
    };

    // Set the branch metadata from project or task
    function setBranchMetadata(branchMetadataObj) {
      branchMetadata = branchMetadataObj;
    }

    //
    // Module retrieval functions
    //

    // retrieves the first extension module id if in extension
    // returns the first international module id if not
    // used by componentAuthoringUtil to set module on new components
    function getCurrentModuleId() {
      return extensionMetadata ?
        extensionMetadata.modules[0].id : internationalMetadata.modules[0].id;
    }

    // return the international module id
    function getInternationalModuleId() {
      return internationalMetadata.modules[0].id;
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
      
    function isAdditionalExtensionModule(moduleId) {
      if (!extensionMetadata || !Array.isArray(extensionMetadata.additionalModules)) {
        return false;
      }
      return extensionMetadata.additionalModules.filter(function (module) {
          return module.id === moduleId;
        }).length > 0;
    }

    function isUsDialect(dialectId) {
      return dialectId === '900000000000509007';
    }

    function isGbDialect(dialectId) {
      return dialectId === '900000000000508004';
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
      }
      else if(isAdditionalExtensionModule(moduleId)){
          return extensionMetadata.additionalModules;
      }
      else {
        return internationalMetadata.modules;
      }
    }
      
    function getallModules() {
        let allModules = [];
        if (internationalMetadata && internationalMetadata.modules) {
          allModules = allModules.concat(internationalMetadata.modules);
        }
        if (extensionMetadata) {
          if (extensionMetadata.modules) {
            allModules = allModules.concat(extensionMetadata.modules);
          }
          if (extensionMetadata.additionalModules) {
            allModules = allModules.concat(extensionMetadata.additionalModules);
          }
        }
        
        return allModules;
    }
      
    function addExtensionModule(moduleId, moduleName, readOnly) {
        extensionMetadata.additionalModules.push(
            {
                id: moduleId,
                name: moduleName,
                readOnly: readOnly
            }
        );
    }

    // setter for display name by module id
    function setModuleName(moduleId, moduleName) {
      angular.forEach(extensionMetadata.modules, function (module) {
        if (module.id === moduleId) {
          module.name = moduleName;
        }
      });
      angular.forEach(internationalMetadata.modules, function (module) {
        if (module.id === moduleId) {
          module.name = moduleName;
        }
      });
    }

    function clearBranchMetadata() {
      extensionMetadata = null;
      branchMetadata = null;
    }

    //
    // Branch functions -- only used for branchPath resolution
    //

    function getBranch() {
      if (!branchMetadata) {
        console.error('Branch metadata not set, could not determine branch');
        return null;
      }
      return branchMetadata.branchPath;
    }

    function getBranchRoot() {
      // if branch metadata has a project key, match for task: BRANCH_ROOT/pkey/tkey
      if (branchMetadata.projectKey) {
        return branchMetadata.branchPath.match(/(.*)\/[^\/]+\/[^\/]+$/)[1];
      }

      // otherwise, match for project: BRANCH_ROOT/pKey
      else {
        if(branchMetadata.codeSystem && branchMetadata.codeSystem.branchPath){
            return branchMetadata.codeSystem.branchPath
        }
        else{
            return branchMetadata.branchPath.match(/(.*)\/[^\/]+$/)[1];
        }
      }
    }

    function getPreviousRelease() {
      return extensionMetadata.dependencyRelease;
    }

    // returns extension dialects plus international dialects
    // NOTE: Extension dialects override international
    function getAllDialects() {
      // get the test branch dialects
      var dialects = angular.copy(internationalMetadata.dialects);
      if (extensionMetadata) {
        if (extensionMetadata.dialects) {
          for (var key in extensionMetadata.dialects) {
            dialects[key] = extensionMetadata.dialects[key];
          }
        }
        if (extensionMetadata.optionalLanguageRefsets) {
          for (let i = 0; i < extensionMetadata.optionalLanguageRefsets.length; i++) {
            dialects[extensionMetadata.optionalLanguageRefsets[i].refsetId] = extensionMetadata.optionalLanguageRefsets[i].key;
          }
        }
      }
      return dialects;
    }

    // get available dialects from extension metadata
    // NOTE: Return international dialects for FSNs
    function getDialectsForModuleId(moduleId, FSN) {
      if (extensionMetadata && !FSN && extensionMetadata.dialects !== null) {
        return extensionMetadata.dialects;
      } else {
        return internationalMetadata.dialects;
      }
    }

    function getDialectDefaultsForModuleId(moduleId, FSN) {
      if (extensionMetadata && !FSN && extensionMetadata.dialectDefaults !== null) {
        return extensionMetadata.dialectDefaults;
      } else {
        return internationalMetadata.dialectDefaults;
      }
    }

    function getReadOnlyDialectsForModuleId(moduleId, FSN) {
      if (extensionMetadata && !FSN && extensionMetadata.readOnlyDialects !== null) {
        return extensionMetadata.readOnlyDialects;
      } else {
        return internationalMetadata.readOnlyDialects;
      }
    }

    function getLanguagesForModuleId(moduleId) {
      if (isExtensionModule(moduleId) || isAdditionalExtensionModule(moduleId) && extensionMetadata.languages !== null) {
        return extensionMetadata.languages;
      } else {
        return internationalMetadata.languages;
      }
    }

    function getOptionalLanguageRefsets() {
      if (extensionMetadata && extensionMetadata.optionalLanguageRefsets) {
        return extensionMetadata.optionalLanguageRefsets;
      } 

      return null;
    }

    function getDefaultLanguageForModuleId(moduleId) {
      if (isExtensionModule(moduleId) && extensionMetadata.defaultLanguagess  !== null) {
        return extensionMetadata.defaultLanguages ? extensionMetadata.defaultLanguages : extensionMetadata.languages[0];
      } else {
        return internationalMetadata.defaultLanguages ? internationalMetadata.defaultLanguages : internationalMetadata.languages[0];
      }
    }

    function getAdditionalFSNs() {
      return extensionMetadata && extensionMetadata.additionalFSNs ? extensionMetadata.additionalFSNs : [];
    }

    function isAdditionalFSN(description) {
      return extensionMetadata && extensionMetadata.additionalFSNs 
              && extensionMetadata.additionalFSNs.filter(function (item) {return item.language === description.lang && item.dialectIds.filter(value => Object.keys(description.acceptabilityMap).includes(value)).length !== 0;}).length !== 0;
    }

    function getAcceptLanguageValueForModuleId(moduleId) {

      if (isExtensionModule(moduleId) && extensionMetadata.acceptLanguageMap !== null) {
        return extensionMetadata.acceptLanguageMap;
      } else {
        return internationalMetadata.acceptLanguageMap;
      }
    }

    function getExtensionAcceptLanguageValueByDialectId (dialectId) {
      if (extensionMetadata && extensionMetadata.dialects[dialectId]) {
        if (extensionMetadata.dialects[dialectId].indexOf('-') !== -1) {
          return extensionMetadata.dialects[dialectId] + '-x-' + dialectId + ';q=0.8,en-US;q=0.5';
        }
        else {
          return extensionMetadata.dialects[dialectId] + '-' + extensionMetadata.dialects[dialectId].toUpperCase() + '-x-' + dialectId + ';q=0.8,en-US;q=0.5'
        }        
      }
      return 'q=0.8,en-US;q=0.5';
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

    function getdrugsModelOrdering() {
      return drugsModelOrdering;
    }


    function getAssociationInactivationReasons() {
      return associationInactivationReasons;
    }

    function getDescriptionInactivationReasons() {
      return descriptionInactivationReasons;
    }

    function setSemanticTags(tags) {
      semanticTags = tags;
    }

    function getSemanticTags() {
      return semanticTags;
    }

    function setCodeSystems(list) {
      codeSystems = list;
    }

    function getCodeSystems() {
      return codeSystems;
    }

    function getCodeSystenForGivenBranch(branch) {
      if (codeSystems.length !== 0) {
        let filter = codeSystems.filter(function(item) {return item.branchPath === branch});
        if (filter.length !== 0) return filter[0];
      }

      return null;
    }

    function getCodeSystenForGivenShortname(shortname) {
      if (codeSystems.length !== 0) {
        let filter = codeSystems.filter(function(item) {return item.shortName === shortname});
        if (filter.length !== 0) return filter[0];
      }

      return null;
    }

    //
    // Cached project retrieval functions
    //

    function getProjects() {
      return projects;
    }

    function setTopLevelConcepts(concepts) {
      topLevelConcepts = concepts;
    }

    function getTopLevelConcepts() {
      return topLevelConcepts;
    }

    function isProjectsLoaded() {
      var defer = $q.defer();        
        if (!projectsLoadCompleted) {                  
          setTimeout(function waitForProjectsLoadCompleted() {                              
            if (!projectsLoadCompleted) {                      
              setTimeout(waitForProjectsLoadCompleted, 10);
            } 
            else {                  
              defer.resolve(projectsLoadCompleted);
            }
          }, 10);
        }
        else {              
          defer.resolve(projectsLoadCompleted);
        }
        
        return defer.promise;
    }

    function setProjectsLoaded(completed) {
      projectsLoadCompleted = completed;
    }

    function getMyProjects() {
      return myProjects;
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

    function setMyProjects(myProjectList) {
      myProjects = myProjectList;
    }

    function setMrcmEnabled(value) {
      console.log('MRCM validation enforced', value);
      mrcmEnabled = value;
    }

    function setTemplatesEnabled(value){
        templatesEnabled = value;
    }

    function setSpellcheckDisabled(value){
        spellcheckDisabled = value;
    }

    function setTaskPromotionDisabled(value){
        taskPromotionDisabled = value;
    }

    function isMrcmEnabled() {
      return mrcmEnabled;
    }

    function isTemplatesEnabled() {
      return templatesEnabled;
    }

    function isSpellcheckDisabled() {
      return spellcheckDisabled;
    }

    function isTaskPromotionDisabled() {
      return taskPromotionDisabled;
    }
      
    function isComplex() {
      let complex = false;
      if(branchMetadata.metadata && branchMetadata.metadata.authorFlags && branchMetadata.metadata.authorFlags != null){
          for (var key in branchMetadata.metadata.authorFlags) {
              console.log(key);
              if(key === 'complex'){
                  complex = branchMetadata.metadata.authorFlags[key];
              }
          }
        }
      if(complex === 'true'){
          return true
      }
      else{
          return false
      }
    }
      
    function isBatch() {
      let batch = false;
      if(branchMetadata.metadata && branchMetadata.metadata.authorFlags && branchMetadata.metadata.authorFlags != null){
          for (var key in branchMetadata.metadata.authorFlags) {
              if(key === 'batch-change'){
                  batch = branchMetadata.metadata.authorFlags[key];
              }
          }
        }
      if(batch === 'true'){
          return true
      }
      else{
          return false
      }
    }

    function setNamespaces(list) {
      namespaces = list;
    }

    function getNamespaces() {
      return namespaces;
    }

    function getNamespaceById(namespaceId) {
      for (var i = 0; i < namespaces.length; i++) {
        if(namespaceId === namespaces[i].namespace) {
          return namespaces[i];
        }
      }

      return null;
    }

    function setMrcmAttributeDomainMembers(list) {
      mrcmAttributeDomainMembers = list;
    }

    function setUngroupedAttributes (list) {
      ungroupedAttributes = list;
    }

    function isUngroupedAttribute(id) {
      for (var i = 0; i < ungroupedAttributes.length; i++) {
          var attribute = ungroupedAttributes[i];
          if(attribute.referencedComponentId === id) {
            return true;
          }
      }
      return false;
    }

    function getDropdownLanguages() {      
      var result = {};
      let usModel = {
        moduleId: '731000124108',
        dialectId: '900000000000509007'
      };

      let noModel = {
        moduleId: '51000202101',
        dialectId: '61000202103'
      };
      let gbDialectId = '900000000000508004';
      let usFSN = {id: '900000000000509007-fsn', label: 'FSN in US'};
      let usPT = {id: '900000000000509007-pt', label: 'PT in US'};
      var internatinalFilter = [];
      internatinalFilter.push(usFSN);
      internatinalFilter.push(usPT);           

      var extensionFilter = [];
      extensionFilter.push(usFSN);
      extensionFilter.push(usPT);

      if (extensionMetadata !== null) {          
        var dialects = getAllDialects();
        // Remove 'en-gb' if any
        
        if (dialects.hasOwnProperty(gbDialectId)) {             
          delete dialects[gbDialectId];
        }

        // us dialect + extension with one dialect
        if (Object.keys(dialects).length === 2 && getCurrentModuleId() !== usModel.moduleId) {
          for (var key in dialects) {
            if (key !== usModel.dialectId) {
              let languages = dialects[key].split('-');
              var dialect = {id: key, label: 'PT in ' + (languages.length > 1 ? languages[1].toUpperCase() : languages[0].toUpperCase())}
              extensionFilter.push(dialect);
              result.selectedLanguage = dialect; // Set PT in extension by default
            }
          }
          result.languages = extensionFilter;
        } else if (getCurrentModuleId() === usModel.moduleId) {
          // us module
          result.languages = internatinalFilter;
          result.selectedLanguage = usPT; // Set PT in US by default
        } else {
          // multiple dialects
          for (var key in dialects) {
            if (key !== usModel.dialectId) {
              let languages = dialects[key].split('-');
              var dialect = {id: key, label: 'PT in ' + (languages.length > 1 ? languages[1].toUpperCase() : languages[0].toUpperCase())}
              extensionFilter.push(dialect);               
            }
          }
          result.languages = extensionFilter;
          result.selectedLanguage = usPT; // Set PT in US by default
        }                
      } else {
        result.languages = internatinalFilter;
        result.selectedLanguage = usFSN; // Set FSN in US by default
      }

      return result;
    }

    return {

      // relationship functions
      isIsaRelationship: isIsaRelationship,
      getSnomedCtRootId: getSnomedCtRootId,

      // project, my project cache getters/setters
      setProjects: setProjects,
      getProjects: getProjects,
      setMyProjects : setMyProjects,
      getMyProjects : getMyProjects,
      getProjectForKey: getProjectForKey,
      setTopLevelConcepts: setTopLevelConcepts,
      getTopLevelConcepts: getTopLevelConcepts,

      // inactivation reason retrieval
      getConceptInactivationReasons: getConceptInactivationReasons,
      getDescriptionInactivationReasons: getDescriptionInactivationReasons,
      getAssociationInactivationReasons: getAssociationInactivationReasons,
      getdrugsModelOrdering: getdrugsModelOrdering,
      //getDescriptionAssociationInactivationReasons: getDescriptionAssociationInactivationReasons,

      // boolean checks exposed for use
      isLockedModule: isLockedModule,
      isUsDialect: isUsDialect,
      isGbDialect: isGbDialect,
      isExtensionDialect: isExtensionDialect,
      isMrcmEnabled: isMrcmEnabled,
      isTemplatesEnabled: isTemplatesEnabled,
      isSpellcheckDisabled: isSpellcheckDisabled,
      isTaskPromotionDisabled: isTaskPromotionDisabled,
      isComplex: isComplex,
      isBatch: isBatch,

      // extension module-dependent retrieval functions

      getCurrentModuleId: getCurrentModuleId,
      getInternationalModuleId: getInternationalModuleId,
      getModulesForModuleId: getModulesForModuleId,
      getallModules: getallModules,
      addExtensionModule: addExtensionModule,
      getDefaultLanguageForModuleId: getDefaultLanguageForModuleId,
      getAdditionalFSNs: getAdditionalFSNs,
      isAdditionalFSN: isAdditionalFSN,
      getLanguagesForModuleId: getLanguagesForModuleId,
      getDialectsForModuleId: getDialectsForModuleId,
      getDialectDefaultsForModuleId: getDialectDefaultsForModuleId,
      getReadOnlyDialectsForModuleId: getReadOnlyDialectsForModuleId,
      getAcceptLanguageValueForModuleId: getAcceptLanguageValueForModuleId,
      getExtensionAcceptLanguageValueByDialectId: getExtensionAcceptLanguageValueByDialectId,
      getAllDialects: getAllDialects,
      isExtensionSet: function () {
        return extensionMetadata !== null;
      },
      useInternationalLanguageRefsets: function () {
        return extensionMetadata ? extensionMetadata.useInternationalLanguageRefsets : false;
      },

      // module and branch metadata setters
      setExtensionMetadata: setExtensionMetadata,
      setBranchMetadata: setBranchMetadata,
      clearBranchMetadata: clearBranchMetadata,
      setMrcmEnabled: setMrcmEnabled,
      setTemplatesEnabled: setTemplatesEnabled,
      setSpellcheckDisabled: setSpellcheckDisabled,
      setModuleName: setModuleName,
      setTaskPromotionDisabled: setTaskPromotionDisabled,
      isProjectsLoaded: isProjectsLoaded,
      setProjectsLoaded: setProjectsLoaded,

      // branch/task fupath retrieval functions
      getBranch: getBranch,
      getBranchRoot: getBranchRoot,
      getPreviousRelease: getPreviousRelease,

      // TODO Functions exposed for dev work, remove when complete

      getInternationalMetadata: function () {
        return internationalMetadata;
      },

      getExtensionMetadata: function () {
        return extensionMetadata;
      },
      getBranchMetadata: function () {
        return branchMetadata;
      },

      setNamespaces: setNamespaces,
      getNamespaces: getNamespaces,
      getNamespaceById: getNamespaceById,
      setMrcmAttributeDomainMembers: setMrcmAttributeDomainMembers,
      setUngroupedAttributes: setUngroupedAttributes,
      isUngroupedAttribute: isUngroupedAttribute,
      setSemanticTags: setSemanticTags,
      getSemanticTags: getSemanticTags,
      setCodeSystems: setCodeSystems,
      getCodeSystems: getCodeSystems,
      getCodeSystenForGivenBranch: getCodeSystenForGivenBranch,
      getCodeSystenForGivenShortname: getCodeSystenForGivenShortname,
      getDropdownLanguages: getDropdownLanguages,
      getOptionalLanguageRefsets: getOptionalLanguageRefsets
    };

  }])
;
