<template>
    <AGAppLayout class="bg-blue-50">
        <main class="flex flex-grow flex-col items-center justify-center">
            <div v-if="$solid.isLoggedIn()" class="flex flex-col items-center gap-3">
                <h1 class="fontsmi prose text-xl">
                    <AGMarkdown
                        inline
                        :text="`Hello, [${$solid.user.name ?? $solid.user.webId}](${$solid.user.webId})`"
                    />
                </h1>
                <AGButton @click="$solid.logout(true)">
                    Log out
                </AGButton>
            </div>
            <AGForm
                v-else
                :form="form"
                class="flex flex-col items-center gap-3"
                @submit="$ui.loading($solid.login(form.url))"
            >
                <h1 class="fontsmi text-xl">
                    Log in with Solid
                </h1>
                <div class="flex">
                    <AGInput name="url" placeholder="Your WebId" aria-label="Login url" />
                    <AGButton submit>
                        Log In
                    </AGButton>
                </div>
                <p v-if="$solid.error" class="text-red">
                    {{ $errors.getErrorMessage($solid.error) }}
                </p>
            </AGForm>
        </main>
    </AGAppLayout>
</template>

<script setup lang="ts">
import { requiredStringInput, useForm } from '@aerogel/core';

const form = useForm({ url: requiredStringInput() });
</script>
