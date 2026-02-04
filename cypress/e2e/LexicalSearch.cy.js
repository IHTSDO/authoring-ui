const Utils = require('../commands/Utils.js');

const utils = new Utils();

const urlAuthoring = Cypress.env('URL_AUTHORING');
const username = Cypress.env('TEST_LOGIN_USR');
const password = Cypress.env('TEST_LOGIN_PSW');

describe('Lexical Search Test - TestRail C51', () => {

    let firstCount = 0;
    let secondCount = 0;
    let thirdCount = 0;

    let activeCount = 0;
    let inactiveCount = 0;
    let activeAndInactiveCount = 0;

    it('Login', () => {
        cy.intercept('GET', '**/my-tasks**').as('getMyTasks');

        utils.login(urlAuthoring, username, password);
        cy.get('[data-cy="platform-title"]').should('contain.text', 'Authoring Platform');

        cy.wait('@getMyTasks').then((interceptions) => {
            expect(interceptions.response.statusCode).to.be.equal(200);
            cy.screenshot('lexical-search-test-c51-started');
        });
    });

    it('Verify that the dashboard is loaded', () => {
        cy.get('[data-cy="platform-title"]').should('be.visible');
        cy.get('[data-cy="sidebar-navigation"]').should('be.visible');
        cy.get('[data-cy="sidebar-new-task').should('be.visible');
    });

    it('Create and open a new task', () => {
        utils.createTask('Test Int 1 (International)', 'Lexical Search Test - TestRail C51', 'Automated test for lexical search functionality per TestRail C51');
    });

    it('Step 1: Go to Search tab in task information panel', () => {
        cy.get('[data-cy="search-tab"]').should('be.visible').click();
        cy.get('[data-cy="search-input"]').should('be.visible');
    });

    it('Step 2: Type "hea" into search query box', () => {
        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type('hea');
        cy.wait('@searchResults').then((interceptions) => {
            firstCount = interceptions.response.body.total;
        });
    });

    it('Step 2a: Verify that search results are displayed', () => {
        cy.get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            expect(firstCount).to.be.greaterThan(0).and.equal(parseInt(match[0].replace(/,/g, '')));
        });
    });

    it('Step 2b: Verify that matches for "hea" are displayed', () => {
        cy.get('.search-result').should('contain.text', 'HEA (body structure)');
        cy.get('.search-result').should('contain.text', 'Heat (physical force)');
        cy.get('.search-result').should('contain.text', 'Hearing, function (observable entity)');
        cy.get('.search-result').should('contain.text', 'Heart structure (body structure)');
    });

    it('Step 3: Add another letter "r" to the search query', () => {
        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type('hear');
        cy.wait('@searchResults').then((interceptions) => {
            secondCount = interceptions.response.body.total;
        });
    });

    it('Step 3a: Verify that search results are displayed and that the number of results is less than before', () => {
        cy.get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            expect(secondCount).to.be.lessThan(firstCount).and.equal(parseInt(match[0].replace(/,/g, '')));
        });
    });

    it('Step 3b: Verify that matches for "hear" are displayed', () => {
        cy.get('.search-result').should('not.contain.text', 'HEA (body structure)');
        cy.get('.search-result').should('not.contain.text', 'Heat (physical force)');
        cy.get('.search-result').should('contain.text', 'Hearing, function (observable entity)');
        cy.get('.search-result').should('contain.text', 'Heart structure (body structure)');
    });

    it('Step 4: Load next 100', () => {
        cy.get('.search-result').last().scrollIntoView();
        cy.get('.search-result').then(($results) => {
            const resultsCount = $results.length;
            const lastResult = $results.last().find('.result-text > a').text();

            cy.intercept('POST', '**/concepts/search').as('searchResults');
            cy.get('button').contains('Load Next').click();
            cy.wait('@searchResults');

            cy.get('.search-result').its('length').should('be.gt', resultsCount);
            cy.get('.search-result').last().find('.result-text > a').invoke('text').should('not.be.eq', lastResult);
        });
    });

    it('Step 5: Add another letter "t" to the search query', () => {
        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type('heart');
        cy.wait('@searchResults').then((interceptions) => {
            thirdCount = interceptions.response.body.total;
        });
    });

    it('Step 5a: Verify that search results are displayed and that the number of results is less than before', () => {
        cy.get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            expect(thirdCount).to.be.lessThan(secondCount).and.lessThan(firstCount).and.equal(parseInt(match[0].replace(/,/g, '')));
        });
    });

    it('Step 5b: Verify that matches for "heart" are displayed', () => {
        cy.get('.search-result').should('not.contain.text', 'HEA (body structure)');
        cy.get('.search-result').should('not.contain.text', 'Heat (physical force)');
        cy.get('.search-result').should('not.contain.text', 'Hearing, function (observable entity)');
        cy.get('.search-result').should('contain.text', 'Heart structure (body structure)');
    });

    it('Step 6: Search for "Immunoglobulin G antibody to Leishmania mexicana (substance)"', () => {
        utils.search('Immunoglobulin G antibody to Leishmania mexicana (substance)');
    });

    it('Step 7: Search for "32mg"', () => {
        utils.search('32mg');
    });

    it('Step 8: Search for "lap gal end"', () => {
        utils.search('lap gal end');
    });

    it('Step 9a: Search for "Active only"', () => {
        cy.get('[data-cy="search-type-dropdown-button"]').click();
        cy.get('[data-cy="search-type-active-only"]').click();

        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type('mood');
        cy.wait('@searchResults').get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            activeCount = parseInt(match[0].replace(/,/g, ''));
            expect(activeCount).to.be.greaterThan(0);
        });
    });

    it('Step 9b: Search for "Inactive only"', () => {
        cy.intercept('POST', '**/concepts/search').as('searchResults');

        cy.get('[data-cy="search-type-dropdown-button"]').click();
        cy.get('[data-cy="search-type-inactive-only"]').click();

        cy.wait('@searchResults').get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            inactiveCount = parseInt(match[0].replace(/,/g, ''));
            expect(inactiveCount).to.be.greaterThan(0);
        });
    });

    it('Step 10: Search for "Active and inactive" and verify that the number is the total of results from 9a and 9b', () => {
        cy.intercept('POST', '**/concepts/search').as('searchResults');

        cy.get('[data-cy="search-type-dropdown-button"]').click();
        cy.get('[data-cy="search-type-active-and-inactive"]').click();

        cy.wait('@searchResults').get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            activeAndInactiveCount = parseInt(match[0].replace(/,/g, ''));
            expect(activeAndInactiveCount).to.be.equal(activeCount + inactiveCount);
        });
    });

    it('Step 11: Search for "repair of" and verify that there are 100+ results', () => {
        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type('repair of');

        cy.wait('@searchResults').get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            let count = parseInt(match[0].replace(/,/g, ''));
            expect(count).to.be.greaterThan(100);
        });
    });

    it('Step 12: Search for inactive description', () => {
        cy.get('[data-cy="search-type-dropdown-button"]').click();
        cy.get('[data-cy="search-type-active-only"]').click();

        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type('acid reflux');
        cy.wait('@searchResults');
        cy.get('.search-result').should('contain.text', 'Gastroesophageal reflux disease (disorder)');
    });

    it('Step 13: Search for "NOS" and verify that there are over 31k results', () => {
        cy.get('[data-cy="search-type-dropdown-button"]').click();
        cy.get('[data-cy="search-type-active-and-inactive"]').click();

        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type('nos');
        cy.wait('@searchResults').get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            let count = parseInt(match[0].replace(/,/g, ''));
            expect(count).to.be.greaterThan(31000);
        });
    });

    it('Delete the task', () => {
        utils.deleteTask();
    });

    it('Take the screenshot', () => {
        cy.screenshot('lexical-search-test-c51-complete');
    });

    it('Logout', () => {
        utils.logout();
        cy.contains('Welcome to SNOMED International', {timeout: 15000}).should('be.visible');
        cy.contains('Sign In').should('be.visible');
    });

});
