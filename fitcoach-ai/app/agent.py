# ruff: noqa
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import datetime
import os
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.cloud import firestore
from google.genai import types
import requests


MODEL = "gemini-3.8-flash"
PROJECT_ID = "qwiklabs-gcp-04-220e06ee3cd9"

# Initialize Firestore Client with hardcoded project ID
db = firestore.Client(project=PROJECT_ID)


def list_exercises(muscle_group: Optional[str] = None, difficulty: Optional[str] = None) -> List[Dict[str, Any]]:
    """List or search exercises in the fitness catalog.

    Args:
        muscle_group: Optional filter by muscle group (e.g. 'Chest', 'Legs', 'Back', 'Shoulders').
        difficulty: Optional filter by difficulty level ('Beginner', 'Intermediate', 'Advanced').

    Returns:
        A list of exercise dictionaries containing id, name, muscle_group, equipment, difficulty, and instructions.
    """
    collection = db.collection("exercises")
    docs = collection.stream()
    results = []

    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id

        if muscle_group and muscle_group.lower() not in data.get("muscle_group", "").lower():
            continue
        if difficulty and difficulty.lower() != data.get("difficulty", "").lower():
            continue

        results.append(data)

    return results


def get_exercise_details(exercise_name_or_id: str) -> Dict[str, Any]:
    """Get detailed exercise information and instructions by ID or name.

    Args:
        exercise_name_or_id: The ID or name of the exercise to look up (e.g. 'barbell-bench-press' or 'Bench Press').

    Returns:
        Exercise details including instructions, primary/secondary muscles, and default sets/reps.
    """
    query_str = exercise_name_or_id.strip().lower()
    doc_ref = db.collection("exercises").document(query_str).get()
    if doc_ref.exists:
        data = doc_ref.to_dict()
        data["id"] = doc_ref.id
        return data

    for doc in db.collection("exercises").stream():
        data = doc.to_dict()
        if (
            query_str in doc.id.lower()
            or query_str in data.get("name", "").lower()
        ):
            data["id"] = doc.id
            return data

    return {"error": f"Exercise '{exercise_name_or_id}' not found in the catalog."}


