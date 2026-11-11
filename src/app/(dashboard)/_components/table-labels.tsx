"use client";

import { useEffect } from "react";

/**
 * Marks every wide table (4+ columns) with data-rt and copies each column's
 * header text onto its cells as data-label. globals.css then shows those
 * tables as stacked cards on phones. Desktop and print are untouched.
 * Add data-keep-table to a <table> to opt out.
 */
function label(root: ParentNode) {
  root.querySelectorAll("table:not([data-keep-table])").forEach((table) => {
    const heads = [...table.querySelectorAll("thead tr:last-child th")];
    const names: string[] = [];
    heads.forEach((th) => {
      const span = Number(th.getAttribute("colspan") ?? 1) || 1;
      const text = (th.textContent ?? "").trim();
      for (let i = 0; i < span; i++) names.push(text);
    });
    if (names.length < 4) return;
    if (!table.hasAttribute("data-rt")) table.setAttribute("data-rt", "");
    table.querySelectorAll("tbody tr, tfoot tr").forEach((tr) => {
      let col = 0;
      [...tr.children].forEach((cell) => {
        const name = names[col] ?? "";
        if (cell.getAttribute("data-label") !== name) cell.setAttribute("data-label", name);
        col += Number(cell.getAttribute("colspan") ?? 1) || 1;
      });
    });
  });
}

export function TableLabels() {
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => label(main));
    };
    run();
    const observer = new MutationObserver(run);
    observer.observe(main, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
