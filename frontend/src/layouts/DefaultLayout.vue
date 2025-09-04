<template>
    <div class="page d-flex flex-column flex-fill">
        <header class="navbar navbar-expand-md d-print-none d-block pb-0" data-bs-theme="dark">
            <div class="container-fluid">
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-menu"
                    aria-controls="navbar-menu" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0 pe-md-3 py-0">
                    <router-link to="/" class="logo d-flex align-items-center text-decoration-none">
                        <img :src="logo" alt="" class="logo-img" />
                        <div>
                            <div class="logo-text ms-2">
                                <div class="brand-highlight">weppi</div>
                                <div class="logo-subtext">xpress</div>
                            </div>
                            <div class="brand-sub-highlight">technologies</div>
                        </div>
                    </router-link>
                </div>
                <div class="navbar-nav flex-row order-md-last">
                    <UserDropdown v-if="auth.user" :user="auth.user" @logout="confirmLogout" />
                </div>
                <div class="collapse navbar-collapse justify-content-end" id="navbar-menu">
                    <Navbar />
                </div>
            </div>
        </header>
        <div class="page-wrapper">
            <div class="page-body m-0">
                <slot />
            </div>
        </div>
    </div>
</template>

<script setup>
import Navbar from '@/components/base/Navbar.vue'
import UserDropdown from '@/components/base/UserDropdown.vue';
import logo from '@/assets/images/logo-light.svg'

// Assets and components
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router'

const router = useRouter()
const auth = useAuthStore();
const data = ref(null);
const showConfirm = ref(false)

function confirmLogout() {
    auth.logout()
    showConfirm.value = false
    router.replace({ path: '/login' })
}

onMounted(async () => {
    try {
        const res = await auth.fetchUser();
        data.value = res.data;
    } catch (e) {
        // Optional: Token refresh fallback
        try {
            await auth.refresh();
            const res = await auth.fetchUser();
            data.value = res.data;
        } catch (err) {
            data.value = { message: 'Nicht autorisiert' };
        }
    }
});
</script>

<style scoped>
.nav-link {
    font-size: 1rem;
    font-weight: 400;
}

.logo {
    letter-spacing: -0.4px;
    font-weight: 400;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);

    .logo-img {
        height: 38px;
        filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
    }

    .logo-text {
        font-size: 1.2rem;
        display: flex;

        .brand-highlight {
            color: var(--tblr-gray-100);
        }

        .logo-subtext {
            font-size: 1.2rem;
            color: var(--tblr-gray-400);
            font-weight: 400;
        }
    }

    .brand-sub-highlight {
        font-size: .8rem;
        color: var(--tblr-gray-100);
        margin-left: .6rem;
        font-weight: 300;
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