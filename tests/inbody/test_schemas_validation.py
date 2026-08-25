from app.domains.inbody.schemas import InBodyMeasurement, InBodyMetricKey, InBodyResult
from app.domains.inbody.validation import is_supported_upload, validate_measurement


def test_schema_preserves_missing_measurements_as_null() -> None:
    result = InBodyResult(
        measurements=[
            InBodyMeasurement(key=InBodyMetricKey.WEIGHT, value=None, unit=None),
        ]
    )

    assert result.measurements[0].value is None


def test_low_confidence_and_bad_units_are_flagged_without_replacing_value() -> None:
    measurement = InBodyMeasurement(
        key=InBodyMetricKey.WEIGHT,
        value=81.2,
        unit="stone",
        metadata={"confidence": 0.42},
    )

    validated = validate_measurement(measurement)

    assert validated.value == 81.2
    assert "low_confidence" in validated.metadata.flags
    assert "unknown_unit" in validated.metadata.flags


def test_corrupt_and_unsupported_files_are_rejected() -> None:
    assert not is_supported_upload("application/pdf", 10, b"not a pdf")
    assert not is_supported_upload("text/plain", 5, b"hello")


def test_valid_image_and_pdf_signatures_are_accepted() -> None:
    assert is_supported_upload("image/jpeg", 4, b"\xff\xd8\xff\xe0")
    assert is_supported_upload("application/pdf", 8, b"%PDF-1.7")
