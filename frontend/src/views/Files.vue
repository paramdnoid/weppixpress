<template>
    <DefaultLayout :treeData="[
        {
            title: 'Uploads',
            items: [
                {
                    label: 'Introduction',
                    children: [
                        { label: 'Installation', link: '/ui/getting-started/installation/' },
                        { label: 'FAQ', link: '/ui/getting-started/faq/' },
                    ]
                },
                {
                    label: 'Base',
                    children: [
                        { label: 'Colors', link: '/ui/base/colors/' }
                    ]
                }
            ]
        }
    ]"></DefaultLayout>
</template>

<script setup>
import DefaultLayout from '@/layouts/DefaultLayout.vue';

</script>