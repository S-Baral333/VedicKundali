import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

// The flow's own logic is what is under test: the sky is a canvas jsdom cannot
// draw, and the language picker talks to Supabase.
vi.mock("@/components/LanguageSelector", () => ({ default: () => null }));

import DwaraFlow from "./DwaraFlow";
import type { OnboardingResult } from "@/lib/onboarding-profile";

const KATHMANDU = [
  { display_name: "Kathmandu, Bagamati Province, Nepal", lat: "27.7172", lon: "85.3240" },
];

/** Reduced motion on: beats swap instantly and the crossing skips the warp. */
function reduceMotion() {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

beforeEach(() => {
  reduceMotion();
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
  Element.prototype.scrollTo = vi.fn() as never;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => KATHMANDU }))
  );
});
afterEach(() => vi.unstubAllGlobals());

/** Click, then let the swap to the next beat settle — the flow ignores a second tap mid-swap. */
const click = async (name: string | RegExp, role = "button") => {
  fireEvent.click(screen.getByRole(role, { name }));
  await act(async () => {});
};

/** Walk from the welcome screen to the end of the Moment world. */
async function enterMoment() {
  await click("onboarding:dwara.begin");
  await click("onboarding:continueBtn");

  // The wheels start as unchosen defaults; each must be turned before the day counts.
  expect(screen.getByRole("button", { name: "onboarding:dwara.setDay" })).toBeDisabled();
  fireEvent.click(screen.getByRole("option", { name: "16" }));
  fireEvent.click(screen.getByRole("option", { name: "July" }));
  expect(screen.getByRole("button", { name: "onboarding:dwara.setDay" })).toBeDisabled();
  fireEvent.click(screen.getByRole("option", { name: "1996" }));
  await click("onboarding:dwara.setDay");

  fireEvent.change(screen.getByLabelText("Time of Birth"), { target: { value: "23:21" } });
  await click("onboarding:dwara.setHour");

  fireEvent.change(screen.getByLabelText("Birthplace"), { target: { value: "Kathmandu" } });
  fireEvent.keyDown(screen.getByLabelText("Birthplace"), { key: "Enter" });
  // A single hit is selected for you, so the place can be set straight away.
  await waitFor(() => expect(screen.getByRole("button", { name: "onboarding:dwara.setPlace" })).toBeEnabled());
  await click("onboarding:dwara.setPlace");
}

async function finishIntent() {
  fireEvent.click(screen.getByRole("button", { name: /Career/ }));
  await click("onboarding:continueBtn");
  fireEvent.click(screen.getByRole("radio", { name: /Gentle/ }));
  await click("onboarding:dwara.cast");
}

describe("DwaraFlow", () => {
  it("carries the whole journey into one save and ends on the arrival", async () => {
    const onSave = vi.fn<(r: OnboardingResult) => Promise<void>>().mockResolvedValue();
    const onDone = vi.fn();
    render(<DwaraFlow initialName="Ayush" languageChosen onSave={onSave} onDone={onDone} />);

    await enterMoment();
    await finishIntent();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      name: "Ayush",
      dateOfBirth: "1996-07-16",
      birthTime: "23:21",
      skipBirthTime: false,
      place: { label: "Kathmandu, Bagamati Province, Nepal", lat: 27.7172, lng: 85.324 },
      lifePriorities: ["career"],
      guidanceStyle: "gentle",
    });

    // "Your sky is ready" is only said once the save has resolved.
    await screen.findByRole("heading", { name: "onboarding:dwara.arrivalTitle" });
    await click("onboarding:dwara.reveal");
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("saves no birth details when the moment is skipped, and does not claim a ready sky", async () => {
    const onSave = vi.fn<(r: OnboardingResult) => Promise<void>>().mockResolvedValue();
    render(<DwaraFlow initialName="Ayush" languageChosen onSave={onSave} onDone={() => {}} />);

    await click("onboarding:dwara.begin");
    await click("onboarding:continueBtn");
    await click("onboarding:dwara.skipMoment");
    await finishIntent();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({ dateOfBirth: "", birthTime: "", birthPeriod: "", place: null });
    await screen.findByRole("heading", { name: "onboarding:dwara.arrivalTitleSkipped" });
  });

  it("holds on a failed save, offers a retry, and only arrives once it works", async () => {
    const onSave = vi
      .fn<(r: OnboardingResult) => Promise<void>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<DwaraFlow initialName="Ayush" languageChosen onSave={onSave} onDone={() => {}} />);

    await click("onboarding:dwara.begin");
    await click("onboarding:continueBtn");
    await click("onboarding:dwara.skipMoment");
    await finishIntent();

    await screen.findByRole("heading", { name: "onboarding:dwara.castFailedTitle" });
    expect(screen.queryByRole("heading", { name: /arrivalTitle/ })).toBeNull();

    await click("onboarding:dwara.retry");
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    await screen.findByRole("heading", { name: "onboarding:dwara.arrivalTitleSkipped" });
  });

  it("requires a named part of the day when the exact time is unknown", async () => {
    render(<DwaraFlow initialName="Ayush" languageChosen onSave={async () => {}} onDone={() => {}} />);

    await click("onboarding:dwara.begin");
    await click("onboarding:continueBtn");
    fireEvent.click(screen.getByRole("option", { name: "16" }));
    fireEvent.click(screen.getByRole("option", { name: "July" }));
    fireEvent.click(screen.getByRole("option", { name: "1996" }));
    await click("onboarding:dwara.setDay");

    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("button", { name: "onboarding:dwara.setHour" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /Morning/ }));
    expect(screen.getByRole("button", { name: "onboarding:dwara.setHour" })).toBeEnabled();
  });

  it("goes back without losing what was entered", async () => {
    render(<DwaraFlow initialName="Ayush" languageChosen onSave={async () => {}} onDone={() => {}} />);

    await click("onboarding:dwara.begin");
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Asha" } });
    await click("onboarding:continueBtn");
    await click("onboarding:dwara.back");
    expect(screen.getByLabelText("Your name")).toHaveValue("Asha");
  });
});
