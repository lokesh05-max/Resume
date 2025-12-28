import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { extractTextFromPdf, analyzeResume } from '../utils/gemini';
import { Button, Container, Typography, Box, TextField, CircularProgress, Paper, Divider, Alert } from '@mui/material';
import { Upload as UploadIcon, Description as DescriptionIcon } from '@mui/icons-material';
import { User } from 'firebase/auth';

// Add a debug mode constant
const DEBUG_MODE = true; // Set to false in production

interface ResumeValidatorProps {
  user: User;
  onLogout: () => void;
}

const ResumeValidator: React.FC<ResumeValidatorProps> = ({ user, onLogout }) => {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [error, setError] = useState('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      setFile(acceptedFiles[0]);
      setError('');
      setAnalysisResult('');
    },
  });

  const debugLog = (...args: any[]) => {
    if (DEBUG_MODE) {
      console.log('[DEBUG]', ...args);
    }
  };

  const handleAnalyze = async () => {
    debugLog('Starting analysis...');
    
    if (!file) {
      const msg = 'Please upload a resume first';
      debugLog(msg);
      setError(msg);
      return;
    }
    
    if (!jobDescription.trim()) {
      const msg = 'Please enter a job description';
      debugLog(msg);
      setError(msg);
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setAnalysisResult('');
    
    try {
      debugLog('Step 1/4: Starting PDF text extraction...');
      const resumeText = await extractTextFromPdf(file);
      debugLog('Step 1/4: Text extraction complete. Length:', resumeText.length);
      
      if (!resumeText || resumeText.trim().length === 0) {
        throw new Error('Extracted text is empty');
      }
      
      // Show preview of extracted text in debug mode
      if (DEBUG_MODE) {
        const preview = resumeText.substring(0, 200) + (resumeText.length > 200 ? '...' : '');
        debugLog('Extracted text preview:', preview);
      }

      debugLog('Step 2/4: Sending to Gemini API...');
      const result = await analyzeResume(resumeText, jobDescription);
      debugLog('Step 3/4: Analysis complete');
      
      setAnalysisResult(result);
      debugLog('Step 4/4: Results displayed');
      
    } catch (err: any) {
      console.error('Error in handleAnalyze:', {
        error: err,
        message: err.message,
        stack: err.stack,
        name: err.name,
        response: err.response
      });
      
      let errorMessage = 'Failed to analyze resume. ';
      
      // More specific error handling
      if (err.message.includes('network')) {
        errorMessage += 'Network error. Please check your internet connection.';
      } else if (err.message.includes('API key') || err.message.includes('authentication') || err.message.includes('API_KEY')) {
        errorMessage = 'Authentication error. Please check if your Gemini API key is correctly set in the .env file.';
      } else if (err.message.includes('Extracted text is empty') || err.message.includes('no extractable text')) {
        errorMessage = 'The PDF appears to be empty, corrupted, or contains no extractable text. Please try a different file.';
      } else if (err.message.includes('Invalid PDF') || err.message.includes('corrupted')) {
        errorMessage = 'The file is not a valid PDF or is corrupted. Please try a different file.';
      } else if (err.message.includes('password')) {
        errorMessage = 'Password-protected PDFs are not supported. Please remove the password and try again.';
      } else if (err.message.includes('file size')) {
        errorMessage = 'The file is too large. Maximum size is 10MB.';
      } else if (err.message.includes('Gemini API Error')) {
        errorMessage = `Error from Gemini API: ${err.message.replace('Gemini API Error: ', '')}`;
      } else {
        errorMessage += `Error: ${err.message || 'Unknown error occurred'}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Resume Validator
        </Typography>
        <Button variant="outlined" color="secondary" onClick={onLogout}>
          Sign Out
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Welcome, {user.displayName || 'User'}!
        </Typography>
        <Typography variant="body1" paragraph>
          Upload your resume (PDF) and paste the job description to get AI-powered feedback on how well your resume matches the job requirements.
        </Typography>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          1. Upload Your Resume (PDF)
        </Typography>
        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed #ccc',
            borderRadius: 1,
            p: 4,
            textAlign: 'center',
            backgroundColor: isDragActive ? '#f5f5f5' : 'white',
            cursor: 'pointer',
            '&:hover': {
              borderColor: '#666',
            },
          }}
        >
          <input {...getInputProps()} />
          <UploadIcon fontSize="large" color="action" sx={{ mb: 1 }} />
          <Typography variant="body1">
            {isDragActive ? 'Drop the resume here...' : 'Drag and drop your resume here, or click to select'}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Only PDF files are accepted
          </Typography>
        </Box>
        
        {file && (
          <Box mt={2} display="flex" alignItems="center">
            <DescriptionIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="body2">
              {file.name} ({formatFileSize(file.size)})
            </Typography>
          </Box>
        )}
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          2. Paste Job Description
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={6}
          variant="outlined"
          placeholder="Paste the job description here..."
          value={jobDescription}
          onChange={(e) => {
            setJobDescription(e.target.value);
            setAnalysisResult('');
          }}
          sx={{ mb: 2 }}
        />
      </Paper>

      <Box display="flex" justifyContent="center" mb={4}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleAnalyze}
          disabled={isAnalyzing || !file || !jobDescription.trim()}
          startIcon={isAnalyzing ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
        </Button>
      </Box>

      {error && (
        <Box mb={4}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          {DEBUG_MODE && (
            <Box mt={2} p={2} bgcolor="#fff8e1" borderRadius={1}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Debug Info (visible in development only):
              </Typography>
              <Typography variant="body2" component="pre" sx={{ 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '0.8rem',
                fontFamily: 'monospace'
              }}>
                {JSON.stringify({
                  fileName: file?.name,
                  fileSize: file ? `${(file.size / 1024).toFixed(2)} KB` : 'No file',
                  jobDescLength: jobDescription.length,
                  timestamp: new Date().toISOString()
                }, null, 2)}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {analysisResult && (
        <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Analysis Results
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Box sx={{ whiteSpace: 'pre-line' }}>
            {analysisResult.split('\n').map((line, i) => (
              <Typography key={i} paragraph sx={{ mb: line.trim() ? 2 : 0 }}>
                {line || <br />}
              </Typography>
            ))}
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default ResumeValidator;
