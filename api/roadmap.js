// File: api/roadmap.js

import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

export default async function handler(req, res) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
    });

    const projects = {};

    response.results.forEach((page) => {
      const props = page.properties;
      const project = props["Project"].title[0]?.plain_text || "Unknown";
      const feature = props["Feature"].rich_text[0]?.plain_text || "";
      const status = props["Status"].select?.name || "Planned";

      if (!projects[project]) projects[project] = [];
      projects[project].push({ feature, status });
    });

    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching Notion data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
