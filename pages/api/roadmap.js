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
        
        // Helper function to extract text from Notion property
        const extractTextFromProperty = (prop) => {
          if (!prop) return null;
          
          // Handle title type property
          if (prop.type === 'title' && prop.title) {
            return prop.title.map(t => t.plain_text).join(' ').trim();
          }
          
          // Handle rich_text type property
          if (prop.rich_text && Array.isArray(prop.rich_text)) {
            return prop.rich_text.map(t => t.plain_text).join(' ').trim();
          }
          
          // Handle select type property
          if (prop.type === 'select' && prop.select) {
            return prop.select.name;
          }
          
          // Handle multi_select type property
          if (prop.type === 'multi_select' && Array.isArray(prop.multi_select)) {
            return prop.multi_select.map(s => s.name).join(', ');
          }
          
          // Handle formula type property
          if (prop.type === 'formula' && prop.formula) {
            if (prop.formula.type === 'string' && prop.formula.string) {
              return prop.formula.string;
            }
            if (prop.formula.type === 'number' && prop.formula.number !== undefined) {
              return String(prop.formula.number);
            }
            if (prop.formula.type === 'boolean' && prop.formula.boolean !== undefined) {
              return prop.formula.boolean ? 'Yes' : 'No';
            }
          }
          
          // Handle URL type property
          if (prop.type === 'url' && prop.url) {
            return prop.url;
          }
          
          // Handle email type property
          if (prop.type === 'email' && prop.email) {
            return prop.email;
          }
          
          // Handle phone_number type property
          if (prop.type === 'phone_number' && prop.phone_number) {
            return prop.phone_number;
          }
          
          // Handle date type property
          if (prop.type === 'date' && prop.date) {
            return prop.date.start || '';
          }
          
          // Handle people type property
          if (prop.type === 'people' && Array.isArray(prop.people)) {
            return prop.people.map(p => p.name || 'Unknown').join(', ');
          }
          
          // Handle files type property
          if (prop.type === 'files' && Array.isArray(prop.files)) {
            return prop.files.map(f => f.name || 'File').join(', ');
          }
          
          // Handle checkbox type property
          if (prop.type === 'checkbox' && prop.checkbox !== undefined) {
            return prop.checkbox ? 'Yes' : 'No';
          }
          
          // Handle number type property
          if (prop.type === 'number' && prop.number !== undefined) {
            return String(prop.number);
          }
          
          // Handle created_time type property
          if (prop.type === 'created_time' && prop.created_time) {
            return prop.created_time;
          }
          
          // Handle last_edited_time type property
          if (prop.type === 'last_edited_time' && prop.last_edited_time) {
            return prop.last_edited_time;
          }
          
          // Handle created_by type property
          if (prop.type === 'created_by' && prop.created_by) {
            return prop.created_by.name || 'Unknown';
          }
          
          // Handle last_edited_by type property
          if (prop.type === 'last_edited_by' && prop.last_edited_by) {
            return prop.last_edited_by.name || 'Unknown';
          }
          
          // Handle relation type property
          if (prop.type === 'relation' && Array.isArray(prop.relation)) {
            return prop.relation.length > 0 ? 'Related' : '';
          }
          
          // Handle rollup type property
          if (prop.type === 'rollup' && prop.rollup) {
            // This is a complex type that might need special handling
            return 'Rollup';
          }
          
          return null;
        };
        
        // Function to get title from properties
        const getTitle = () => {
          // List of possible title properties to check (in order of priority)
          const possibleTitleProps = [
            'Name', 'Title', 'Feature', 'Project', 'Task', 'Item', 'Description',
            'name', 'title', 'feature', 'project', 'task', 'item', 'description'
          ];
          
          // First, check for any property that has type 'title'
          const titleProp = Object.entries(properties).find(([_, value]) => 
            value?.type === 'title'
          );
          
          if (titleProp) {
            const [key, prop] = titleProp;
            const title = extractTextFromProperty(prop);
            if (title) {
              console.log(`Found title in property '${key}' (type: ${prop.type})`);
              return title;
            }
          }
          
          // Then check other possible title properties
          for (const propName of possibleTitleProps) {
            if (properties[propName]) {
              const title = extractTextFromProperty(properties[propName]);
              if (title) {
                console.log(`Found title in property '${propName}'`);
                return title;
              }
            }
          }
          
          // If no title found, try to use the first property that has text
          for (const [key, prop] of Object.entries(properties)) {
            const title = extractTextFromProperty(prop);
            if (title) {
              console.log(`Using fallback title from property '${key}'`);
              return title;
            }
          }
          
          // If still no title, use the page ID
          const fallbackTitle = `Item ${item.id.slice(0, 6)}`;
          console.log(`No title found, using fallback: ${fallbackTitle}`);
          return fallbackTitle;
        };
        
        const title = getTitle();
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
