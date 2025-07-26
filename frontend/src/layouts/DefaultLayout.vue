<template>
    <div class="page" :class="{ 'landing body-bg': logoTargetPath === '/' }">
        <header class="navbar navbar-expand-md d-print-none d-block pb-0" data-bs-theme="dark">
            <div class="container-fluid">
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-menu"
                    aria-controls="navbar-menu" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0 pe-md-3 py-0">
                    <router-link :to="logoTargetPath" class="logo d-flex align-items-center text-decoration-none">
                        <img :src="logo" alt="" class="logo-img" />
                        <div class="logo-text ms-2">
                            <div class="brand-highlight">weppi</div>
                            <div class="logo-subtext">xpress.com</div>
                        </div>
                    </router-link>
                </div>
                <div class="navbar-nav flex-row order-md-last">
                    <UserDropdown v-if="user" :user="user" @logout="confirmLogout" />
                </div>
                <div class="collapse navbar-collapse justify-content-end" id="navbar-menu">
                    <Navbar />
                </div>
            </div>
        </header>
        <div class="page-wrapper">
            <div class="page-body m-0">
                <div class="d-flex flex-fill position-relative">
                    <div class="position-absolute top-0 end-0 start-0 bottom-0 overflow-hidden">
                        <div class="d-flex h-100">
                            <aside class="open">
                                <div class="col-docs">
                                    <div class="py-3">
                                        <div class="space-y space-y-5">
                                            <div class="flex-fill">
                                                <TreeView v-if="treeData?.length" :treeData="treeData" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </aside>
                            <main class="content">
                                <slot />
                            </main>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import Navbar from '@/components/Navbar.vue'
import UserDropdown from '@/components/UserDropdown.vue'
import TreeView from '@/components/tree/TreeView.vue';

// Vue core imports
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Auth store import
import { useAuthStore } from '@/stores/useAuthStore'

// Assets and components
import logo from '@/assets/images/logo-light.svg'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const user = computed(() => authStore.user)
const { auth, treeData } = defineProps({ auth: Boolean, treeData: Array })
const logoTargetPath = computed(() => route.path === '/' ? '/files' : '/')

const showConfirm = ref(false)

function confirmLogout() {
    authStore.logout()
    showConfirm.value = false
    router.replace({ name: 'Login' })
}
</script>

<style type="scss" scoped>
.nav-link {
    font-size: 1rem;
    font-weight: 400;
}

.logo-img {
    height: 38px;
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
}

.logo-text {
    line-height: 1;
    font-size: .9rem;
    font-weight: 300;
    letter-spacing: -0.4px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    font-weight: 400;

    .brand-highlight {
        color: var(--tblr-gray-300);
        line-height: .7;
    }

    .logo-subtext {
        font-size: 1.3rem;
        color: var(--tblr-light);
        line-height: 1;
        font-weight: 500;
    }
}

.navbar {
    min-height: 3.5rem;

    .navbar-nav .nav-link:hover,
    .navbar-nav .nav-link:focus {
        background-color: transparent !important;
    }

    .dropdown-item.active,
    .dropdown-item:active {
        color: var(--tblr-gray-900);
        text-decoration: none;
        background-color: var(--tblr-dropdown-link-active-bg);
    }
}

</style>