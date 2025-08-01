<template>
    <DefaultLayout>
        <aside class="open col-docs flex-fill">
            <TreeView :treeData="[
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
            ]" />
        </aside>
        <main class="content">

        </main>
    </DefaultLayout>
</template>

<script setup>
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import TreeView from '@/components/tree/TreeView.vue'
</script>