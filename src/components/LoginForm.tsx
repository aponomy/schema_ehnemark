import {
    Alert,
    Box,
    Button,
    FormControl,
    FormLabel,
    Input,
    Sheet,
    Typography,
} from '@mui/joy';
import React, { useState } from 'react';
import { login } from '../api';
import type { User } from '../types';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(username, password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.body',
      }}
    >
      <Sheet
        variant="outlined"
        sx={{
          width: 300,
          p: 4,
          borderRadius: 'md',
          boxShadow: 'lg',
        }}
      >
        <Typography level="h3" sx={{ mb: 2, textAlign: 'center' }}>
          Schema
        </Typography>
        
        <Typography level="body-sm" sx={{ mb: 3, textAlign: 'center' }}>
          Logga in för att se schemat
        </Typography>

        {error && (
          <Alert color="danger" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <FormControl sx={{ mb: 2 }}>
            <FormLabel>Användarnamn</FormLabel>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Användarnamn"
              required
            />
          </FormControl>

          <FormControl sx={{ mb: 3 }}>
            <FormLabel>Lösenord</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Lösenord"
              required
            />
          </FormControl>

          <Button
            type="submit"
            fullWidth
            loading={loading}
          >
            Logga in
          </Button>
        </form>
      </Sheet>
    </Box>
  );
}
