import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Create a PostgreSQL connection with improved reliability
const connectionString = process.env.DATABASE_URL as string;
const sql = postgres(connectionString, { 
  max: 10, // Maximum number of connections in pool
  idle_timeout: 30, // Remove connections after 30 seconds of inactivity
  connect_timeout: 15, // Wait up to 15 seconds for a connection
  max_lifetime: 60 * 30, // Connection lifetime in seconds (30 minutes)
  ssl: { rejectUnauthorized: false }, // Accept self-signed certificates when needed
  
  // Error handling callbacks
  onnotice: () => {}, // Silence notices
  debug: (connection, query, params, types) => {
    // Only log in debug mode to avoid flooding console
    if (process.env.NODE_ENV === 'development') {
      console.log('Database query:', query);
    }
  },
  
  // Handle automatic reconnections better
  connection: {
    application_name: 'traxx_app'
  }
});

// Log database connection events using custom listener
// The postgres.js library doesn't expose events directly, so we'll handle this differently
const originalEnd = sql.end.bind(sql);
sql.end = async function(...args: any[]) {
  console.log('Database connection ended');
  return originalEnd(...args);
};

// Log initial connection
console.log('Database connection initialized');

// Create a drizzle instance with the schema
export const db = drizzle(sql, { schema });

// Export the SQL client for other uses
export { sql };

// Add graceful shutdown handling
process.on('SIGINT', async () => {
  try {
    console.log('Closing database connections...');
    await sql.end({ timeout: 5 });
    console.log('Database connections closed');
  } catch (err) {
    console.error('Error closing database connections:', err);
  } finally {
    process.exit(0);
  }
});