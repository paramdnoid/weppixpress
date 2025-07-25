<template>
    <DefaultLayout :treeData="[
        {
            title: 'Flows',
            items: [
                {
                    label: 'Kategorien',
                    link: '/flows'
                },
                {
                    label: 'Erstellte Flows',
                    link: '/flows'
                },
                {
                    label: 'Team Flows',
                    link: '/flows'
                },
                {
                    label: 'Zugewiesene Aufgaben',
                    link: '/flows'
                },
                {
                    label: 'Archivierte Flows',
                    link: '/flows'
                },
                {
                    label: 'Vorlagen',
                    link: '/flows'
                }
            ]
        }
    ]"></DefaultLayout>
</template>

<script setup>
import DefaultLayout from '@/layouts/DefaultLayout.vue';

</script>