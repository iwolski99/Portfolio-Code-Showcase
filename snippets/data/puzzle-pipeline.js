#!/usr/bin/env node
"use strict";

const fs = require("fs");

function streamCSV(filePath, onRow) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { encoding: "utf8" });
    let buffer = "";
    let rowCount = 0;
    let isFirstRow = true;
    let stopped = false;
    let settled = false;

    function settle(fn) {
      if (settled) return;
      settled = true;
      fn();
    }

    function parseCSVLine(line) {
      const fields = [];
      let field = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === "," && !inQuotes) {
          fields.push(field);
          field = "";
        } else {
          field += ch;
        }
      }
      fields.push(field);
      return fields;
    }

    stream.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        if (isFirstRow) {
          isFirstRow = false;
          continue;
        }
        const keepGoing = onRow(parseCSVLine(line));
        rowCount += 1;
        if (keepGoing === false) {
          stopped = true;
          stream.destroy();
          break;
        }
      }
    });

    stream.on("end", () => settle(() => resolve(rowCount)));
    stream.on("close", () => {
      if (stopped) settle(() => resolve(rowCount));
    });
    stream.on("error", (err) => {
      if (stopped) return settle(() => resolve(rowCount));
      settle(() => reject(err));
    });
  });
}

async function extractPuzzles({ inputPath, limit, minRating, maxRating, themeFilter, sample }) {
  const selected = [];
  let eligibleSeen = 0;

  await streamCSV(inputPath, (fields) => {
    const id = fields[0]?.trim();
    const fen = fields[1]?.trim();
    const moves = fields[2]?.trim();
    const rating = Number.parseInt(fields[3], 10);
    const themes = String(fields[7] || "")
      .trim()
      .split(/\s+/)
      .map((theme) => theme.toLowerCase())
      .filter(Boolean);

    if (!id || !fen || !moves) return true;
    if (!Number.isFinite(rating)) return true;
    if (rating < minRating || rating > maxRating) return true;
    if (themeFilter && !themes.some((theme) => themeFilter.has(theme))) return true;

    const puzzle = { id, fen, moves, rating, themes };

    if (!sample) {
      if (selected.length < limit) selected.push(puzzle);
      return selected.length < limit;
    }

    eligibleSeen += 1;
    if (selected.length < limit) {
      selected.push(puzzle);
      return true;
    }

    const slot = Math.floor(Math.random() * eligibleSeen);
    if (slot < limit) selected[slot] = puzzle;
    return true;
  });

  return selected;
}

module.exports = {
  streamCSV,
  extractPuzzles,
};
