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

from google.cloud import firestore

PROJECT_ID = "qwiklabs-gcp-04-220e06ee3cd9"

SEED_EXERCISES = [
    {
        "id": "barbell-bench-press",
        "name": "Barbell Bench Press",
        "muscle_group": "Chest",
        "secondary_muscles": ["Triceps", "Anterior Deltoids"],
        "equipment": "Barbell, Bench",
        "difficulty": "Intermediate",
        "instructions": "Lie flat on the bench, grip the barbell slightly wider than shoulder width. Lower bar with control to mid-chest, press upwards extending arms.",
        "default_sets": 4,
        "default_reps": "8-10",
    },
    {
        "id": "barbell-back-squat",
        "name": "Barbell Back Squat",
        "muscle_group": "Legs",
        "secondary_muscles": ["Glutes", "Hamstrings", "Core"],
        "equipment": "Barbell, Squat Rack",
        "difficulty": "Intermediate",
        "instructions": "Rest barbell across upper traps. Hinge at hips and knees to squat until thighs are at or below parallel. Drive through midfoot to stand.",
        "default_sets": 4,
        "default_reps": "6-8",
    },
    {
        "id": "deadlift",
        "name": "Conventional Deadlift",
        "muscle_group": "Back",
        "secondary_muscles": ["Hamstrings", "Glutes", "Traps", "Forearms"],
        "equipment": "Barbell",
        "difficulty": "Advanced",
        "instructions": "Stand with feet hip-width under bar. Grip bar just outside shins. Keep neutral spine, drive through floor while extending hips and knees together.",
        "default_sets": 3,
        "default_reps": "5",
    },
    {
        "id": "dumbbell-overhead-press",
        "name": "Dumbbell Overhead Press",
        "muscle_group": "Shoulders",
        "secondary_muscles": ["Triceps", "Upper Chest"],
        "equipment": "Dumbbells",
        "difficulty": "Beginner",
        "instructions": "Hold dumbbells at shoulder height with palms facing forward. Press dumbbells overhead until arms are extended, lower slowly.",
        "default_sets": 3,
        "default_reps": "10-12",
    },
    {
        "id": "pull-up",
        "name": "Pull-Up",
        "muscle_group": "Back",
        "secondary_muscles": ["Biceps", "Lats", "Core"],
        "equipment": "Pull-Up Bar",
        "difficulty": "Intermediate",
        "instructions": "Overhand grip slightly wider than shoulder width. Pull chest towards bar by engaging lats and driving elbows down.",
        "default_sets": 3,
        "default_reps": "6-10",
    },
    {
        "id": "dumbbell-goblet-squat",
        "name": "Dumbbell Goblet Squat",
        "muscle_group": "Legs",
        "secondary_muscles": ["Quads", "Glutes", "Core"],
        "equipment": "Dumbbell",
        "difficulty": "Beginner",
        "instructions": "Hold a single dumbbell vertically against chest. Squat down between knees while keeping torso upright.",
        "default_sets": 3,
        "default_reps": "12-15",
    },
]


def seed_exercises():
    db = firestore.Client(project=PROJECT_ID)
    collection = db.collection("exercises")
    print(f"Seeding exercises into Firestore project '{PROJECT_ID}'...")
    for item in SEED_EXERCISES:
        doc_id = item["id"]
        collection.document(doc_id).set(item)
        print(f"  ✓ Added exercise: {item['name']} ({doc_id})")
    print("Seeding complete!")


if __name__ == "__main__":
    seed_exercises()
