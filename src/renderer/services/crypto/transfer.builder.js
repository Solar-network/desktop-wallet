import { Transactions } from "@solar-network/crypto";
import { TRANSACTION_TYPES } from "@config";
import store from "@/store";
import { CryptoUtils } from "./utils";
import { TransactionSigner } from "./transaction-signer";

export class TransferBuilder {
    static async build (
        {
            address,
            amount,
            fee,
            recipientId,
            memo,
            mnemonic,
            extraMnemonic,
            wif,
            networkWif,
            networkId,
            multiSignature,
            nonce
        },
        isAdvancedFee = false,
        returnObject = false
    ) {
        const staticFee = store.getters["transaction/staticFee"](
            TRANSACTION_TYPES.GROUP_1.TRANSFER,
            1
        );
        if (!isAdvancedFee && fee.gt(staticFee)) {
            throw new Error(
                `Transfer fee should be smaller than ${staticFee}`
            );
        }

        const transaction = Transactions.BuilderFactory.transfer()
            .amount(amount || 0)
            .fee(fee)
            .recipientId(recipientId)
            .memo(memo);

        mnemonic = CryptoUtils.normalizeMnemonic(mnemonic);
        extraMnemonic = CryptoUtils.normalizeMnemonic(extraMnemonic);

        return TransactionSigner.sign(
            {
                address,
                transaction,
                mnemonic,
                extraMnemonic,
                wif,
                networkWif,
                networkId,
                multiSignature,
                nonce
            },
            returnObject
        );
    }
}
