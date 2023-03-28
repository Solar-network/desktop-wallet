import { Identities, Transactions } from "@solar-network/crypto";
import { dayjs } from "@/services/datetime";
import store from "@/store";
import TransactionService from "@/services/transaction";
import WalletService from "@/services/wallet";
import { CryptoUtils } from "./utils";
import semver from "semver";

export class TransactionSigner {
    static async sign ({
        transaction,
        mnemonic,
        extraMnemonic,
        wif,
        networkWif,
        networkId,
        multiSignature,
        nonce
    },
    returnObject = false
    ) {
        let network;
        if (networkId) {
            network = store.getters["network/byId"](networkId);
        }
        if (!network) {
            network = store.getters["session/network"];
        }

        transaction = transaction.network(+network.version);

        // TODO replace with dayjs
        const epochTime = dayjs(network.constants.epoch)
            .utc()
            .valueOf();
        const now = dayjs().valueOf();
        transaction.data.timestamp = Math.floor((now - epochTime) / 1000);

        if (mnemonic) {
            mnemonic = CryptoUtils.normalizeMnemonic(mnemonic);
        }

        if (network.constants.bip340) {
            transaction.version(3).nonce(nonce);
        } else {
            transaction.version(2).nonce(nonce);
        }

        if (multiSignature) {
            let senderPublicKey = null;
            if (mnemonic) {
                senderPublicKey = WalletService.getPublicKeyFromMnemonic(
                    mnemonic
                );
            } else if (wif) {
                senderPublicKey = WalletService.getPublicKeyFromWIF(wif);
            }

            const publicKeyIndex = multiSignature.publicKeys.indexOf(
                senderPublicKey
            );
            transaction.senderPublicKey(senderPublicKey);
            if (publicKeyIndex > -1) {
                if (mnemonic) {
                    transaction.multiSign(mnemonic, publicKeyIndex);
                } else if (wif) {
                    transaction.multiSignWithWif(publicKeyIndex, wif, networkWif);
                }
            } else if (
                TransactionService.isMultiSignatureRegistration(transaction.data) &&
                !transaction.data.signatures
            ) {
                transaction.data.signatures = [];
            }
        } else {
            if (mnemonic) {
                transaction.sign(mnemonic);
            } else if (wif) {
                transaction.signWithWif(wif, networkWif);
            }

            if (extraMnemonic) {
                transaction.secondSign(
                    CryptoUtils.normalizeMnemonic(extraMnemonic)
                );
            }
        }

        if (returnObject) {
            transaction.data = this.legacyTransaction(networkId, transaction.data);
            return transaction;
        }

        if (multiSignature) {
            if (!transaction.data.senderPublicKey) {
                transaction.senderPublicKey(
                    WalletService.getPublicKeyFromMultiSignatureAsset(
                        multiSignature
                    )
                );
            }
            const transactionJson = transaction.build().toJson();
            transactionJson.multiSignature = multiSignature;
            if (!transactionJson.signatures) {
                transactionJson.signatures = [];
            }

            return this.legacyTransaction(networkId, transactionJson);
        }

        const response = transaction.build().toJson();
        const totalAmount = TransactionService.getTotalAmount(response);
        response.totalAmount = !isNaN(totalAmount) ? totalAmount : 0;

        return this.legacyTransaction(networkId, response);
    }

    static legacyTransaction (networkId, response) {
        let network;
        if (networkId) {
            network = store.getters["network/byId"](networkId);
        }
        if (!network) {
            network = store.getters["session/network"];
        }

        const legacy = semver.satisfies(semver.coerce(network.apiVersion), "<=3.3");
        if (legacy) {
            if (response.amount === undefined) {
                response.amount = "0";
            }

            response.vendorField = response.memo;
            delete response.memo;

            if (response.asset && response.asset.transfers) {
                response.asset.payments = response.asset.transfers;
                delete response.asset.transfers;
            }
        }

        return response;
    }

    // todo: why is this async? it doesn't make any use of promises or await
    static async multiSign (
        transaction, { multiSignature, networkWif, mnemonic, extraMnemonic, wif }
    ) {
        if (!mnemonic && !wif) {
            throw new Error("No mnemonic or wif provided");
        }

        transaction = CryptoUtils.transactionFromData(transaction);

        let keys;
        if (mnemonic) {
            keys = Identities.Keys.fromPassphrase(mnemonic);
        } else {
            keys = Identities.Keys.fromWIF(wif, { wif: networkWif });
        }

        const isReady = TransactionService.isMultiSignatureReady({
            ...transaction,
            multiSignature,
            signatures: [...transaction.signatures]
        },
        true
        );

        if (!isReady) {
            const index = multiSignature.publicKeys.indexOf(keys.publicKey);
            if (index >= 0) {
                Transactions.Signer.multiSign(transaction, keys, index);
                transaction.signatures = transaction.signatures.filter(
                    (value, index, self) => {
                        return self.indexOf(value) === index;
                    }
                );
            } else {
                throw new Error(
                    "mnemonic/wif is not used to sign this transaction"
                );
            }
        } else if (
            TransactionService.needsWalletSignature(
                transaction,
                keys.publicKey
            )
        ) {
            Transactions.Signer.sign(transaction, keys);

            if (extraMnemonic) {
                const secondaryKeys = Identities.Keys.fromPassphrase(
                    extraMnemonic
                );
                Transactions.Signer.secondSign(transaction, secondaryKeys);
            }

            transaction.id = TransactionService.getId(transaction);
        }

        return {
            ...transaction,
            multiSignature
        };
    }
}
