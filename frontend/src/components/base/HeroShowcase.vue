<template>
  <!-- Text Content -->
  <div class="col-12 col-md-5 order-2 order-md-1">
    <h1 
      :key="`main-${currentIndex}`" 
      class="display-6 fw-bold mb-4 text-dark hero-main-text" 
      data-aos="fade-right"
      v-html="mainTexts[currentIndex]"
    />
    <p 
      :key="`sub-${currentIndex}`" 
      class="fs-5 mb-4 text-muted hero-sub-text"
      data-aos="fade-left"
    >
      {{ subTexts[currentIndex] }}
    </p>
    <a 
      href="#kontakt" 
      class="btn btn-primary btn-lg px-4 py-3 my-3 animate-bounce" 
      data-aos="fade-bottom"
      aria-label="Jetzt anfragen - Kontakt aufnehmen"
    >
      Jetzt Anfragen
    </a>
  </div>

  <!-- Content Area -->
  <div
    class="col-12 col-md-7 order-1 order-md-2 mb-4 mb-md-0"
    data-aos="fade-left"
  >
    <div class="wrapper">
      <div
        class="dashboard-3d-wrapper position-relative mt-5 mt-lg-0"
        role="tabpanel"
        aria-label="Product screenshots"
      >
        <button
          v-for="(image, index) in images" 
          :key="index"
          type="button"
          class="dashboard-3d position-absolute image-button"
          :class="{ active: index === currentIndex }"
          :style="styleFor(index)"
          :aria-label="`Show ${image.alt}`"
          :aria-pressed="index === currentIndex"
          :tabindex="index === currentIndex ? 0 : -1"
          @click="setActive(index)"
          @mouseenter="setActive(index)"
          @focus="setActive(index)"
        >
          <img 
            :src="image.src" 
            :alt="image.alt"
            class="w-100 h-100 object-fit-cover"
            loading="lazy"
            draggable="false"
          >
        </button>
        
        <!-- Navigation dots for mobile -->
        <div class="position-absolute bottom-0 start-50 translate-middle-x mb-3 d-md-none">
          <div class="d-flex gap-2">
            <button
              v-for="(_, index) in images"
              :key="index"
              type="button"
              class="nav-dot"
              :class="{ active: index === currentIndex }"
              :aria-label="`Go to slide ${index + 1}`"
              @click="setActive(index)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Improved slider composable with better performance and accessibility
function useHeroSlider(imagesLength) {
  const currentIndex = ref(0)
  let intervalId = null
  const isUserInteracting = ref(false)
  const isPaused = ref(false)
  const interval = 5000

  const startAutoSlide = () => {
    if (intervalId || isPaused.value) return
    
    intervalId = setInterval(() => {
      if (!isUserInteracting.value && !isPaused.value) {
        currentIndex.value = (currentIndex.value + 1) % imagesLength
      }
    }, interval)
  }

  const stopAutoSlide = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  const pauseAutoSlide = () => {
    isUserInteracting.value = true
    setTimeout(() => {
      isUserInteracting.value = false
    }, 3000) // Resume after 3 seconds of no interaction
  }

  const pause = () => {
    isPaused.value = true
    stopAutoSlide()
  }

  const resume = () => {
    isPaused.value = false
    startAutoSlide()
  }

  // Handle visibility changes (pause when tab is not visible)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      pause()
    } else {
      resume()
    }
  }

  onMounted(() => {
    startAutoSlide()
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    stopAutoSlide()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return { 
    currentIndex, 
    pauseAutoSlide,
    pause,
    resume
  }
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

const { currentIndex, pauseAutoSlide } = useHeroSlider(images.length)

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
  pauseAutoSlide()
}
</script>

<style scoped>
.image-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  outline: none;
}

.image-button:focus {
  outline: 2px solid var(--tblr-primary);
  outline-offset: 4px;
}

.dashboard-3d {
  width: 100%;
  max-width: 1200px;
  transform: perspective(1000px) rotateX(4deg) rotateY(-16deg) rotateZ(4deg) scale(.8);
  transform-style: preserve-3d;
  border-radius: 12px;
  box-shadow:
    1px 1px 0 1px #f9f9fb,
    -1px 0 28px 0 rgba(34, 33, 81, 0.01),
    28px 28px 28px 0 rgba(34, 33, 81, 0.25);
  transition:
    .4s ease-in-out transform,
    .4s ease-in-out box-shadow;
  opacity: 0.4;
}

.dashboard-3d.active {
  opacity: 1 !important;
  transform: perspective(1000px) rotateX(4deg) rotateY(-16deg) rotateZ(4deg) scale(.8);
  z-index: 40 !important;
}

.dashboard-3d:hover,
.dashboard-3d:focus-within {
  transform: rotateX(0deg) rotateY(0deg) scale(1);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.3);
  opacity: 0.98;
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

/* Navigation dots */
.nav-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-dot.active {
  background: var(--tblr-primary);
  transform: scale(1.2);
}

.nav-dot:hover,
.nav-dot:focus {
  background: var(--tblr-primary);
  outline: 2px solid var(--tblr-primary);
  outline-offset: 2px;
}

/* Responsive improvements */
@media (max-width: 768px) {
  .dashboard-3d-wrapper {
    height: 280px;
    max-width: 95%;
  }
  
  .dashboard-3d {
    transform: perspective(800px) rotateX(2deg) rotateY(-8deg) rotateZ(2deg) scale(.9);
  }
  
  .dashboard-3d.active {
    transform: perspective(800px) rotateX(2deg) rotateY(-8deg) rotateZ(2deg) scale(.9);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .dashboard-3d,
  .hero-sub-text,
  .hero-main-text,
  .nav-dot {
    transition: none;
  }
  
  .dashboard-3d:hover,
  .dashboard-3d:focus-within {
    transform: perspective(1000px) rotateX(4deg) rotateY(-16deg) rotateZ(4deg) scale(.8);
  }
}
</style>