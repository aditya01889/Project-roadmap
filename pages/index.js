import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';

// Helper function to extract text from Notion property
const getTextFromProperty = (property) => {
  if (!property) return '';
  
  // Handle different property types
  if (property.type === 'title' && property.title) {
    return property.title.map(t => t.plain_text).join(' ');
  }
  if (property.type === 'rich_text' && property.rich_text) {
    return property.rich_text.map(t => t.plain_text).join(' ');
  }
  if (property.type === 'select' && property.select) {
    return property.select.name || '';
  }
  if (property.type === 'multi_select' && property.multi_select) {
    return property.multi_select.map(s => s.name).join(', ');
  }
  if (property.type === 'date' && property.date) {
    return property.date.start || '';
  }
  if (property.type === 'number' && property.number !== undefined) {
    return property.number.toString();
  }
  if (property.type === 'checkbox' && property.checkbox !== undefined) {
    return property.checkbox ? 'Yes' : 'No';
  }
  if (property.type === 'url' && property.url) {
    return property.url;
  }
  if (property.type === 'email' && property.email) {
    return property.email;
  }
  if (property.type === 'phone_number' && property.phone_number) {
    return property.phone_number;
  }
  if (property.type === 'files' && property.files) {
    // Handle file/image URLs
    return property.files[0]?.file?.url || property.files[0]?.external?.url || '';
  }
  
  return '';
};

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

        // Extract property names from the first item for reference
        const propertyNames = responseData.propertyNames || 
          (responseData.results[0]?.properties ? Object.keys(responseData.results[0].properties) : []);
        
        console.log('Available property names:', propertyNames);
        
        // Process the Notion API response
        const processedItems = responseData.results.map(item => {
          const properties = item.properties || {};
          
          // Try to find common property names
          const title = item.title || getTextFromProperty(
            properties.Name || properties.name || properties.Title || properties.title || {}
          ) || 'Untitled Item';
          
          // Try to find status property (common names: Status, State, Stage, Status)
          const status = getTextFromProperty(
            properties.Status || properties.State || properties.Stage || properties.status || {}
          ) || 'Not Started';
          
          // Try to find description (common names: Description, Details, Notes, description)
          const description = getTextFromProperty(
            properties.Description || properties.Details || properties.Notes || properties.description || {}
          );
          
          // Try to find due date (common names: Due Date, Deadline, Target Date, due_date)
          const dueDate = getTextFromProperty(
            properties['Due Date'] || properties.Deadline || properties['Target Date'] || properties.due_date || {}
          );
          
          // Collect all properties for display
          const allProperties = {};
          Object.entries(properties).forEach(([key, prop]) => {
            allProperties[key] = getTextFromProperty(prop);
          });
          
          return {
            id: item.id,
            title: title,
            status: status,
            description: description,
            dueDate: dueDate,
            // Include all processed properties
            properties: allProperties,
            // Include raw properties for debugging
            rawProperties: properties
          };
        });
        
        // Log the first item's processed data for debugging
        if (processedItems.length > 0) {
          console.log('First processed item:', processedItems[0]);
        }

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

  // Status configuration with icons and colors
  const statusConfig = {
    '⚪ Planned': {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      icon: '🔄',
      label: 'Planned'
    },
    '🟡 In Progress': {
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      icon: '⚡',
      label: 'In Progress'
    },
    '✅ Completed': {
      bg: 'bg-green-50',
      text: 'text-green-800',
      border: 'border-green-200',
      icon: '✓',
      label: 'Completed'
    },
    '⏸️ On Hold': {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-300',
      icon: '⏸️',
      label: 'On Hold'
    },
    '🔴 Blocked': {
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-200',
      icon: '⚠️',
      label: 'Blocked'
    }
  };

  // Default status config
  const defaultStatus = {
    bg: 'bg-gray-50',
    text: 'text-gray-800',
    border: 'border-gray-200',
    icon: '•',
    label: 'Not Started'
  }; 
  
  // Get status config with fallback
  const getStatusConfig = (status) => {
    if (!status) return defaultStatus;
    return statusConfig[status] || {
      ...defaultStatus,
      label: status
    };
  };

  const statusColors = {
    'Not Started': 'bg-gray-100 text-gray-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Done': 'bg-green-100 text-green-800',
    'Backlog': 'bg-purple-100 text-purple-800',
    'Completed': 'bg-green-100 text-green-800',
    'In Development': 'bg-yellow-100 text-yellow-800',
    'Planned': 'bg-blue-100 text-blue-800'
  };

  // Helper function to render property value
  const renderPropertyValue = (key, value) => {
    if (value === null || value === undefined || value === '') return '—';
    
    // Handle URLs
    if (key.toLowerCase().includes('url') || 
        key.toLowerCase().includes('link') ||
        (typeof value === 'string' && value.startsWith('http'))) {
      return (
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline break-all"
        >
          {value}
        </a>
      );
    }
    
    // Handle images
    if (key.toLowerCase().includes('image') || 
        key.toLowerCase().includes('screenshot') ||
        key.toLowerCase().includes('snapshot')) {
      return (
        <div className="mt-2">
          <img 
            src={value} 
            alt="Project snapshot" 
            className="rounded-lg border border-gray-200 max-w-full h-auto"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        </div>
      );
    }
    
    return value.toString();
  };

  // Add this to your Next.js config if you want to allow images from external domains
  // next.config.js:
  // module.exports = {
  //   images: {
  //     domains: ['www.notion.so', 's3.us-west-2.amazonaws.com', 'prod-files-secure.s3.us-west-2.amazonaws.com'],
  //   },
  // };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <Head>
        <title>Project Roadmap</title>
        <meta name="description" content="Project Roadmap powered by Notion" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      
      <style jsx global>{`
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
      `}</style>

      <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Project Roadmap</h1>
              <p className="text-gray-500 text-sm mt-1">
                Powered by Notion • Updated {new Date().toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-sm font-medium text-blue-700">
                {roadmapItems.length} {roadmapItems.length === 1 ? 'item' : 'items'}
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                title="Refresh"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
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
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading roadmap data</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4">
                    <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-md">
                      <h4 className="text-xs font-medium text-red-800 mb-1">Debug Info:</h4>
                      <p className="text-xs text-red-700">API URL: /api/roadmap</p>
                      <p className="text-xs text-red-700 mt-1">Check the browser console for more details.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && !error && roadmapItems.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No items found</h3>
            <p className="mt-1 text-sm text-gray-500">No roadmap items were found in your Notion database.</p>
            <div className="mt-6">
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); window.location.reload(); }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </a>
            </div>
          </div>
        )}

        <div className="space-y-5">
          {roadmapItems.map((item, index) => {
            const status = item.status || 'Not Started';
            const statusConfig = getStatusConfig(status);
            const hasProperties = item.properties && Object.keys(item.properties).length > 0;
            
            // Find image URLs in properties
            const imageUrls = [];
            if (hasProperties) {
              Object.entries(item.properties).forEach(([key, value]) => {
                if (key.toLowerCase().includes('image') || 
                    key.toLowerCase().includes('screenshot') ||
                    key.toLowerCase().includes('snapshot')) {
                  const url = getTextFromProperty(value);
                  if (url) imageUrls.push(url);
                }
              });
            }
            
            return (
              <div 
                key={item.id || index} 
                className={`bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border ${statusConfig.border} hover:border-${statusConfig.border.split('-')[1]}-300`}
              >
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  {/* Status indicator */}
                  <div className={`flex-shrink-0 w-2.5 h-full rounded-full ${statusConfig.bg}`}></div>
                  
                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900 leading-snug">
                          {item.title || 'Untitled Item'}
                        </h2>
                        
                        {item.description && (
                          <p className="mt-1.5 text-gray-600 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-3 sm:space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                          <span className="mr-1.5">{statusConfig.icon}</span>
                          {statusConfig.label}
                        </span>
                        
                        {item.dueDate && (
                          <div className="hidden sm:flex items-center text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
                            <svg className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Display images if available */}
                    {imageUrls.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {imageUrls.map((url, idx) => (
                          <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                            <img 
                              src={url} 
                              alt={`Project snapshot ${idx + 1}`} 
                              className="w-full h-auto object-cover"
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Display additional properties */}
                    {hasProperties && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          {Object.entries(item.properties)
                            .filter(([key]) => {
                              const lowerKey = key.toLowerCase();
                              return !['title', 'name', 'description', 'status', 'duedate', 'due date', 'image', 'screenshot', 'snapshot'].some(term => 
                                lowerKey.includes(term)
                              );
                            })
                            .map(([key, value]) => {
                              const displayValue = getTextFromProperty(value);
                              if (!displayValue) return null;
                              
                              return (
                                <div key={key} className="flex">
                                  <span className="font-medium text-gray-500 w-28 flex-shrink-0">
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                                  </span>
                                  <span className="text-gray-800 flex-1 break-words">
                                    {renderPropertyValue(key, displayValue)}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Mobile due date */}
                {item.dueDate && (
                  <div className="mt-3 sm:hidden flex items-center text-xs text-gray-500">
                    <svg className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(item.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                )}
                
                {/* Debug info - only visible in development */}
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-4 text-xs bg-gray-50 p-2 rounded overflow-hidden">
                    <summary className="cursor-pointer text-gray-500 font-medium">Debug Info</summary>
                    <div className="mt-2 space-y-4">
                      <div>
                        <h4 className="font-semibold mb-1">Processed Data:</h4>
                        <pre className="p-2 bg-white border rounded text-xs overflow-x-auto">
                          {JSON.stringify({
                            id: item.id,
                            title: item.title,
                            status: item.status,
                            description: item.description,
                            dueDate: item.dueDate
                          }, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Raw Properties:</h4>
                        <pre className="p-2 bg-white border rounded text-xs overflow-x-auto">
                          {JSON.stringify(item.rawProperties, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Debug section */}
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <div className="mt-12 p-5 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Debug Information</h3>
            <div className="bg-white p-4 rounded border border-gray-200 overflow-hidden">
              <h4 className="text-sm font-medium text-gray-700 mb-2">First Item's Properties:</h4>
              <pre className="text-xs text-gray-800 overflow-x-auto p-3 bg-gray-50 rounded">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
