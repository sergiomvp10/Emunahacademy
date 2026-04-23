"""Seed curriculum content for grades 5-8 into the Courses module.

Source: https://math-minds-journey.base44.app (Base44 CMS entities).
Raw JSON payloads are vendored under app/data/base44/<subject>/ so the import
is reproducible and auditable in source control.

One Course is created per (subject, grade). Each source module becomes a
TEXT Lesson whose HTML content preserves the module description, learning
objectives, and every sub-lesson with its examples — nothing from the
source is dropped.

The seed is idempotent: running it multiple times will not duplicate data.
Courses are keyed by (grade_level, title) and lessons by (course_id, title).
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from html import escape
from typing import Iterable

from sqlalchemy.orm import Session

from app.db_models import Course, Lesson, LessonTypeEnum, User, UserRoleEnum

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "base44")

GRADES: tuple[str, ...] = ("5", "6", "7", "8")


@dataclass(frozen=True)
class Subject:
    key: str  # data folder under data/base44/
    title_prefix: str  # course title prefix, e.g. "Math"
    description: str  # course description shared across grades


SUBJECTS: tuple[Subject, ...] = (
    Subject(
        key="math",
        title_prefix="Math",
        description=(
            "Core mathematics: whole numbers, fractions and decimals, ratios and "
            "proportions, expressions and equations, geometry, statistics and probability."
        ),
    ),
    Subject(
        key="ela",
        title_prefix="English Language Arts",
        description=(
            "Reading literature and informational text, writing arguments and "
            "narratives, grammar and conventions, speaking, listening and vocabulary."
        ),
    ),
    Subject(
        key="science",
        title_prefix="Science",
        description=(
            "Life, earth, physical and engineering sciences: ecosystems, matter and "
            "energy, forces, space systems, human body, and the scientific method."
        ),
    ),
    Subject(
        key="history",
        title_prefix="History",
        description=(
            "World and U.S. history: ancient civilizations, classical empires, the "
            "medieval world, revolutions, nation-building, and the modern era."
        ),
    ),
    Subject(
        key="geography",
        title_prefix="Geography",
        description=(
            "Physical and human geography of every region of the world: landforms, "
            "climate, population, economies, culture, and geographic tools."
        ),
    ),
)


def _load_modules(subject_key: str, grade: str) -> list[dict]:
    path = os.path.join(DATA_DIR, subject_key, f"grade_{grade}.json")
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _render_lesson_html(module: dict) -> str:
    """Render a module's full content as self-contained HTML."""
    parts: list[str] = []
    parts.append(f"<p>{escape(module['description'])}</p>")

    objectives = module.get("objectives") or []
    if objectives:
        parts.append("<h3>Learning Objectives</h3>")
        parts.append("<ul>")
        for obj in objectives:
            parts.append(f"<li>{escape(obj)}</li>")
        parts.append("</ul>")

    lessons = module.get("lessons") or []
    if lessons:
        parts.append("<h3>Lessons</h3>")
        for idx, lesson in enumerate(lessons, start=1):
            parts.append(f"<h4>{idx}. {escape(lesson['title'])}</h4>")
            if lesson.get("content"):
                parts.append(f"<p>{escape(lesson['content'])}</p>")
            examples = lesson.get("examples") or []
            if examples:
                parts.append("<p><strong>Examples</strong></p><ul>")
                for ex in examples:
                    parts.append(f"<li>{escape(ex)}</li>")
                parts.append("</ul>")

    return "".join(parts)


def _pick_teacher(db: Session) -> User | None:
    """Pick a plausible owner for the seeded courses.

    Prefers TEACHER, then DIRECTOR, then SUPERUSER.
    """
    for role in (UserRoleEnum.TEACHER, UserRoleEnum.DIRECTOR, UserRoleEnum.SUPERUSER):
        user = db.query(User).filter(User.role == role).order_by(User.id).first()
        if user:
            return user
    return None


def _course_title(subject: Subject, grade: str) -> str:
    return f"{subject.title_prefix} — Grade {grade}"


def _upsert_course(
    db: Session, subject: Subject, grade: str, teacher_id: int
) -> Course:
    title = _course_title(subject, grade)
    course = (
        db.query(Course)
        .filter(Course.grade_level == grade, Course.title == title)
        .first()
    )
    if course is None:
        course = Course(
            title=title,
            description=subject.description,
            grade_level=grade,
            teacher_id=teacher_id,
            is_published=True,
        )
        db.add(course)
        db.flush()
    return course


def _upsert_lessons(db: Session, course: Course, modules: Iterable[dict]) -> int:
    created = 0
    for module in modules:
        order = int(module["order"])
        title = f"Module {order}: {module['title']}"
        content = _render_lesson_html(module)
        lesson = (
            db.query(Lesson)
            .filter(Lesson.course_id == course.id, Lesson.title == title)
            .first()
        )
        if lesson is None:
            lesson = Lesson(
                course_id=course.id,
                title=title,
                lesson_type=LessonTypeEnum.TEXT,
                content=content,
                order=order,
            )
            db.add(lesson)
            created += 1
        else:
            lesson.content = content
            lesson.order = order
    return created


def seed_base44_content(db: Session) -> dict[str, dict[str, int]]:
    """Idempotently seed grades 5-8 content for every configured subject.

    Returns {subject_key: {grade: new_lesson_count}}.
    """
    teacher = _pick_teacher(db)
    if teacher is None:
        print("[seed_base44] No teacher/director/superuser found; skipping.")
        return {}

    summary: dict[str, dict[str, int]] = {}
    for subject in SUBJECTS:
        per_grade: dict[str, int] = {}
        for grade in GRADES:
            try:
                modules = _load_modules(subject.key, grade)
            except FileNotFoundError:
                print(
                    f"[seed_base44] Missing data for {subject.key} grade {grade}; skipping."
                )
                continue
            course = _upsert_course(db, subject, grade, teacher_id=teacher.id)
            created = _upsert_lessons(db, course, modules)
            per_grade[grade] = created
            print(
                f"[seed_base44] {subject.title_prefix} grade {grade}: "
                f"course='{course.title}' lessons_created={created} "
                f"lessons_total={len(modules)}"
            )
        summary[subject.key] = per_grade

    db.commit()
    return summary


if __name__ == "__main__":
    from app.db_config import SessionLocal

    session = SessionLocal()
    try:
        seed_base44_content(session)
    finally:
        session.close()
