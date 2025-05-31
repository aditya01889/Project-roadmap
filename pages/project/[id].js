import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';

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

export default function ProjectDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    if (!id) return;

    async function fetchProject() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/roadmap?id=${id}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch project data');
        }
        
        if (data.results && data.results.length > 0) {
          const item = data.results[0];
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
          
          setProject({
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
          });
        } else {
          setError('Project not found');
        }
      } catch (err) {
        console.error('Error fetching project:', err);
        setError(err.message || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Project</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Back to all projects
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
          <p className="text-gray-600 mb-6">The requested project could not be found.</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Back to all projects
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(project.status);
  
  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <Head>
        <title>{project.title} - Project Details</title>
        <meta name="description" content={`Details for ${project.title}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      
      <style jsx global>{`
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
      `}</style>

      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => router.push('/')}
          className="mb-6 flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to all projects
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                    {project.status}
                  </span>
                </div>
                
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{project.title}</h1>
                
                {project.description && (
                  <p className="text-gray-600 mb-6">{project.description}</p>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  {project.dueDate && (
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Due Date</p>
                        <p className="text-sm text-gray-900">{project.dueDate}</p>
                      </div>
                    </div>
                  )}
                  
                  {project.priority && (
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Priority</p>
                        <p className="text-sm text-gray-900">{project.priority}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {project.images && project.images.length > 0 && (
                <div className="md:w-1/3">
                  <div className="bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={project.images[0]} 
                      alt={project.title}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Additional Properties */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Project Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(project.properties)
                  .filter(([key]) => !['Name', 'Title', 'Status', 'Description', 'Due Date', 'Due date', 'due_date', 'dueDate', 'Priority', 'priority', 'image', 'screenshot', 'snapshot'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{key}</p>
                      <p className="mt-1 text-sm text-gray-900 break-words">
                        {value || '—'}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
