# =============================================================================
# VentureForge AI – From Vision to Venture
# Flask Application Backend
# =============================================================================
# Main entry point for the VentureForge AI web application.
# Integrates IBM watsonx.ai via the ibm-watsonx-ai SDK using the Chat API.
# Uses session-based conversation memory for multi-turn context.
# =============================================================================

import os
import uuid
import logging
from datetime import datetime
from functools import wraps

from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    session,
)
from flask_cors import CORS
from dotenv import load_dotenv

# IBM watsonx.ai SDK — Chat API (non-deprecated)
from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference

# Local agent configuration
from agent_config import (
    build_system_prompt,
    SAMPLE_IDEAS,
    QUICK_ACTIONS,
    AGENT_NAME,
    AGENT_TAGLINE,
    AGENT_VERSION,
    ANALYSIS_MODULES,
)

# ---------------------------------------------------------------------------
# Environment & Logging Setup
# ---------------------------------------------------------------------------
load_dotenv()  # Load variables from .env file

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ventureforge_ai")

# ---------------------------------------------------------------------------
# Flask Application Initialization
# ---------------------------------------------------------------------------
app = Flask(__name__)

# Security: strong secret key required for session encryption
app.secret_key = os.environ.get("FLASK_SECRET_KEY", os.urandom(32))

# Session configuration
app.config["SESSION_COOKIE_HTTPONLY"] = True   # Prevent XSS cookie theft
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"  # CSRF protection
app.config["PERMANENT_SESSION_LIFETIME"] = 3600  # 1 hour session TTL
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB max request

# Enable CORS (restrict in production to your actual domain)
CORS(app, resources={r"/api/*": {"origins": os.environ.get("ALLOWED_ORIGINS", "*")}})

# ---------------------------------------------------------------------------
# IBM watsonx.ai Client Initialization
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Generation config (read once at startup)
# ---------------------------------------------------------------------------
CHAT_PARAMS = {}  # populated in create_watsonx_model()


