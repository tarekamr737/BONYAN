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
