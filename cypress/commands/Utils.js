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
    cy.contains('Please Log In', {timeout: 15000});
    cy.get('#username').clear();
    cy.get('#username').type(username);
    cy.get('#password').clear();
    cy.get('#password').type(password, {log: false});
    cy.get('button#submit', {timeout: this.loginTimeoutInSeconds}).click({force: true});
  }

  logout() {
    cy.contains('Logout').click();
    cy.clearAllCookies();
  }
}

module.exports = Utils;
