import * as bip39 from "bip39";
import { Crypto, Identities } from "@solar-network/crypto";
import { version as mainnetVersion } from "@config/networks/mainnet";
import store from "@/store";
import { CryptoUtils } from "./crypto/utils";
import { reqwest } from "@/utils/http";

export default class WalletService {
    /*
   * Generate a wallet.
   * It does not check if the wallet is new (no transactions on the blockchain)
   * @param {Number} pubKeyHash - also known as address or network version
   * @return {Object}
   */
    static generate (pubKeyHash, language) {
        const mnemonic = bip39.generateMnemonic(null, null, bip39.wordlists[language]);
        const publicKey = Identities.Keys.fromPassphrase(CryptoUtils.normalizeMnemonic(mnemonic)).publicKey;
        return {
            address: Identities.Address.fromPublicKey(publicKey, pubKeyHash),
            mnemonic
        };
    }

    /**
   * Generates a new mnemonic to be used for a extra mnemonic
   */
    static generateExtraMnemonic (language) {
        return bip39.generateMnemonic(null, null, bip39.wordlists[language]);
    }

    /**
   * Returns the address that correspond to a mnemonic
   * @param {String} mnemonic
   * @param {Number} pubKeyHash - also known as address or network version
   * @return {String}
   */
    static getAddress (mnemonic, pubKeyHash) {
        return Identities.Address.fromPassphrase(CryptoUtils.normalizeMnemonic(mnemonic), pubKeyHash);
    }

    static getAddressFromPublicKey (publicKey, pubKeyHash) {
        return Identities.Address.fromPublicKey(publicKey, pubKeyHash);
    }

    /**
   * Returns the address generated from a multi-signature registration.
   * @param {Object} multiSignatureAsset
   * @return {String}
   */
    static getAddressFromMultiSignatureAsset (multiSignatureAsset) {
        return Identities.Address.fromMultiSignatureAsset(multiSignatureAsset);
    }

    /**
   * Generates the public key belonging to a wallet
   * @param {Object} wallet
   * @return {String|null}
   */
    static getPublicKeyFromWallet (wallet) {
        if (!wallet) {
            return null;
        }

        if (wallet.multiSignature) {
            return this.getPublicKeyFromMultiSignatureAsset(wallet.multiSignature);
        }

        return wallet.publicKey || null;
    }

    /**
   * Generates the public key belonging to the given mnemonic
   * @param {String} mnemonic
   * @return {String}
   */
    static getPublicKeyFromMnemonic (mnemonic) {
        return Identities.PublicKey.fromPassphrase(CryptoUtils.normalizeMnemonic(mnemonic));
    }

    /**
   * Generates the public key belonging to the given wif
   * @param {String} wif
   * @return {String}
   */
    static getPublicKeyFromWIF (wif) {
        return Identities.PublicKey.fromWIF(wif);
    }

    /**
   * Returns the public key generated from a multi-signature registration.
   * @param {Object} multiSignatureAsset
   * @return {String}
   */
    static getPublicKeyFromMultiSignatureAsset (multiSignatureAsset) {
        return Identities.PublicKey.fromMultiSignatureAsset(multiSignatureAsset);
    }

    /**
   * Check if a specific address contain data in the NEO Blockchain
   * @param {String} address
   * @returns {Boolean}
   */
    static async isNeoAddress (address) {
        if (!WalletService.validateAddress(address, mainnetVersion)) {
            return false;
        }

        const neoUrl = "https://neoscan.io/api/main_net/v1/get_last_transactions_by_address/";
        const response = await reqwest(neoUrl + address, {
            json: true
        });

        return response.statusCode === 200 && response.body && response.body.length > 0;
    }

    /**
   * Check if a wallet can resign as a block producer
   * @param {Object} wallet
   * @returns {Boolean}
   */
    static canResign (wallet, type) {
        if (!wallet.isBlockProducer || wallet.resigned === "permanent") {
            return false;
        }

        if (type === 0 && wallet.isResigned) {
            return false;
        }

        if (type === 2 && !wallet.isResigned) {
            return false;
        }

        return true;
    }

    /**
   * Signs a message by using the given mnemonic.
   * @param {String} message
   * @param {String} mnemonic
   * @return {String}
   */
    static signMessage (message, mnemonic) {
        return Crypto.Message.sign(message, CryptoUtils.normalizeMnemonic(mnemonic));
    }

    /**
   * Signs a message by using the given wif.
   * @param {String} message
   * @param {Number} wif
   * @param {Object} [network]
   * @return {String}
   */
    static signMessageWithWif (message, wif, network) {
        return Crypto.Message.signWithWif(message, wif, network);
    }

    /**
   * Verify a given message based on the given public key and signature.
   * @param {String} message
   * @param {String} publicKey
   * @param {String} signature
   * @return {String}
   */
    static verifyMessage (message, publicKey, signature) {
        return Crypto.Message.verify({ message, publicKey, signature });
    }

    /**
   * Check that an address is valid.
   * @param {Number} pubKeyHash - also known as address or network version
   * @return {Boolean}
   */
    static validateAddress (address, pubKeyHash) {
        return Identities.Address.validate(address, pubKeyHash);
    }

    /**
   * TODO: Is this necessary? A mnemonic is always valid as long as it's a string.
   *
   * Check that a mnemonic is valid.
   * @param {String} mnemonic
   * @return {Boolean}
   */
    static validateMnemonic (mnemonic) {
        const publicKey = Identities.Keys.fromPassphrase(CryptoUtils.normalizeMnemonic(mnemonic)).publicKey;
        return Identities.PublicKey.verify(publicKey);
    }

    /**
   * Check that a mnemonic is valid bip39 mnemonic.
   * @param {String} mnemonic
   * @param {Number} language - bip39 wordlist language
   * @return {Boolean}
   */
    static isBip39Mnemonic (mnemonic, language) {
        return bip39.validateMnemonic(CryptoUtils.normalizeMnemonic(mnemonic), bip39.wordlists[language]);
    }

    /**
   * Check that a username is valid
   *
   * @param {String} username
   * @return {Object} { errors: Array, passes: Boolean }
   */
    static validateUsername (username) {
        const errors = [];

        if (username.length < 1) {
            errors.push({ type: "empty" });
        } else if (username.length > 20) {
            errors.push({ type: "maxLength" });
        } else if (store.getters["blockProducer/byUsername"](username)) {
            errors.push({ type: "exists" });
            // Regex from `@solar-network/crypto`
        } else if (!username.match(/^[a-z0-9!@$&_.]+$/)) {
            errors.push({ type: "invalidFormat" });
        }

        return {
            errors,
            passes: errors.length === 0
        };
    }

    /**
   * Check that a mnemonic matches an address
   * @param {String} address
   * @param {String} mnemonic
   * @param {Number} pubKeyHash - also known as address or network version
   * @return {Boolean}
   */
    static verifyMnemonic (address, mnemonic, pubKeyHash) {
        return address === WalletService.getAddress(CryptoUtils.normalizeMnemonic(mnemonic), pubKeyHash);
    }
}
