# VentureForge AI – From Vision to Venture

> **AI-Powered Startup Blueprint Generator**  
> Built with Python Flask · IBM watsonx.ai · IBM Granite Foundation Models

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0-black?logo=flask)](https://flask.palletsprojects.com)
[![IBM watsonx.ai](https://img.shields.io/badge/IBM-watsonx.ai-0f62fe?logo=ibm)](https://www.ibm.com/watsonx)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952b3?logo=bootstrap)](https://getbootstrap.com)

---

## 🚀 Overview

**VentureForge AI** is an intelligent AI startup co-founder that transforms innovative business ideas into complete, actionable, investor-ready startup blueprints. Powered by **IBM Granite** foundation models on **IBM watsonx.ai**, VentureForge guides entrepreneurs through every stage of startup planning.

### What VentureForge AI Generates

| Module | Description |
|---|---|
| 🔍 Idea Validation | Problem-solution fit assessment |
| 📋 Problem & Solution | Structured problem statement + solution overview |
| 💎 Unique Value Proposition | Differentiated UVP crafting |
| 👥 Customer Persona | Target audience + buyer persona |
| 📊 Market Analysis | TAM/SAM/SOM estimation |
| 🏆 Competitor Analysis | Competitive landscape + differentiation |
| ⚖️ SWOT Analysis | Strengths, Weaknesses, Opportunities, Threats |
| 🧩 Business Model Canvas | Full BMC generation |
| 💰 Revenue Model | Multiple monetization strategy options |
| 📣 GTM Strategy | Go-to-market plan + marketing channels |
| 💵 Startup Budget | Estimated cost breakdown |
| 🏦 Funding Guide | Startup India, grants, VCs, angel investors |
| ⚠️ Risk Analysis | Risk identification + mitigation strategies |
| 🗺️ 90-Day Roadmap | 30-60-90 day execution milestones |
| 🎤 Elevator Pitch | Investor-ready 60-second pitch |
| 📄 Executive Summary | Complete executive summary document |
| ✅ Launch Checklist | Step-by-step startup launch checklist |
| 🧠 AI Mentor Tips | Personalized next-step recommendations |

---

## 🏗️ Project Structure

```
VentureForge AI/
├── app.py                  # Flask application backend
├── agent_config.py         # AI agent instructions & personality
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variables template
├── .env                    # Your credentials (DO NOT COMMIT)
├── .gitignore
├── README.md
│
├── templates/
│   └── index.html          # Main HTML template (Jinja2)
│
└── static/
    ├── css/
    │   └── style.css       # Custom styles (IBM Blue theme)
    └── js/
        └── main.js         # Frontend JavaScript
```

---

## ⚙️ Prerequisites

- Python **3.10** or higher
- An **IBM Cloud account** — [Sign up free](https://cloud.ibm.com/registration)
- An **IBM watsonx.ai** project — [Get started](https://dataplatform.cloud.ibm.com)
- Git

---

## 🔧 Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ventureforge-ai.git
cd ventureforge-ai
```

### 2. Create a Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

```bash
# Copy the template
cp .env.example .env
```

Open `.env` and fill in your credentials:

```env
IBM_API_KEY=your_ibm_cloud_api_key_here
WATSONX_PROJECT_ID=your_watsonx_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
FLASK_SECRET_KEY=your_strong_secret_key_here
WATSONX_MODEL_ID=ibm/granite-3-3-8b-instruct
```

### 5. Run the Application

```bash
python app.py
```

Open your browser at **http://localhost:5000**

---

## 🔑 Obtaining IBM Credentials

### IBM Cloud API Key

1. Log in to [IBM Cloud Console](https://cloud.ibm.com)
2. Click your **profile icon → IBM Cloud API keys**
3. Click **Create an IBM Cloud API key**
4. Copy and save the key in your `.env` file

### watsonx.ai Project ID

1. Go to [IBM watsonx.ai](https://dataplatform.cloud.ibm.com)
2. Open or create a **Project**
3. Navigate to **Manage → General**
4. Copy the **Project ID** to your `.env` file

### Supported IBM Granite Models

| Model ID | Best For |
|---|---|
| `ibm/granite-3-3-8b-instruct` | Balanced quality & speed (recommended) |
| `ibm/granite-3-2-8b-instruct` | Cost-efficient alternative |
| `ibm/granite-13b-instruct-v2` | Higher quality for complex tasks |

---

## 🎨 Features

### AI Capabilities
- **Multi-turn conversation memory** — VentureForge maintains context across your session
- **20 structured analysis modules** — complete startup blueprint generation
- **India-specific knowledge** — Startup India, DPIIT, SIDBI, angel networks, VCs
- **Structured Markdown output** — tables, headings, bullet points for easy sharing

### User Interface
- **IBM Blue professional theme** — business-oriented design
- **Dark / Light mode toggle** — persisted in browser storage
- **Fully responsive** — mobile, tablet, desktop optimized
- **Real-time typing indicator** — smooth UX while AI generates
- **One-click quick actions** — Full Blueprint, Elevator Pitch, SWOT, Funding, Roadmap, Market Analysis
- **8 sample startup ideas** — instant inspiration starters
- **Export & Download** — copy or download blueprints as `.txt`
- **Session management** — start fresh anytime without page reload

### Security
- Environment variables for all secrets (never in code)
- Session cookies: HttpOnly + SameSite protection
- Input length limiting (4000 char max)
- XSS sanitization with DOMPurify on rendered Markdown
- CORS configured via environment variable

---

## 🛠️ Customization

### Changing the AI Persona

Edit [`agent_config.py`](agent_config.py) to modify:

```python
AGENT_PERSONALITY = {
    "tone": "professional, strategic, supportive",
    "style": "structured, actionable, beginner-friendly",
    "creativity": "high",
    "depth": "comprehensive",
    ...
}
```

### Adding Safety Rules

```python
SAFETY_RULES = [
    "Never provide illegal advice.",
    "Always disclose uncertainty.",
    ...
]
```

### Adding New Sample Ideas

```python
SAMPLE_IDEAS = [
    {
        "category": "Your Category",
        "icon": "🎯",
        "title": "Your Idea Title",
        "description": "Detailed description for the AI context.",
    },
    ...
]
```

### Adjusting AI Generation Parameters

In `.env`:

```env
MAX_NEW_TOKENS=3000     # Response length
TEMPERATURE=0.7         # Creativity (0.0–1.0)
TOP_P=0.9               # Nucleus sampling
REPETITION_PENALTY=1.1  # Reduce repetition
```

---

## 🚢 Deployment

### Option 1: IBM Cloud Code Engine

```bash
# Build and push Docker image
docker build -t ventureforge-ai .
docker tag ventureforge-ai icr.io/your-namespace/ventureforge-ai:latest
docker push icr.io/your-namespace/ventureforge-ai:latest

# Deploy to Code Engine
ibmcloud ce app create \
  --name ventureforge-ai \
  --image icr.io/your-namespace/ventureforge-ai:latest \
  --env-from-secret ventureforge-secrets \
  --port 5000
```

### Option 2: Gunicorn (Production Server)

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Option 3: Docker

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "app:app"]
```

```bash
docker build -t ventureforge-ai .
docker run -p 5000:5000 --env-file .env ventureforge-ai
```

### Environment Variables for Production

```env
FLASK_ENV=production
FLASK_DEBUG=False
FLASK_SECRET_KEY=<strong-random-32-byte-hex>
ALLOWED_ORIGINS=https://yourdomain.com
```

---

## 🔌 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Main application page |
| `/api/chat` | POST | Send message, get AI response |
| `/api/reset` | POST | Reset conversation session |
| `/api/history` | GET | Get current session history |
| `/api/status` | GET | AI readiness health check |
| `/api/sample-ideas` | GET | Get sample startup ideas |

### `/api/chat` Request/Response

```json
// Request
{
  "message": "Generate a full startup blueprint for my idea",
  "startup_idea": "AI-powered rural diagnostics platform"
}

// Response
{
  "success": true,
  "response": "## VentureForge AI Startup Blueprint\n...",
  "session_id": "uuid",
  "turn_count": 1
}
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **IBM watsonx.ai** for providing the Granite foundation models
- **IBM SkillsBuild** & **AICTE** for inspiring this project
- **Bootstrap** for the responsive UI framework
- **Flask** for the lightweight Python web framework

---

<div align="center">
  <strong>VentureForge AI – Empowering the next generation of entrepreneurs</strong><br>
  Built with ❤️ using IBM Granite on watsonx.ai
</div>
