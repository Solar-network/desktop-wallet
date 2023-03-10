import { Transactions } from "@solar-network/crypto";
import { TRANSACTION_TYPES } from "@config";
import store from "@/store";
import { CryptoUtils } from "./utils";
import { TransactionSigner } from "./transaction-signer";

export class IpfsBuilder {
    static async build ({
        address,
        fee,
        hash,
        mnemonic,
        extraMnemonic,
        wif,
        networkWif,
        multiSignature,
        nonce
    },
    isAdvancedFee = false,
    returnObject = false
    ) {
        const staticFee = store.getters["transaction/staticFee"](
            TRANSACTION_TYPES.GROUP_1.IPFS,
            1
        );
        if (!isAdvancedFee && fee.gt(staticFee)) {
            throw new Error(`IPFS fee should be smaller than ${staticFee}`);
        }

        const transaction = Transactions.BuilderFactory.ipfs()
            .ipfsAsset(hash)
            .fee(fee);

        mnemonic = CryptoUtils.normalizeMnemonic(mnemonic);
        extraMnemonic = CryptoUtils.normalizeMnemonic(extraMnemonic);

        return TransactionSigner.sign({
            address,
            transaction,
            mnemonic,
            extraMnemonic,
            wif,
            networkWif,
            multiSignature,
            nonce
        },
        returnObject
        );
    }
}
