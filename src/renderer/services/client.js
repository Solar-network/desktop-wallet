import { Connection } from "@arkecosystem/client";
import { castArray, chunk, orderBy } from "lodash";
import logger from "electron-log";
import { TRANSACTION_GROUPS, TRANSACTION_TYPES } from "@config";
import store from "@/store";
import TransactionService from "@/services/transaction";
import { TransactionBuilderService } from "./crypto/transaction-builder.service";
import { TransactionSigner } from "./crypto/transaction-signer";
import BigNumber from "@/plugins/bignumber";
import { camelToUpperSnake } from "@/utils";
import semver from "semver";

export default class ClientService {
    /**
   * Generate a new connection instance.
   *
   * @param  {String} server         Host URL to connect to server
   * @param  {Number} [timeout=5000] Connection timeout
   * @return {Connection}
   */
    static newConnection (server, timeout) {
        return new Connection(`${server}/api`).withOptions({
            timeout: timeout || 5000
        });
    }

    /**
   * Fetch the network configuration according to the version.
   * In case the `memo` length has changed, updates the network data.
   * Create a new client to isolate the main client.
   *
   * @param {String} server
   * @param {Number} timeout
   * @returns {Object}
   */
    static async fetchNetworkConfig (server, timeout) {
        const response = await ClientService.newConnection(server, timeout)
            .api("node")
            .configuration();
        const data = response.body.data;

        return data;
    }

    /**
   * Fetch the network crypto data, e.g. milestones
   *
   * @param {String} server
   * @param {Number} timeout
   * @returns {Object}
   */
    static async fetchNetworkCrypto (server, timeout) {
        return (
            await ClientService.newConnection(server, timeout)
                .api("node")
                .crypto()
        ).body.data;
    }

    static async fetchFeeStatistics (server, timeout) {
        let data;

        try {
            const response = await ClientService.newConnection(server, timeout)
                .api("node")
                .fees(7);

            data = response.body.data;
        } catch (error) {
            return [];
        }

        /*
      The peer can send 2 types of response: an Array and and Object.
      In case it sends an Object, the fees should be parsed according to the
      transaction groups and types from @config.
    */

        // Case it is an Object
        if (!Array.isArray(data)) {
            // Remove the groups that are not in the response
            const groupsIds = Object.values(TRANSACTION_GROUPS).filter(groupId => !!data[groupId]);

            const network = store.getters["session/network"];
            const legacy = semver.satisfies(semver.coerce(network.apiVersion), "<=3.3");

            const parsedFees = groupsIds.reduce((accumulator, groupId) => {
                const retrivedTypeNames = Object.keys(data[groupId]);

                // Parse the fees and add to accumulator
                accumulator[groupId] = retrivedTypeNames.map(typeName => {
                    const fees = data[groupId][typeName];

                    /*
            Notice that the types are in different format.
            Response is in cammelCase. Eg: 'bussinesUpdate'
            @config is in UPPER_SNAKE_CASE. Eg: 'BUSSINES_UPDATE'
          */
                    const groupName = `GROUP_${groupId}`;
                    let parsedTypeName = camelToUpperSnake(typeName);

                    if (!legacy) {
                        if (typeName === "legacyTransfer") {
                            parsedTypeName = "TRANSFER";
                        } else if (typeName === "transfer") {
                            parsedTypeName = "MULTI_PAYMENT";
                        } else if (typeName === "legacyVote") {
                            parsedTypeName = "VOTE";
                        }
                    }

                    const type = TRANSACTION_TYPES[groupName][parsedTypeName];

                    return {
                        type,
                        fees: {
                            minFee: Number(fees.min),
                            maxFee: Number(fees.max),
                            avgFee: Number(fees.avg)
                        }
                    };
                });

                return accumulator;
            }, {});

            if (!parsedFees["1"].some(fee => fee.type === 0) && parsedFees["1"].some(fee => fee.type === 6)) {
                parsedFees["1"].push({ ...parsedFees["1"].filter(fee => fee.type === 6)[0], type: 0 });
            }

            if (!parsedFees["1"].some(fee => fee.type === 3) && parsedFees["2"].some(fee => fee.type === 2)) {
                parsedFees["1"].push({ ...parsedFees["2"].filter(fee => fee.type === 2)[0], type: 3 });
            }

            return parsedFees;
        }

        // Case the response is an Array
        return data.map(fee => ({
            type: Number(fee.type),
            fees: {
                minFee: Number(fee.min),
                maxFee: Number(fee.max),
                avgFee: Number(fee.avg)
            }
        }));
    }

    constructor () {
        this.__host = null;
        this.client = new Connection("http://localhost");
    }

