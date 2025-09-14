# AVA - AI SDR Assistant Backend

**AVA** is an AI-powered SDR (Sales Development Representative) assistant backend designed to help sales teams discover relevant leads, suggest outreach emails, and manage interactions intelligently. Built with FastAPI, AVA integrates advanced LLMs and external APIs to streamline your sales workflow.

---

## 📁 Project Structure

- `routes.py` — FastAPI route handling for chat interactions and tool calls  
- `agent.py` — Manages OpenRouter interaction, model response handling, and memory  
- `tools/search_tool.py` — Unified lead search for contacts and companies via external API  
- `tools/suggest_email_tool.py` — Generates email suggestions based on contact and company context  
- `enum_matcher.py` — Utility for semantic/enumeration matching of filter values  
- `enum_data/` — Folder to store enums for different fields  
-  `storage/` - File storage

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone git@github.com:cloduraai/ai-sdr.git
cd ai-sdr
```

### 2. Create a Virtual Environment (Recommended)

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory and add:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
CLODURA_TOKEN=your_clodura_token
```

---

## 🏃‍♂️ Running Locally

### Using Uvicorn

```bash
uvicorn routes:app --reload
```

The API will be available at [http://143.244.143.231:8000](http://143.244.143.231:8000).

---

## 🐳 Docker Setup

### 1. Build the Docker Image

```bash
docker build -t ava-sdr .
```

### 2. Run the Container

```bash
docker run -p 8000:8000 ava-sdr
```

The API will be accessible at [http://143.244.143.231:8000](http://143.244.143.231:8000).

---

## 📚 API Endpoints

- `GET /` — Health check
- `POST /chat` — Main chat endpoint for interacting with the AI Sales Assistant
- `GET /session/{session_id}` — Get session info
- `DELETE /session/{session_id}` — Clear a session
- `GET /docs` — Interactive API documentation (Swagger UI)

---

## 🤝 Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements and bug fixes.

---
**Happy Selling! 🚀**