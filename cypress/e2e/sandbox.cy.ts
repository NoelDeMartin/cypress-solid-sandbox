import { podUrl, webId } from 'cypress-solid';

describe('Solid interactions', () => {

    beforeEach(() => {
        cy.solidReset();
        cy.visit('/');
    });

    it('Logs in', () => {
        // Arrange
        cy.contains('Log in with Solid');

        // Act
        cy.get('[aria-label="Login url"]').type(webId()).type('{enter}');
        cy.solidLogin();

        // Assert
        cy.contains('Hello, Alice Cooper');
    });

    it('Logs out', () => {
        // Arrange
        cy.get('[aria-label="Login url"]').type(webId()).type('{enter}');
        cy.solidLogin();

        // Act
        cy.contains('Log out').click();

        // Assert
        cy.contains('Hello, Alice Cooper').should('not.exist');
    });

    it('Creates tasks', () => {
        // Arrange
        cy.intercept('PATCH', podUrl('/tasks/*')).as('createTask');

        cy.get('[aria-label="Login url"]').type(webId()).type('{enter}');
        cy.solidLogin();

        // Act
        cy.contains('No tasks yet, create one.');
        cy.get('[aria-label="Task name"]').type('Learn to use cypress-solid{enter}');

        // Assert
        cy.contains('No tasks yet, create one.').should('not.exist');
        cy.contains('Learn to use cypress-solid');

        cy.fixture('create-task.sparql').then((sparql) => {
            cy.get('@createTask').its('response.statusCode').should('eq', 201);
            cy.get('@createTask').its('request.body').should('be.sparql', sparql);
        });
    });

    it('Loads tasks', () => {
        // Arrange
        cy.solidCreateContainer('/tasks/', 'Tasks');
        cy.solidCreateDocument('/tasks/task', 'task.ttl');
        cy.solidCreateDocument('/tasks/deleted-task', 'deleted-task.ttl');
        cy.solidDeleteDocument('/tasks/deleted-task');
        cy.solidCreateDocument('/settings/privateTypeIndex', 'privateTypeIndex.ttl');
        cy.solidUpdateDocument('/profile/card', 'register-type-index.sparql');

        // Act
        cy.get('[aria-label="Login url"]').type(webId()).type('{enter}');
        cy.solidLogin();

        // Assert
        cy.contains('This task was seeded in Cypress');
        cy.contains('This task should be deleted').should('not.exist');

        cy.fixture('task.ttl').then((turtle) => {
            cy.solidReadDocument('/tasks/task').should('be.turtle', turtle);
        });
    });

});
