<template>
    <DefaultLayout>
        <aside class="open col-docs flex-fill">
            <TreeView :treeData="[
                {
                    title: 'Meetings',
                    items: []
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