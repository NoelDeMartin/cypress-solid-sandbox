<template>
    <AGAppLayout class="bg-blue-50">
        <main class="flex flex-grow flex-col items-center justify-center">
            <div v-if="$solid.isLoggedIn()" class="flex flex-col items-center gap-3">
                <div class="flex items-center gap-3">
                    <h1 class="prose font-semibold">
                        <AGMarkdown
                            inline
                            :text="`Hello, [${$solid.user.name ?? $solid.user.webId}](${$solid.user.webId})`"
                        />
                    </h1>
                    <AGButton @click="$solid.logout(true)">
                        Log out
                    </AGButton>
                </div>
                <TasksList class="mt-6" />
            </div>
            <AGForm
                v-else
                :form="form"
                class="flex flex-col items-center gap-3"
                @submit="$ui.loading($solid.login(form.url))"
            >
                <h1 class="text-xl font-semibold">
                    Log in with Solid
                </h1>
                <div class="flex">
                    <AGInput name="url" placeholder="Your WebId" aria-label="Login url" />
                    <AGButton submit>
                        Log In
                    </AGButton>
                </div>
                <div v-if="$solid.error" class="flex items-center gap-3 text-red-500">
                    <p>{{ getErrorMessage($solid.error) }}</p>

                    <AGButton @click="$solid.reconnect({ force: true })">
                        Reconnect
                    </AGButton>
                </div>
            </AGForm>
        </main>
    </AGAppLayout>
</template>

<script setup lang="ts">
import { getErrorMessage, requiredStringInput, useForm } from '@aerogel/core';

const form = useForm({ url: requiredStringInput() });
</script>
