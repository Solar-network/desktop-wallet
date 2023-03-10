import { Transactions } from "@solar-network/crypto";
import { TRANSACTION_TYPES } from "@config";
import store from "@/store";
import { CryptoUtils } from "./utils";
import { TransactionSigner } from "./transaction-signer";

export class MultiSignatureBuilder {
    static async build ({
        address,
        publicKeys,
        minKeys,
        fee,
        mnemonic,
        extraMnemonic,
        wif,
        networkWif,
        nonce
    },
    isAdvancedFee = false,
    returnObject = false
    ) {
        const staticFee = store.getters["transaction/staticFee"](
            TRANSACTION_TYPES.GROUP_1.MULTI_SIGNATURE,
            1
        );
        if (!isAdvancedFee && fee.gt(staticFee)) {
            throw new Error(
                `Multi-Signature fee should be smaller than ${staticFee}`
            );
        }

        const transaction = Transactions.BuilderFactory.multiSignature()
            .multiSignatureAsset({
                min: +minKeys,
                publicKeys
            })
            .fee(fee);

        mnemonic = CryptoUtils.normalizeMnemonic(mnemonic);
        extraMnemonic = CryptoUtils.normalizeMnemonic(extraMnemonic);

        const transactionObject = await TransactionSigner.sign({
            address,
            transaction,
            mnemonic,
            extraMnemonic,
            wif,
            networkWif,
            multiSignature: transaction.data.asset.multiSignature,
            nonce
        },
        true
        );

        return returnObject
            ? transactionObject
            : transactionObject.getStruct();
    }
}
