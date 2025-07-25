<template>
    <DefaultLayout :treeData="[
        {
            title: 'Mails',
            items: [
                {
                    label: 'Posteingang',
                    link: '/mails'
                },
                {
                    label: 'Postausgang',
                    link: '/mails'
                },
                {
                    label: 'Kontakte',
                    link: '/mails'
                }
            ]
        }
    ]"></DefaultLayout>
</template>

<script setup>
import DefaultLayout from '@/layouts/DefaultLayout.vue';

</script>