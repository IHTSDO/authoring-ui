class Utils {

    constructor() {
        this.branch = 'MAIN';
        this.project = '';
        this.task = '';
        this.loginTimeoutInSeconds = 30000;
    }

    login(url, username, password) {
        cy.clearAllCookies();
        cy.visit(url);
        cy.contains('Welcome to SNOMED International', {timeout: 15000});
        cy.get('#username').clear();
        cy.get('#username').type(username);
        cy.get('#password').clear();
        cy.get('#password').type(password, {log: false});
        cy.get('input#kc-login', {timeout: this.loginTimeoutInSeconds}).click({force: true});
    }

    logout() {
        cy.get('[data-cy="logout-button"]', {timeout: 10000}).should('be.visible').click();
        cy.get('input#kc-logout').click();
        cy.clearAllCookies();
    }

    createTask(project, summary, description) {
        cy.intercept('POST', '**/tasks**').as('createTask');
        cy.intercept('GET', '**/tasks/**').as('getTaskDetails');

        // Click the "New Task" button in the left sidebar
        cy.get('[data-cy="sidebar-new-task"]').click();

        // Fill in task creation form
        cy.get('[data-cy="task-summary"]').should('be.visible').type(summary);
        cy.get('[data-cy="task-description"]').should('be.visible').type(description);

        // Select a project from the dropdown
        cy.get('[data-cy="task-project-dropdown"]').should('be.visible').select(project);

        // Create and open the task
        cy.get('[data-cy="create-and-open-task-button"]').click();
        cy.wait('@createTask', {timeout: 10000});

        // Task should be created and we should be redirected to task view
        cy.url().should('include', '/tasks/');

        // Wait for task details to load
        cy.wait('@getTaskDetails', {timeout: 10000});

        // Wait for the task editing interface to fully load
        cy.wait(3000);
    }

    search(searchTerm) {
        let searchResultsCount = 0;

        cy.intercept('POST', '**/concepts/search').as('searchResults');
        cy.get('[data-cy="search-input"]').clear().type(searchTerm);
        cy.wait('@searchResults').then((interceptions) => {
            searchResultsCount = interceptions.response.body.total;
        }).get('.total-text').should('be.visible').and('contain.text', 'concepts found').then(($result) => {
            const match = $result.text().match(/([\d,]+)/g);
            expect(searchResultsCount).to.be.greaterThan(0).and.equal(parseInt(match[0].replace(/,/g, '')));
        });
    }

    deleteTask() {
        cy.intercept('GET', '**/my-tasks**').as('getMyTasks');

        cy.get('[data-cy="back-to-task-editing-button"]').click();
        cy.get('[data-cy="edit-task-details-button"]').click();
        cy.get('[data-cy="delete-task-button"]').click();
        cy.get('#confirmModal').contains('button', 'Yes').click();

        cy.wait('@getMyTasks').then((interceptions) => {
            expect(interceptions.response.statusCode).to.equal(200);
        });
    }
}

module.exports = Utils;
