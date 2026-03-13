import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultTable } from "./ResultTable";
import type { Entity } from "../api/types";

describe("ResultTable", () => {
  it("renders table headers", () => {
    render(<ResultTable entities={[]} />);

    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
    expect(screen.getByText("Confidence")).toBeInTheDocument();
    expect(screen.getByText("Normalized Value")).toBeInTheDocument();
  });

  it("renders entity rows", () => {
    const entities: Entity[] = [
      {
        type: "total_amount",
        mentionText: "1,000",
        confidence: 0.95,
        normalizedValue: { text: "1000" },
      },
      { type: "date", mentionText: "2024-01-01", confidence: 0.88 },
    ];

    render(<ResultTable entities={entities} />);

    expect(screen.getByText("total_amount")).toBeInTheDocument();
    expect(screen.getByText("1,000")).toBeInTheDocument();
    expect(screen.getByText("95.0%")).toBeInTheDocument();
    expect(screen.getByText("1000")).toBeInTheDocument();

    expect(screen.getByText("date")).toBeInTheDocument();
    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("88.0%")).toBeInTheDocument();
  });

  it("renders empty state when no entities", () => {
    render(<ResultTable entities={[]} />);

    expect(screen.getByText("No entities found")).toBeInTheDocument();
  });
});
