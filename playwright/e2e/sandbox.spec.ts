import { expect, test } from '@playwright/test';
import {
    fixture,
    podUrl,
    resetPod,
    solidCreateContainer,
    solidCreateDocument,
    solidDeleteDocument,
    solidLogin,
    solidReadDocument,
    solidUpdateDocument,
    webId,
} from '../solid';
import { normalizeSparql } from '@noeldemartin/solid-utils';

test.describe('Solid interactions', () => {

    test.beforeEach(async ({ page }) => {
        await resetPod();
        await page.goto('/');
    });

    test('Logs in', async ({ page }) => {
        // Arrange
        await expect(page.getByText('Log in with Solid')).toBeVisible({ timeout: 15000 });

        // Act
        await page.getByLabel('Login url').fill(webId());
        await page.getByLabel('Login url').press('Enter');
        await solidLogin(page);

        // Assert
        await expect(page.getByText('Hello, Alice Cooper')).toBeVisible({ timeout: 15000 });
    });

    test('Logs out', async ({ page }) => {
        // Arrange
        await expect(page.getByText('Log in with Solid')).toBeVisible({ timeout: 15000 });
        await page.getByLabel('Login url').fill(webId());
        await page.getByLabel('Login url').press('Enter');
        await solidLogin(page);

        // Act
        await page.getByText('Log out').click();

        // Assert
        await expect(page.getByText('Hello, Alice Cooper')).not.toBeVisible();
    });

    test('Creates tasks', async ({ page }) => {
        // Arrange
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let createTaskRequest: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let createTaskResponse: any = null;

        page.on('response', async (response) => {
            const request = response.request();
            if (request.method() === 'PATCH' && request.url().startsWith(podUrl('/tasks/'))) {
                createTaskRequest = request;
                createTaskResponse = response;
            }
        });

        await expect(page.getByText('Log in with Solid')).toBeVisible({ timeout: 15000 });
        await page.getByLabel('Login url').fill(webId());
        await page.getByLabel('Login url').press('Enter');
        await solidLogin(page);

        // Act
        await expect(page.getByText('No tasks yet, create one.')).toBeVisible();
        await page.getByLabel('Task name').fill('Learn to use cypress-solid');
        await page.getByLabel('Task name').press('Enter');

        // Assert
        await expect(page.getByText('No tasks yet, create one.')).not.toBeVisible();
        await expect(page.getByText('Learn to use cypress-solid')).toBeVisible();

        const sparql = await fixture('create-task.sparql');

        expect(createTaskResponse).not.toBeNull();
        expect(createTaskResponse.status()).toBe(201);

        const requestBody = createTaskRequest.postData();

        // Use regex for checking since the timestamp differs. Cypress-solid probably ignored the timestamp.
        const dateTimeRegex = /".*?"\^\^<http:\/\/www\.w3\.org\/2001\/XMLSchema#dateTime>/g;
        const replacement = '""^^<http://www.w3.org/2001/XMLSchema#dateTime>';
        const normalizedRequest = normalizeSparql(requestBody).replace(dateTimeRegex, replacement);
        const normalizedFixture = normalizeSparql(sparql)
            .replace(dateTimeRegex, replacement)
            .replace(/\[\[.*\]\]/g, '');

        expect(normalizedRequest).toBe(normalizedFixture);
    });

    test('Loads tasks', async ({ page }) => {
        // Arrange
        await solidCreateContainer('/tasks/', 'Tasks');
        await solidCreateDocument('/tasks/task', 'task.ttl');
        await solidCreateDocument('/tasks/deleted-task', 'deleted-task.ttl');
        await solidDeleteDocument('/tasks/deleted-task');
        await solidCreateDocument('/settings/privateTypeIndex', 'privateTypeIndex.ttl');
        await solidUpdateDocument('/profile/card', 'register-type-index.sparql');

        // Act
        await expect(page.getByText('Log in with Solid')).toBeVisible({ timeout: 15000 });
        await page.getByLabel('Login url').fill(webId());
        await page.getByLabel('Login url').press('Enter');
        await solidLogin(page);

        // Assert
        await expect(page.getByText('This task was seeded in Cypress')).toBeVisible();
        await expect(page.getByText('This task should be deleted')).not.toBeVisible();

        const turtle = await fixture('task.ttl');
        const podDocument = await solidReadDocument('/tasks/task');

        // Similarly for `be.turtle`, we can just expect strings to include it,
        // or since turtle string formatting might differ slightly, let's at least check the contents
        // For simple fixtures, it might exactly match. Let's do a basic equality check or contains.
        expect(podDocument).toContain('This task was seeded in Cypress');
        // Let's strip whitespace for simple comparison
        expect(podDocument.replace(/\s+/g, '')).toBe(turtle.replace(/\s+/g, ''));
    });

});
