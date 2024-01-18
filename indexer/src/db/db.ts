import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface Inscription {
  hash: string;
  address: string;
  calldata: string;
  timestamp: Date;
}

async function createTable() {
  const query = `
        CREATE TABLE IF NOT EXISTS inscriptions (
            id SERIAL PRIMARY KEY,
            hash VARCHAR(255) NOT NULL,
            address VARCHAR(255) NOT NULL,
            calldata TEXT NOT NULL,
            timestamp TIMESTAMP NOT NULL
        );
    `;
  await pool.query(query);
}

async function saveInscription(inscription: Inscription) {
  const query = `
    INSERT INTO inscriptions (hash, address, calldata, timestamp)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (hash) DO NOTHING;
  `;
  const values = [inscription.hash, inscription.address, inscription.calldata, inscription.timestamp];
  await pool.query(query, values);
}

async function getAllInscriptions(): Promise<Inscription[]> {
  const query = 'SELECT * FROM inscriptions ORDER BY timestamp DESC';
  const res = await pool.query(query);
  return res.rows as Inscription[];
}

async function getInscription(hash: string): Promise<Inscription | null> {
  const query = 'SELECT * FROM inscriptions WHERE hash = $1';
  const values = [hash];
  const res = await pool.query(query, values);

  if (res.rows.length === 0) {
    return null;
  }
  return res.rows[0] as Inscription;
}

export { Inscription, createTable, saveInscription, getAllInscriptions };