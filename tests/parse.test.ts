import { describe, expect, it } from "vitest";
import { extractCitation, parseReply, parseSseEvents, splitRubric } from "@/lib/parse";

describe("parseSseEvents", () => {
  it("parses complete events", () => {
    const buffer = 'data: {"text":"Hel"}\n\ndata: {"text":"lo"}\n\n';
    const { events, rest } = parseSseEvents(buffer);
    expect(events).toEqual([{ text: "Hel" }, { text: "lo" }]);
    expect(rest).toBe("");
  });

  it("keeps a partial trailing event as `rest`", () => {
    const { events, rest } = parseSseEvents('data: {"text":"a"}\n\ndata: {"tex');
    expect(events).toEqual([{ text: "a" }]);
    expect(rest).toBe('data: {"tex');
  });

  it("completes an event that was split across two network chunks", () => {
    const first = parseSseEvents('data: {"text":"split');
    expect(first.events).toEqual([]);

    const second = parseSseEvents(first.rest + '"}\n\n');
    expect(second.events).toEqual([{ text: "split" }]);
  });

  it("ignores lines that are not data events", () => {
    const { events } = parseSseEvents(': keep-alive\n\ndata: {"done":true}\n\n');
    expect(events).toEqual([{ done: true }]);
  });

  it("passes error events through", () => {
    const { events } = parseSseEvents('data: {"error":"boom"}\n\n');
    expect(events).toEqual([{ error: "boom" }]);
  });
});

describe("splitRubric", () => {
  it("returns null until the first line is complete", () => {
    expect(splitRubric("RUBRIC: De Bello Hus")).toBeNull();
  });

  it("strips the RUBRIC: prefix and returns the rest as the body", () => {
    expect(splitRubric("RUBRIC: De Bello Hussitarum\n\nThe wars began.")).toEqual({
      rubric: "De Bello Hussitarum",
      body: "The wars began.",
    });
  });

  it("falls back to the whole first line if the prefix is missing", () => {
    expect(splitRubric("De Bello Hussitarum\nThe wars began.")).toEqual({
      rubric: "De Bello Hussitarum",
      body: "The wars began.",
    });
  });
});

describe("extractCitation", () => {
  it("removes a trailing † line and returns it as the citation", () => {
    const result = extractCitation("First paragraph.\n\n† Author, Title, c. 1420");
    expect(result).toEqual({ body: "First paragraph.", citation: "Author, Title, c. 1420" });
  });

  it("leaves the body alone when there is no citation line", () => {
    expect(extractCitation("Just prose.")).toEqual({ body: "Just prose.", citation: "" });
  });

  it("only treats the LAST line as the citation", () => {
    const body = "† not a citation\nMore prose.";
    expect(extractCitation(body)).toEqual({ body, citation: "" });
  });

  it("handles trailing whitespace after the citation", () => {
    expect(extractCitation("Prose.\n† Source, c. 1400\n\n")).toEqual({
      body: "Prose.",
      citation: "Source, c. 1400",
    });
  });
});

describe("parseReply", () => {
  it("parses a well-formed reply into rubric, body, and citation", () => {
    const raw =
      "RUBRIC: De Bello Hussitarum · Caput Primum\n\nJan Žižka led the Hussite armies.\n\nHe used war wagons.\n\n† Wikipedia, Jan Žižka, c. 2024";

    expect(parseReply(raw)).toEqual({
      rubric: "De Bello Hussitarum · Caput Primum",
      body: "Jan Žižka led the Hussite armies.\n\nHe used war wagons.",
      citation: "Wikipedia, Jan Žižka, c. 2024",
    });
  });

  it("returns an empty citation when the model forgets the † line", () => {
    const parsed = parseReply("RUBRIC: Heading\n\nSome prose.");
    expect(parsed.citation).toBe("");
    expect(parsed.body).toBe("Some prose.");
  });

  it("does not crash on a reply with no newline at all", () => {
    expect(parseReply("only one line")).toEqual({
      rubric: "",
      body: "only one line",
      citation: "",
    });
  });

  it("does not crash on an empty reply", () => {
    expect(parseReply("")).toEqual({ rubric: "", body: "", citation: "" });
  });
});
