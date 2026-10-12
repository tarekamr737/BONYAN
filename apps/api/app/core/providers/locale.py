import re


def response_matches_locale(text: str, locale: str) -> bool:
    """Conservative script guard; terminology may retain necessary fitness names."""
    letters = re.findall(r"[^\W\d_]", text, re.UNICODE)
    if not letters:
        return False
    arabic = sum("\u0600" <= letter <= "\u06ff" for letter in letters)
    return arabic / len(letters) >= 0.25 if locale.startswith("ar") else arabic == 0


def response_locale_instruction(locale: str) -> str:
    return (
        "Respond only in natural Egyptian Arabic. Avoid formal MSA and English sentences. "
        if locale.startswith("ar")
        else "Respond only in English. Do not include Arabic text. "
    )
