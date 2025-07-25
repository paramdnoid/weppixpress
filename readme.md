// Monorepo mit vite, express, shared: weppixpress

// --- Frontend ---
// Tech: Vue 3, Pinia, Tabler UI
// Structure:
// - src/
//   - views/
//     - Landing.vue
//     - auth/
//       - Login.vue
//       - Register.vue
//       - ForgotPassword.vue
//     - files/
//       - FileManager.vue
//       - Flows.vue
//       - Mails.vue
//       - Meetings.vue
//   - components/
//     - shared/
//     - layout/
//   - store/ (Pinia stores)
//   - router/
//   - assets/
//   - main.js

// --- Backend ---
// Tech: Node.js (Express, JWT, Mailer)
// Structure:
// - server/
//   - routes/
//     - auth.js
//     - files.js
//     - flows.js
//     - mails.js
//     - meetings.js
//   - controllers/
//   - models/
//   - middleware/
//   - utils/
//   - app.js

// --- Shared ---
// Lib: filesize (used in frontend and backend)
// - shared/
//   - utils/
//     - formatSize.js // exports function using filesize lib

// --- Pages Overview ---

// Website:
// - Landing.vue: Intro page with CTA, features, and login/register buttons

// Authentication:
// - Login.vue: email/password, forgot password link
// - Register.vue: name, email, password, confirm
// - ForgotPassword.vue: request reset via email

// Files:
// - FileManager.vue: Upload, tree, grid/list, drag-drop, chunked upload
// - Flows.vue: Project/task flows with Kanban or cards
// - Mails.vue: Mail client UI
// - Meetings.vue: List and create video/audio meetings

// All integrated with responsive Tabler UI and Pinia store modules
// Auth via JWT with refreshToken, secure storage and route guards
