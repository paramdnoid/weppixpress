<template>
    <DefaultLayout :treeData="[
        {
            title: 'Mails',
            items: [
                {
                    name: 'Posteingang',
                    link: '/mails'
                },
                {
                    name: 'Postausgang',
                    link: '/mails'
                },
                {
                    name: 'Kontakte',
                    link: '/mails'
                }
            ]
        }
    ]"></DefaultLayout>
</template>

<script setup>
import DefaultLayout from '@/layouts/DefaultLayout.vue';

</script>