import asyncio
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.domains.users.coaching_schemas import AssessmentRequest, CoachingPreferences
from app.domains.users.scoring import coaching_score


def test_missing_inputs_are_not_invented_or_scored_as_failure():
    score = coaching_score("military_preparation", CoachingPreferences(), 3)
    assert score.value is None
    assert score.coverage == 0
    assert score.dimensions == []


def test_military_score_uses_personal_targets_and_reports_coverage():
    score = coaching_score(
        "military_preparation",
        CoachingPreferences(
            running_minutes=10,
            running_target_minutes=20,
            pushups=10,
            pushups_target=20,
            active_days_per_week=3,
        ),
        3,
    )
    assert score.coverage == 90
    assert score.value == 61
    assert score.missing == ["pullups"]
    assert score.strongest == "consistency"


def test_weight_progress_and_goal_formulas_differ():
    preferences = CoachingPreferences(target_weight_kg=80, active_days_per_week=3)
    fat = coaching_score(
        "fat_loss", preferences, 3, weight_kg=90, baseline_weight_kg=100
    )
    strength = coaching_score(
        "strength", preferences, 3, weight_kg=90, baseline_weight_kg=100
    )
    assert fat.value == 69
    assert strength.value == 100
    assert fat.coverage == 80


def test_scores_are_bounded_and_zero_is_valid():
    zero = coaching_score(
        "strength", CoachingPreferences(pushups=0, pushups_target=10), 3
    )
    assert zero.value == 0
    score = coaching_score(
        "strength", CoachingPreferences(pushups=100, pushups_target=10), 3
    )
    assert score.value == 100


def test_invalid_assessment_and_target_inputs_rejected():
    with pytest.raises(ValidationError):
        CoachingPreferences(running_target_minutes=0)
    with pytest.raises(ValidationError):
        AssessmentRequest(
            request_id=uuid4(), source="manual", measurements={"weight_kg": 80}
        )
    with pytest.raises(ValidationError):
        AssessmentRequest(
            request_id=uuid4(),
            source="inbody",
            inbody_scan_id=uuid4(),
            measurements={"height_cm": 180, "weight_kg": 80},
        )


def test_optional_military_baselines_are_validated():
    preferences = CoachingPreferences(
        situps=25,
        situps_target=45,
        limitations="Avoid deep knee flexion",
    )
    assert preferences.situps == 25
    assert preferences.situps_target == 45
    assert preferences.limitations == "Avoid deep knee flexion"

    with pytest.raises(ValidationError):
        CoachingPreferences(situps_target=0)


def test_goal_change_clears_incompatible_fields_and_preserves_owner():
    from app.domains.users.schemas import ProfileUpdate
    from app.domains.users.service import ProfileService
    from tests.api.test_users import FakeProfileRepository

    async def scenario():
        service = ProfileService(FakeProfileRepository())
        await service.update(
            "a",
            ProfileUpdate(
                training_goal="military_preparation",
                coaching=CoachingPreferences(
                    military_subtype="military_college",
                    situps=20,
                    pullups=3,
                    limitations="knee",
                ),
            ),
        )
        result = await service.update(
            "a", ProfileUpdate(training_goal="general_fitness")
        )
        assert result.coaching.military_subtype is None
        assert result.coaching.situps is None
        assert result.coaching.pullups is None
        assert result.coaching.limitations is None
        assert (await service.get("b")).training_goal is None
        await service.update("a", ProfileUpdate(coaching=CoachingPreferences(running_minutes=12)))
        updated = await service.update(
            "a", ProfileUpdate(coaching=CoachingPreferences(running_target_minutes=20))
        )
        assert updated.coaching.running_minutes == 12
        assert updated.coaching.running_target_minutes == 20

    asyncio.run(scenario())
