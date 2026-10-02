# 🎓 StudyTimeline

![StudyTimeline Hero/Banner](<!-- Add hero image URL here -->)

**StudyTimeline** is a highly visual, personal-use web application designed to transform passive YouTube studying into an active, organized, and highly efficient revision process. 

Instead of dealing with endless, unorganized YouTube bookmarks or manually scrubbing through 2-hour lectures to find that *one* important formula, StudyTimeline allows you to build a structured library, annotate specific timestamps, and generate automated revision playlists right before your exams.

## ✨ Key Features

- **📚 Structured Library:** Organize your YouTube lectures into a clean hierarchy of **Subjects** and **Chapters**.
- **🎬 Smart Video Player:** Watch YouTube videos directly in the app without distractions.
- **🔖 Segment Tagging:** Use keyboard shortcuts (`M`) to instantly mark start and end times for crucial parts of a video. 
- **🏷️ Importance Levels:** Tag your segments with priority levels (*Critical, Very Important, Important, Useful, Optional*) and add personal notes.
- **🧠 Revision Engine:** Exam tomorrow? Tell the app you have 30 minutes, select your subject, and it will generate a custom, continuous playlist of only your highest-priority segments to maximize your study time.
- **🔒 Privacy First:** Your data is completely private. The app uses Firebase Anonymous Authentication to silently secure your data to your local device without requiring a manual login.

---

## 📸 Screenshots

### The Library Dashboard
*Easily view and manage all your subjects and chapters.*
![Library Dashboard Screenshot](<!-- Add Library screenshot URL here -->)

### Smart Lecture Player & Segment Editor
*Watch lectures, mark important timestamps, and take notes.*
![Lecture Player Screenshot](<!-- Add Player screenshot URL here -->)

### Revision Mode Engine
*Generate a smart playlist based on your available study time.*
![Revision Mode Screenshot](<!-- Add Revision mode screenshot URL here -->)

---

## 🛠️ Technology Stack

- **Frontend Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (v4)
- **Database & Auth:** Firebase Firestore + Firebase Anonymous Authentication
- **Icons:** Lucide React
- **Video API:** Official YouTube IFrame API

---

## 🚀 Getting Started (Local Development)

To run this project locally, follow these steps:

### 1. Clone the repository
```bash
git clone https://github.com/your-username/studytimeline.git
cd studytimeline
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Firebase
1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database** and **Anonymous Authentication**.
3. Apply the security rules found in `firestore.rules`.
4. Copy `.env.example` to `.env` and fill in your Firebase project configuration:
```bash
cp .env.example .env
```

### 4. Start the Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

---

## ☁️ Deployment

This project is optimized for deployment on **Netlify**. 
A `netlify.toml` file is included with pre-configured build commands, Single Page Application (SPA) routing redirects, and security headers. 

Simply connect your GitHub repository to Netlify and add your `.env` variables in the Netlify dashboard.

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).
