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
    
    console.log('Querying Notion database...');
    
    try {
      // First, try to get the database schema
      console.log('Fetching database schema...');
      const database = await notion.databases.retrieve({
        database_id: databaseId,
      });
      
      const propertyNames = Object.keys(database.properties || {});
      console.log('Available properties in database:', propertyNames);
      
      // Now query the database with a simple query
      const response = await notion.databases.query({
        database_id: databaseId,
        page_size: 100,
      });

      console.log(`Successfully queried Notion database. Found ${response.results.length} items.`);
      
      // Process the results to extract the data we need
      const processedResults = response.results.map(item => {
        const properties = item.properties || {};
        
        // Helper function to get rich text content
        const getRichText = (prop) => {
          if (!prop || !prop.rich_text) return '';
          return prop.rich_text.map(rt => rt.plain_text).join(' ');
        };
        
        // Helper to get title (common in Notion databases)
        const getTitle = (prop) => {
          if (!prop) return 'Untitled';
          if (prop.title) return prop.title.map(t => t.plain_text).join(' ');
          if (prop.rich_text) return getRichText(prop);
          return 'Untitled';
        };
        
        // Extract common properties
        const titleProp = Object.values(properties).find(p => p.type === 'title') || {};
        
        return {
          id: item.id,
          title: getTitle(titleProp),
          // Include all properties for debugging
          properties: properties,
          // Include the raw API response for debugging
          _raw: item
        };
      });
      
      return res.status(200).json({
        success: true,
        results: processedResults,
        propertyNames: propertyNames,
        debug: {
          firstItem: processedResults.length > 0 ? processedResults[0] : null,
          rawFirstItem: response.results.length > 0 ? response.results[0] : null
        }
      });
      
    } catch (schemaError) {
      console.warn('Error fetching database schema, falling back to simple query:', schemaError);
      
      // Fallback to a simple query if schema retrieval fails
      const response = await notion.databases.query({
        database_id: databaseId,
        page_size: 100,
      });
      
      // Process results without relying on schema
      const processedResults = response.results.map(item => ({
        id: item.id,
        title: 'Item ' + (item.id || '').slice(0, 6),
        properties: item.properties || {},
        _raw: item
      }));
      
      return res.status(200).json({
        success: true,
        results: processedResults,
        propertyNames: Object.keys(processedResults[0]?.properties || {}),
        debug: {
          message: 'Used fallback query',
          error: schemaError.message
        }
      });
    }
    
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
