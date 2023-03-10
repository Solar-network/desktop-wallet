/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";

const bip38 = require("bip38");
const wif = require("wif");
const { Identities } = require("@solar-network/crypto");

process.on("message", message => {
    if (message.mnemonic) {
        try {
            const key = Identities.WIF.fromPassphrase(message.mnemonic, { wif: message.wif });
            const decoded = wif.decode(key);

            process.send({
                bip38key: bip38.encrypt(decoded.privateKey, decoded.compressed, message.password)
            });
        } catch (error) {
            process.send({
                error: `Failed to encrypt mnemonic: ${error.message}`
            });
        }
    } else if (message.bip38key) {
        try {
            const decryptedKey = bip38.decrypt(message.bip38key, message.password);
            process.send({
                encodedWif: wif.encode(message.wif, decryptedKey.privateKey, decryptedKey.compressed)
            });
        } catch (error) {
            process.send({
                error: `Failed to decrypt mnemonic: ${error.message}`
            });
        }
    } else if (message === "quit") {
        process.exit();
    }
});
