from io import BytesIO

import pytest
from PIL import Image
from pypdf import PdfReader, PdfWriter

from app.domains.inbody.schemas import InBodyMeasurement, InBodyMetricKey, InBodyResult
from app.domains.inbody.validation import (
    MAX_IMAGE_BYTES,
    MAX_PDF_PAGES,
    assemble_image_pages_pdf,
    is_supported_upload,
    normalize_upload_filename,
    validate_measurement,
)


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
    one_page = pdf_with_pages(1)
    assert is_supported_upload("application/pdf", len(one_page), one_page)


def test_upload_limits_and_pdf_page_ceiling_are_enforced() -> None:
    assert not is_supported_upload("image/jpeg", MAX_IMAGE_BYTES + 1, b"\xff\xd8\xff")
    oversized_pdf = pdf_with_pages(MAX_PDF_PAGES + 1)
    assert not is_supported_upload("application/pdf", len(oversized_pdf), oversized_pdf)


def test_pdf_parser_accepts_real_multipage_and_rejects_malformed_content() -> None:
    multipage = pdf_with_pages(3)
    assert is_supported_upload("application/pdf", len(multipage), multipage)
    assert not is_supported_upload("application/pdf", 20, b"%PDF-1.7\ntruncated")


def test_pdf_page_limit_ignores_deceptive_page_markers() -> None:
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    stream = BytesIO()
    writer.write(stream)
    content = stream.getvalue() + b"\n" + b"% /Type /Page\n" * (MAX_PDF_PAGES + 2)

    assert content.count(b"/Type /Page") > MAX_PDF_PAGES
    assert is_supported_upload("application/pdf", len(content), content)


def test_upload_filename_is_reduced_to_a_safe_display_name() -> None:
    assert normalize_upload_filename("../../private/report.pdf") == "report.pdf"
    assert normalize_upload_filename("..\\private\\scan.png") == "scan.png"
    assert normalize_upload_filename("bad\r\nname.pdf") == "inbody-report"


def test_report_images_are_assembled_into_one_valid_multipage_pdf() -> None:
    pages = [("image/jpeg", jpeg_page(color)) for color in ("white", "gray", "black")]

    content = assemble_image_pages_pdf(pages)

    assert is_supported_upload("application/pdf", len(content), content)
    assert len(PdfReader(BytesIO(content)).pages) == 3


def test_report_image_assembly_rejects_non_image_parts() -> None:
    with pytest.raises(ValueError, match="report images"):
        assemble_image_pages_pdf([("application/pdf", pdf_with_pages(1))])


def pdf_with_pages(page_count: int) -> bytes:
    writer = PdfWriter()
    for _ in range(page_count):
        writer.add_blank_page(width=100, height=100)
    stream = BytesIO()
    writer.write(stream)
    return stream.getvalue()


def jpeg_page(color: str) -> bytes:
    stream = BytesIO()
    Image.new("RGB", (120, 180), color).save(stream, "JPEG")
    return stream.getvalue()
