const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// CORS headers for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Proxy endpoint for Euron API to avoid CORS issues
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, apiKey } = req.body;
    
    console.log('Proxy request received');
    console.log('API Key (first 10 chars):', apiKey?.substring(0, 10) + '...');
    console.log('Model:', model);
    console.log('Messages count:', messages?.length);
    
    if (!apiKey) {
      console.error('API key missing');
      return res.status(400).json({ error: 'API key is required' });
    }
    
    const requestBody = {
      messages: messages || [],
      model: model || 'gpt-4.1-nano',
      max_tokens: max_tokens || 1000,
      temperature: temperature || 0.7
    };
    
    console.log('Sending request to Euron API...');
    console.log('Request body:', JSON.stringify(requestBody).substring(0, 200));
    
    const response = await fetch('https://api.euron.one/api/v1/euri/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Read response as text first to handle empty or non-JSON responses
    const responseText = await response.text();
    console.log('Response text length:', responseText.length);
    console.log('Response text (first 500 chars):', responseText.substring(0, 500));
    
    if (!response.ok) {
      // Try to parse error response as JSON, otherwise return text
      try {
        const errorData = responseText ? JSON.parse(responseText) : { error: `HTTP ${response.status}` };
        return res.status(response.status).json(errorData);
      } catch {
        return res.status(response.status).json({ 
          error: responseText || `HTTP ${response.status} - Empty response` 
        });
      }
    }
    
    // Check if response is empty
    if (!responseText || responseText.trim() === '') {
      return res.status(500).json({ 
        error: 'API returned empty response. Please check your API key.' 
      });
    }
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText);
      res.json(data);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, 'Response text:', responseText);
      res.status(500).json({ 
        error: 'Invalid JSON response from API', 
        details: responseText.substring(0, 200) 
      });
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Route for home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

// Route for chat page
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback to home.html for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

app.listen(PORT, () => {
  console.log(`Halya Chat server running on port ${PORT}`);
});

