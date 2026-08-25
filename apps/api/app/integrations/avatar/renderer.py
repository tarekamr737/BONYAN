from __future__ import annotations

import struct
import zlib
from collections.abc import Iterable

from app.domains.avatar.contracts import BodyMetricsSnapshot

Color = tuple[int, int, int, int]
Point = tuple[float, float]

CANVAS_WIDTH = 480
CANVAS_HEIGHT = 720


def render_body_avatar_png(metrics: BodyMetricsSnapshot) -> bytes:
    """Render an anonymous, fully clothed body figure from confirmed measurements."""
    canvas = _Canvas(CANVAS_WIDTH, CANVAS_HEIGHT)
    shape = _derive_shape(metrics)
    center_x = CANVAS_WIDTH / 2

    canvas.vertical_gradient((12, 13, 14, 255), (26, 23, 20, 255))
    canvas.ellipse((54, 52, 426, 684), (65, 50, 38, 70))
    canvas.ellipse((124, 655, 356, 691), (5, 5, 5, 130))

    top = shape["top"]
    shoulder_y = top + 108
    waist_y = shoulder_y + shape["torso_length"]
    hip_y = waist_y + 55
    knee_y = hip_y + shape["leg_length"] * 0.52
    ankle_y = hip_y + shape["leg_length"]

    bronze = (171, 126, 82, 255)
    bronze_light = (205, 162, 112, 255)
    graphite = (39, 40, 41, 255)
    graphite_light = (58, 59, 60, 255)
    pants = (25, 27, 29, 255)
    shoe = (16, 17, 18, 255)

    head_radius = 38
    canvas.ellipse(
        (
            center_x - head_radius,
            top,
            center_x + head_radius,
            top + head_radius * 2,
        ),
        bronze_light,
    )
    canvas.rounded_rect(
        (center_x - 20, top + 68, center_x + 20, shoulder_y + 12),
        10,
        bronze,
    )

    shoulder_half = shape["shoulder_width"] / 2
    waist_half = shape["waist_width"] / 2
    hip_half = shape["hip_width"] / 2

    left_shoulder = center_x - shoulder_half
    right_shoulder = center_x + shoulder_half
    left_hand = center_x - shoulder_half - 26
    right_hand = center_x + shoulder_half + 26
    hand_y = waist_y + 70

    canvas.line((left_shoulder + 12, shoulder_y + 22), (left_hand, hand_y), 42, bronze)
    canvas.line((right_shoulder - 12, shoulder_y + 22), (right_hand, hand_y), 42, bronze)
    canvas.line((left_shoulder + 12, shoulder_y + 22), (left_hand, hand_y - 14), 34, graphite)
    canvas.line((right_shoulder - 12, shoulder_y + 22), (right_hand, hand_y - 14), 34, graphite)
    canvas.ellipse((left_hand - 14, hand_y - 5, left_hand + 14, hand_y + 25), bronze_light)
    canvas.ellipse((right_hand - 14, hand_y - 5, right_hand + 14, hand_y + 25), bronze_light)

    torso_outer = [
        (left_shoulder - 5, shoulder_y),
        (right_shoulder + 5, shoulder_y),
        (center_x + waist_half + 6, waist_y),
        (center_x + hip_half + 5, hip_y),
        (center_x - hip_half - 5, hip_y),
        (center_x - waist_half - 6, waist_y),
    ]
    torso_inner = [
        (left_shoulder + 2, shoulder_y + 6),
        (right_shoulder - 2, shoulder_y + 6),
        (center_x + waist_half, waist_y),
        (center_x + hip_half, hip_y),
        (center_x - hip_half, hip_y),
        (center_x - waist_half, waist_y),
    ]
    canvas.polygon(torso_outer, bronze)
    canvas.polygon(torso_inner, graphite)
    canvas.line((center_x, shoulder_y + 28), (center_x, waist_y - 8), 3, graphite_light)
    canvas.line(
        (center_x - waist_half + 10, waist_y - 2),
        (center_x + waist_half - 10, waist_y - 2),
        4,
        bronze,
    )

    gap = 8
    thigh_half = shape["thigh_width"] / 2
    left_leg_x = center_x - gap - thigh_half
    right_leg_x = center_x + gap + thigh_half
    calf_half = max(22, thigh_half * 0.68)

    left_leg = [
        (center_x - gap, hip_y - 3),
        (center_x - hip_half, hip_y),
        (left_leg_x - calf_half, ankle_y),
        (left_leg_x + calf_half, ankle_y),
        (center_x - gap + 2, hip_y + 18),
    ]
    right_leg = [
        (center_x + gap, hip_y - 3),
        (center_x + hip_half, hip_y),
        (right_leg_x + calf_half, ankle_y),
        (right_leg_x - calf_half, ankle_y),
        (center_x + gap - 2, hip_y + 18),
    ]
    canvas.polygon(left_leg, pants)
    canvas.polygon(right_leg, pants)
    canvas.line((left_leg_x, hip_y + 24), (left_leg_x, knee_y), 3, graphite_light)
    canvas.line((right_leg_x, hip_y + 24), (right_leg_x, knee_y), 3, graphite_light)
    canvas.rounded_rect(
        (left_leg_x - calf_half - 8, ankle_y - 3, left_leg_x + 34, ankle_y + 25),
        9,
        shoe,
    )
    canvas.rounded_rect(
        (right_leg_x - 34, ankle_y - 3, right_leg_x + calf_half + 8, ankle_y + 25),
        9,
        shoe,
    )

    return canvas.to_png()


