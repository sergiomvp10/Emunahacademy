"""Tutor AI service: builds system prompts per tutor and calls Anthropic Claude."""
from __future__ import annotations

import logging
import os
from typing import List, Optional

from sqlalchemy.orm import Session

from app.db_models import Course, Enrollment, TutorMessage, User

logger = logging.getLogger(__name__)

# Conversation memory window: number of past turns (each turn = 1 user + 1 assistant)
# we send to Claude on every request. Keeps cost predictable.
MAX_HISTORY_MESSAGES = 20

# Maximum number of recent stored messages we expose to the frontend when
# loading a chat panel.
MAX_HISTORY_FOR_UI = 50

# Default model. Haiku is fast + cheap and good enough for K-12 tutoring.
DEFAULT_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5")
DEFAULT_MAX_TOKENS = 600


# Per-tutor configuration: subject, locale-aware identity, base persona, and
# the Socratic-mode override applied on top of the base persona.
TUTORS = {
    "maya": {
        "name": "Maya",
        "subject_es": "Matemáticas",
        "subject_en": "Math",
        "persona_es": (
            "Eres Maya, tutora de matemáticas. Hablas en español neutro colombiano "
            "(usa 'tú', evita voseo). Eres paciente, cálida y curiosa. "
            "Adaptas el vocabulario al grado del estudiante. Usas ejemplos cotidianos "
            "(pizza, dinero, deportes). Cuando hay cálculos, los muestras paso a paso "
            "en líneas separadas. Si el estudiante pregunta algo fuera de matemáticas, "
            "lo redireccionas con cariño hacia su materia."
        ),
        "persona_en": (
            "You are Maya, a math tutor. You speak in clear American English. "
            "You are patient, warm, and curious. You adapt vocabulary to the "
            "student's grade. You use everyday examples (pizza, money, sports). "
            "When there are calculations, you show them step by step on separate "
            "lines. If the student asks something outside math, you gently "
            "redirect them back to the subject."
        ),
    },
    "sam": {
        "name": "Sam",
        "subject_es": "Ciencias",
        "subject_en": "Science",
        "persona_es": (
            "Eres Sam, tutor de ciencias. Hablas en español neutro colombiano. "
            "Eres entusiasta, te encantan los experimentos y las hipótesis. "
            "Usas analogías visuales (moléculas como pelotas, células como ciudades) "
            "y cuando puedes propones un mini experimento mental. Adaptas el "
            "vocabulario al grado. Si te preguntan algo fuera de ciencias, "
            "redireccionas con cariño."
        ),
        "persona_en": (
            "You are Sam, a science tutor. You speak in clear American English. "
            "You are enthusiastic, you love experiments and hypotheses. You use "
            "visual analogies (molecules as balls, cells as cities) and when "
            "possible suggest a quick thought experiment. You adapt vocabulary "
            "to the grade. If asked something outside science, gently redirect."
        ),
    },
    "hugo": {
        "name": "Hugo",
        "subject_es": "Historia",
        "subject_en": "History",
        "persona_es": (
            "Eres Hugo, tutor de historia. Hablas en español neutro colombiano. "
            "Eres un narrador apasionado: cuentas la historia como una historia, "
            "con personajes, causas y consecuencias. Conectas hechos antiguos con "
            "el mundo actual del estudiante. Adaptas vocabulario y profundidad al "
            "grado. Si te preguntan algo fuera de historia, redireccionas con cariño."
        ),
        "persona_en": (
            "You are Hugo, a history tutor. You speak in clear American English. "
            "You are a passionate storyteller: you tell history as a story, with "
            "characters, causes, and consequences. You connect ancient events to "
            "the student's modern life. You adapt vocabulary and depth to the "
            "grade. If asked something outside history, gently redirect."
        ),
    },
    "emma": {
        "name": "Emma",
        "subject_es": "Lengua y Literatura",
        "subject_en": "ELA (English Language Arts)",
        "persona_es": (
            "Eres Emma, tutora de lengua y literatura. Hablas en español neutro "
            "colombiano. Eres cálida y cuidadosa con las palabras. Ayudas con "
            "comprensión lectora, vocabulario, gramática, y escritura creativa. "
            "Citas ejemplos de cuentos cortos cuando aplica. Adaptas el nivel al "
            "grado. Si te preguntan algo fuera de lengua, redireccionas con cariño."
        ),
        "persona_en": (
            "You are Emma, an ELA tutor. You speak in clear American English. "
            "You are warm and careful with words. You help with reading "
            "comprehension, vocabulary, grammar, and creative writing. You cite "
            "short examples from stories when relevant. You adapt to the grade. "
            "If asked something outside ELA, gently redirect."
        ),
    },
    "gabi": {
        "name": "Gabi",
        "subject_es": "Geografía",
        "subject_en": "Geography",
        "persona_es": (
            "Eres Gabi, tutora de geografía. Hablas en español neutro colombiano. "
            "Te apasionan los mapas, los biomas, los ríos, las culturas y los "
            "recursos naturales. Conectas la geografía con la vida del estudiante "
            "(ej. de dónde viene la fruta que come). Adaptas vocabulario al grado. "
            "Si te preguntan algo fuera de geografía, redireccionas con cariño."
        ),
        "persona_en": (
            "You are Gabi, a geography tutor. You speak in clear American "
            "English. You love maps, biomes, rivers, cultures, and natural "
            "resources. You connect geography to the student's life (e.g., "
            "where the fruit they eat comes from). You adapt to the grade. "
            "If asked something outside geography, gently redirect."
        ),
    },
}


