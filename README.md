# Xrai-Vision

A modern video calling application built with React, featuring real-time video communication, screen sharing, and interactive annotations. This project is part of the Xrai-Vision initiative by PurviewTech.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- npm (v6 or higher)
- Firebase CLI (for deployment)

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/PurviewTech/Xrai-Vision.git
cd Xrai-Vision
```

2. Install dependencies:
```bash
npm install
```

3. Create a `firebaseConfig.js` file in the root directory and add your environment variables:
```firebaseConfig.js
VITE_AGORA_APP_ID=your_agora_app_id
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

## 🚀 Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Build for production:
```bash
npm run build
```

3. Preview production build:
```bash
npm run preview
```

## 🔥 Deployment

The application is configured for deployment on Firebase Hosting. To deploy:

1. Login to Firebase:
```bash
firebase login
```

2. Deploy to Firebase:
```bash
firebase deploy
```

## 📦 Project Structure

```
.
├── node_modules/
├── src/
├── dist/
├── .firebase/
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── package-lock.json
├── index.html
├── firebase.json
├── eslint.config.js
├── .firebaserc
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- PurviewTech - Initial work

## 🙏 Acknowledgments

- Agora SDK for video calling capabilities
- Firebase for hosting and backend services
- Tailwind CSS for styling
- React community for the amazing framework

## 🔗 Links

- [GitHub Repository](https://github.com/PurviewTech/Xrai-Vision)
- [PurviewTech](https://github.com/PurviewTech) 