def _derive_shape(metrics: BodyMetricsSnapshot) -> dict[str, float]:
    height_m = metrics.height_cm / 100
    bmi = metrics.weight_kg / (height_m * height_m)
    estimated_fat = metrics.body_fat_percentage
    if estimated_fat is None:
        estimated_fat = 12 + (bmi - 18.5) * 1.55
    fat = _normalize(estimated_fat, 8, 42)

    if metrics.skeletal_muscle_mass_kg is not None:
        muscle_ratio = metrics.skeletal_muscle_mass_kg / metrics.weight_kg
        muscle = _normalize(muscle_ratio, 0.24, 0.52)
    else:
        lean_ratio = 1 - estimated_fat / 100
        muscle = _normalize(lean_ratio, 0.58, 0.9) * 0.72

    mass = _normalize(bmi, 17, 38)
    stature = _normalize(metrics.height_cm, 145, 205)

    return {
        "top": 52 - stature * 16,
        "shoulder_width": 178 + muscle * 70 + mass * 25,
        "waist_width": 92 + fat * 105 + mass * 26,
        "hip_width": 112 + fat * 80 + mass * 18,
        "torso_length": 175 + stature * 26,
        "leg_length": 280 + stature * 42,
        "thigh_width": 56 + mass * 30 + muscle * 20,
    }


def _normalize(value: float, minimum: float, maximum: float) -> float:
    return max(0.0, min(1.0, (value - minimum) / (maximum - minimum)))


