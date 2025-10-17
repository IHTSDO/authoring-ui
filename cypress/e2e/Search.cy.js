const Utils = require('../commands/Utils.js');

const utils = new Utils();

const urlAuthoring = Cypress.env('URL_AUTHORING');
const username = Cypress.env('TEST_LOGIN_USR');
const password = Cypress.env('TEST_LOGIN_PSW');

describe('Lexical Search Functionality Test - TestRail C51', () => {

    let searchTerm;

    let firstCount = 0;
    let secondCount = 0;
    let thirdCount = 0;

    let activeCount = 0;
    let inactiveCount = 0;
    let activeAndInactiveCount = 0;

    function search(searchTerm) {
        let searchResultsCount;

        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type(searchTerm);
        cy.wait('@searchResults').then((interceptions) => {
            searchResultsCount = interceptions.response.body.total;
        }).get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            assert.isNotNull(match);
            assert.equal(parseInt(match[0].replace(/,/g, '')), searchResultsCount);
        });
    }

    it('Login', () => {
        utils.login(urlAuthoring, username, password);
        cy.intercept('GET', '**/auth').as('auth');
        cy.wait('@auth').then((interceptions) => {
            assert.equal(interceptions.response.statusCode, 200);
        });
    });

    it('Get tasks', () => {
        cy.intercept('GET', '**/my-tasks**').as('getMyTasks');
        cy.wait('@getMyTasks').then((interceptions) => {
            assert.equal(interceptions.response.statusCode, 200);
            cy.screenshot('lexical-search-test-c51-started');
        });
    });

    it('Verify that the dashboard is loaded', () => {
        cy.get('[data-cy="platform-title"]').should('be.visible');
        cy.get('[data-cy="sidebar-navigation"]').should('be.visible');
        cy.get('[data-cy="sidebar-new-task').should('be.visible');
    });

    it('Create and open a new task', () => {
        cy.intercept('POST', '**/tasks**').as('createTask');
        cy.intercept('GET', '**/tasks/**').as('getTaskDetails');

        // Click the "New Task" button in the left sidebar
        cy.get('[data-cy="sidebar-new-task"]').click();

        // Fill in task creation form
        cy.get('[data-cy="task-summary"]').should('be.visible').type('Lexical Search Test - TestRail C51');
        cy.get('[data-cy="task-description"]').should('be.visible').type('Automated test for lexical search functionality per TestRail C51');

        // Select a project from the dropdown
        cy.get('[data-cy="task-project-dropdown"]').should('be.visible').select(0); // Select first available project

        // Create and open the task
        cy.get('[data-cy="create-and-open-task-button"]').click();
        cy.wait('@createTask', {timeout: 10000});

        // Task should be created and we should be redirected to task view
        cy.url().should('include', '/tasks/');

        // Wait for task details to load
        cy.wait('@getTaskDetails', {timeout: 10000});

        // Wait for the task editing interface to fully load
        cy.wait(3000);
    });

    it('Step 1: Go to Search tab in task information panel', () => {
        cy.get('[data-cy="search-tab"]').should('be.visible').click();
        cy.get('[data-cy="search-input"]').should('be.visible');
    });

    it('Step 2: Type "hea" into search query box', () => {
        searchTerm = 'hea';
        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type(searchTerm);
        cy.wait('@searchResults').then((interceptions) => {
            firstCount = interceptions.response.body.total;
            cy.log(`First search results count: ${firstCount}`);
        });
    });

    it('Step 2a: Verify that search results are displayed', () => {
        cy.get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            assert.isNotNull(match);
            assert.equal(parseInt(match[0].replace(/,/g, '')), firstCount);
            cy.log(`Found ${firstCount} results for '${searchTerm}'`);
        });
    });

    it('Step 2b: Verify that matches for "hea" are displayed', () => {
        cy.get('.search-result').should('contain.text', 'HEA (body structure)');
        cy.get('.search-result').should('contain.text', 'Heat (physical force)');
        cy.get('.search-result').should('contain.text', 'Hearing, function (observable entity)');
        cy.get('.search-result').should('contain.text', 'Heart structure (body structure)');
    });

    it('Step 3: Add another letter "r" to the search query', () => {
        searchTerm = 'hear';
        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type(searchTerm);
        cy.wait('@searchResults').then((interceptions) => {
            secondCount = interceptions.response.body.total;
            cy.log(`Second search results count: ${secondCount}`);
        });
    });

    it('Step 3a: Verify that search results are displayed and that the number of results is less than before', () => {
        cy.get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            assert.isNotNull(match);
            assert.equal(parseInt(match[0].replace(/,/g, '')), secondCount);
            cy.log(`Found ${secondCount} results for '${searchTerm}'`);

            expect(secondCount).to.be.lessThan(firstCount);
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
        searchTerm = 'heart';
        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type(searchTerm);
        cy.wait('@searchResults').then((interceptions) => {
            thirdCount = interceptions.response.body.total;
            cy.log(`Third search results count: ${thirdCount}`);
        });
    });

    it('Step 5a: Verify that search results are displayed and that the number of results is less than before', () => {
        cy.get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            assert.isNotNull(match);
            assert.equal(parseInt(match[0].replace(/,/g, '')), thirdCount);
            cy.log(`Found ${thirdCount} results for '${searchTerm}'`);

            expect(thirdCount).to.be.lessThan(secondCount).and.lessThan(firstCount);
        });
    });

    it('Step 5b: Verify that matches for "heart" are displayed', () => {
        cy.get('.search-result').should('not.contain.text', 'HEA (body structure)');
        cy.get('.search-result').should('not.contain.text', 'Heat (physical force)');
        cy.get('.search-result').should('not.contain.text', 'Hearing, function (observable entity)');
        cy.get('.search-result').should('contain.text', 'Heart structure (body structure)');
    });

    it('Step 6: Search for "Immunoglobulin G antibody to Leishmania mexicana (substance)"', () => {
        search('Immunoglobulin G antibody to Leishmania mexicana (substance)');
    });

    it('Step 7: Search for "32mg"', () => {
        search('32mg');
    });

    it('Step 8: Search for "lap gal end"', () => {
        search('lap gal end');
    });

    it('Step 9a: Search for "Active only"', () => {
        cy.get('#search-type-dropdown').click();
        cy.contains('Active only').click();

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

        cy.get('#search-type-dropdown').click();
        cy.contains('Inactive only').click();

        cy.wait('@searchResults').get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            inactiveCount = parseInt(match[0].replace(/,/g, ''));
            expect(inactiveCount).not.to.be.equal(activeCount);
        });
    });

    it('Step 10: Search for "Active and inactive" and verify that the number is the total of results from 9a and 9b', () => {
        cy.intercept('POST', '**/concepts/search').as('searchResults');

        cy.get('#search-type-dropdown').click();
        cy.contains('Active and inactive').click();

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
        cy.get('#search-type-dropdown').click();
        cy.contains('Active only').click();

        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type('acid reflux');
        cy.wait('@searchResults');
        cy.get('.search-result').should('contain.text', 'Gastroesophageal reflux disease (disorder)');
    });

    it('Step 13: Search for "NOS" and verify that there are over 31k results', () => {
        cy.get('#search-type-dropdown').click();
        cy.contains('Active and inactive').click();

        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type('nos');
        cy.wait('@searchResults').get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            let count = parseInt(match[0].replace(/,/g, ''));
            expect(count).to.be.greaterThan(31000);
        });
    });

    it('Delete the task', () => {
        cy.intercept('GET', '**/my-tasks**').as('getMyTasks');

        cy.get('button.task-editing-btn').click();
        cy.get('button.editingtask').click();

        cy.get('#taskModal').contains('button', 'Delete Task').click();
        cy.get('#confirmModal').contains('button', 'Yes').click();

        cy.wait('@getMyTasks').then((interceptions) => {
            assert.equal(interceptions.response.statusCode, 200);
            cy.screenshot('lexical-search-test-c51-complete');
        });
    });

    it('Logout', () => {
        utils.logout();
        cy.contains('Welcome to SNOMED International', {timeout: 15000}).should('be.visible');
        cy.contains('Sign In').should('be.visible');
    });

});
