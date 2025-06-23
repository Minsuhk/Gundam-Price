"use client";

import React, { useState, useEffect } from "react";

interface Result {
  site:    string;
  name:    string;
  price:   string;
  link:    string;
  picture: string;
}

const GRADE_OPTIONS = ["HG", "MG", "RG", "NG", "SD", "PG"];

export default function HomePage() {
  const [grade, setGrade]     = useState(GRADE_OPTIONS[0]);
  const [model, setModel]     = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  // for toggling hourglass emoji
  const [emoji, setEmoji] = useState<"⌛" | "⏳">("⌛");
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setEmoji((e) => (e === "⌛" ? "⏳" : "⌛"));
    }, 500);
    return () => clearInterval(id);
  }, [loading]);

  async function handleSearch() {
    setLoading(true);
    setEmoji("⌛");
    let data: Result[] = [];

    try {
      const res = await fetch(
        `/api/scrape?grade=${encodeURIComponent(grade)}&model=${encodeURIComponent(model)}`
      );
      if (res.ok) {
        data = await res.json();
      } else {
        console.error("Non-OK response:", res.status);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }

    setResults(data);
    setLoading(false);
  }

  return (
    <>
      {/* full‐screen blended background */}
      <div
        className="
          fixed inset-0
          bg-[url('/Char.png')]
          bg-cover bg-center
          bg-white/80
          bg-blend-overlay
        "
      />

      <main className="relative p-8 max-w-xl mx-auto min-h-screen">
        <h1 className="text-4xl font-bold mb-4 text-center">
          Char&apos;s Choice
        </h1>

        {/* Search controls */}
        <div className="flex w-full justify-center gap-1 mb-6">
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="bg-white border rounded px-3 py-2"
          >
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <input
            className="bg-white flex-1 border rounded px-3 py-2"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. Tallgeese EW"
          />

          <button
            onClick={handleSearch}
            disabled={!model || loading}
            className="bg-blue-500 text-white px-3 py-2 rounded disabled:opacity-50"
          >
            {loading ? emoji : "Search"}
          </button>
        </div>

        {/* Results */}
        <ul className="space-y-6">
          {results.map((r, i) => (
            <li
              key={`${r.link}-${i}`}
              className="bg-white flex border rounded overflow-hidden"
            >
              <img
                src={r.picture || "/Cat_01.png"}
                alt={r.name}
                className="w-32 h-32 object-cover flex-shrink-0"
              />
              <div className="p-4 flex-1">
                <a
                  href={r.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-lg font-semibold hover:underline"
                >
                  {r.name}
                </a>
                <div className="text-sm text-gray-500 mb-2">{r.site}</div>
                <div className="text-base">Price: {r.price}</div>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
