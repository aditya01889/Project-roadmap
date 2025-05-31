import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [roadmapItems, setRoadmapItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

        setRoadmapItems(responseData.results);
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
    'Backlog': 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Head>
        <title>Project Roadmap</title>
        <meta name="description" content="Project Roadmap powered by Notion" />
      </Head>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Project Roadmap</h1>
        
        {loading && (
          <div className="flex items-center space-x-2 text-gray-600 mb-6">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <span>Loading roadmap items...</span>
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
          <p className="text-gray-500">No roadmap items found.</p>
        )}

        <div className="space-y-6">
          {roadmapItems.map((item, index) => {
            const properties = item.properties || {};
            const title = properties.Name?.title?.[0]?.plain_text || 'Untitled';
            const status = properties.Status?.select?.name || 'Not Started';
            const description = properties.Description?.rich_text?.[0]?.plain_text || '';
            const dueDate = properties['Due Date']?.date?.start || '';
            const statusClass = statusColors[status] || 'bg-gray-100 text-gray-800';

            return (
              <div key={item.id || index} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                  <span className={`px-3 py-1 text-sm rounded-full ${statusClass}`}>
                    {status}
                  </span>
                </div>
                {description && <p className="mt-2 text-gray-600">{description}</p>}
                {dueDate && (
                  <p className="mt-3 text-sm text-gray-500">
                    Due: {new Date(dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
