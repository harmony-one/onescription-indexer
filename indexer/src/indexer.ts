import fs from 'fs';
import path from 'path';
import { ethers } from "ethers";
import { saveInscription } from './db/db';

const START_BLOCK = 52256100;

const INTERVAL = 500; // 500 ms
const MAX_RETRIES = 3;

const LOG_FILE = 'indexer_v1.log';
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 MB

class Indexer {
  protected provider: ethers.providers.JsonRpcProvider;
  protected lastBlockNum: number | undefined;
  protected interval: number;


  constructor(rpc: string, interval: number = INTERVAL) {
    this.provider = new ethers.providers.JsonRpcProvider(rpc);
    this.lastBlockNum = START_BLOCK;
    this.interval = interval;
  }

  log(message: string) {
    this.checkLogRotation();
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    fs.appendFileSync(LOG_FILE, logMessage, 'utf8');
  }

  checkLogRotation() {
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_LOG_SIZE) {
      const logDir = path.dirname(LOG_FILE);
      const logExtension = path.extname(LOG_FILE);
      const logBaseName = path.basename(LOG_FILE, logExtension);
      const newLogName = `${logDir}/${logBaseName}_${new Date().toISOString().replace(/:/g, '-')}${logExtension}`;
      fs.renameSync(LOG_FILE, newLogName);
    }
  }

  public async start() {
    this.log('Starting Indexer Service');

    const processIndexing = async () => {
      let retryCount = 0;
      while (retryCount <= MAX_RETRIES) {
        try {
          const currBlockNum = await this.fetchBlockNum();
          if (this.lastBlockNum && this.lastBlockNum < currBlockNum) {
            for (let blockNum = this.lastBlockNum + 1; blockNum <= currBlockNum; blockNum++) {
              console.log(`Handling Block: ${blockNum}`);
              const { transactions: newTxs, timestamp: blockTimestamp } = await this.fetchTxs(blockNum);
              const txPromises = newTxs.map(tx => this.processTransaction(tx, blockNum, blockTimestamp));
              await Promise.all(txPromises);
              this.lastBlockNum = blockNum;
            }
          }
          break;
        } catch (error) {
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`Retrying: attempt ${retryCount}/${MAX_RETRIES}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // exponential back-off
          } else {
            console.log('Max retries reached. Proceeding to next cycle.');
            break;
          }
        }
      }
      setTimeout(processIndexing, this.interval);
    }

    processIndexing();
  }

  protected async processTransaction(tx: ethers.providers.TransactionResponse, blockNum: number, blockTimestamp: number) {
    try {
      const decodedData = this.hexToBase64(tx.data);
      if (decodedData) {
        await saveInscription({
          hash: tx.hash,
          address: tx.from,
          calldata: decodedData,
          timestamp: new Date(blockTimestamp * 1000)
        });
        const logMsg = `Tx Hash: ${tx.hash} / Calldata: ${decodedData} / Block Number: ${blockNum}`;
        this.log(logMsg);
        console.log(logMsg);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error processing transaction ${tx.hash}: ${error.message}`);
      } else {
        console.error(`Error processing transaction ${tx.hash}:`, error);
      }
    }
  }

  protected async fetchBlockNum(): Promise<number> {
    const currBlockNum = await this.provider.getBlockNumber();
    if (this.lastBlockNum === undefined) {
      this.lastBlockNum = currBlockNum - 1;
    }
    return currBlockNum;
  }

  protected async fetchTxs(blockNum: number): Promise<{ transactions: ethers.providers.TransactionResponse[], timestamp: number }> {
    const result = {
      transactions: [] as ethers.providers.TransactionResponse[],
      timestamp: 0
    };

    try {
      const block = await this.provider.getBlockWithTransactions(blockNum);
      result.transactions = block.transactions.filter(tx => tx.data);
      result.timestamp = block.timestamp;
    } catch (error) {
      console.error('Error fetching transactions:', error as Error);
    }

    return result;
  }

  hexToBase64(hex: string): string | undefined {
    if (!hex.startsWith('0x') || hex.length % 2 !== 0) {
      return undefined;
    }

    const actualHex = hex.substring(2);
    if (!/^[0-9a-fA-F]+$/g.test(actualHex)) {
      return undefined;
    }

    try {
      const bytesArray = ethers.utils.arrayify(hex);
      const hexString = ethers.utils.toUtf8String(bytesArray);
      return hexString;
    } catch (error) {
      // can be due to invalid hexString or decoding failure
      return undefined;
    }
  }
}

export default Indexer;