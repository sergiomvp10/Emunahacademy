"""Seed math curriculum for grades 5-8 into the Courses module.

Source: https://math-minds-journey.base44.app (MathModule entity).
Raw JSON payloads are vendored under app/data/math_minds/ so the import is
reproducible and auditable in source control.

The seed is idempotent: running it multiple times will not duplicate data.
Courses are keyed by (grade_level, title) and lessons by (course_id, title).
"""
from __future__ import annotations

import json
import os
from html import escape
from typing import Iterable

from sqlalchemy.orm import Session

from app.db_models import Course, Lesson, LessonTypeEnum, User, UserRoleEnum

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "math_minds")

GRADES: tuple[str, ...] = ("5", "6", "7", "8")

COURSE_META: dict[str, dict[str, str]] = {
    "5": {
        "title": "Math — Grade 5",
        "description": (
            "Fifth-grade math: fluency with whole-number and decimal operations, "
            "fractions, volume, the coordinate plane, 2D figures, expressions, "
            "data and an introduction to ratios."
        ),
    },
    "6": {
        "title": "Math — Grade 6",
        "description": (
            "Sixth-grade math: ratios and percent, integers on the number line, "
            "algebraic expressions and one-step equations, area/surface area/volume, "
            "statistical distributions and the coordinate plane."
        ),
    },
    "7": {
        "title": "Math — Grade 7",
        "description": (
            "Seventh-grade math: proportional relationships, operations with rational "
            "numbers, multi-step equations and inequalities, scale drawings, circle "
            "geometry, probability and statistical inference."
        ),
    },
    "8": {
        "title": "Math — Grade 8",
        "description": (
            "Eighth-grade math: linear equations in one and two variables, systems, "
            "functions, exponents, the Pythagorean theorem, volume of curved solids, "
            "transformations and bivariate data."
        ),
    },
}


def _load_modules(grade: str) -> list[dict]:
    path = os.path.join(DATA_DIR, f"grade_{grade}.json")
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
            parts.append(
                f"<h4>{idx}. {escape(lesson['title'])}</h4>"
            )
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


def _upsert_course(db: Session, grade: str, teacher_id: int) -> Course:
    meta = COURSE_META[grade]
    course = (
        db.query(Course)
        .filter(Course.grade_level == grade, Course.title == meta["title"])
        .first()
    )
    if course is None:
        course = Course(
            title=meta["title"],
            description=meta["description"],
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


def seed_math_minds_content(db: Session) -> dict[str, int]:
    """Idempotently seed grades 5-8 math content.

    Returns a summary mapping grade -> number of new lessons created.
    """
    teacher = _pick_teacher(db)
    if teacher is None:
        print("[seed_math_minds] No teacher/director/superuser found; skipping.")
        return {}

    summary: dict[str, int] = {}
    for grade in GRADES:
        try:
            modules = _load_modules(grade)
        except FileNotFoundError:
            print(f"[seed_math_minds] Missing data file for grade {grade}; skipping.")
            continue
        course = _upsert_course(db, grade, teacher_id=teacher.id)
        created = _upsert_lessons(db, course, modules)
        summary[grade] = created
        print(
            f"[seed_math_minds] Grade {grade}: course='{course.title}' "
            f"lessons_created={created} lessons_total={len(modules)}"
        )

    db.commit()
    return summary


if __name__ == "__main__":
    from app.db_config import SessionLocal

    session = SessionLocal()
    try:
        seed_math_minds_content(session)
    finally:
        session.close()