    get host () {
        return this.__host;
    }

    set host (host) {
        this.__host = `${host}/api`;
        this.client = ClientService.newConnection(host);
    }

    /**
   * Fetch the peer status.
   * @returns {Object}
   */
    async fetchPeerStatus () {
        return (await this.client.api("node").syncing()).body.data;
    }

    /** Request the block producers according to the current network version
   *
   * @param {Object} [query]
   * @param {Number} [query.page=1]
   * @param {Number} [query.limit=51]
   * @param {String} [query.orderBy='rank:asc']
   * @return {Object[]}
   */
    async fetchBlockProducers (options = {}) {
        const network = store.getters["session/network"];
        options.page || (options.page = 1);
        options.limit || (options.limit = network.constants.activeDelegates);
        options.orderBy || (options.orderBy = "rank:asc");

        if (options.orderBy.startsWith("approval:") && !semver.satisfies(semver.coerce(network.apiVersion), "<=3.3")) {
            options.orderBy = options.orderBy.replace("approval:", "votesReceived.percent:");
        } else {
            options.orderBy = options.orderBy.replace("approval:", "production.approval:");
        }

        const { body } = await this.client.api("delegates").all({
            page: options.page,
            limit: options.limit,
            orderBy: options.orderBy
        });

        const { data } = body;
        if (data) {
            for (const blockProducer of data) {
                if (blockProducer.votesReceived) {
                    blockProducer.production = { approval: blockProducer.votesReceived.percent };
                }
            }
        }

        return {
            blockProducers: data,
            meta: body.meta
        };
    }

    /**
   * Fetches the voters of the given block producer and returns the number of total voters
   *
   * @return {Number}
   */
    async fetchVoters (blockProducer) {
        const { body } = await this.client
            .api("delegates")
            .voters(blockProducer.username);

        return body.meta.totalCount;
    }

    fetchBlockProducerProduced (blockProducer) {
        if (blockProducer.produced) {
            return blockProducer.produced.total;
        }

        return "0";
    }

    /**
   * Fetches the static fees for transaction types.
   * @return {Number[]}
   */
    async fetchStaticFees () {
        return {
            1: {
                legacyTransfer: "50000000",
                secondSignature: "5000000",
                registration: "7500000000",
                legacyVote: "9000000",
                multiSignature: "5000000",
                ipfs: "5000000",
                transfer: "50000000",
                resignation: "0"
            },
            2: {
                burn: "0",
                vote: "9000000"
            }
        };
    }

    /**
   * Fetch the latest transactions
   *
   * @param {Object} [query]
   * @param {Number} [query.page=1]
   * @param {Number} [query.limit=100]
   * @return {Array}
   */
    async fetchTransactions ({ page, limit } = {}) {
        page || (page = 1);
        limit || (limit = 100);

        let totalCount = 0;
        let transactions = [];

        const { body } = await this.client.api("transactions").all({
            limit,
            page
        });

        transactions = body.data.map(transaction => {
            transaction.timestamp = transaction.timestamp.unix * 1000; // to milliseconds
            return transaction;
        });
        totalCount = body.meta.totalCount;

        return {
            transactions,
            totalCount
        };
    }

    /**
   * Request the transactions according to the current network version
   *
   * V1:
   *   - The timestamp returned from the api is relative to the mainnet release date.
   *   - Map keys to match the v2 response structure.
   *
   * V2:
   *   - The timestamp field is an object that already returns converted date.
   *
   * @param {String} address
   * @param {Object} [query]
   * @param {Number} [query.page=1]
   * @param {Number} [query.limit=50]
   * @return {Object[]}
   */
    async fetchWalletTransactions (address, options = {}) {
        options.page || (options.page = 1);
        options.limit || (options.limit = 50);
        options.orderBy || (options.orderBy = "timestamp:desc");

        let totalCount = 0;
        let transactions = [];

        const queryOptions = {
            orderBy: options.orderBy,
            limit: options.limit,
            page: options.page
        };

        if (options.transactionType) {
            queryOptions.type = options.transactionType;
        }

        const { body } = await this.client
            .api("wallets")
            .transactions(address, queryOptions);

        transactions = body.data.map(transaction => {
            transaction.timestamp = transaction.timestamp.unix * 1000; // to milliseconds
            return transaction;
        });

        store.dispatch("transaction/processVotes", transactions);
        totalCount = body.meta.totalCount;

        // Add some utilities for each transactions
        const result = transactions.map(transaction => {
            transaction.isSender = transaction.sender === address;
            transaction.isRecipient = transaction.recipient === address;
            transaction.totalAmount = TransactionService.getTotalAmount(transaction);

            return transaction;
        });

        return {
            transactions: result,
            totalCount
        };
    }

