# 🏇 Charioteer

> **Status: 🚧 Work in Progress** — Core curriculum generation is functional. Content delivery features are actively being developed.

Charioteer is an AI-powered learning companion designed to replace unstructured, random learning with a guided and adaptive experience. Instead of browsing randomly, users get a structured day-by-day curriculum tailored to their goal, current level, and available time.

---

## 🎯 What It Does

Users provide:
- Their **learning goal**
- **Current level** and **target level**
- **Duration** and **daily study time**

Charioteer then generates a structured **day-by-day curriculum** in JSON format, including:
- Topics and subtopics
- Expected outcomes per day
- Difficulty progression from beginner to advanced

---

## ✅ Features Completed

- **Curriculum Generation Engine** — AI generates a structured, personalized day-by-day learning plan
- **Content Mapping Engine** — Intelligently maps relevant learning resources using precise queries and filtering logic to avoid repetition and mismatched content
- **In-App AI Lessons** — When high-quality external content is unavailable, Charioteer generates lessons with explanations, examples, practice exercises, and checkpoints
- **Validation Layer** — Filters and validates content quality before delivery
- **Secure Backend** — Handles AI and content APIs securely with a modular architecture
- **Structured Plan Display** — Users can view their full curriculum with topics and subtopics

---

## 🚧 In Progress / Coming Soon

- **YouTube Video Integration** — Mapping curated YouTube videos to each topic
- **Journaling & Reflection** — Daily journaling prompts to reinforce learning
- **Progress Tracking** — Track completed topics and overall progress
- **Adaptive Recalibration** — System recalibrates the plan based on user progress to reinforce weak areas
- **Mobile UI Improvements** — Better responsive design for mobile users

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, CSS |
| Backend | Node.js, Express |
| Additional | Java |
| AI | Integrated via API (secured in backend) |

---

## 🚀 Getting Started (Local Setup)

### Prerequisites
- Node.js installed
- Java installed
- API keys (see `.env.example`)

### Installation

```bash
# Clone the repository
git clone https://github.com/jayagovindjunni/Charioteer.git

# Navigate to the project folder
cd Charioteer

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your API keys to the .env file

# Run the app
npm start
```

---

## ⚙️ Environment Variables

Create a `.env` file based on `.env.example` and fill in your API keys. Never share your `.env` file publicly.

---

## 📌 Project Architecture

```
Charioteer/
├── src/              # React frontend
├── server.js         # Node.js backend
├── .env.example      # Environment variable template
└── README.md
```

---

## 🤝 Contributing

This project is currently under active development. Feel free to open issues or suggestions!

---

## 📄 License

This project is not yet licensed. All rights reserved for now.
