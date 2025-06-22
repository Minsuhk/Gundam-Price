"use client";
import { useState } from "react";

interface Result {
  site: string;
  name: string;
  price: string;
  link: string;
  picture: string;
}

const GRADE_OPTIONS = ["MG", "HG", "NG", "SD", "MGSD", "PG", "MGEX"];

export default function HomePage() {
  const [grade, setGrade]     = useState(GRADE_OPTIONS[0]);
  const [model, setModel]     = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    setLoading(true);
    let data: Result[] = [];

    try {
      const res = await fetch(
        `/api/scrape?grade=${encodeURIComponent(grade)}&model=${encodeURIComponent(model)}`
      );
      if (!res.ok) {
        console.error("Non-OK response from /api/scrape:", res.status);
      } else {
        try {
          data = await res.json();
        } catch (parseErr) {
          console.error("Invalid JSON from /api/scrape:", parseErr);
        }
      }
    } catch (networkErr) {
      console.error("Network error fetching /api/scrape:", networkErr);
    }

    setResults(data);
    setLoading(false);
  }



  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Char&apos;s Choice</h1>

      {/* Search controls */}
      <div className="flex gap-2 mb-6">
        {/* 1) Grade dropdown */}
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="border rounded px-3 py-2"
        >
          {GRADE_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        {/* 2) Model text input */}
        <input
          className="flex-1 border rounded px-3 py-2"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="e.g. Tallgeese EW"
        />

        {/* 3) Search button */}
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-4 rounded disabled:opacity-50"
          disabled={!model || loading}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {/* Results */}
      <ul className="space-y-6">
        {results.map((r, i) => (
          <li
            key={`${r.link}-${i}`}
            className="flex border rounded overflow-hidden"
          >
            <img
              src={r.picture || "/Cat_00.jpg"}
              alt={r.name}
              className="w-32 h-32 object-cover flex-shrink-0"
            />
            <div className="p-4 flex-1">
              <a
                href={r.link}
                target="_blank"
                rel="noopener"
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
  );
}
