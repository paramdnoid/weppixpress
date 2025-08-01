<template>
    <DefaultLayout>
        <aside class="open col-docs flex-fill">
            <TreeView :treeData="[
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