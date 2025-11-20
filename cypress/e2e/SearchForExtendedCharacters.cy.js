const Utils = require('../commands/Utils.js');

const utils = new Utils();

const urlAuthoring = Cypress.env('URL_AUTHORING');
const username = Cypress.env('TEST_LOGIN_USR');
const password = Cypress.env('TEST_LOGIN_PSW');

describe('Search For Extended Characters Test - TestRail C53', () => {

    let count1 = 0;
    let count2 = 0;

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
        utils.createTask('Test Int 1 (International)', 'Search For Extended Characters Test - TestRail C53', 'Automated test for search for extended characters per TestRail C53');
    });

    it('Step 1: Go to Search tab in task information panel and set search to "Active and Inactive"', () => {
        cy.get('[data-cy="search-tab"]').should('be.visible').click();
        cy.get('[data-cy="search-input"]').should('be.visible');

        cy.wait(3000);

        cy.get('[data-cy="search-type-dropdown-button"]').should('be.visible').click();
        cy.get('[data-cy="search-type-active-and-inactive"]').click();
    });

    it('Step 2-1: Search for umlaut - "Tübingen" and "Tubingen"', () => {
        count1 = 0;
        cy.intercept('POST', '**/concepts/search').as('searchResults');

        cy.get('[data-cy="search-input"]').clear().type('Tübingen');
        cy.wait('@searchResults').get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            count1 = parseInt(match[0].replace(/,/g, ''));
            expect(count1).to.be.greaterThan(0);
        });
    });

    it('Step 2-2: Search for umlaut - "Tübingen" and "Tubingen"', () => {
        count2 = 0;
        cy.intercept('POST', '**/concepts/search').as('searchResults');

        cy.get('[data-cy="search-input"]').clear().type('Tubingen');
        cy.wait('@searchResults').get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            count2 = parseInt(match[0].replace(/,/g, ''));
            expect(count2).to.be.equal(count1);
        });
    });

    it('Step 3-1: Search for accent - "Ménière" and "Meniere"', () => {
        count1 = 0;

        cy.intercept('POST', '**/concepts/search').as('searchResults');

        cy.get('[data-cy="search-input"]').clear().type('Ménière');
        cy.wait('@searchResults').get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            count1 = parseInt(match[0].replace(/,/g, ''));
            expect(count1).to.be.greaterThan(0);
        });
    });

    it('Step 3-2: Search for accent - "Ménière" and "Meniere"', () => {
        count2 = 0;

        cy.intercept('POST', '**/concepts/search').as('searchResults');

        cy.get('[data-cy="search-input"]').clear().type('Meniere');
        cy.wait('@searchResults').get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            count2 = parseInt(match[0].replace(/,/g, ''));
            expect(count2).to.be.equal(count1);
        });
    });

    it('Step 4: Search for Alzheimer\'s', () => {
        utils.search('Alzheimer\'s');
    });

    it('Step 5-1: Search for active and inactive content', () => {
        utils.search('phospho-2-dehydro-3-deoxygluconate aldolase');
    });

    it('Step 5-2: Search for active and inactive content', () => {
        utils.search('Salmonella II 43:g,t:[1,5] (organism)');
    });

    it('Step 5-3: Search for active and inactive content', () => {
        utils.search('lidocaine hydrochloride 1.5%/epinephrine 1:200,000 injection solution vial (product)');
    });

    it('Step 5-4: Search for active and inactive content', () => {
        utils.search('pT3: tumor invades adventitia (esophagus)');
    });

    it('Step 5-5: Search for active and inactive content', () => {
        utils.search('Technetium Tc^99c^ medronate (substance)');
    });

    it('Step 6-1: Special characters: &, %, and #', () => {
        utils.search('Minnesota pig #1');
    });

    it('Step 6-2: Special characters: &, %, and #', () => {
        utils.search('Lidocaine hydrochloride 1.5%/epinephrine');
    });

    it('Step 6-3: Special characters: &, %, and #', () => {
        utils.search('Hypodermic needles & syringes');
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
