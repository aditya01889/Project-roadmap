import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [roadmapItems, setRoadmapItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  // Helper function to get property value from Notion API response
  const getPropertyValue = (property) => {
    if (!property) return null;
    
    // Check the type of the property and return the appropriate value
    if (property.type === 'title' && property.title) {
      return property.title[0]?.plain_text || '';
    }
    if (property.type === 'rich_text' && property.rich_text) {
      return property.rich_text[0]?.plain_text || '';
    }
    if (property.type === 'select' && property.select) {
      return property.select.name || '';
    }
    if (property.type === 'date' && property.date) {
      return property.date.start || '';
    }
    if (property.type === 'multi_select' && property.multi_select) {
      return property.multi_select.map(item => item.name).join(', ');
    }
    if (property.type === 'number' && property.number !== undefined) {
      return property.number;
    }
    if (property.type === 'checkbox' && property.checkbox !== undefined) {
      return property.checkbox ? 'Yes' : 'No';
    }
    
    return '';
  };

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching roadmap data...');
        const apiUrl = '/api/roadmap';
        console.log('API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const responseData = await response.json();
        console.log('API Response:', responseData);
        
        if (!response.ok) {
          throw new Error(responseData.message || `Failed to fetch roadmap data (${response.status})`);
        }

        if (!responseData.results) {
          console.warn('No results in response:', responseData);
          throw new Error('No data returned from the server');
        }

        // Log the first item's raw properties to help with debugging
        if (responseData.results.length > 0) {
          console.log('First item raw properties:', responseData.results[0].properties);
        }

        // Process the Notion API response
        const processedItems = responseData.results.map(item => {
          const properties = item.properties || {};
          
          // Log all property names for debugging
          console.log('Available properties:', Object.keys(properties));
          
          // Try to find the title property (Notion's default is 'Name')
          const titleProperty = properties.Name || properties.name || properties.Title || {};
          const title = titleProperty.title?.[0]?.plain_text || 'Untitled Item';
          
          // Try to find status property (common names: Status, State, Stage)
          const statusProperty = properties.Status || properties.State || properties.Stage || {};
          const status = statusProperty.select?.name || 'Not Started';
          
          // Try to find description (common names: Description, Details, Notes)
          const descriptionProperty = properties.Description || properties.Details || properties.Notes || {};
          const description = descriptionProperty.rich_text?.[0]?.plain_text || '';
          
          // Try to find due date (common names: Due Date, Deadline, Target Date)
          const dueDateProperty = properties['Due Date'] || properties.Deadline || properties['Target Date'] || {};
          const dueDate = dueDateProperty.date?.start || '';
          
          return {
            id: item.id,
            title: title,
            status: status,
            description: description,
            dueDate: dueDate,
            // Include all raw properties for debugging
            rawProperties: properties
          };
        });

        setRoadmapItems(processedItems);
        
        // For debugging: log the first item's properties
        if (processedItems.length > 0) {
          console.log('First item properties:', processedItems[0]);
          setDebugInfo(JSON.stringify(processedItems[0].rawProperties, null, 2));
        }
      } catch (err) {
        console.error('Error fetching roadmap:', err);
        setError(err.message || 'An error occurred while loading the roadmap');
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, []);

  const statusColors = {
    'Not Started': 'bg-gray-100 text-gray-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Done': 'bg-green-100 text-green-800',
    'Backlog': 'bg-purple-100 text-purple-800',
    'Completed': 'bg-green-100 text-green-800',
    'In Development': 'bg-yellow-100 text-yellow-800',
    'Planned': 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <Head>
        <title>Project Roadmap</title>
        <meta name="description" content="Project Roadmap powered by Notion" />
      </Head>

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Project Roadmap</h1>
          <div className="flex space-x-2">
            <span className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-800">
              {roadmapItems.length} items
            </span>
          </div>
        </div>
        
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <p className="text-gray-600">Loading roadmap items...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
            <p className="font-bold">Error loading roadmap data</p>
            <p className="mt-2">{error}</p>
            <p className="mt-2 text-sm">
              Check the browser console for more details.
              {process.env.NODE_ENV === 'development' && (
                <span className="block mt-2">
                  API URL: /api/roadmap
                </span>
              )}
            </p>
          </div>
        )}

        {!loading && !error && roadmapItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No roadmap items found.</p>
            <p className="text-sm text-gray-400 mt-2">Check if your Notion database has any items.</p>
          </div>
        )}

        <div className="space-y-4">
          {roadmapItems.map((item, index) => {
            const status = item.status || 'Not Started';
            const statusClass = statusColors[status] || 'bg-gray-100 text-gray-800';
            
            return (
              <div 
                key={item.id || index} 
                className="bg-white p-4 md:p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                      {item.title || 'Untitled Item'}
                    </h2>
                    {item.description && (
                      <p className="mt-1 text-gray-600">{item.description}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2
                    md:flex-col md:items-end md:space-y-2 md:w-48">
                    <span className={`px-3 py-1 text-xs md:text-sm rounded-full ${statusClass} whitespace-nowrap`}>
                      {status}
                    </span>
                    {item.dueDate && (
                      <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                        📅 {new Date(item.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Debug info - only visible in development */}
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-4 text-xs bg-gray-50 p-2 rounded overflow-hidden">
                    <summary className="cursor-pointer text-gray-500">Debug Info</summary>
                    <pre className="mt-2 p-2 bg-white border rounded text-xs overflow-x-auto">
                      {JSON.stringify(item.rawProperties, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Debug section */}
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <div className="mt-12 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Debug Information</h3>
            <p className="text-sm text-gray-600 mb-2">First item's properties:</p>
            <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
              {debugInfo}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