def log_workout_session(
    exercise_name: str,
    sets: int,
    reps: int,
    weight_lbs: Optional[float] = None,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """Log a completed workout exercise entry to Firestore.

    Args:
        exercise_name: Name of the exercise performed (e.g. 'Barbell Back Squat').
        sets: Number of sets completed.
        reps: Number of repetitions completed per set.
        weight_lbs: Optional weight used in pounds.
        notes: Optional user notes or feelings during the exercise.

    Returns:
        Confirmation dictionary with the logged record details and log ID.
    """
    timestamp = datetime.datetime.now(ZoneInfo("UTC")).isoformat()
    record = {
        "exercise_name": exercise_name,
        "sets": sets,
        "reps": reps,
        "weight_lbs": weight_lbs,
        "notes": notes or "",
        "logged_at": timestamp,
    }
    _, doc_ref = db.collection("workout_logs").add(record)
    record["log_id"] = doc_ref.id
    return {"status": "success", "message": f"Successfully logged workout for {exercise_name}.", "record": record}


def get_workout_history(limit: int = 5) -> List[Dict[str, Any]]:
    """Retrieve recent workout logs from Firestore.

    Args:
        limit: Maximum number of recent workout entries to return (default 5).

    Returns:
        List of recent workout entries with exercise, sets, reps, weight, and timestamp.
    """
    query = db.collection("workout_logs").order_by("logged_at", direction=firestore.Query.DESCENDING).limit(limit)
    docs = query.stream()
    return [dict(doc.to_dict(), log_id=doc.id) for doc in docs]


def calculate_one_rep_max(weight_lbs: float, reps: int) -> Dict[str, Any]:
    """Calculate estimated 1-Rep Max (1RM) and percentage-based training load zones.

    Args:
        weight_lbs: The weight lifted in pounds.
        reps: The number of repetitions completed (must be >= 1).

    Returns:
        A dictionary with estimated 1RM and percentage-based training weight targets.
    """
    if reps <= 0 or weight_lbs <= 0:
        return {"error": "Weight and reps must be greater than zero."}

    if reps == 1:
        one_rep_max = weight_lbs
    else:
        # Epley formula: 1RM = weight * (1 + reps / 30)
        one_rep_max = weight_lbs * (1.0 + reps / 30.0)

    one_rep_max = round(one_rep_max, 1)

    return {
        "estimated_1rm_lbs": one_rep_max,
        "formula": "Epley",
        "training_zones_lbs": {
            "95%_max_strength": round(one_rep_max * 0.95, 1),
            "85%_heavy_strength": round(one_rep_max * 0.85, 1),
            "75%_hypertrophy": round(one_rep_max * 0.75, 1),
            "65%_endurance_speed": round(one_rep_max * 0.65, 1),
        },
    }


def search_public_exercises(
    category: Optional[str] = None,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """Search the free public wger workout database for real exercise ideas and instructions.

    Args:
        category: Muscle/body category to filter by ('Abs', 'Arms', 'Back', 'Calves', 'Cardio', 'Chest', 'Legs', 'Shoulders').
        limit: Number of results to return (default 5, max 10).

    Returns:
        A list of exercise summaries including name, category, equipment, muscles, and description.
    """
    category_map = {
        "abs": 10,
        "arms": 8,
        "back": 12,
        "calves": 14,
        "cardio": 15,
        "chest": 11,
        "legs": 9,
        "shoulders": 13,
    }

    url = "https://wger.de/api/v2/exerciseinfo/"
    params: Dict[str, Any] = {"limit": min(limit, 10)}

    if category and category.lower() in category_map:
        params["category"] = category_map[category.lower()]

    headers = {"Accept": "application/json"}
    # Optional API key support if configured in environment
    api_key = os.environ.get("WGER_API_KEY")
    if api_key:
        headers["Authorization"] = f"Token {api_key}"

    try:
        response = requests.get(url, params=params, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        return [{"error": f"Failed to fetch data from wger public API: {str(e)}"}]

    results = []
    for item in data.get("results", []):
        # Find English name/description (language 2 is English in wger)
        name = "Unknown"
        desc = ""
        for translation in item.get("translations", []):
            if translation.get("language") == 2:
                name = translation.get("name")
                desc = translation.get("description_source", "")
                break
        if not name or name == "Unknown":
            if item.get("translations"):
                name = item["translations"][0].get("name", "Unknown")
                desc = item["translations"][0].get("description_source", "")

        equipment_list = [eq.get("name") for eq in item.get("equipment", []) if eq.get("name")]
        muscle_list = [m.get("name_en") or m.get("name") for m in item.get("muscles", []) if m.get("name_en") or m.get("name")]

        results.append({
            "name": name,
            "category": item.get("category", {}).get("name"),
            "equipment": equipment_list,
            "muscles": muscle_list,
            "description": desc[:250] + ("..." if len(desc) > 250 else ""),
        })

    return results


root_agent = Agent(
    name="root_agent",
    model=Gemini(
        model=MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=(
        "You are FitCoach AI, a knowledgeable, motivating, and personalized fitness coach assistant. "
        "You help users discover exercises, tailor workout plans, check form and instructions, and log their completed sessions. "
        "Use `list_exercises` and `get_exercise_details` to query the exercise catalog in Firestore, "
        "`log_workout_session` and `get_workout_history` to track workouts, "
        "`calculate_one_rep_max` to calculate 1RM and training percentage zones, "
        "and `search_public_exercises` to discover new exercises from the live public wger workout database."
    ),
    tools=[
        list_exercises,
        get_exercise_details,
        log_workout_session,
        get_workout_history,
        calculate_one_rep_max,
        search_public_exercises,
    ],
)

app = App(
    root_agent=root_agent,
    name="app",
)
