export default class Utils {
  branch: string;
  project: string;
  task: string;
  loginTimeoutInSeconds = 30_000;

  constructor() {
    this.branch = 'MAIN';
    this.project = '';
    this.task = '';
  }

  login(url: string, username: string, password: string): void {
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
