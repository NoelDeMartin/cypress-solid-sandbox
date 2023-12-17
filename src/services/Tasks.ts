import { facade, stringToSlug, urlResolveDirectory } from '@noeldemartin/utils';
import { Service } from '@aerogel/core';
import { setEngine } from 'soukai';
import { Solid } from '@aerogel/plugin-solid';
import type { SolidUserProfile } from '@noeldemartin/solid-utils';

import Task from '@/models/Task';

export class TasksService extends Service {

    protected async boot(): Promise<void> {
        await Solid.booted;

        if (!Solid.isLoggedIn()) {
            return;
        }

        setEngine(Solid.requireAuthenticator().engine);

        await this.loadTasks(Solid.user);
    }

    protected async loadTasks(user: SolidUserProfile): Promise<void> {
        const name = 'Tasks';
        const url = urlResolveDirectory(user.storageUrls[0], stringToSlug(name));
        const container = await Solid.createPrivateContainer({
            name,
            url,
            registerFor: Task,
            reuseExisting: true,
        });

        Task.collection = container.url;
    }

}

export default facade(new TasksService());
