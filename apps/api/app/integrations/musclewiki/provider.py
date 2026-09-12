"""Compatibility exports for the legacy MuscleWiki adapter."""

from app.integrations.exercises.provider import (
    ExerciseDetails,
    ExerciseProvider,
    ExerciseSearchFilters,
    ExerciseSearchPage,
    MediaAccess,
)

MuscleWikiExerciseProvider = ExerciseProvider

__all__ = [
    "ExerciseDetails",
    "ExerciseSearchFilters",
    "ExerciseSearchPage",
    "MediaAccess",
    "MuscleWikiExerciseProvider",
]
