<template>
    <DefaultLayout :treeData="[
        {
            title: 'Flows',
            items: [
                {
                    name: 'Kategorien',
                    link: '/flows'
                },
                {
                    name: 'Erstellte Flows',
                    link: '/flows'
                },
                {
                    name: 'Team Flows',
                    link: '/flows'
                },
                {
                    name: 'Zugewiesene Aufgaben',
                    link: '/flows'
                },
                {
                    name: 'Archivierte Flows',
                    link: '/flows'
                },
                {
                    name: 'Vorlagen',
                    link: '/flows'
                }
            ]
        }
    ]"></DefaultLayout>
</template>

<script setup>
import DefaultLayout from '@/layouts/DefaultLayout.vue';

</script>