<template>
    <div class="flex flex-col items-center gap-3">
        <p v-if="tasks.length === 0">
            No tasks yet, create one.
        </p>
        <ul v-else class="w-full">
            <li
                v-for="task of tasks"
                :key="task.id"
                class="w-full border border-b-0 border-gray-300 bg-white p-2 last-of-type:border-b"
            >
                {{ task.name }}
            </li>
        </ul>
        <AGForm :form="form" class="flex" @submit="$ui.loading(Task.create({ name: form.draft })), form.reset()">
            <AGInput name="draft" placeholder="Task name..." aria-label="Task name" />
            <AGButton submit>
                Add
            </AGButton>
        </AGForm>
    </div>
</template>

<script setup lang="ts">
import { requiredStringInput, useForm } from '@aerogel/core';
import { useModelCollection } from '@aerogel/plugin-soukai';

import Task from '@/models/Task';

const tasks = useModelCollection(Task);
const form = useForm({ draft: requiredStringInput() });
</script>
