<template>
  <!-- Text Content -->
  <div class="col-12 col-md-5 order-2 order-md-1">
    <h1 class="display-6 fw-bold mb-4 text-dark hero-main-text" data-aos="fade-right" v-html="mainTexts[currentIndex]">
    </h1>
    <p class="fs-5 mb-4 text-muted hero-sub-text" data-aos="fade-left">{{ subTexts[currentIndex] }}</p>
    <a href="#kontakt" class="btn btn-primary btn-lg px-4 py-3 my-3 animate-bounce" data-aos="fade-bottom">
      Jetzt Anfragen
    </a>
  </div>

  <!-- Content Area -->
  <div class="col-12 col-md-7 order-1 order-md-2 mb-4 mb-md-0" data-aos="fade-left">
    <div class="wrapper">
      <div class="dashboard-3d-wrapper position-relative mt-5 mt-lg-0">
        <img v-for="(image, index) in images" :key="index" :src="image.src" :alt="image.alt"
          :class="['dashboard-3d position-absolute', { active: index === currentIndex }]" :style="styleFor(index)"
          @click="setActive(index)" @mouseenter="setActive(index)" />
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, watchEffect, onUnmounted } from 'vue'

function useHeroSlider(imagesLength) {
  const currentIndex = ref(0)
  let animationFrameId = null
  let lastTimestamp = 0
  const interval = 5000

  function step(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp
    const elapsed = timestamp - lastTimestamp
    if (elapsed > interval) {
      currentIndex.value = (currentIndex.value + 1) % imagesLength
      lastTimestamp = timestamp
    }
    animationFrameId = requestAnimationFrame(step)
  }

  watchEffect(() => {
    animationFrameId = requestAnimationFrame(step)
  })

  onUnmounted(() => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
  })

  return { currentIndex }
}

const images = [
  { src: new URL('@/assets/images/flows.webp', import.meta.url).href, alt: 'Flowboard Screenshot' },
  { src: new URL('@/assets/images/meetings.webp', import.meta.url).href, alt: 'Meetings Screenshot' },
  { src: new URL('@/assets/images/mails.webp', import.meta.url).href, alt: 'MailBox Screenshot' },
  { src: new URL('@/assets/images/files.webp', import.meta.url).href, alt: 'FileManager Screenshot' },
]

const mainTexts = [
  'Abläufe steuern. Prozesse <span class="text-muted">vereinfachen.</span>',
  'Effizient planen. Klar <span class="text-muted">kommunizieren.</span>',
  'Kommunikation, die <span class="text-muted">verbindet.</span>',
  'Dateien einfach verwalten, jederzeit <span class="text-muted">verfügbar.</span>'
]

const subTexts = [
  'Mit Flows behalten Sie den Überblick über Ihre Projekte. Automatisierte Aufgaben, klare Verantwortlichkeiten, nahtlose Zusammenarbeit.',
  'Planen Sie Meetings mit wenigen Klicks. Mit Kalenderintegration, Agenda, Protokoll und Follow-up bleibt nichts mehr offen.',
  'Schreiben, empfangen und verwalten Sie Ihre Projektmails zentral. Mit Kommentarfunktion und Verknüpfung zu Dateien und Aufgaben.',
  'Organisieren, teilen und sichern Sie Ihre Dateien – intuitiv und geräteunabhängig. Strukturieren Sie Projekte mit Ordnern und Zugriffsrechten.'
]

const positions = [
  { top: 60, right: 60 },
  { top: 40, right: 40 },
  { top: 20, right: 20 },
  { top: 0, right: 0 },
]

const { currentIndex } = useHeroSlider(images.length)

function styleFor(index) {
  const relativeIndex = (index - currentIndex.value + images.length) % images.length
  const pos = positions[relativeIndex]
  return {
    top: `${pos.top}px`,
    right: `${pos.right}px`,
    opacity: relativeIndex === 0 ? '1' : '0.4',
    zIndex: ((positions.length - relativeIndex) * 10).toString(),
    transition: 'opacity 0.8s ease, top 0.7s ease, right 0.7s ease, transform 0.4s ease'
  }
}

function setActive(index) {
  currentIndex.value = index
}
</script>

<style>
.dashboard-3d {
  width: 100%;
  max-width: 1200px;
  transform:
    perspective(1000px) rotateX(4deg) rotateY(-16deg) rotateZ(4deg) scale(.8);
  transform-style: preserve-3d;
  border-radius: 12px;
  box-shadow:
    1px 1px 0 1px #f9f9fb,
    -1px 0 28px 0 rgba(34, 33, 81, 0.01),
    28px 28px 28px 0 rgba(34, 33, 81, 0.25);
  transition:
    .4s ease-in-out transform,
    .4s ease-in-out box-shadow;
  opacity: 10%;
}

.dashboard-3d.active {
  opacity: 1 !important;
  transform:
    perspective(1000px) rotateX(4deg) rotateY(-16deg) rotateZ(4deg) scale(.8);
  z-index: 10;
}

.dashboard-3d:hover {
  transform: rotateX(0deg) rotateY(0deg) scale(1);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.3);
  opacity: 98%;
}

.dashboard-3d-wrapper {
  position: relative;
  z-index: 10;
  height: 380px;
  perspective: 1500px;
  display: flex;
  justify-content: center;
  margin-left: auto;
  max-width: 90%;
}

.hero-sub-text {
  transition: opacity 0.4s ease;
}

.hero-main-text {
  transition: opacity 0.4s ease;
}
</style>