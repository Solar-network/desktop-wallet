import { Transactions } from "@solar-network/crypto";
import { TRANSACTION_TYPES } from "@config";
import store from "@/store";
import { CryptoUtils } from "./utils";
import { TransactionSigner } from "./transaction-signer";

export class ExtraSignatureRegistrationBuilder {
    static async build ({
        address,
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
            TRANSACTION_TYPES.GROUP_1.EXTRA_SIGNATURE,
            1
        );
        if (!isAdvancedFee && fee.gt(staticFee)) {
            throw new Error(
                `Extra signature fee should be smaller than ${staticFee}`
            );
        }

        const transaction = Transactions.BuilderFactory.secondSignature()
            .signatureAsset(extraMnemonic)
            .fee(fee);

        mnemonic = CryptoUtils.normalizeMnemonic(mnemonic);

        return TransactionSigner.sign({
            address,
            transaction,
            mnemonic,
            wif,
            networkWif,
            multiSignature,
            nonce
        },
        returnObject
        );
    }
}
