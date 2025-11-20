const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Default route - serve the enhanced tracker
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'iowa_dot_enhanced_tracker.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
