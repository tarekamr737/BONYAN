from app.domains.inbody.schemas import InBodyMetricKey
from app.integrations.mistral.client import MISTRAL_OCR_MODEL
from app.integrations.mistral.ocr_provider import map_mistral_ocr_to_inbody


def test_locked_mistral_model() -> None:
    assert MISTRAL_OCR_MODEL == "mistral-ocr-4-1"


def test_native_pdf_text_maps_to_provider_neutral_measurements() -> None:
    result = map_mistral_ocr_to_inbody(
        {
            "pages": [
                {
                    "markdown": """
                    Height: 178 cm
                    Weight: 82.5 kg
                    Skeletal Muscle Mass: 38.1 kg
                    Body Fat Mass: 14.2 kg
                    PBF: 17.2 %
                    BMI: 26.0
                    """
                }
            ]
        }
    )

    values = {item.key: item.value for item in result.measurements}

    assert values[InBodyMetricKey.WEIGHT] == 82.5
    assert values[InBodyMetricKey.SKELETAL_MUSCLE_MASS] == 38.1
    assert values[InBodyMetricKey.BODY_FAT_PERCENTAGE] == 17.2


def test_scanned_pdf_missing_fields_remain_null() -> None:
    result = map_mistral_ocr_to_inbody({"pages": [{"text": "Weight: 77 kg"}]})
    values = {item.key: item.value for item in result.measurements}

    assert values[InBodyMetricKey.WEIGHT] == 77
    assert values[InBodyMetricKey.HEIGHT] is None


def test_markdown_table_separators_do_not_hide_measurements() -> None:
    result = map_mistral_ocr_to_inbody(
        {
            "pages": [
                {
                    "markdown": """
                    | ID | **Height** | Age | Gender |
                    | --- | --- | --- | --- |
                    | redacted | **139.3 cm** | 12 | unspecified |

                    | Body Composition Analysis | Abbreviation | Unit | Value |
                    | --- | --- | --- | --- |
                    | Body weight | **Weight** | (kg) | **42.7 (28.0 ~ 45.0)** |
                    | Obesity Analysis | **BMI** | (kg/m²) | **22.0** |
                    """
                }
            ]
        }
    )
    values = {item.key: item.value for item in result.measurements}

    assert values[InBodyMetricKey.HEIGHT] == 139.3
    assert values[InBodyMetricKey.WEIGHT] == 42.7
    assert values[InBodyMetricKey.BMI] == 22


def test_provider_key_value_layout_maps_to_measurements() -> None:
    result = map_mistral_ocr_to_inbody(
        {
            "pages": [
                {
                    "markdown": """
                    height_cm: 181.2
                    weight_kg: 88.4
                    skeletal_muscle_mass_kg: 39.1
                    body_fat_mass_kg: 17.3
                    percent_body_fat: 19.6
                    bmi_kg_m2: 27.0
                    total_body_water_l: 51.2
                    inbody_score: 84
                    """
                }
            ]
        }
    )
    values = {item.key: item.value for item in result.measurements}

    assert values[InBodyMetricKey.HEIGHT] == 181.2
    assert values[InBodyMetricKey.SKELETAL_MUSCLE_MASS] == 39.1
    assert values[InBodyMetricKey.BODY_FAT_PERCENTAGE] == 19.6
    assert values[InBodyMetricKey.TOTAL_BODY_WATER] == 51.2
    assert values[InBodyMetricKey.INBODY_SCORE] == 84


def test_history_table_uses_latest_value_instead_of_chart_scale() -> None:
    result = map_mistral_ocr_to_inbody(
        {
            "pages": [
                {
                    "markdown": """
                    | PBF Protein Body Fat | (%) | 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 |
                    | PBF Protein Body Fat | (%) | 18 | 18.4 | 19 | 19.2 | 20 | 20.1 | 20.3 | 21.7 |
                    """
                }
            ]
        }
    )
    values = {item.key: item.value for item in result.measurements}

    assert values[InBodyMetricKey.BODY_FAT_PERCENTAGE] == 21.7


def test_chart_scale_is_not_misread_and_missing_bmi_is_derived() -> None:
    result = map_mistral_ocr_to_inbody(
        {
            "pages": [
                {
                    "markdown": """
                    | Height | (cm) | 180 |
                    | Weight | (kg) | 81 |
                    | BMI | (kg/m2) | 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 |
                    """
                }
            ]
        }
    )
    measurements = {item.key: item for item in result.measurements}

    assert measurements[InBodyMetricKey.BMI].value == 25
    assert measurements[InBodyMetricKey.BMI].metadata.flags == ["derived"]
