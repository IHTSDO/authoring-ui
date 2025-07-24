const { defineConfig } = require('cypress');

module.exports = defineConfig({
  video: true,
  videoCompression: true,
  
  // Add base configuration for authoring UI
  e2e: {
    experimentalStudio: true,
    baseUrl: 'http://local.ihtsdotools.org:8083',
    viewportWidth: 1920,
    viewportHeight: 1080,
    testIsolation: false,
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.js',
    
    // Handle cross-origin authentication
    chromeWebSecurity: false,
    experimentalSessionAndOrigin: true,
    
    setupNodeEvents(on, config) {
      require('cypress-mochawesome-reporter/plugin')(on);
    }
  },

  component: {
    supportFile: 'cypress/support/component.js',
    specPattern: 'cypress/component/**/*.cy.js'
  },

  reporter: 'cypress-mochawesome-reporter',

  reporterOptions: {
    embeddedScreenshots: true,
    inlineAssets: true,
    ignoreVideos: false,
    videoOnFailOnly: true,
    saveAllAttempts: true,
    quiet: false,
    debug: false,
    charts: true // Pie chart ratio success/fail
  }
});