class _Canvas:
    def __init__(self, width: int, height: int) -> None:
        self.width = width
        self.height = height
        self.pixels = bytearray(width * height * 4)

    def vertical_gradient(self, top: Color, bottom: Color) -> None:
        for y in range(self.height):
            factor = y / max(1, self.height - 1)
            color = tuple(
                round(top[index] + (bottom[index] - top[index]) * factor)
                for index in range(4)
            )
            for x in range(self.width):
                self._set(x, y, color)  # type: ignore[arg-type]

    def ellipse(self, bounds: tuple[float, float, float, float], color: Color) -> None:
        left, top, right, bottom = bounds
        radius_x = max(0.5, (right - left) / 2)
        radius_y = max(0.5, (bottom - top) / 2)
        center_x = left + radius_x
        center_y = top + radius_y
        for y in range(max(0, int(top)), min(self.height, int(bottom) + 1)):
            for x in range(max(0, int(left)), min(self.width, int(right) + 1)):
                distance = ((x - center_x) / radius_x) ** 2 + ((y - center_y) / radius_y) ** 2
                if distance <= 1:
                    self._blend(x, y, color)

    def rounded_rect(
        self,
        bounds: tuple[float, float, float, float],
        radius: float,
        color: Color,
    ) -> None:
        left, top, right, bottom = bounds
        self.rect((left + radius, top, right - radius, bottom), color)
        self.rect((left, top + radius, right, bottom - radius), color)
        self.ellipse((left, top, left + radius * 2, top + radius * 2), color)
        self.ellipse((right - radius * 2, top, right, top + radius * 2), color)
        self.ellipse((left, bottom - radius * 2, left + radius * 2, bottom), color)
        self.ellipse((right - radius * 2, bottom - radius * 2, right, bottom), color)

    def rect(self, bounds: tuple[float, float, float, float], color: Color) -> None:
        left, top, right, bottom = bounds
        for y in range(max(0, int(top)), min(self.height, int(bottom) + 1)):
            for x in range(max(0, int(left)), min(self.width, int(right) + 1)):
                self._blend(x, y, color)

    def polygon(self, points: Iterable[Point], color: Color) -> None:
        vertices = list(points)
        if len(vertices) < 3:
            return
        minimum_y = max(0, int(min(point[1] for point in vertices)))
        maximum_y = min(self.height - 1, int(max(point[1] for point in vertices)))
        for y in range(minimum_y, maximum_y + 1):
            intersections: list[float] = []
            for index, first in enumerate(vertices):
                second = vertices[(index + 1) % len(vertices)]
                if (first[1] <= y < second[1]) or (second[1] <= y < first[1]):
                    factor = (y - first[1]) / (second[1] - first[1])
                    intersections.append(first[0] + factor * (second[0] - first[0]))
            intersections.sort()
            for start, end in zip(intersections[::2], intersections[1::2], strict=False):
                for x in range(max(0, int(start)), min(self.width, int(end) + 1)):
                    self._blend(x, y, color)

    def line(self, start: Point, end: Point, width: float, color: Color) -> None:
        delta_x = end[0] - start[0]
        delta_y = end[1] - start[1]
        steps = max(1, int(max(abs(delta_x), abs(delta_y))))
        radius = width / 2
        for step in range(steps + 1):
            factor = step / steps
            x = start[0] + delta_x * factor
            y = start[1] + delta_y * factor
            self.ellipse((x - radius, y - radius, x + radius, y + radius), color)

    def to_png(self) -> bytes:
        raw = bytearray()
        stride = self.width * 4
        for y in range(self.height):
            raw.append(0)
            start = y * stride
            raw.extend(self.pixels[start : start + stride])
        signature = b"\x89PNG\r\n\x1a\n"
        header = struct.pack(">IIBBBBB", self.width, self.height, 8, 6, 0, 0, 0)
        return (
            signature
            + _png_chunk(b"IHDR", header)
            + _png_chunk(b"IDAT", zlib.compress(raw, 9))
            + _png_chunk(b"IEND", b"")
        )

    def _blend(self, x: int, y: int, color: Color) -> None:
        if color[3] == 255:
            self._set(x, y, color)
            return
        index = (y * self.width + x) * 4
        alpha = color[3] / 255
        inverse = 1 - alpha
        blended = (
            round(color[0] * alpha + self.pixels[index] * inverse),
            round(color[1] * alpha + self.pixels[index + 1] * inverse),
            round(color[2] * alpha + self.pixels[index + 2] * inverse),
            255,
        )
        self._set(x, y, blended)

    def _set(self, x: int, y: int, color: Color) -> None:
        index = (y * self.width + x) * 4
        self.pixels[index : index + 4] = bytes(color)


def _png_chunk(name: bytes, data: bytes) -> bytes:
    payload = name + data
    return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload))
