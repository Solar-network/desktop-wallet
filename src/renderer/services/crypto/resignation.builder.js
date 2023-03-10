import { Transactions } from "@solar-network/crypto";
import { TRANSACTION_TYPES } from "@config";
import store from "@/store";
import { CryptoUtils } from "./utils";
import { TransactionSigner } from "./transaction-signer";

export class ResignationBuilder {
    static async build ({
        address,
        resignationType,
        fee,
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
            TRANSACTION_TYPES.GROUP_1.RESIGNATION,
            1
        );
        if (!isAdvancedFee && fee.gt(staticFee)) {
            throw new Error(
                `Resignation fee should be smaller than ${staticFee}`
            );
        }

        const transaction = Transactions.BuilderFactory.delegateResignation()
            .resignationTypeAsset(resignationType)
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
