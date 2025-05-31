import { Client } from "@notionhq/client";

// Enable CORS
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  return await fn(req, res);
};

// Initialize Notion client with API key from environment variables
const notion = new Client({ 
  auth: process.env.NOTION_API_KEY,
});

const logError = (error, context = {}) => {
  console.error('=== ERROR DETAILS ===');
  console.error('Error:', error);
  console.error('Error Type:', error.constructor.name);
  console.error('Error Message:', error.message);
  console.error('Context:', JSON.stringify(context, null, 2));
  
  if (error.response) {
    console.error('Error Response Status:', error.response.status);
    console.error('Error Response Data:', error.response.data);
  }
  console.error('===================');
};

async function roadmapHandler(req, res) {
  try {
    // Check if NOTION_API_KEY is set
    if (!process.env.NOTION_API_KEY) {
      throw new Error("NOTION_API_KEY environment variable is not set");
    }

    // Check if NOTION_DATABASE_ID is set
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!databaseId) {
      throw new Error("NOTION_DATABASE_ID environment variable is not set");
    }

    console.log('Attempting to query Notion database:', databaseId);
    
    // Query the Notion database
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
    });

    console.log('Successfully queried Notion database');
    
    // Send back the query results as JSON
    return res.status(200).json(response);
    
  } catch (error) {
    // Log detailed error information
    logError(error, {
      timestamp: new Date().toISOString(),
      environment: {
        NOTION_API_KEY: process.env.NOTION_API_KEY ? '*** (exists)' : 'Not set',
        NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID || 'Not set',
      },
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
      },
    });

    // Send error response
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
      type: error.constructor.name,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

export default allowCors(roadmapHandler);
