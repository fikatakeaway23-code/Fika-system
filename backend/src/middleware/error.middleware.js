/**
 * Global Express error handler.
 * Catches all errors passed via next(err).
 */
export function errorHandler(err, req, res, _next) {
  // Prisma known errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Duplicate entry',
      detail: `A record with this ${err.meta?.target?.join(', ')} already exists.`,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      issues: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // JWT errors (shouldn't reach here normally, caught in middleware)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Log unexpected errors
  if (process.env.NODE_ENV !== 'production') {
    console.error('[ERROR]', err);
  }

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message || 'Internal server error';

  res.status(status).json({ error: message });
}
