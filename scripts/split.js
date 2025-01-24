#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');

/**
 * This script:
 * 1. Reads the top-level CHANGELOG.md
 * 2. Splits it by headings of the form: "## x.x.x (Month DD, YYYY)"
 * 3. Generates separate MD files in ./temp-changelogs
 * 4. Each MD file has the required front matter for rdme
 */

const CHANGELOG_PATH = path.join(__dirname, '..', 'CHANGELOG.md');
const OUTPUT_DIR = path.join(__dirname, '..', 'temp-changelogs');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const fileContents = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
// Split on lines that start with `## `, capturing that line separately
// so we can keep it in the final output
// (We use a regex "split" trick that keeps the delimiter line)
const entries = fileContents.split(/(?=^##\s)/m).filter(Boolean);

entries.forEach((entry) => {
  // The first line of each chunk should match something like:
  // "## 6.6.1 (Dec 20, 2024)"
  // We can parse out the version (6.6.1), and the date in parentheses
  const lines = entry.split('\n');
  const headingLine = lines[0].trim(); // e.g. "## 6.6.1 (Dec 20, 2024)"

  // Strip out "## " at the beginning
  const headingText = headingLine.replace(/^##\s*/, ''); // "6.6.1 (Dec 20, 2024)"

  // We'll try to parse the version and date in parentheses.
  // Typical format: "6.6.1 (Dec 20, 2024)"
  // We'll assume parentheses always encloses the date
  const versionMatch = headingText.match(/^([^()]+)\s*\(([^)]+)\)/);
  if (!versionMatch) {
    // If we can't parse, skip or handle it differently
    console.error(`Skipping entry, could not parse heading: ${headingLine}`);
    return;
  }

  const version = versionMatch[1].trim(); // "6.6.1"
  const dateStr = versionMatch[2].trim(); // "Dec 20, 2024"

  // Attempt to parse date
  let dateObj;
  try {
    dateObj = new Date(dateStr);
  } catch (err) {
    // Fallback if invalid date
    dateObj = new Date();
  }

  const createdAt = dateObj.toString(); // e.g. "Wed Dec 20 2024 00:00:00 GMT+0000 (Coordinated Universal Time)"

  // Generate a slug from the entire heading text, e.g. "6.6.1 (Dec 20, 2024)"
  const theSlug = slugify(headingText, {
    lower: true,
  });

  // The rest of the chunk is the lines except the first heading line
  const bodyLines = lines.slice(1).join('\n').trim();

  // Build the front matter
  const frontMatter = `---\ntitle: "${version}"\ncreatedAt: "${createdAt}"\nslug: "${theSlug}"\nhidden: false\n---`;

  // Combine front matter + the original chunk content
  const finalContent = `${frontMatter}\n\n${bodyLines}\n`;

  // Write this to a file named after the slug
  const outputFile = path.join(OUTPUT_DIR, `${theSlug}.md`);
  fs.writeFileSync(outputFile, finalContent, 'utf-8');

  console.log(`Created file: ${outputFile}`);
});

console.log('Done splitting CHANGELOG.md into separate MD files.');