    /**
   * Fetch transactions from a bulk list of addresses.
   * @param  {String[]} addresses
   * @param  {Object} options
   * @return {Object}
   */
    async fetchTransactionsForWallets (addresses, options = {}) {
        options = options || {};

        const walletData = {};
        let transactions = [];
        let hadFailure = false;

        const search = (addressList) => {
            return this.client.api("transactions").all({
                address: addressList.join(",")
            });
        };

        for (const addressChunk of chunk(addresses, 20)) {
            try {
                const { body } = await search(addressChunk);
                transactions.push(...body.data);
            } catch (error) {
                logger.error(error);
                hadFailure = true;
            }
        }

        if (!hadFailure) {
            transactions = orderBy(transactions, "timestamp", "desc").map(
                transaction => {
                    transaction.timestamp = transaction.timestamp.unix * 1000; // to milliseconds
                    transaction.isSender = addresses.includes(transaction.sender);
                    transaction.isRecipient = addresses.includes(transaction.recipient);

                    return transaction;
                }
            );

            for (const transaction of transactions) {
                if (addresses.includes(transaction.sender)) {
                    if (!walletData[transaction.sender]) {
                        walletData[transaction.sender] = {};
                    }
                    walletData[transaction.sender][transaction.id] = transaction;
                }

                if (
                    transaction.recipient &&
          addresses.includes(transaction.recipient)
                ) {
                    if (!walletData[transaction.recipient]) {
                        walletData[transaction.recipient] = {};
                    }
                    walletData[transaction.recipient][transaction.id] = transaction;
                }

                if (transaction.asset && (transaction.asset.payments || transaction.asset.transfers)) {
                    const payments = transaction.asset.payments || transaction.asset.transfers;
                    for (const payment of payments) {
                        if (addresses.includes(payment.recipientId)) {
                            if (!walletData[payment.recipientId]) {
                                walletData[payment.recipientId] = {};
                            }
                            walletData[payment.recipientId][transaction.id] = transaction;
                        }
                    }
                }
            }

            for (const address of Object.keys(walletData)) {
                if (walletData[address]) {
                    walletData[address] = Object.values(walletData[address]);
                }
            }

            return walletData;
        }

        for (const address of addresses) {
            try {
                walletData[address] = (
                    await this.fetchWalletTransactions(address, options)
                ).transactions;
            } catch (error) {
                logger.error(error);
                const message = error.response
                    ? error.response.body.message
                    : error.message;
                if (message !== "Wallet not found") {
                    throw error;
                }
            }
        }

        return walletData;
    }

    fixWallet (data) {
        if (data) {
            if (data.attributes) {
                if (data.attributes.delegate) {
                    data.isBlockProducer = true;
                    data.isResigned = data.attributes.delegate.resigned !== undefined;
                    data.resigned = data.attributes.delegate.resigned;
                }

                if (data.attributes.secondPublicKey) {
                    data.secondPublicKey = data.attributes.secondPublicKey;
                }

                if (data.attributes.multiSignature) {
                    data.multiSignature = data.attributes.multiSignature;
                }
            }

            data.vote = data.votingFor;
        }

        return data;
    }

    /**
   * Fetches wallet data from an address.
   * @param {String} address
   * @return {Object}
   */
    async fetchWallet (address) {
        const { body } = await this.client.api("wallets").get(address);
        return this.fixWallet(body.data);
    }

    /**
   * Fetches wallet data from a bulk list of addresses.
   * @param  {String[]} addresses
   * @return {Object[]}
   */
    async fetchWallets (addresses) {
        const walletData = [];

        const search = (addressList) => {
            return this.client.api("wallets").all({
                address: addressList.join(",")
            });
        };

        const randomizedLimit = Math.floor(Math.random() * 41) + 10;
        for (const addressChunk of chunk(addresses, randomizedLimit)) {
            const { body } = await search(addressChunk);
            walletData.push(...body.data.map(wallet => this.fixWallet(wallet)));
        }

        return walletData;
    }

    /**
   * Request the vote of a wallet.
   * Returns the block producers's public key if this wallet has voted, null otherwise.
   * @param {String} address
   * @returns {String|null}
   */
    async fetchWalletVote (address) {
        let walletData;

        try {
            walletData = await this.fetchWallet(address);
        } catch (error) {
            logger.error(error);
            const message = error.response
                ? error.response.body.message
                : error.message;
            if (message !== "Wallet not found") {
                throw error;
            }
        }

        if (walletData && walletData.votingFor) {
            return walletData.votingFor;
        }

        return null;
    }

