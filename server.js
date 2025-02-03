const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// (Optional) Serve static files if your index.html is in the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// POST /convert endpoint to handle the conversion
app.post('/convert', (req, res) => {
  const { youtubeUrl, format, quality } = req.body;

  if (!youtubeUrl || !format || !quality) {
    return res.status(400).send('Missing required parameters.');
  }

  // Create a temporary output file name. This file will be deleted after sending.
  const outputFile = path.join(__dirname, `output_${Date.now()}.${format}`);
  let command = '';

  if (format === 'mp3') {
    // For MP3 conversion: extract audio using yt-dlp.
    // Note: The value for `--audio-quality` in yt-dlp might need mapping.
    // Here we directly pass the quality parameter (e.g., "64", "128", etc.).
    command = `yt-dlp --extract-audio --audio-format mp3 --audio-quality ${quality} "${youtubeUrl}" -o "${outputFile}"`;
  } else if (format === 'mp4') {
    // For MP4 conversion: select a video format up to the chosen height (quality)
    // The command selects the best video and audio streams that satisfy the height constraint.
    command = `yt-dlp -f "bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]" "${youtubeUrl}" -o "${outputFile}"`;
  } else {
    return res.status(400).send('Invalid format specified.');
  }

  console.log(`Executing command: ${command}`);

  // Execute the conversion command
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Conversion error:', error);
      return res.status(500).send('Conversion failed.');
    }

    // Read the converted file and send it as a download
    fs.readFile(outputFile, (err, data) => {
      if (err) {
        console.error('Error reading the converted file:', err);
        return res.status(500).send('Error reading the converted file.');
      }

      // Set headers for file download
      const contentType = format === 'mp3' ? 'audio/mpeg' : 'video/mp4';
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="video.${format}"`
      });
      res.send(data);

      // Delete the temporary file after sending the response
      fs.unlink(outputFile, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting temporary file:', unlinkErr);
        }
      });
    });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