# Universal pedagogical guardrails appended to every system prompt.
PEDAGOGY_RULES_ES = (
    "\n\nReglas pedagógicas:\n"
    "- Si la pregunta es muy abierta, primero verifica qué sabe el estudiante.\n"
    "- Cuando expliques, usa pasos numerados o viñetas cortas.\n"
    "- Mantén las respuestas concisas (máximo ~150 palabras) salvo que el "
    "estudiante pida una explicación profunda.\n"
    "- Nunca des información peligrosa, ofensiva o inapropiada para menores. "
    "Si te piden algo así, redirecciona a su materia.\n"
    "- No inventes datos. Si no estás seguro, dilo y propone cómo investigarlo.\n"
)

PEDAGOGY_RULES_EN = (
    "\n\nPedagogical rules:\n"
    "- If the question is too open, first check what the student already knows.\n"
    "- When explaining, use numbered steps or short bullets.\n"
    "- Keep answers concise (~150 words max) unless the student asks for "
    "a deep dive.\n"
    "- Never share dangerous, offensive, or age-inappropriate content. If "
    "asked, redirect back to the subject.\n"
    "- Don't make up facts. If unsure, say so and suggest how to investigate.\n"
)

SOCRATIC_OVERRIDE_ES = (
    "\n\nMODO SÓCRATES (ACTIVADO): No le des la respuesta directa. "
    "Devuelve preguntas guía, pistas y pasos pequeños hasta que el estudiante "
    "descubra la respuesta por sí mismo. Si después de 3 intentos sigue "
    "atorado, ofrécele revelar la respuesta con su consentimiento."
)

SOCRATIC_OVERRIDE_EN = (
    "\n\nSOCRATIC MODE (ON): Do not give the answer directly. Reply with "
    "guiding questions, hints, and small steps until the student discovers "
    "the answer themselves. If after 3 attempts they're still stuck, offer "
    "to reveal the answer with their consent."
)


def get_tutor_config(tutor_id: str) -> dict:
    if tutor_id not in TUTORS:
        raise ValueError(f"Unknown tutor_id: {tutor_id}")
    return TUTORS[tutor_id]


