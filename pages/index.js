import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

// Helper function to extract text from Notion property
const getTextFromProperty = (property) => {
  if (!property) return '';
  
  if (typeof property === 'string') return property;
  
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
    return property.files[0]?.file?.url || property.files[0]?.external?.url || '';
  }
  
  return '';
};

export default function Home() {
  const router = useRouter();
  const { id: projectId } = router.query;
  const [roadmapItems, setRoadmapItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  
  // Get status configuration for styling
  const getStatusConfig = (status) => {
    const statusMap = {
      'Not Started': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
      'In Progress': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
      'In Review': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
      'Done': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
      'On Hold': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
      'Cancelled': { 
        bg: 'bg-gray-100', 
        text: 'text-gray-800 line-through', 
        border: 'border-gray-200' 
      },
    };
    
    return statusMap[status] || { 
      bg: 'bg-gray-100', 
      text: 'text-gray-800', 
      border: 'border-gray-200' 
    };
  };
  
  useEffect(() => {
    async function fetchRoadmap() {
      try {
        setLoading(true);
        setError(null);
        
        // Include project ID in the API URL if it exists
        const apiUrl = projectId ? `/api/roadmap?id=${projectId}` : '/api/roadmap';
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch roadmap data');
        }
        
        if (data.results && data.results.length > 0) {
          // Process the results to extract useful information
          const processedItems = data.results.map(item => {
            const properties = item.properties || {};
            
            // Extract common properties
            const title = getTextFromProperty(properties.Name || properties.Title || properties.name || properties.title || {});
            const status = getTextFromProperty(properties.Status || properties.status || {});
            const description = getTextFromProperty(properties.Description || properties.description || {});
            const dueDate = getTextFromProperty(properties['Due Date'] || properties['Due date'] || properties.due_date || properties.dueDate || {});
            const priority = getTextFromProperty(properties.Priority || properties.priority || {});
            
            // Find any image properties (case-insensitive)
            let images = [];
            Object.entries(properties).forEach(([key, value]) => {
              if (key.toLowerCase().includes('image') || key.toLowerCase().includes('screenshot') || key.toLowerCase().includes('snapshot')) {
                const imageUrls = getTextFromProperty(value);
                if (imageUrls && typeof imageUrls === 'string') {
                  images.push(imageUrls);
                } else if (Array.isArray(imageUrls)) {
                  images = [...images, ...imageUrls];
                }
              }
            });
            
            return {
              id: item.id,
              title: title || 'Untitled',
              status: status || 'Not Started',
              description,
              dueDate,
              priority,
              images,
              properties: Object.entries(properties).reduce((acc, [key, value]) => {
                acc[key] = getTextFromProperty(value);
                return acc;
              }, {})
            };
          });
          
          setRoadmapItems(processedItems);
          
          // Save the first item's properties for debugging
          if (processedItems.length > 0) {
            setDebugInfo({
              properties: processedItems[0].properties,
              rawProperties: data.results[0].properties
            });
          }
        } else {
          setRoadmapItems([]);
        }
      } catch (err) {
        console.error('Error fetching roadmap data:', err);
        setError(err.message || 'Failed to load roadmap data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchRoadmap();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading roadmap data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Roadmap</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Project Roadmap</title>
        <meta name="description" content="View the project roadmap and track progress" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Project Roadmap</h1>
          {projectId && (
            <Link href="/" className="text-blue-600 hover:text-blue-800 hover:underline">
              ← Back to all projects
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {roadmapItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No projects found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {roadmapItems.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        <Link href={`/project/${item.id}`} className="hover:text-blue-600 hover:underline">
                          {item.title}
                        </Link>
                      </h2>
                      <div className="flex items-center space-x-2 mb-2">
                        <span 
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getStatusConfig(item.status).bg
                          } ${getStatusConfig(item.status).text} ${getStatusConfig(item.status).border}`}
                        >
                          {item.status}
                        </span>
                        {item.priority && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {item.priority}
                          </span>
                        )}
                        {item.dueDate && (
                          <span className="text-sm text-gray-500">
                            Due: {new Date(item.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {item.description && (
                    <p className="mt-2 text-gray-600">{item.description}</p>
                  )}
                  
                  {item.images && item.images.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      {item.images.map((img, idx) => (
                        <div key={idx} className="relative h-40 rounded-md overflow-hidden">
                          <img
                            src={img}
                            alt={`Screenshot ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link 
                      href={`/project/${item.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View details →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
