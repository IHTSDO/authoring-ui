const Utils = require('../commands/Utils.js');

const utils = new Utils();

const urlAuthoring = Cypress.env('URL_AUTHORING');
const username = Cypress.env('TEST_LOGIN_USR');
const password = Cypress.env('TEST_LOGIN_PSW');

describe('Search By ID Test - TestRail C52', () => {

    it('Login', () => {
        cy.intercept('GET', '**/my-tasks**').as('getMyTasks');

        utils.login(urlAuthoring, username, password);
        cy.get('[data-cy="platform-title"]').should('contain.text', 'Authoring Platform');

        cy.wait('@getMyTasks').then((interceptions) => {
            expect(interceptions.response.statusCode).to.be.equal(200);
            cy.screenshot('search-for-extended-characters-test-c53-started');
        });
    });

    it('Verify that the dashboard is loaded', () => {
        cy.get('[data-cy="platform-title"]').should('be.visible');
        cy.get('[data-cy="sidebar-navigation"]').should('be.visible');
        cy.get('[data-cy="sidebar-new-task').should('be.visible');
    });

    it('Create and open a new task', () => {
        utils.createTask('Test Int 1 (International)', 'Search By ID Test - TestRail C52', 'Automated test for search by ID per TestRail C52');
    });

    it('Step 1: Go to Search tab in task information panel', () => {
        cy.get('[data-cy="search-tab"]').should('be.visible').click();
        cy.get('[data-cy="search-input"]').should('be.visible');
    });

    it('Step 2: Select "Active and Inactive" from dropdown', () => {
        cy.wait(3000);

        cy.get('[data-cy="search-type-dropdown-button"]').should('be.visible').click();
        cy.get('[data-cy="search-type-active-and-inactive"]').click();
    });

    it('Step 3: Search for an active concept (64077000)', () => {
        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type('64077000');
        cy.wait('@searchResults');
        cy.get('.search-result').should('contain.text', 'Myocardial degeneration (disorder)');
    });

    it('Step 4: Search for inactive concept (232971009)', () => {
        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type('232971009');
        cy.wait('@searchResults');
        cy.get('.search-result').should('contain.text', 'Heart and heart-lung transplant (procedure)');
    });

    it('Step 5: Search for active description (444221019 - Entire heart)', () => {
        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type('444221019');
        cy.wait('@searchResults');
        cy.get('.search-result').should('contain.text', 'Entire heart (body structure)');
    });

    it('Step 6: Search for inactive description (353140018 - Acid reflux)', () => {
        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type('353140018');
        cy.wait('@searchResults');
        cy.get('.search-result').should('contain.text', 'Gastroesophageal reflux disease (disorder)');
    });

    it('Step 7: Search for active inferred relationship (50134020)', () => {
        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type('50134020');
        cy.wait('@searchResults');
        /*
        Source concept 37657006 |Disorder of esophagus (disorder)|and
        Target concept 235595009 |Gastroesophageal reflux disease (disorder)|are found
        */
        cy.get('.search-result').should('contain.text', 'Disorder of esophagus (disorder)');
        cy.get('.search-result').should('contain.text', 'Gastroesophageal reflux disease (disorder)');
    });

    it('Step 8: Search for inactive inferred relationship (4370092024)', () => {
        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type('4370092024');
        cy.wait('@searchResults');
        /*
        Source concept 792004 |Jakob-Creutzfeldt disease (disorder)|and
        Target concept 88520007 |Creutzfeldt-Jakob agent (organism)| are found
        */
        cy.get('.search-result').should('contain.text', 'Jakob-Creutzfeldt disease (disorder)');
        cy.get('.search-result').should('contain.text', 'Creutzfeldt-Jakob agent (organism)');
    });

    it('Step 9: Search for inactive concept with long FSN (369879002)', () => {
        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type('369879002');
        cy.wait('@searchResults');
        cy.get('.search-result').should('contain.text', 'T4: Aerodigestive tract tumor with intracranial extension, orbital extension including apex, involving sphenoid and/or frontal sinus and/or skin of nose (finding)');
    });

    it('Delete the task', () => {
        utils.deleteTask();
    });

    it('Logout', () => {
        utils.logout();
        cy.contains('Welcome to SNOMED International', {timeout: 15000}).should('be.visible');
        cy.contains('Sign In').should('be.visible');
    });

});