    /**
   * Fetch votes for wallet.
   *
   * @param {String} address
   * @returns {Object[]}
   */
    async fetchWalletVotes (address) {
        return (await this.client.api("wallets").votes(address)).body.data;
    }

    /**
   * Parse peer from current client host.
   * @return {Object}
   */
    __parseCurrentPeer () {
        const matches = /(https?:\/\/)([a-zA-Z0-9.\-_]+)(:([0-9]*))?/.exec(
            this.host
        );
        const scheme = matches[1];
        const ip = matches[2];
        const port = matches[4];

        const isHttps = scheme === "https://";

        return {
            ip,
            port: port || (isHttps ? "443" : "80"),
            isHttps
        };
    }

    async getNonceForAddress ({ address, networkId }) {
        let network;
        if (networkId) {
            network = store.getters["network/byId"](networkId);
        }
        if (!network) {
            network = store.getters["session/network"];
        }

        try {
            const response = await this.fetchWallet(address);
            return BigNumber(
                response.nonce || 0
            )
                .plus(1)
                .toString();
        } catch (error) {
            return "1";
        }
    }

    // todo: move this out
    async buildTransfer (data, isAdvancedFee = false, returnObject = false) {
        return this.__buildTransaction("buildTransfer", data, isAdvancedFee, returnObject);
    }

    // todo: move this out
    async buildExtraSignatureRegistration (
        data,
        isAdvancedFee = false,
        returnObject = false
    ) {
        return this.__buildTransaction("buildExtraSignatureRegistration", data, isAdvancedFee, returnObject);
    }

    // todo: move this out
    async buildRegistration (
        data,
        isAdvancedFee = false,
        returnObject = false
    ) {
        return this.__buildTransaction("buildRegistration", data, isAdvancedFee, returnObject);
    }

    // todo: move this out
    async buildVote (data, isAdvancedFee = false, returnObject = false) {
        return this.__buildTransaction("buildVote", data, isAdvancedFee, returnObject);
    }

    // todo: move this out
    async buildMultiSignature (data, isAdvancedFee = false, returnObject = false) {
        return this.__buildTransaction("buildMultiSignature", data, isAdvancedFee, returnObject);
    }

    // todo: move this out
    async buildIpfs (data, isAdvancedFee = false, returnObject = false) {
        return this.__buildTransaction("buildIpfs", data, isAdvancedFee, returnObject);
    }

    // todo: move this out
    async buildMultiPayment (data, isAdvancedFee = false, returnObject = false) {
        return this.__buildTransaction("buildMultiPayment", data, isAdvancedFee, returnObject);
    }

    // todo: move this out
    async buildResignation (
        data,
        isAdvancedFee = false,
        returnObject = false
    ) {
        return this.__buildTransaction("buildResignation", data, isAdvancedFee, returnObject);
    }

    // todo: move this out
    async __buildTransaction (
        builder,
        data,
        isAdvancedFee = false,
        returnObject = false
    ) {
        return TransactionBuilderService[builder](
            { ...data, ...{ nonce: await this.getNonceForAddress(data) } },
            isAdvancedFee,
            returnObject
        );
    }

    // todo: move this out
    async multiSign (transaction, data) {
        return TransactionSigner.multiSign(transaction, data);
    }

    /**
   * Broadcast transactions to the current peer.
   *
   * @param {Array|Object} transactions
   * @param {Boolean} broadcast - whether the transaction should be broadcasted to multiple peers or not
   * @returns {Object[]}
   */
    async broadcastTransaction (transactions, broadcast) {
        if (Array.isArray(transactions) && !transactions.length) {
            return [];
        } else if (typeof transactions === "object" && !transactions.network) {
            return [];
        }

        let currentPeer = store.getters["peer/current"]();
        if (!currentPeer) {
            currentPeer = this.__parseCurrentPeer();
        }

        let failedBroadcast = false;
        if (broadcast) {
            const txs = [];
            const peers = store.getters["peer/broadcastPeers"]();
            if (peers && peers.length) {
                for (let i = 0; i < peers.length; i++) {
                    try {
                        const client = await store.dispatch(
                            "peer/clientServiceFromPeer",
                            peers[i]
                        );
                        const transaction = await client.client.api("transactions").create({
                            transactions: castArray(transactions)
                        });
                        txs.push(transaction);
                    } catch (err) {
                        //
                    }
                }
                return txs;
            } else {
                failedBroadcast = true;
            }
        }

        if (!broadcast || failedBroadcast) {
            const transaction = await this.client.api("transactions").create({
                transactions: castArray(transactions)
            });
            return [transaction];
        }
    }
}
