import { Client } from "@notionhq/client";

// Initialize Notion client with API key from environment variables
const notion = new Client({ auth: process.env.NOTION_API_KEY });

export default async function handler(req, res) {
  try {
    // Check if NOTION_DATABASE_ID env var is set
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!databaseId) {
      throw new Error("Environment variable NOTION_DATABASE_ID is not set.");
    }

    // Query the Notion database
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
    });

    // Send back the query results as JSON
    res.status(200).json(response);
  } catch (error) {
    // Log the error to the server console for debugging
    console.error("Error fetching data from Notion API:", error);

    // Respond with status 500 and error message JSON
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
}