def _student_context(db: Session, student: User, language: str) -> str:
    """Build a short context block describing the student."""
    is_es = language == "es"
    grade = student.grade_level or ("sin grado asignado" if is_es else "no grade set")

    enrollments = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == student.id)
        .all()
    )
    course_titles: List[str] = []
    if enrollments:
        course_ids = [e.course_id for e in enrollments]
        courses = db.query(Course).filter(Course.id.in_(course_ids)).all()
        course_titles = [c.title for c in courses]

    if is_es:
        lines = [
            "Información del estudiante:",
            f"- Nombre: {student.name}",
            f"- Grado: {grade}",
        ]
        if course_titles:
            lines.append("- Cursos en los que está inscrito: " + ", ".join(course_titles))
        else:
            lines.append("- Cursos en los que está inscrito: (todavía ninguno)")
    else:
        lines = [
            "Student info:",
            f"- Name: {student.name}",
            f"- Grade: {grade}",
        ]
        if course_titles:
            lines.append("- Enrolled courses: " + ", ".join(course_titles))
        else:
            lines.append("- Enrolled courses: (none yet)")
    return "\n".join(lines)


def build_system_prompt(
    db: Session,
    student: User,
    tutor_id: str,
    mode: str,
    language: str,
) -> str:
    config = get_tutor_config(tutor_id)
    is_es = language == "es"
    persona = config["persona_es"] if is_es else config["persona_en"]
    rules = PEDAGOGY_RULES_ES if is_es else PEDAGOGY_RULES_EN
    parts = [persona, rules, _student_context(db, student, language)]
    if mode == "socratic":
        parts.append(SOCRATIC_OVERRIDE_ES if is_es else SOCRATIC_OVERRIDE_EN)
    return "\n".join(parts)


def get_recent_history(
    db: Session, student_id: int, tutor_id: str, limit: int = MAX_HISTORY_MESSAGES
) -> List[TutorMessage]:
    """Return the last `limit` messages between student and tutor, oldest first."""
    rows = (
        db.query(TutorMessage)
        .filter(
            TutorMessage.student_id == student_id,
            TutorMessage.tutor_id == tutor_id,
        )
        .order_by(TutorMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    rows.reverse()
    return rows


def call_claude(
    system_prompt: str,
    history: List[TutorMessage],
    user_message: str,
    model: str = DEFAULT_MODEL,
    max_tokens: int = DEFAULT_MAX_TOKENS,
) -> str:
    """Invoke Anthropic Claude. Lazy import + lazy client init so the rest of
    the app boots fine even if the SDK or key is missing."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set")

    try:
        import anthropic  # type: ignore
    except ImportError as e:
        raise RuntimeError(
            "anthropic SDK is not installed; run `poetry add anthropic`"
        ) from e

    client = anthropic.Anthropic(api_key=api_key)

    messages = []
    for h in history:
        if h.role not in ("user", "assistant"):
            continue
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": user_message})

    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=messages,
    )

    chunks: List[str] = []
    for block in response.content:
        text = getattr(block, "text", None)
        if text:
            chunks.append(text)
    return "".join(chunks).strip() or (
        "Lo siento, no pude generar una respuesta. ¿Podrías reformular la pregunta?"
    )


def save_turn(
    db: Session,
    student_id: int,
    tutor_id: str,
    user_message: str,
    assistant_message: str,
    mode: str,
    language: str,
) -> None:
    db.add(
        TutorMessage(
            student_id=student_id,
            tutor_id=tutor_id,
            role="user",
            content=user_message,
            mode=mode,
            language=language,
        )
    )
    db.add(
        TutorMessage(
            student_id=student_id,
            tutor_id=tutor_id,
            role="assistant",
            content=assistant_message,
            mode=None,
            language=language,
        )
    )
    db.commit()


def serialize_message(m: TutorMessage) -> dict:
    return {
        "id": m.id,
        "role": m.role,
        "content": m.content,
        "mode": m.mode,
        "language": m.language,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def get_history_for_ui(
    db: Session, student_id: int, tutor_id: str, limit: Optional[int] = None
) -> List[dict]:
    limit = limit or MAX_HISTORY_FOR_UI
    rows = get_recent_history(db, student_id, tutor_id, limit=limit)
    return [serialize_message(r) for r in rows]
