import React, { useState } from 'react';
import { signInWithGoogle } from '../firebase';
import { Button, Container, Typography, Box, Alert, CircularProgress } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await signInWithGoogle();
      onLoginSuccess(user);
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      setError(error.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 4,
          boxShadow: 3,
          borderRadius: 2,
          backgroundColor: 'white',
        }}
      >
        <Typography component="h1" variant="h4" gutterBottom>
          Resume Validator
        </Typography>
        <Typography variant="body1" paragraph align="center" sx={{ mb: 3 }}>
          Analyze your resume against job descriptions using AI to improve your job application success rate.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Button
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          sx={{
            backgroundColor: '#4285F4',
            '&:hover': {
              backgroundColor: '#357ABD',
            },
            padding: '10px 24px',
            fontSize: '1rem',
            minWidth: '220px',
            '& .MuiButton-startIcon': {
              marginRight: '8px',
            },
          }}
        >
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </Button>
        
        {isLoading && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            Opening Google sign-in popup...
          </Typography>
        )}
        
        <Box mt={4} textAlign="center">
          <Typography variant="body2" color="textSecondary">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