def create_watsonx_model() -> ModelInference:
    """
    Initialize and return the IBM watsonx.ai ModelInference client.
    Uses the Chat API (model.chat) — the current non-deprecated interface.
    """
    api_key    = os.environ.get("IBM_API_KEY")
    project_id = os.environ.get("WATSONX_PROJECT_ID")
    url        = os.environ.get("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
    model_id   = os.environ.get("WATSONX_MODEL_ID", "meta-llama/llama-3-3-70b-instruct")

    if not api_key:
        raise EnvironmentError(
            "IBM_API_KEY is not set. Please configure your .env file."
        )
    if not project_id:
        raise EnvironmentError(
            "WATSONX_PROJECT_ID is not set. Please configure your .env file."
        )

    credentials = Credentials(url=url, api_key=api_key)

    model = ModelInference(
        model_id=model_id,
        credentials=credentials,
        project_id=project_id,
    )

    # Store chat params separately — passed per-call to model.chat()
    CHAT_PARAMS["max_tokens"]          = int(os.environ.get("MAX_NEW_TOKENS", 3000))
    CHAT_PARAMS["temperature"]         = float(os.environ.get("TEMPERATURE", 0.7))
    CHAT_PARAMS["top_p"]               = float(os.environ.get("TOP_P", 0.9))

    logger.info(f"IBM watsonx.ai model initialized: {model_id}")
    return model


# Initialize model at startup (fail fast on misconfiguration)
try:
    watsonx_model = create_watsonx_model()
    AI_READY = True
    logger.info("VentureForge AI is ready.")
except EnvironmentError as e:
    watsonx_model = None
    AI_READY = False
    logger.warning(f"IBM watsonx.ai not configured: {e}")
except Exception as e:
    watsonx_model = None
    AI_READY = False
    logger.error(f"Failed to initialize IBM watsonx.ai: {e}")


# ---------------------------------------------------------------------------
# Conversation Memory Helpers (Filesystem-based to bypass 4KB Cookie limit)
# ---------------------------------------------------------------------------
import json

MAX_HISTORY_TURNS = 12  # Keep last 12 turns (6 user + 6 assistant) in context
SESSION_DIR = "/tmp/ventureforge_sessions"
os.makedirs(SESSION_DIR, exist_ok=True)


def get_session_path(sid: str) -> str:
    """Get absolute path to session JSON file."""
    return os.path.join(SESSION_DIR, f"{sid}.json")


def get_conversation_history() -> list:
    """Retrieve conversation history from server-side session storage."""
    sid = session.get("session_id")
    if not sid:
        return []
    path = get_session_path(sid)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def append_to_history(role: str, content: str) -> None:
    """Append a new message to the server-side session conversation history."""
    sid = session.get("session_id")
    if not sid:
        return
    history = get_conversation_history()
    # Use standard timezone-aware datetime replacement if utcnow is deprecated, or keep utcnow
    history.append({
        "role": role,
        "content": content,
        "timestamp": datetime.now().isoformat()
    })
    # Trim to context window size
    if len(history) > MAX_HISTORY_TURNS * 2:
        history = history[:1] + history[-(MAX_HISTORY_TURNS * 2 - 1):]
    
    path = get_session_path(sid)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Failed to write session file: {e}")



def build_chat_messages(user_message: str) -> list:
    """
    Build the messages list for the IBM watsonx.ai Chat API.
    Format: [{"role": "system"|"user"|"assistant", "content": "..."}]
    Includes system prompt + full conversation history + current message.
    """
    messages = [{"role": "system", "content": build_system_prompt()}]

    # Append prior conversation turns
    for turn in get_conversation_history():
        role = "user" if turn["role"] == "user" else "assistant"
        messages.append({"role": role, "content": turn["content"]})

    # Append the new user message
    messages.append({"role": "user", "content": user_message})
    return messages


# ---------------------------------------------------------------------------
# Route Decorators
# ---------------------------------------------------------------------------
def require_ai(f):
    """Decorator: returns a 503 JSON error if watsonx.ai is not configured."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not AI_READY or watsonx_model is None:
            return jsonify({
                "success": False,
                "error": (
                    "IBM watsonx.ai is not configured. "
                    "Please set IBM_API_KEY and WATSONX_PROJECT_ID in your .env file."
                ),
            }), 503
        return f(*args, **kwargs)
    return decorated


# ---------------------------------------------------------------------------
# Application Routes
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    """Landing page — initialize a fresh session if none exists."""
    if "session_id" not in session:
        session["session_id"] = str(uuid.uuid4())
        session["conversation_history"] = []
        session.permanent = True
    return render_template(
        "index.html",
        agent_name=AGENT_NAME,
        agent_tagline=AGENT_TAGLINE,
        agent_version=AGENT_VERSION,
        sample_ideas=SAMPLE_IDEAS,
        quick_actions=QUICK_ACTIONS,
        analysis_modules=ANALYSIS_MODULES,
        ai_ready=AI_READY,
    )


@app.route("/api/chat", methods=["POST"])
@require_ai
def chat():
    """
    Primary chat endpoint.
    Receives a user message, calls IBM Granite, and returns the AI response.

    Request JSON:  { "message": "string", "startup_idea": "string (optional)" }
    Response JSON: { "success": bool, "response": "string", "session_id": "string" }
    """
    data = request.get_json(silent=True)
    if not data or not data.get("message", "").strip():
        return jsonify({"success": False, "error": "Message cannot be empty."}), 400

    user_message = data["message"].strip()[:4000]  # Limit input length
    startup_idea = data.get("startup_idea", "").strip()

    # If a startup idea context is provided and this is the first message, prepend it
    if startup_idea and not get_conversation_history():
        user_message = (
            f"My startup idea: {startup_idea}\n\n{user_message}"
        )

    try:
        # Build messages list for the Chat API
        messages = build_chat_messages(user_message)

        logger.info(
            f"[Session {session.get('session_id', 'unknown')[:8]}] "
            f"Generating response for: {user_message[:80]}..."
        )

        # Call IBM watsonx.ai via the Chat API (non-deprecated)
        result = watsonx_model.chat(
            messages=messages,
            params={
                "max_tokens": CHAT_PARAMS.get("max_tokens", 3000),
                "temperature": CHAT_PARAMS.get("temperature", 0.7),
                "top_p": CHAT_PARAMS.get("top_p", 0.9),
            },
        )

        # Extract text from chat response structure
        ai_response = result["choices"][0]["message"]["content"].strip()

        if not ai_response:
            raise ValueError("Empty response from IBM watsonx.ai.")

        # Persist conversation turns to session memory
        append_to_history("user", user_message)
        append_to_history("assistant", ai_response)

        logger.info(
            f"[Session {session.get('session_id', 'unknown')[:8]}] "
            f"Response generated ({len(ai_response)} chars)."
        )

        return jsonify({
            "success": True,
            "response": ai_response,
            "session_id": session.get("session_id"),
            "turn_count": len(get_conversation_history()) // 2,
        })

    except Exception as e:
        logger.error(f"Error generating AI response: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": (
                "An error occurred while generating your startup blueprint. "
                "Please check your IBM watsonx.ai credentials and try again."
            ),
        }), 500


@app.route("/api/reset", methods=["POST"])
def reset_session():
    """
    Reset the conversation history for the current session.
    Starts a fresh co-founder session without requiring re-login.
    """
    sid = session.get("session_id")
    if sid:
        path = get_session_path(sid)
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass
    session["session_id"] = str(uuid.uuid4())
    session.modified = True
    logger.info("Session reset.")
    return jsonify({"success": True, "message": "New session started."})


@app.route("/api/history", methods=["GET"])
def get_history():
    """Return the current session's conversation history (for UI restore)."""
    history = get_conversation_history()
    # Strip timestamps before sending to client
    clean_history = [{"role": h["role"], "content": h["content"]} for h in history]
    return jsonify({
        "success": True,
        "history": clean_history,
        "turn_count": len(clean_history) // 2,
        "session_id": session.get("session_id"),
    })


@app.route("/api/status", methods=["GET"])
def api_status():
    """Health-check endpoint — returns AI readiness and configuration status."""
    model_id = os.environ.get("WATSONX_MODEL_ID", "ibm/granite-3-3-8b-instruct")
    return jsonify({
        "status": "online",
        "ai_ready": AI_READY,
        "agent_name": AGENT_NAME,
        "agent_version": AGENT_VERSION,
        "model": model_id if AI_READY else "not configured",
        "timestamp": datetime.utcnow().isoformat(),
    })


@app.route("/api/sample-ideas", methods=["GET"])
def get_sample_ideas():
    """Return the list of sample startup ideas for the UI."""
    return jsonify({"success": True, "ideas": SAMPLE_IDEAS})


# ---------------------------------------------------------------------------
# Error Handlers
# ---------------------------------------------------------------------------
@app.errorhandler(404)
def not_found(e):
    return render_template("index.html",
        agent_name=AGENT_NAME, agent_tagline=AGENT_TAGLINE,
        agent_version=AGENT_VERSION, sample_ideas=SAMPLE_IDEAS,
        quick_actions=QUICK_ACTIONS, analysis_modules=ANALYSIS_MODULES,
        ai_ready=AI_READY), 404


@app.errorhandler(500)
def server_error(e):
    logger.error(f"Internal server error: {e}")
    return jsonify({"success": False, "error": "Internal server error."}), 500


@app.errorhandler(413)
def too_large(e):
    return jsonify({"success": False, "error": "Request too large."}), 413


# ---------------------------------------------------------------------------
# Application Entry Point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    host = os.environ.get("FLASK_HOST", "0.0.0.0")
    port = int(os.environ.get("PORT") or os.environ.get("FLASK_PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "True").lower() == "true"

    logger.info(f"Starting VentureForge AI on http://{host}:{port}")
    logger.info(f"AI Ready: {AI_READY}")

    app.run(host=host, port=port, debug=debug)
