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
      
      // Get the project ID from query parameters if provided
      const { id: projectId } = req.query;
      
      let filter = undefined;
      if (projectId) {
        // If a specific project ID is requested, filter by that ID
        filter = {
          property: 'id',
          rich_text: {
            equals: projectId
          }
        };
        console.log(`Filtering for project ID: ${projectId}`);
      }
      
      // Query the database with optional filter
      const response = await notion.databases.query({
        database_id: databaseId,
        filter: filter,
        page_size: projectId ? 1 : 100, // Only need 1 result if filtering by ID
      });

      console.log(`Successfully queried Notion database. Found ${response.results.length} items.`);
      
      // Log the raw response from Notion
      console.log('Raw Notion API response:', JSON.stringify(response, null, 2));
      
      // Process the results to extract the data we need
      const processedResults = response.results.map(item => {
        console.log('Processing item:', item.id);
        console.log('Item properties:', Object.keys(item.properties || {}));
        
        const properties = item.properties || {};
        
        // Log all properties and their types
        Object.entries(properties).forEach(([key, value]) => {
          console.log(`Property: ${key}, Type: ${value?.type}`);
          if (value?.type === 'title' || key.toLowerCase().includes('name') || key.toLowerCase().includes('title')) {
            console.log(`Potential title property [${key}]:`, JSON.stringify(value, null, 2));
          }
        });
        
        // Helper function to get rich text content
        const getRichText = (prop) => {
          if (!prop) return '';
          if (prop.rich_text) {
            const text = prop.rich_text.map(rt => rt.plain_text).join(' ');
            console.log('Rich text content:', text);
            return text;
          }
          return '';
        };
        
        // Helper to get title (common in Notion databases)
        const getTitle = (prop) => {
          if (!prop) return 'Untitled';
          console.log('Getting title from prop:', prop);
          
          if (prop.title) {
            const title = prop.title.map(t => t.plain_text).join(' ');
            console.log('Title from title property:', title);
            return title;
          }
          
          if (prop.rich_text) {
            const richText = getRichText(prop);
            console.log('Title from rich text:', richText);
            return richText;
          }
          
          // Try to find a title property by name
          const titleProp = Object.entries(properties).find(([key, value]) => 
            key.toLowerCase() === 'name' || 
            key.toLowerCase() === 'title' ||
            value?.type === 'title'
          );
          
          if (titleProp) {
            const [key, value] = titleProp;
            console.log(`Found potential title property: ${key}`, value);
            if (value.title) {
              const title = value.title.map(t => t.plain_text).join(' ');
              console.log('Title from found title property:', title);
              return title;
            }
            if (value.rich_text) {
              const title = getRichText(value);
              console.log('Title from found rich text property:', title);
              return title;
            }
          }
          
          console.log('No title found, using Untitled');
          return 'Untitled';
        };
        
        // Try to find a title property by type or name
        const titleProp = Object.entries(properties).find(([key, value]) => 
          value?.type === 'title' || 
          key.toLowerCase() === 'name' || 
          key.toLowerCase() === 'title'
        )?.[1] || {};
        
        const title = getTitle(titleProp);
        console.log('Final title:', title);
        
        return {
          id: item.id,
          title: title,
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
