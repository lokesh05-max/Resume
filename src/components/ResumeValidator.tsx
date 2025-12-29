import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Button,
  Container,
  Typography,
  Box,
  TextField,
  CircularProgress,
  Paper,
  Divider,
  Alert,
} from "@mui/material";
import {
  Upload as UploadIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import { User } from "firebase/auth";

import { extractTextFromPDF } from "../services/pdfParser";
import { calculateATSScore } from "../services/atsAnalyzer";

// Debug mode (turn OFF in production)
const DEBUG_MODE = true;

interface ResumeValidatorProps {
  user: User;
  onLogout: () => void;
}

const ResumeValidator: React.FC<ResumeValidatorProps> = ({ user, onLogout }) => {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const [error, setError] = useState("");

  const debugLog = (...args: any[]) => {
    if (DEBUG_MODE) {
      console.log("[DEBUG]", ...args);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
        setError("");
        setAnalysisResult("");
      }
    },
  });

  const handleAnalyze = async () => {
    debugLog("Starting ATS analysis");

    if (!file) {
      setError("Please upload a resume first.");
      return;
    }

    if (!jobDescription.trim()) {
      setError("Please paste the job description.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setAnalysisResult("");

    try {
      // STEP 1: Extract text from PDF
      debugLog("Extracting text from PDF...");
      const resumeText = await extractTextFromPDF(file);

      if (!resumeText || resumeText.trim().length === 0) {
        throw new Error("No extractable text found in the PDF.");
      }

      debugLog("Resume text length:", resumeText.length);

      // STEP 2: Calculate ATS score
      debugLog("Calculating ATS score...");
      const atsResult = calculateATSScore(resumeText, jobDescription);

      // STEP 3: Format result
      const formattedResult = `
ATS SCORE: ${atsResult.score}%

FEEDBACK:
${atsResult.feedback}

KEYWORD MATCH:
Matched ${atsResult.matchedKeywords} out of ${atsResult.totalKeywords} keywords
      `.trim();

      setAnalysisResult(formattedResult);
      debugLog("ATS analysis completed successfully");
    } catch (err: any) {
      console.error("ATS Analysis Error:", err);
      setError(
        err.message ||
          "Failed to analyze resume. Please try a different PDF."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">Resume Validator</Typography>
        <Button variant="outlined" color="secondary" onClick={onLogout}>
          Sign Out
        </Button>
      </Box>

      {/* Welcome */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">
          Welcome, {user.displayName || "User"}!
        </Typography>
        <Typography variant="body1" mt={1}>
          Upload your resume and paste the job description to get an ATS
          compatibility score.
        </Typography>
      </Paper>

      {/* Upload Resume */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          1. Upload Your Resume (PDF)
        </Typography>

        <Box
          {...getRootProps()}
          sx={{
            border: "2px dashed #ccc",
            borderRadius: 1,
            p: 4,
            textAlign: "center",
            backgroundColor: isDragActive ? "#f5f5f5" : "white",
            cursor: "pointer",
          }}
        >
          <input {...getInputProps()} />
          <UploadIcon fontSize="large" sx={{ mb: 1 }} />
          <Typography>
            {isDragActive
              ? "Drop the resume here..."
              : "Drag and drop your resume here, or click to select"}
          </Typography>
          <Typography variant="caption">
            Only PDF files are accepted
          </Typography>
        </Box>

        {file && (
          <Box mt={2} display="flex" alignItems="center">
            <DescriptionIcon sx={{ mr: 1 }} />
            <Typography variant="body2">
              {file.name} ({formatFileSize(file.size)})
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Job Description */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          2. Paste Job Description
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={6}
          placeholder="Paste the job description here..."
          value={jobDescription}
          onChange={(e) => {
            setJobDescription(e.target.value);
            setAnalysisResult("");
          }}
        />
      </Paper>

      {/* Analyze Button */}
      <Box display="flex" justifyContent="center" mb={4}>
        <Button
          variant="contained"
          size="large"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          startIcon={isAnalyzing ? <CircularProgress size={20} /> : undefined}
        >
          {isAnalyzing ? "Analyzing..." : "Analyze Resume"}
        </Button>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Result */}
      {analysisResult && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Analysis Results
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography component="pre" sx={{ whiteSpace: "pre-wrap" }}>
            {analysisResult}
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default ResumeValidator;

