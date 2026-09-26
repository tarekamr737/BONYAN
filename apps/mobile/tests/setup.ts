import { vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
