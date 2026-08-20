// Setup para testes
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kairos_ponto_test';
process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_chars_long';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_chars_long';
process.env.BIOMETRIC_ENCRYPTION_KEY = 'dGVzdC1iaW8tMzItYnl0ZXMtZm9yLXRlc3RzMTIzNDU2';
