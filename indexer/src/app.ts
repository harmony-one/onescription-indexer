import express from 'express';
import Indexer from './indexer';
import cors from 'cors';
import { createTable, getAllInscriptions } from './db/db';

const app = express();
const port = 3000;

const rpcUrl = 'https://api.s0.t.hmny.io';
const indexer = new Indexer(rpcUrl);
indexer.start();

createTable();

app.use(cors());

app.get('/', async (_, res) => {
  res.send('hello world')
});

app.get('/inscriptions', async (_, res) => {
  try {
    const inscriptions = await getAllInscriptions();
    res.json(inscriptions);
  } catch (error) {
    console.error('Error fetching inscriptions:', error);
    res.status(500).send('Error fetching inscriptions');
  }
});

app.listen(port, () => {
  console.log(`App listening at port ${port}`);
});
