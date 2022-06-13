import LedgerTransport from "@ledgerhq/hw-transport-node-hid-singleton";
import { SolarTransport } from "@solar-network/ledger-transport";
import queue from "async/queue";
import logger from "electron-log";

class LedgerService {
    /**
   * Create LedgerService instance.
   * @return {void}
   */
    constructor () {
        this.transport = null;
        this.ledger = null;
        this.listeningForLedger = false;
        this.actions = [];
        this.actionsQueue = queue(async ({ action, resolve }, callback) => {
            try {
                resolve(await action());
            } catch (error) {
                if (error.statusText === "CONDITIONS_OF_USE_NOT_SATISFIED") {
                    resolve(false);
                }

                this.transport = null;
                this.ledger = null;
                resolve(null);
            }
            callback();
        });

        this.listenForLedger();
    }

    async listenForLedger () {
        try {
            if (this.listeningForLedger) {
                return;
            }

            this.listeningForLedger = true;
            this.transport = await LedgerTransport.create();
            this.ledger = new SolarTransport(this.transport);
        } catch (error) {
            logger.debug(error);
        } finally {
            this.listeningForLedger = false;
        }
    }

    /**
   * Try connecting to ledger device.
   * @return {Boolean} true if connected, false if failed
   */
    async connect () {
        try {
            if (!this.transport || this.transport.disconnected) {
                this.listenForLedger();
            }

            return this.isConnected();
        } catch (error) {
            logger.debug(error);
        }

        return false;
    }

    /**
   * Flag ledger as disconnected.
   * @return {void}
   */
    async disconnect () {
    // Disconnect ledger in case this is called manually
        try {
            if (this.transport) {
                await this.transport.close();
            }
        } catch (error) {
            logger.error(error);
        }
    }

    /**
   * Check if connected to the ledger.
   * @return {Boolean}
   */
    async isConnected () {
        try {
            if (!this.transport || this.transport.disconnected) {
                return false;
            }

            const appName = await this.__performAction(async () => {
                return this.ledger.getAppName();
            });

            const isConnected = await this.__performAction(async () => {
                const randIdx = Math.floor(Math.random() * 2147483647);
                return this.ledger.getPublicKey(`44'/3333'/${randIdx}'/0/0`);
            });

            return appName === "Solar" && !!isConnected;
        } catch (error) {
            logger.error(error);
        }

        return false;
    }

    /**
   * Get the name of currently-opened ledger app.
   * @return {Promise<string>}
   */
    async getAppName () {
        return this.__performAction(async () => {
            return this.ledger.getAppName();
        });
    }

    /**
   * Get the Solar app's version.
   * @return {Promise<string>}
   */
    async getVersion () {
        return this.__performAction(async () => {
            return this.ledger.getAppVersion();
        });
    }

    /**
   * Get a publicKey from ledger wallet given a path.
   * @param  {string} path derivation path.
   * @return {Promise<string>}
   */
    async getPublicKey (path) {
        return this.__performAction(async () => {
            return this.ledger.getPublicKey(path);
        });
    }

    /**
     * Get an extended publicKey from ledger wallet given a path.
   * @param  {string} path extended derivation path. (e.g., "44'/3333'/0'")
     * @return {Promise<string>}
     */
    async getExtPublicKey (path) {
        return this.__performAction(async () => {
            return this.ledger.getExtPublicKey(path);
        });
    }

    /**
   * Sign a transaction using a ledger wallet.
   * @param  {string} path Path for wallet location.
   * @param  {Buffer} transactionBytes bytes of transaction.
   * @return {Promise<string>}
   */
    async signTransaction (path, transactionBytes) {
        return this.__performAction(async () => {
            return this.ledger.signTransaction(path, transactionBytes);
        });
    }

    /**
   * Sign a message using a ledger wallet.
   * @param  {string} path Path for wallet location.
   * @param  {Buffer} messageBytes bytes to sign.
   * @return {Promise<string>}
   */
    async signMessage (path, messageBytes) {
        return this.__performAction(async () => {
            return this.ledger.signMessage(path, messageBytes);
        });
    }

    /**
   * Sign transaction for ledger wallet.
   * @param  {Function} [action] Method to run in an synchronous queue.
   * @return {Promise}
   */
    __performAction (action) {
        return new Promise((resolve) => {
            this.actionsQueue.push({
                action,
                resolve
            });
        });
    }
}

export default new LedgerService();
