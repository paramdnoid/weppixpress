<template>
    <div class="auth-layout row g-0 vh-100">
        <div class="left-auth col-xxl-3 col-lg-4 col-md-5">
            <div class="d-flex flex-column h-100 py-5 px-4">
                <div class="text-center text-muted mb-2">
                    <div class="pb-3">
                        <slot name="auth-text" />
                    </div>
                </div>
                <div class="my-auto">
                    <div class="p-3 text-center">
                        <img src="@/assets/images/logo-dark.svg" alt="" class="img-fluid w-75">
                    </div>
                </div>
                <div class="mt-4 mt-md-5 text-center">
                    <p class="mb-2">
                        &copy; {{ currentYear }} Weppi®Technologies.
                    </p>
                </div>
            </div>
        </div>
        <div class="col-xxl-9 col-lg-8 col-md-7">
            <div class="body-bg clip bg-light py-md-5 p-4 d-flex h-100">
                <div class="row justify-content-center g-0 align-items-start align-items-md-center w-100 position-relative">
                    <div class="col-xl-5 col-lg-8">
                        <div class="frm-auth-logo pb-5 text-center">
                            <img src="@/assets/images/logo-light.svg" alt="" class="img-fluid">
                        </div>
                        <div class="card">
                            <div class="card-body p-0">
                                <div class="px-3 py-3">
                                    <slot />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="position-absolute bottom-0 start-0 end-0">
                        <ul class="navbar-nav d-flex flex-row align-items-center justify-content-center">
                            <li class="nav-item p-0 pe-2">
                                <a href="/pricing" class="nav-link text-white-50">
                                    Preise
                                </a>
                            </li>
                            <li class="nav-item p-0 px-2">
                                <a href="/terms/conditions" class="nav-link text-white-50">
                                    AGB
                                </a>
                            </li>
                            <li class="nav-item p-0 px-2">
                                <a href="/terms/privacy" class="nav-link text-white-50">
                                    Datenschutz
                                </a>
                            </li>
                            <li class="nav-item p-0 px-2">
                                <a href="/terms/impressum" class="nav-link text-white-50">
                                    Impressum
                                </a>
                            </li>
                            <li class="nav-item p-0 px-2">
                                <a href="/terms/contact" class="nav-link text-white-50">
                                    Kontakt
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
const currentYear = new Date().getFullYear()
</script>

<style>
.font-size-12 {
    font-size: 12px !important;
}

.auth-layout .form-check-input {
    width: 1rem;
    height: 1rem;
}

.auth-layout .form-check-input[type=checkbox] {
    border-radius: 4px;
}

.logo-txt {
    color: rgba(0, 0, 0, .81);
    font-size: 16px;
    font-weight: 700;
    line-height: 85px;
    margin-left: 5px;
}

.frm-auth-logo {
    display: none;
}

.form-floating-custom {
    position: relative;
}

.form-floating-custom .btn-link:hover {
    background-color: transparent !important;
}

.form-floating-custom .form-floating-icon {
    align-items: center;
    color: rgba(0, 0, 0, .4);
    display: flex;
    font-size: 20px;
    height: 100%;
    justify-content: center;
    left: 0;
    position: absolute;
    top: 0;
    width: 56px;
}

.form-floating-custom .btn-link .icon {
    width: 1.5rem;
    height: 1.5rem;
}

.form-floating-custom>.form-control,
.form-floating-custom>.form-select {
    padding-left: 60px !important;
    background-color: var(--tblr-gray-100);
}

.form-floating-custom>label {
    left: 48px !important;
}

@media (max-width: 768px) {
    .frm-auth-logo {
        display: block;
    }

    .left-auth {
        display: none;
    }

    .auth-bg {
        clip-path: none;
    }

    .img-fluid {
        width: 20%;
    }
}
</style>